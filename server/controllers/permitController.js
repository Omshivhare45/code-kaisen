import Permit from '../models/Permit.js';
import Road from '../models/Road.js';
import Notification from '../models/Notification.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { detectConflicts } from '../services/conflictService.js';
import { generatePermitPDF } from '../services/pdfService.js';
import ActivityLog from '../models/ActivityLog.js';
import { getIO } from '../sockets/socketHandler.js';

// @desc    Create new permit request
// @route   POST /api/permits
// @access  Private (Department Officer / Super Admin)
export const createPermit = asyncHandler(async (req, res, next) => {
  // If user is department officer, force their department
  let departmentId = req.user.role === 'Department Officer' ? req.user.department._id : req.body.department;

  if (!departmentId) {
    return next(new ErrorResponse('Please specify a department', 400));
  }

  const { roadName, ward, latitude, longitude, radius, purpose, startDate, endDate, depth, restorationPlan, applicantName, applicantPhone } = req.body;

  const permit = await Permit.create({
    department: departmentId,
    roadName,
    ward,
    latitude: Number(latitude),
    longitude: Number(longitude),
    location: {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)], // GeoJSON [lng, lat]
    },
    radius: Number(radius) || 50,
    purpose,
    startDate,
    endDate,
    depth: Number(depth),
    restorationPlan,
    applicantName: applicantName || req.user.name,
    applicantPhone: applicantPhone || req.user.phone,
    status: 'Pending',
  });

  // Log action
  await ActivityLog.create({
    user: req.user._id,
    action: 'CREATE_PERMIT',
    details: `Created permit request ID ${permit._id} on ${roadName}`,
    ipAddress: req.ip,
  });

  // Run conflict detection asynchronously to keep response snappy, or wait.
  // Wait is better so the user gets the updated status (Pending vs Conflict) in the creation response.
  await detectConflicts(permit._id);

  // Retrieve the updated permit after conflict detection
  const updatedPermit = await Permit.findById(permit._id).populate('department');

  // Trigger real-time notifications
  const io = getIO();
  if (io) {
    io.emit('permit_created', updatedPermit);
  }

  res.status(201).json({
    success: true,
    data: updatedPermit,
  });
});

// @desc    Get all permits (with search, filtering, sorting, pagination)
// @route   GET /api/permits
// @access  Private
export const getPermits = asyncHandler(async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude from direct match query
  const removeFields = ['select', 'sort', 'page', 'limit', 'search', 'startDate', 'endDate'];
  removeFields.forEach((param) => delete reqQuery[param]);

  // Handle direct filtration (ward, department, status)
  let queryStr = JSON.stringify(reqQuery);
  query = Permit.find(JSON.parse(queryStr)).populate('department');

  // Road Name Search
  if (req.query.search) {
    query = query.find({ roadName: { $regex: req.query.search, $options: 'i' } });
  }

  // Date Filters
  if (req.query.startDate || req.query.endDate) {
    const dateQuery = {};
    if (req.query.startDate) dateQuery.$gte = new Date(req.query.startDate);
    if (req.query.endDate) dateQuery.$lte = new Date(req.query.endDate);
    query = query.find({ startDate: dateQuery });
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Permit.countDocuments();

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const permits = await query;

  // Pagination result
  const pagination = {};
  if (endIndex < total) {
    pagination.next = { page: page + 1, limit };
  }
  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }

  res.status(200).json({
    success: true,
    count: permits.length,
    pagination,
    data: permits,
  });
});

// @desc    Get single permit details
// @route   GET /api/permits/:id
// @access  Private
export const getPermitById = asyncHandler(async (req, res, next) => {
  const permit = await Permit.findById(req.params.id)
    .populate('department')
    .populate({
      path: 'conflictingPermits',
      populate: { path: 'department' },
    });

  if (!permit) {
    return next(new ErrorResponse(`Permit not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: permit,
  });
});

// @desc    Update permit status (Accept/Reject/Complete/Active)
// @route   PUT /api/permits/:id/status
// @access  Private (Department Officer / Super Admin)
export const updatePermitStatus = asyncHandler(async (req, res, next) => {
  const { status, remarks } = req.body;
  
  let permit = await Permit.findById(req.params.id).populate('department');
  
  if (!permit) {
    return next(new ErrorResponse(`Permit not found with id of ${req.params.id}`, 404));
  }

  // Permission Check
  // Officers can only update permits belonging to their own department
  if (req.user.role === 'Department Officer') {
    if (permit.department._id.toString() !== req.user.department._id.toString()) {
      return next(new ErrorResponse('Not authorized to modify this department permit', 403));
    }
  }

  // Validate status updates
  permit.status = status;
  await permit.save();

  // If status is Active or Completed, we might want to update Road Status
  if (status === 'Active') {
    // Attempt to close the road corresponding to this permit or create a closure record
    await Road.findOneAndUpdate(
      { name: { $regex: permit.roadName, $options: 'i' } },
      {
        status: 'Closed',
        closureReason: `Utility work in progress by ${permit.department.name}: ${permit.purpose}`,
        closedByPermit: permit._id,
      },
      { new: true }
    );
  } else if (status === 'Completed' || status === 'Rejected') {
    // Reopen road
    await Road.findOneAndUpdate(
      { closedByPermit: permit._id },
      {
        status: 'Open',
        closureReason: '',
        closedByPermit: null,
      }
    );
  }

  // Create audit log
  await ActivityLog.create({
    user: req.user._id,
    action: 'UPDATE_PERMIT_STATUS',
    details: `Updated permit ${permit._id} status to ${status}. Remarks: ${remarks || ''}`,
    ipAddress: req.ip,
  });

  // Notify using Sockets
  const io = getIO();
  if (io) {
    // Create notifications for officers of the department
    const notification = await Notification.create({
      recipientDepartment: permit.department._id,
      title: 'Permit Status Updated',
      message: `Your permit request on ${permit.roadName} was updated to ${status}.`,
      type: 'Permit',
      metadata: { permitId: permit._id },
    });
    io.to(`dept_${permit.department._id.toString()}`).emit('notification', notification);
    io.emit('permit_updated', permit);
  }

  res.status(200).json({
    success: true,
    data: permit,
  });
});

// @desc    Agree to Joint Excavation
// @route   PUT /api/permits/:id/agree-joint
// @access  Private (Department Officer)
export const agreeJointExcavation = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'Department Officer') {
    return next(new ErrorResponse('Only department officers can accept joint excavation requests', 403));
  }

  const permit = await Permit.findById(req.params.id).populate('department');

  if (!permit) {
    return next(new ErrorResponse(`Permit not found with id of ${req.params.id}`, 404));
  }

  const deptId = req.user.department._id;

  // Add to agreed list if not already present
  if (!permit.jointExcavationAgreedBy.includes(deptId)) {
    permit.jointExcavationAgreedBy.push(deptId);
    
    // Check if both the original and at least one conflicting department have agreed
    // For demo simplicity, once a conflicting department agrees, we log it.
    await permit.save();

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'AGREE_JOINT_EXCAVATION',
      details: `Department ${req.user.department.name} agreed to joint excavation on permit ${permit._id}`,
      ipAddress: req.ip,
    });

    const io = getIO();
    if (io) {
      const notification = await Notification.create({
        recipientDepartment: permit.department._id,
        title: 'Joint Excavation Agreed',
        message: `Department ${req.user.department.name} has agreed to join excavation on ${permit.roadName}.`,
        type: 'Conflict',
        metadata: { permitId: permit._id },
      });
      io.to(`dept_${permit.department._id.toString()}`).emit('notification', notification);
    }
  }

  res.status(200).json({
    success: true,
    data: permit,
  });
});

// @desc    Download PDF permit
// @route   GET /api/permits/:id/pdf
// @access  Private
export const downloadPermitPDF = asyncHandler(async (req, res, next) => {
  const permit = await Permit.findById(req.params.id).populate('department');

  if (!permit) {
    return next(new ErrorResponse(`Permit not found with id of ${req.params.id}`, 404));
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=permit_${permit._id}.pdf`);

  generatePermitPDF(permit, res);
});
