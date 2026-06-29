import { Router, Response } from 'express';
import { Notification } from '../models/Notification';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// 1. Get all notifications for the authenticated user
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    // Fetch notifications specifically for the user, plus global broadcasts (userId = null)
    const notifications = await Notification.find({
      $or: [{ userId: user.id }, { userId: null }],
    }).sort({ createdAt: -1 });

    return res.status(200).json(notifications);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Mark notification as read
router.patch('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    // Ensure authorization: Notification must belong to the user or be a global broadcast
    if (notification.userId && notification.userId.toString() !== user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json(notification);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
