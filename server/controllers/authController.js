import crypto from 'crypto';
import UserRepository from '../repositories/UserRepository.js';
import DepartmentRepository from '../repositories/DepartmentRepository.js';
import RoleRepository from '../repositories/RoleRepository.js';
import SessionRepository from '../repositories/SessionRepository.js';
import ActivityLogRepository from '../repositories/ActivityLogRepository.js';
import WardRepository from '../repositories/WardRepository.js';
import AppError from '../utils/appError.js';
import { sendTokenResponse } from '../utils/jwt.js';
import sendEmail from '../services/emailService.js';
import { toUserDTO } from '../dto/UserDTO.js';
import logger from '../utils/logger.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, ward, departmentCode } = req.body;

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return next(new AppError('User already registered with this email', 400, 'USER_EXISTS'));
    }

    // Resolve Role ID
    const roleDoc = await RoleRepository.findByName(role || 'Citizen');
    if (!roleDoc) {
      return next(new AppError(`Specified role '${role}' is not configured in system`, 404, 'ROLE_NOT_FOUND'));
    }

    const roleNameUpper = roleDoc.name.toUpperCase();

    let deptId = null;
    if (roleNameUpper === 'DEPARTMENT OFFICER') {
      if (!departmentCode) {
        return next(new AppError('Department code is required for Department Officers', 400, 'BAD_REQUEST'));
      }
      const dept = await DepartmentRepository.findByCode(departmentCode);
      if (!dept) {
        return next(new AppError(`Department with code '${departmentCode}' not found`, 404, 'DEPARTMENT_NOT_FOUND'));
      }
      deptId = dept._id;
    }

    let wardId = null;
    if (roleNameUpper === 'CITIZEN') {
      if (!ward) {
        return next(new AppError('Ward is required for Citizens', 400, 'BAD_REQUEST'));
      }
      let wardDoc;
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(ward);
      if (isMongoId) {
        wardDoc = await WardRepository.findById(ward);
      } else {
        wardDoc = await WardRepository.findOne({ name: ward });
      }
      if (!wardDoc) {
        return next(new AppError(`Ward '${ward}' not found`, 404, 'WARD_NOT_FOUND'));
      }
      wardId = wardDoc._id;
    }

    // Create user
    const user = await UserRepository.create({
      name,
      email,
      password,
      role: roleDoc._id,
      phone,
      ward: roleNameUpper === 'CITIZEN' ? wardId : undefined,
      department: deptId,
      isVerified: true // Default to true for testing
    });

    // Populate role and department for token response
    const populatedUser = await UserRepository.findByIdWithDetails(user._id);

    // Track activity
    await ActivityLogRepository.log(user._id, 'REGISTER', `User registered as role: ${roleDoc.name}`, req.ip);

    // Create Session
    const tokenPayload = { id: user._id, role: roleDoc.name };
    const tempToken = crypto.randomBytes(40).toString('hex');
    await SessionRepository.create({
      user: user._id,
      token: tempToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    sendTokenResponse(populatedUser, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await UserRepository.findByEmailWithPassword(email);
    if (!user) {
      return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
    }

    // Track activity
    await ActivityLogRepository.log(user._id, 'LOGIN', 'User logged in', req.ip);

    // Create Session
    const tempToken = crypto.randomBytes(40).toString('hex');
    await SessionRepository.create({
      user: user._id,
      token: tempToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await UserRepository.findByIdWithDetails(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: toUserDTO(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phone: req.body.phone,
    };

    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;
    if (roleName === 'Citizen') {
      fieldsToUpdate.ward = req.body.ward;
    }

    const user = await UserRepository.update(req.user.id, fieldsToUpdate);
    const populatedUser = await UserRepository.findByIdWithDetails(user._id);

    // Track activity
    await ActivityLogRepository.log(user._id, 'UPDATE_PROFILE', 'User updated profile details', req.ip);

    res.status(200).json({
      success: true,
      data: toUserDTO(populatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const user = await UserRepository.findByEmail(req.body.email);
    if (!user) {
      return next(new AppError('There is no user registered with that email address', 404, 'EMAIL_NOT_FOUND'));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset url (Vite client default port is 5173)
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

      res.status(200).json({ success: true, data: 'Password reset link sent to your email.' });
    } catch (err) {
      logger.error(`Error sending forgot-password email: ${err.message}`);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new AppError('Email could not be sent', 500, 'EMAIL_SEND_FAILED'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await UserRepository.findOne({
      passwordResetToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError('Invalid or expired password reset token', 400, 'INVALID_RESET_TOKEN'));
    }

    // Set new password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Track activity
    await ActivityLogRepository.log(user._id, 'RESET_PASSWORD', 'User successfully reset password', req.ip);

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};
