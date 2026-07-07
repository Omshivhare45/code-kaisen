import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  handleValidationErrors,
} from '../validations/authValidation.js';

const router = express.Router();

// Public auth routes with validation and rate limiting
router.post('/register', authLimiter, registerRules, handleValidationErrors, register);
router.post('/login', authLimiter, loginRules, handleValidationErrors, login);
router.post('/forgotpassword', authLimiter, forgotPasswordRules, handleValidationErrors, forgotPassword);
router.put('/resetpassword/:resettoken', authLimiter, resetPasswordRules, handleValidationErrors, resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;
