import express from 'express';
import {
  createPermit,
  getPermits,
  getPermitById,
  updatePermitStatus,
  agreeJointExcavation,
  downloadPermitPDF,
} from '../controllers/permitController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, authorize('Department Officer', 'Super Admin'), createPermit)
  .get(protect, getPermits);

router.route('/:id')
  .get(protect, getPermitById);

router.put('/:id/status', protect, authorize('Department Officer', 'Super Admin'), updatePermitStatus);
router.put('/:id/agree-joint', protect, authorize('Department Officer'), agreeJointExcavation);
router.get('/:id/pdf', protect, downloadPermitPDF);

export default router;
