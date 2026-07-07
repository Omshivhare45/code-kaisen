import crypto from 'crypto';
import ComplaintRepository from '../repositories/ComplaintRepository.js';
import DepartmentRepository from '../repositories/DepartmentRepository.js';
import NotificationRepository from '../repositories/NotificationRepository.js';
import ActivityLogRepository from '../repositories/ActivityLogRepository.js';
import ComplaintTimeline from '../models/ComplaintTimeline.js';
import Feedback from '../models/Feedback.js';
import AppError from '../utils/appError.js';
import { getIO } from '../sockets/socketHandler.js';
import logger from '../utils/logger.js';

// Helper to auto-assign department based on complaint type
const autoAssignDepartment = async (complaintType) => {
  let targetCode = 'PWD';

  switch (complaintType) {
    case 'Water Leakage':
      targetCode = 'WATER';
      break;
    case 'Cable Exposure':
      targetCode = 'TELE';
      break;
    case 'Unauthorized Digging':
    case 'Road Damage':
    case 'Debris Accumulation':
      targetCode = 'PWD';
      break;
    case 'Electricity':
      targetCode = 'ELEC';
      break;
    default:
      targetCode = 'PWD';
      break;
  }

  const dept = await DepartmentRepository.findByCode(targetCode);
  return dept ? dept._id : null;
};

// @desc    Report a new complaint
// @route   POST /api/complaints
// @access  Private (Citizen / Admin)
export const createComplaint = async (req, res, next) => {
  try {
    const { description, latitude, longitude, ward, complaintType, priority } = req.body;

    const assignedDeptId = await autoAssignDepartment(complaintType);
    if (!assignedDeptId) {
      return next(new AppError('Could not auto-assign department. Check database configuration.', 500, 'SERVER_ERROR'));
    }

    const photoUrl = req.fileUrl || ''; // Passed from Multer/upload middleware if any
    const complaintNumber = `CMP-${crypto.randomInt(100000, 999999)}`;

    const complaint = await ComplaintRepository.create({
      complaintNumber,
      citizen: req.user._id,
      description,
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      },
      ward,
      complaintType,
      department: assignedDeptId,
      priority: priority || 'Medium',
      status: 'Received',
    });

    // Handle photo attachments in Attachment collection if photoUrl exists
    // We can link it later or write it directly

    // Initial timeline log
    await ComplaintTimeline.create({
      complaint: complaint._id,
      actor: req.user._id,
      previousStatus: null,
      newStatus: 'Received',
      remarks: 'Complaint registered successfully by Citizen.'
    });

    // Track activity
    await ActivityLogRepository.log(
      req.user._id,
      'REPORT_COMPLAINT',
      `Citizen submitted complaint '${complaintNumber}' of type: ${complaintType}`,
      req.ip
    );

    const populatedComplaint = await ComplaintRepository.findByIdWithDetails(complaint._id);

    // Socket Notifications
    const io = getIO();
    if (io) {
      const notification = await NotificationRepository.create({
        recipientDepartment: assignedDeptId,
        title: 'New Complaint Received',
        message: `A new complaint of type ${complaintType} has been assigned to your department.`,
        type: 'ComplaintStatus',
        metadata: { complaintId: complaint._id },
      });

      io.to(`dept_${assignedDeptId.toString()}`).emit('notification', notification);
      io.to('role_Super_Admin').emit('notification', notification);
      io.emit('complaint_created', populatedComplaint);
    }

    res.status(201).json({
      success: true,
      data: populatedComplaint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private
export const getComplaints = async (req, res, next) => {
  try {
    const queryObj = {};
    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;

    if (roleName === 'Citizen') {
      queryObj.citizen = req.user._id;
    } else if (roleName === 'Department Officer') {
      queryObj.department = req.user.department._id;
    }

    if (req.query.status) queryObj.status = req.query.status;
    if (req.query.ward) queryObj.ward = req.query.ward;
    if (req.query.complaintType) queryObj.complaintType = req.query.complaintType;

    const complaints = await ComplaintRepository.findWithDetails(queryObj);

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single complaint details
// @route   GET /api/complaints/:id
// @access  Private
export const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await ComplaintRepository.findByIdWithDetails(req.params.id);
    if (!complaint) {
      return next(new AppError(`Complaint not found with id of ${req.params.id}`, 404, 'COMPLAINT_NOT_FOUND'));
    }

    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;

    // RBAC Checks
    if (roleName === 'Citizen' && complaint.citizen._id.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to access this complaint', 403, 'FORBIDDEN'));
    }

    if (roleName === 'Department Officer' && complaint.department._id.toString() !== req.user.department._id.toString()) {
      return next(new AppError('Not authorized to access this department complaint', 403, 'FORBIDDEN'));
    }

    // Fetch timeline logs
    const timeline = await ComplaintTimeline.find({ complaint: complaint._id }).populate('actor', 'name role').sort('createdAt');

    // Fetch feedback
    const feedback = await Feedback.findOne({ complaint: complaint._id }).populate('citizen', 'name');

    res.status(200).json({
      success: true,
      data: {
        ...complaint.toObject(),
        timeline,
        feedback
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint status
// @route   PUT /api/complaints/:id/status
// @access  Private (Department Officer / Super Admin)
export const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    const complaint = await ComplaintRepository.findByIdWithDetails(req.params.id);
    if (!complaint) {
      return next(new AppError(`Complaint not found with id of ${req.params.id}`, 404, 'COMPLAINT_NOT_FOUND'));
    }

    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;

    if (roleName === 'Department Officer') {
      if (complaint.department._id.toString() !== req.user.department._id.toString()) {
        return next(new AppError('Not authorized to update complaints for other departments', 403, 'FORBIDDEN'));
      }
    }

    const previousStatus = complaint.status;
    complaint.status = status;
    await complaint.save();

    // Log timeline transition
    await ComplaintTimeline.create({
      complaint: complaint._id,
      actor: req.user._id,
      previousStatus,
      newStatus: status,
      remarks: remarks || `Status transitioned to ${status}.`
    });

    // Track activity
    await ActivityLogRepository.log(
      req.user._id,
      'UPDATE_COMPLAINT_STATUS',
      `Updated complaint ${complaint.complaintNumber} status to ${status}`,
      req.ip
    );

    const updatedComplaint = await ComplaintRepository.findByIdWithDetails(complaint._id);

    // Socket notification
    const io = getIO();
    if (io) {
      const notification = await NotificationRepository.create({
        recipient: complaint.citizen._id,
        title: 'Complaint Status Updated',
        message: `Your complaint ${complaint.complaintNumber} has been updated to: ${status}. Remarks: ${remarks || ''}`,
        type: 'ComplaintStatus',
        metadata: { complaintId: complaint._id },
      });

      io.to(`user_${complaint.citizen._id.toString()}`).emit('notification', notification);
      io.to(`user_${complaint.citizen._id.toString()}`).emit('complaint_status_changed', updatedComplaint);
      io.emit('complaint_updated', updatedComplaint);
    }

    res.status(200).json({
      success: true,
      data: updatedComplaint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit rating and feedback
// @route   POST /api/complaints/:id/feedback
// @access  Private (Citizen)
export const rateComplaint = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    const complaint = await ComplaintRepository.findById(req.params.id);
    if (!complaint) {
      return next(new AppError(`Complaint not found with id of ${req.params.id}`, 404, 'COMPLAINT_NOT_FOUND'));
    }

    // Ensure user is the reporter of the complaint
    if (complaint.citizen.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only rate your own complaints', 403, 'FORBIDDEN'));
    }

    // Ensure complaint is resolved
    if (complaint.status !== 'Resolved') {
      return next(new AppError('You can only rate complaints that have been resolved', 400, 'BAD_REQUEST'));
    }

    // Check if feedback already submitted
    const existingFeedback = await Feedback.findOne({ complaint: complaint._id });
    if (existingFeedback) {
      return next(new AppError('Feedback already submitted for this complaint', 400, 'BAD_REQUEST'));
    }

    const feedback = await Feedback.create({
      complaint: complaint._id,
      citizen: req.user._id,
      rating: Number(rating),
      comment: comment || '',
    });

    // Track activity
    await ActivityLogRepository.log(
      req.user._id,
      'RATE_COMPLAINT',
      `Rated resolved complaint ${complaint.complaintNumber} with score: ${rating}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};
