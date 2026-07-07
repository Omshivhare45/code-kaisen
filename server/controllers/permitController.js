import crypto from 'crypto';
import PermitRepository from '../repositories/PermitRepository.js';
import RoadRepository from '../repositories/RoadRepository.js';
import NotificationRepository from '../repositories/NotificationRepository.js';
import ActivityLogRepository from '../repositories/ActivityLogRepository.js';
import ConflictReportRepository from '../repositories/ConflictReportRepository.js';
import PermitTimeline from '../models/PermitTimeline.js';
import AppError from '../utils/appError.js';
import { detectConflicts } from '../services/conflictService.js';
import { generatePermitPDF } from '../services/pdfService.js';
import { getIO } from '../sockets/socketHandler.js';
import logger from '../utils/logger.js';

// @desc    Create new permit request
// @route   POST /api/permits
// @access  Private (Department Officer / Super Admin)
export const createPermit = async (req, res, next) => {
  try {
    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;
    const departmentId = roleName === 'Department Officer' ? req.user.department._id : req.body.department;

    if (!departmentId) {
      return next(new AppError('Please specify a department', 400, 'BAD_REQUEST'));
    }

    const { roadName, ward, latitude, longitude, radius, purpose, startDate, endDate, depth, restorationPlan } = req.body;

    const permitNumber = `PMT-${crypto.randomInt(100000, 999999)}`;

    const permit = await PermitRepository.create({
      permitNumber,
      department: departmentId,
      applicant: req.user._id,
      roadName,
      ward,
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      },
      radius: Number(radius) || 50,
      purpose,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      depth: Number(depth),
      restorationPlan,
      status: 'Pending',
    });

    // Write initial log in PermitTimeline
    await PermitTimeline.create({
      permit: permit._id,
      actor: req.user._id,
      previousStatus: null,
      newStatus: 'Pending',
      actionPerformed: 'SUBMITTED',
      remarks: 'Excavation permit request submitted.'
    });

    // Track activity
    await ActivityLogRepository.log(
      req.user._id,
      'CREATE_PERMIT',
      `Created permit request '${permitNumber}' on ${roadName}`,
      req.ip
    );

    // Check for conflicts
    await detectConflicts(permit._id);

    // Fetch details
    const updatedPermit = await PermitRepository.findByIdWithDetails(permit._id);

    // Notify via sockets
    const io = getIO();
    if (io) {
      io.emit('permit_created', updatedPermit);
    }

    res.status(201).json({
      success: true,
      data: updatedPermit,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all permits (with search, filtering, sorting, pagination)
// @route   GET /api/permits
// @access  Private
export const getPermits = async (req, res, next) => {
  try {
    const filters = {};

    // Filtration matches
    if (req.query.ward) filters.ward = req.query.ward;
    if (req.query.department) filters.department = req.query.department;
    if (req.query.status) filters.status = req.query.status;

    // Search query
    if (req.query.search) {
      filters.roadName = { $regex: req.query.search, $options: 'i' };
    }

    // Date range overlap check
    if (req.query.startDate || req.query.endDate) {
      const dateSubQuery = {};
      if (req.query.startDate) dateSubQuery.$gte = new Date(req.query.startDate);
      if (req.query.endDate) dateSubQuery.$lte = new Date(req.query.endDate);
      filters.startDate = dateSubQuery;
    }

    // Sort order
    let sort = '-createdAt';
    if (req.query.sort) {
      sort = req.query.sort.split(',').join(' ');
    }

    const permits = await PermitRepository.findWithDetails(filters, sort);

    res.status(200).json({
      success: true,
      count: permits.length,
      data: permits,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single permit details
// @route   GET /api/permits/:id
// @access  Private
export const getPermitById = async (req, res, next) => {
  try {
    const permit = await PermitRepository.model.findById(req.params.id)
      .populate('department')
      .populate('applicant', 'name email phone')
      .populate('ward')
      .populate({
        path: 'conflictingPermits',
        populate: { path: 'department' },
      });

    if (!permit) {
      return next(new AppError(`Permit not found with id of ${req.params.id}`, 404, 'PERMIT_NOT_FOUND'));
    }

    // Fetch timeline
    const timeline = await PermitTimeline.find({ permit: permit._id }).populate('actor', 'name role').sort('createdAt');

    res.status(200).json({
      success: true,
      data: {
        ...permit.toObject(),
        timeline
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update permit status (Accept/Reject/Complete/Active)
// @route   PUT /api/permits/:id/status
// @access  Private (Department Officer / Super Admin)
export const updatePermitStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    const permit = await PermitRepository.findByIdWithDetails(req.params.id);
    if (!permit) {
      return next(new AppError(`Permit not found with id of ${req.params.id}`, 404, 'PERMIT_NOT_FOUND'));
    }

    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;

    // RBAC Check: Department Officers can only modify status of their own department requests
    if (roleName === 'Department Officer') {
      if (permit.department._id.toString() !== req.user.department._id.toString()) {
        return next(new AppError('Not authorized to modify this department permit', 403, 'FORBIDDEN'));
      }
    }

    const previousStatus = permit.status;
    permit.status = status;
    await permit.save();

    // Log timeline event
    await PermitTimeline.create({
      permit: permit._id,
      actor: req.user._id,
      previousStatus,
      newStatus: status,
      actionPerformed: `MARK_${status.toUpperCase()}`,
      remarks: remarks || `Status updated from ${previousStatus} to ${status}.`
    });

    // Handle road closure updates
    if (status === 'Active') {
      await RoadRepository.model.findOneAndUpdate(
        { name: { $regex: permit.roadName, $options: 'i' } },
        {
          status: 'Closed',
          closureReason: `Utility work in progress by ${permit.department.name}: ${permit.purpose}`,
          closedByPermit: permit._id,
        }
      );
    } else if (status === 'Completed' || status === 'Rejected') {
      await RoadRepository.model.findOneAndUpdate(
        { closedByPermit: permit._id },
        {
          status: 'Open',
          closureReason: '',
          closedByPermit: null,
        }
      );
    }

    // Track activity
    await ActivityLogRepository.log(
      req.user._id,
      'UPDATE_PERMIT_STATUS',
      `Updated permit ${permit.permitNumber} status from ${previousStatus} to ${status}`,
      req.ip
    );

    // Notify via Socket.io
    const io = getIO();
    if (io) {
      const notification = await NotificationRepository.create({
        recipientDepartment: permit.department._id,
        title: 'Permit Status Updated',
        message: `Your permit request ${permit.permitNumber} on ${permit.roadName} was updated to ${status}.`,
        type: 'PermitStatus',
        metadata: { permitId: permit._id },
      });

      io.to(`dept_${permit.department._id.toString()}`).emit('notification', notification);
      io.emit('permit_updated', permit);
    }

    res.status(200).json({
      success: true,
      data: permit,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Agree to Joint Excavation
// @route   PUT /api/permits/:id/agree-joint
// @access  Private (Department Officer)
export const agreeJointExcavation = async (req, res, next) => {
  try {
    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;
    if (roleName !== 'Department Officer') {
      return next(new AppError('Only department officers can accept joint excavation requests', 403, 'FORBIDDEN'));
    }

    const permit = await PermitRepository.findByIdWithDetails(req.params.id);
    if (!permit) {
      return next(new AppError(`Permit not found with id of ${req.params.id}`, 404, 'PERMIT_NOT_FOUND'));
    }

    // Find if there is an active conflict report
    const conflictReports = await ConflictReportRepository.model.findOne({
      $or: [
        { primaryPermit: permit._id },
        { conflictingPermits: permit._id }
      ],
      status: 'Open'
    });

    if (!conflictReports) {
      return next(new AppError('No open conflict report found for this permit', 404, 'CONFLICT_NOT_FOUND'));
    }

    // Toggle agreements
    conflictReports.status = 'Resolved';
    conflictReports.resolutionNotes = `Department ${req.user.department.name} agreed to coordinate joint excavation schedules.`;
    await conflictReports.save();

    permit.isJointExcavationSuggested = false;
    permit.status = 'Approved'; // Upgrade status back once resolved
    await permit.save();

    // Log Activity
    await ActivityLogRepository.log(
      req.user._id,
      'AGREE_JOINT_EXCAVATION',
      `Department ${req.user.department.name} resolved conflict on permit ${permit.permitNumber}`,
      req.ip
    );

    // Notify via sockets
    const io = getIO();
    if (io) {
      const notification = await NotificationRepository.create({
        recipientDepartment: permit.department._id,
        title: 'Joint Excavation Resolved',
        message: `Department ${req.user.department.name} has coordinated the excavation on ${permit.roadName}.`,
        type: 'Conflict',
        metadata: { permitId: permit._id },
      });
      io.to(`dept_${permit.department._id.toString()}`).emit('notification', notification);
      io.emit('permit_updated', permit);
    }

    res.status(200).json({
      success: true,
      data: permit,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download PDF permit
// @route   GET /api/permits/:id/pdf
// @access  Private
export const downloadPermitPDF = async (req, res, next) => {
  try {
    const permit = await PermitRepository.findByIdWithDetails(req.params.id);
    if (!permit) {
      return next(new AppError(`Permit not found with id of ${req.params.id}`, 404, 'PERMIT_NOT_FOUND'));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=permit_${permit.permitNumber}.pdf`);

    generatePermitPDF(permit, res);
  } catch (error) {
    next(error);
  }
};
