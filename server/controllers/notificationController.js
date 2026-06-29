import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const deptId = req.user.department?._id || null;

  const queryConditions = [
    { recipient: userId }
  ];

  // If officer, also get notifications for their department
  if (req.user.role === 'Department Officer' && deptId) {
    queryConditions.push({ recipientDepartment: deptId });
  }

  // Super admins see conflict alerts
  if (req.user.role === 'Super Admin') {
    queryConditions.push({ type: 'Conflict' });
    queryConditions.push({ recipient: null, recipientDepartment: null });
  }

  const notifications = await Notification.find({
    $or: queryConditions,
  }).sort('-createdAt').limit(50);

  res.status(200).json({
    success: true,
    data: notifications,
  });
});

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { read: true },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: notification,
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllRead = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const deptId = req.user.department?._id || null;

  const queryConditions = [
    { recipient: userId }
  ];

  if (req.user.role === 'Department Officer' && deptId) {
    queryConditions.push({ recipientDepartment: deptId });
  }

  if (req.user.role === 'Super Admin') {
    queryConditions.push({ type: 'Conflict' });
  }

  await Notification.updateMany(
    {
      $or: queryConditions,
      read: false,
    },
    { read: true }
  );

  res.status(200).json({
    success: true,
    data: 'All notifications marked as read',
  });
});
