import User from '../models/User.js';
import Department from '../models/Department.js';
import Permit from '../models/Permit.js';
import ActivityLog from '../models/ActivityLog.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import Notification from '../models/Notification.js';
import { getIO } from '../sockets/socketHandler.js';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Super Admin)
export const getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find().populate('department').sort('-createdAt');
  res.status(200).json({
    success: true,
    data: users,
  });
});

// @desc    Update user details/role/department
// @route   PUT /api/admin/users/:id
// @access  Private (Super Admin)
export const updateUser = asyncHandler(async (req, res, next) => {
  const { role, department, name, phone } = req.body;

  let updateFields = { name, phone, role };

  if (role === 'Department Officer') {
    updateFields.department = department;
  } else {
    updateFields.department = null;
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateFields, {
    new: true,
    runValidators: true,
  }).populate('department');

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'ADMIN_UPDATE_USER',
    details: `Admin updated user details for: ${user.email} (new role: ${role})`,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Super Admin)
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  await user.deleteOne();

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'ADMIN_DELETE_USER',
    details: `Admin deleted user profile: ${user.email}`,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Super Admin)
export const getAuditLogs = asyncHandler(async (req, res, next) => {
  const logs = await ActivityLog.find()
    .populate('user', 'name email role')
    .sort('-createdAt')
    .limit(100);

  res.status(200).json({
    success: true,
    data: logs,
  });
});

// @desc    Manually override and resolve a permit conflict
// @route   PUT /api/admin/permits/:id/resolve
// @access  Private (Super Admin)
export const resolveConflict = asyncHandler(async (req, res, next) => {
  const { status, remarks } = req.body; // status: 'Approved' or 'Rejected'

  if (!['Approved', 'Rejected'].includes(status)) {
    return next(new ErrorResponse('Conflict resolution status must be Approved or Rejected', 400));
  }

  const permit = await Permit.findById(req.params.id).populate('department');

  if (!permit) {
    return next(new ErrorResponse(`Permit not found with id of ${req.params.id}`, 404));
  }

  if (permit.status !== 'Conflict') {
    return next(new ErrorResponse('This permit is not flagged with a conflict status', 400));
  }

  permit.status = status;
  permit.isJointExcavationSuggested = false; // cleared
  await permit.save();

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'ADMIN_RESOLVE_CONFLICT',
    details: `Admin resolved conflict for permit ${permit._id} with status: ${status}. Remarks: ${remarks || ''}`,
    ipAddress: req.ip,
  });

  // Notify departments in conflict
  const io = getIO();
  if (io) {
    const notification = await Notification.create({
      recipientDepartment: permit.department._id,
      title: 'Conflict Resolved by Admin',
      message: `Your permit on ${permit.roadName} previously flagged for conflict has been manually ${status} by Nodal Officer. Remarks: ${remarks || ''}`,
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
