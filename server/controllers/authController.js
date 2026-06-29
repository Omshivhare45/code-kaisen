import crypto from 'crypto';
import User from '../models/User.js';
import Department from '../models/Department.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendTokenResponse } from '../utils/jwt.js';
import sendEmail from '../services/emailService.js';
import ActivityLog from '../models/ActivityLog.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, phone, ward, departmentCode } = req.body;

  let deptId = null;

  // If role is Department Officer, we map departmentCode to department ObjectId
  if (role === 'Department Officer') {
    if (!departmentCode) {
      return next(new ErrorResponse('Please specify a department code', 400));
    }
    const dept = await Department.findOne({ code: departmentCode.toUpperCase() });
    if (!dept) {
      return next(new ErrorResponse(`Department with code ${departmentCode} not found`, 404));
    }
    deptId = dept._id;
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    phone,
    ward: role === 'Citizen' ? ward : undefined,
    department: deptId,
  });

  // Log activity
  await ActivityLog.create({
    user: user._id,
    action: 'REGISTER',
    details: `User registered as role: ${role}`,
    ipAddress: req.ip,
  });

  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password').populate('department');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Log activity
  await ActivityLog.create({
    user: user._id,
    action: 'LOGIN',
    details: `User logged in`,
    ipAddress: req.ip,
  });

  sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('department');

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    phone: req.body.phone,
  };

  if (req.user.role === 'Citizen') {
    fieldsToUpdate.ward = req.body.ward;
  }

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  }).populate('department');

  // Log activity
  await ActivityLog.create({
    user: user._id,
    action: 'UPDATE_PROFILE',
    details: `User updated profile settings`,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset url (we assume frontend is running on localhost:5173 by default)
  const resetUrl = `${req.protocol}://${req.get('host').replace('5000', '5173')}/resetpassword/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'SETU Password Reset Token',
      message,
      html: `
        <h3>SETU – Single Window E-Coordination</h3>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}" target="_blank" style="padding: 10px 20px; background-color: #0f766e; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    console.error(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
export const resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Log activity
  await ActivityLog.create({
    user: user._id,
    action: 'RESET_PASSWORD',
    details: `User successfully reset password`,
    ipAddress: req.ip,
  });

  sendTokenResponse(user, 200, res);
});
