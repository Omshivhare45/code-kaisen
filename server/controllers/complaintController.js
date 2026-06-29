import Complaint from '../models/Complaint.js';
import Department from '../models/Department.js';
import Notification from '../models/Notification.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import ActivityLog from '../models/ActivityLog.js';
import { getIO } from '../sockets/socketHandler.js';

// Helper to auto-assign department based on complaint type
const autoAssignDepartment = async (complaintType) => {
  let targetCode = 'PWD'; // Default fallback

  switch (complaintType) {
    case 'Water Leakage':
      targetCode = 'WATER';
      break;
    case 'Cable Damage':
      targetCode = 'TELE';
      break;
    case 'Pothole':
    case 'Road Digging':
    case 'Open Trench':
    case 'Unauthorized Digging':
      targetCode = 'PWD';
      break;
    case 'Electricity':
      targetCode = 'ELEC';
      break;
    default:
      targetCode = 'PWD';
      break;
  }

  const dept = await Department.findOne({ code: targetCode });
  return dept ? dept._id : null;
};

// @desc    Report a new complaint
// @route   POST /api/complaints
// @access  Private (Citizen / Admin)
export const createComplaint = asyncHandler(async (req, res, next) => {
  const { description, latitude, longitude, ward, complaintType, priority } = req.body;

  // Auto assign department
  const assignedDeptId = await autoAssignDepartment(complaintType);
  if (!assignedDeptId) {
    return next(new ErrorResponse('Could not auto-assign department. Check database seeds.', 500));
  }

  const photoUrl = req.fileUrl || ''; // from handleImageUpload middleware

  const complaint = await Complaint.create({
    citizen: req.user._id,
    photoUrl,
    description,
    latitude: Number(latitude),
    longitude: Number(longitude),
    location: {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)],
    },
    ward,
    complaintType,
    department: assignedDeptId,
    priority: priority || 'Medium',
    status: 'Received',
    statusTimeline: [
      {
        status: 'Received',
        remarks: 'Complaint registered successfully by Citizen.',
      },
    ],
  });

  // Fetch populated details
  const populatedComplaint = await Complaint.findById(complaint._id)
    .populate('citizen', 'name email phone')
    .populate('department');

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'REPORT_COMPLAINT',
    details: `Citizen submitted complaint ID ${complaint._id} of type: ${complaintType}`,
    ipAddress: req.ip,
  });

  // Socket notification to the assigned department and global admin
  const io = getIO();
  if (io) {
    const notification = await Notification.create({
      recipientDepartment: assignedDeptId,
      title: 'New Complaint Received',
      message: `A new complaint of type ${complaintType} has been assigned to your department in ward ${ward}.`,
      type: 'Complaint',
      metadata: { complaintId: complaint._id },
    });
    
    // Notify department room
    io.to(`dept_${assignedDeptId.toString()}`).emit('notification', notification);
    io.to('role_Super_Admin').emit('notification', notification);
    
    // Broadcast for dashboard live update
    io.emit('complaint_created', populatedComplaint);
  }

  res.status(201).json({
    success: true,
    data: populatedComplaint,
  });
});

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private
export const getComplaints = asyncHandler(async (req, res, next) => {
  let queryObj = {};

  // If user is a Citizen, restrict them to their own complaints
  if (req.user.role === 'Citizen') {
    queryObj.citizen = req.user._id;
  } 
  // If user is a Department Officer, only show their department's complaints
  else if (req.user.role === 'Department Officer') {
    queryObj.department = req.user.department._id;
  }

  // Allow extra query params like status, ward, complaintType
  if (req.query.status) queryObj.status = req.query.status;
  if (req.query.ward) queryObj.ward = req.query.ward;
  if (req.query.complaintType) queryObj.complaintType = req.query.complaintType;

  let query = Complaint.find(queryObj)
    .populate('citizen', 'name email phone')
    .populate('department')
    .sort('-createdAt');

  // Execution
  const complaints = await query;

  res.status(200).json({
    success: true,
    count: complaints.length,
    data: complaints,
  });
});

// @desc    Get single complaint details
// @route   GET /api/complaints/:id
// @access  Private
export const getComplaintById = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('citizen', 'name email phone')
    .populate('department');

  if (!complaint) {
    return next(new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404));
  }

  // Authorization check
  if (req.user.role === 'Citizen' && complaint.citizen._id.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('Not authorized to access this complaint', 403));
  }

  if (req.user.role === 'Department Officer' && complaint.department._id.toString() !== req.user.department._id.toString()) {
    return next(new ErrorResponse('Not authorized to access this department complaint', 403));
  }

  res.status(200).json({
    success: true,
    data: complaint,
  });
});

// @desc    Update complaint status
// @route   PUT /api/complaints/:id/status
// @access  Private (Department Officer / Super Admin)
export const updateComplaintStatus = asyncHandler(async (req, res, next) => {
  const { status, remarks } = req.body;

  let complaint = await Complaint.findById(req.params.id).populate('department');

  if (!complaint) {
    return next(new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404));
  }

  // Authorization Check
  if (req.user.role === 'Department Officer') {
    if (complaint.department._id.toString() !== req.user.department._id.toString()) {
      return next(new ErrorResponse('Not authorized to update complaints for other departments', 403));
    }
  }

  // Update status and append to timeline
  complaint.status = status;
  complaint.statusTimeline.push({
    status,
    remarks: remarks || `Status changed to ${status}`,
    updatedAt: new Date(),
  });

  await complaint.save();
  
  // Re-fetch populated object
  const updatedComplaint = await Complaint.findById(complaint._id)
    .populate('citizen', 'name email phone')
    .populate('department');

  // Log action
  await ActivityLog.create({
    user: req.user._id,
    action: 'UPDATE_COMPLAINT_STATUS',
    details: `Updated complaint ${complaint._id} status to ${status}`,
    ipAddress: req.ip,
  });

  // Socket notification
  const io = getIO();
  if (io) {
    // Notify the citizen
    const notification = await Notification.create({
      recipient: complaint.citizen,
      title: 'Complaint Update',
      message: `Your complaint for ${complaint.complaintType} has been updated to: ${status}. Remarks: ${remarks || ''}`,
      type: 'Complaint',
      metadata: { complaintId: complaint._id },
    });

    // Send to specific citizen socket room
    io.to(`user_${complaint.citizen.toString()}`).emit('notification', notification);
    io.to(`user_${complaint.citizen.toString()}`).emit('complaint_status_changed', updatedComplaint);
    
    // General broadcast for updates
    io.emit('complaint_updated', updatedComplaint);
  }

  res.status(200).json({
    success: true,
    data: updatedComplaint,
  });
});

// @desc    Submit rating and feedback
// @route   POST /api/complaints/:id/rate
// @access  Private (Citizen)
export const rateComplaint = asyncHandler(async (req, res, next) => {
  const { score, comment } = req.body;

  let complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return next(new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404));
  }

  // Ensure user is the reporter of the complaint
  if (complaint.citizen.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('You can only rate your own complaints', 403));
  }

  // Ensure complaint is resolved
  if (complaint.status !== 'Resolved') {
    return next(new ErrorResponse('You can only rate complaints that have been resolved', 400));
  }

  complaint.rating = {
    score: Number(score),
    comment: comment || '',
  };

  await complaint.save();

  // Log Activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'RATE_COMPLAINT',
    details: `Rated resolved complaint ${complaint._id} with score: ${score}`,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    data: complaint,
  });
});
