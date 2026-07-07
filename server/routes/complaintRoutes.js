import express from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  rateComplaint,
} from '../controllers/complaintController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload, { handleImageUpload } from '../middleware/upload.js';
import { handleValidationErrors } from '../validations/authValidation.js';
import {
  createComplaintRules,
  updateComplaintStatusRules,
  submitFeedbackRules,
} from '../validations/complaintValidation.js';

const router = express.Router();

router.route('/')
  .post(protect, authorize('Citizen', 'Super Admin'), upload.single('photo'), handleImageUpload, createComplaintRules, handleValidationErrors, createComplaint)
  .get(protect, getComplaints);

router.route('/:id')
  .get(protect, getComplaintById);

router.put('/:id/status', protect, authorize('Department Officer', 'Super Admin'), updateComplaintStatusRules, handleValidationErrors, updateComplaintStatus);
router.post('/:id/feedback', protect, authorize('Citizen'), submitFeedbackRules, handleValidationErrors, rateComplaint);

export default router;
