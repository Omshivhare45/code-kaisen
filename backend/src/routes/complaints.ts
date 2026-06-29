import { Router, Request, Response } from 'express';
import { Complaint } from '../models/Complaint';
import { ComplaintHistory } from '../models/ComplaintHistory';
import { Department } from '../models/Department';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper to determine responsible department slug based on type
function getDepartmentSlugForType(type: string): string {
  switch (type) {
    case 'Pothole':
    case 'Road damage':
      return 'pwd';
    case 'Blockage':
      return 'jal-sansadhan';
    case 'Unsafe trench':
      return 'metro-smartcity';
    case 'Illegal digging':
      return 'pwd';
    case 'Dust':
      return 'metro-smartcity';
    default:
      return 'pwd';
  }
}

// Helper to determine SLA deadline duration in hours
function getSlaHoursForType(type: string): number {
  switch (type) {
    case 'Illegal digging':
    case 'Unsafe trench':
      return 24;
    case 'Pothole':
    case 'Road damage':
    case 'Blockage':
      return 48;
    case 'Dust':
      return 168;
    default:
      return 48;
  }
}

// 1. Submit Complaint (Citizen - Public access)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { reporterName, reporterEmail, reporterPhone, complaintType, description, roadName, latitude, longitude, photoUrl } = req.body;

    if (!complaintType || !description || !roadName || !latitude || !longitude) {
      return res.status(400).json({ error: 'ComplaintType, description, roadName, latitude, and longitude are required.' });
    }

    // Generate unique ticket number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-${dateStr}-${random}`;

    // Calculate SLA
    const slaHours = getSlaHoursForType(complaintType);
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    // Auto-route department
    const deptSlug = getDepartmentSlugForType(complaintType);
    const dept = await Department.findOne({ slug: deptSlug });

    const newComplaint = await Complaint.create({
      ticketNumber,
      reporterName,
      reporterEmail,
      reporterPhone,
      complaintType,
      description,
      roadName,
      latitude,
      longitude,
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      status: 'Received',
      assignedDepartment: dept ? dept._id : null,
      photoUrl,
      slaDeadline,
    });

    // Create History
    await ComplaintHistory.create({
      complaintId: newComplaint._id,
      fromStatus: null,
      toStatus: 'Received',
      notes: 'Complaint registered by citizen.',
      changedBy: null,
    });

    const populatedComplaint = await Complaint.findById(newComplaint._id).populate('assignedDepartment');

    // Socket.IO Broadcast
    const io = req.app.get('socketio');
    if (io) {
      io.to('complaints').emit('complaint_created', populatedComplaint);
      if (dept) {
        io.to(`dept_${dept._id}`).emit('complaint_created', populatedComplaint);
      }
    }

    return res.status(201).json(populatedComplaint);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. List Complaints
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, assignedDepartment, complaintType } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (assignedDepartment) filter.assignedDepartment = assignedDepartment;
    if (complaintType) filter.complaintType = complaintType;

    // Department engineers/admins should see their own department's complaints by default
    const user = req.user as any;
    if (user && (user.role === 'Department Admin' || user.role === 'Department Engineer') && user.department_id) {
      filter.assignedDepartment = user.department_id;
    }

    const complaints = await Complaint.find(filter)
      .populate('assignedDepartment')
      .sort({ createdAt: -1 });

    return res.status(200).json(complaints);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Fetch Complaint Detail with History
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('assignedDepartment');
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const history = await ComplaintHistory.find({ complaintId: complaint._id })
      .populate('changedBy', 'firstName lastName email')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      complaint,
      history,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Update Complaint Status (Department Admin/Engineer/Nodal Officer)
router.patch('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    // Authorization:
    const isPrivileged = user.role === 'Super Admin' || user.role === 'Nodal Officer';
    const isAssignedToDept = user.department_id && complaint.assignedDepartment && 
                             complaint.assignedDepartment.toString() === user.department_id;

    if (!isPrivileged && !isAssignedToDept) {
      return res.status(403).json({ error: 'Access denied. You are not authorized to manage this complaint.' });
    }

    const oldStatus = complaint.status;
    complaint.status = status;
    await complaint.save();

    // Record History
    await ComplaintHistory.create({
      complaintId: complaint._id,
      fromStatus: oldStatus,
      toStatus: status,
      notes: notes || `Status updated from ${oldStatus} to ${status}.`,
      changedBy: user.id,
    });

    const finalComplaint = await Complaint.findById(complaint._id).populate('assignedDepartment');

    // Socket.IO Broadcast
    const io = req.app.get('socketio');
    if (io && finalComplaint) {
      io.to('complaints').emit('complaint_updated', finalComplaint);
      if (finalComplaint.assignedDepartment) {
        io.to(`dept_${(finalComplaint.assignedDepartment as any)._id}`).emit('complaint_updated', finalComplaint);
      }
    }

    return res.status(200).json(finalComplaint);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Citizen Feedback (Public/Citizen access)
router.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { rating, feedback } = req.body;
    if (!rating) {
      return res.status(400).json({ error: 'Rating is required.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    if (complaint.status !== 'Resolved' && complaint.status !== 'Closed') {
      return res.status(400).json({ error: 'Feedback can only be provided for resolved or closed complaints.' });
    }

    complaint.rating = rating;
    if (feedback) complaint.feedback = feedback;
    if (complaint.status === 'Resolved') {
      complaint.status = 'Closed';
    }
    await complaint.save();

    // Record History
    await ComplaintHistory.create({
      complaintId: complaint._id,
      fromStatus: 'Resolved',
      toStatus: complaint.status,
      notes: `Feedback received. Rating: ${rating}/5.`,
      changedBy: null,
    });

    const finalComplaint = await Complaint.findById(complaint._id).populate('assignedDepartment');

    // Socket.IO Broadcast
    const io = req.app.get('socketio');
    if (io && finalComplaint) {
      io.to('complaints').emit('complaint_updated', finalComplaint);
      if (finalComplaint.assignedDepartment) {
        io.to(`dept_${(finalComplaint.assignedDepartment as any)._id}`).emit('complaint_updated', finalComplaint);
      }
    }

    return res.status(200).json(finalComplaint);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
