import { Router, Response } from 'express';
import { Conflict } from '../models/Conflict';
import { Permit } from '../models/Permit';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { evaluateConflicts } from '../utils/conflictDetector';

const router = Router();

// 1. Get all detected conflicts
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conflicts = await Conflict.find()
      .populate({
        path: 'permitId',
        populate: { path: 'department' },
      })
      .populate({
        path: 'conflictingPermitId',
        populate: { path: 'department' },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(conflicts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get conflicts for a specific permit
router.get('/permit/:permitId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conflicts = await Conflict.find({ permitId: req.params.permitId })
      .populate({
        path: 'permitId',
        populate: { path: 'department' },
      })
      .populate({
        path: 'conflictingPermitId',
        populate: { path: 'department' },
      });

    return res.status(200).json(conflicts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Force re-evaluate conflicts for a specific permit
router.post('/re-evaluate/:permitId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role === 'Citizen') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const permit = await Permit.findById(req.params.permitId);
    if (!permit) {
      return res.status(404).json({ error: 'Permit not found.' });
    }

    const score = await evaluateConflicts(permit._id.toString());
    const conflicts = await Conflict.find({ permitId: permit._id })
      .populate({
        path: 'permitId',
        populate: { path: 'department' },
      })
      .populate({
        path: 'conflictingPermitId',
        populate: { path: 'department' },
      });

    const updatedPermit = await Permit.findById(permit._id).populate('department');

    // Socket.IO Broadcast
    const io = req.app.get('socketio');
    if (io && updatedPermit) {
      io.to('permits').emit('permit_updated', updatedPermit);
      io.to(`dept_${(updatedPermit.department as any)._id}`).emit('permit_updated', updatedPermit);
    }

    return res.status(200).json({
      message: 'Conflict re-evaluation completed successfully.',
      conflictScore: score,
      permit: updatedPermit,
      conflicts,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
