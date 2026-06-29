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

const router = express.Router();

router.route('/')
  .post(protect, authorize('Citizen', 'Super Admin'), upload.single('photo'), handleImageUpload, createComplaint)
  .get(protect, getComplaints);

router.route('/:id')
  .get(protect, getComplaintById);

router.put('/:id/status', protect, authorize('Department Officer', 'Super Admin'), updateComplaintStatus);
router.post('/:id/rate', protect, authorize('Citizen'), rateComplaint);

export default router;
