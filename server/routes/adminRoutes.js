import express from 'express';
import {
  getUsers,
  updateUser,
  deleteUser,
  getAuditLogs,
  resolveConflict,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('Super Admin'));

router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .put(updateUser)
  .delete(deleteUser);

router.get('/audit-logs', getAuditLogs);
router.put('/permits/:id/resolve', resolveConflict);

export default router;
