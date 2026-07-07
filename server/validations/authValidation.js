import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: errors.array().map((err) => err.msg)
      }
    });
  }
  next();
};

export const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required').isMobilePhone().withMessage('Invalid phone number'),
  body('role').trim().notEmpty().withMessage('Role is required').isIn(['Citizen', 'Department Officer', 'Super Admin']).withMessage('Invalid role choice'),
  body('department').optional().isMongoId().withMessage('Invalid department ID format'),
  body('ward').optional().isMongoId().withMessage('Invalid ward ID format'),
];

export const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordRules = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address'),
];

export const resetPasswordRules = [
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];
