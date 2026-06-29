import { Router, Response } from 'express';
import { Permit } from '../models/Permit';
import { BhopalWard } from '../models/BhopalWard';
import { Conflict } from '../models/Conflict';
import { CoordinationMeeting } from '../models/CoordinationMeeting';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { calculateCentroid, evaluateConflicts } from '../utils/conflictDetector';

const router = Router();

// 1. Submit/Save Permit
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || user.role === 'Citizen') {
      return res.status(403).json({ error: 'Citizens are not allowed to submit road excavation permits.' });
    }

    const { roadName, geometry, purpose, startDate, endDate, depth, restorationPlan, attachments, status } = req.body;

    if (!roadName || !geometry || !geometry.type || !geometry.coordinates || !purpose || !startDate || !endDate || !depth || !restorationPlan) {
      return res.status(400).json({ error: 'All fields (roadName, geometry, purpose, startDate, endDate, depth, restorationPlan) are required.' });
    }

    // Calculate centroid
    const [lon, lat] = calculateCentroid(geometry.type, geometry.coordinates);

    // Auto-detect Ward using geospatial query
    const matchedWard = await BhopalWard.findOne({
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
        },
      },
    });
    const wardName = matchedWard ? matchedWard.name : 'Unknown Ward';

    // Generate unique permit number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    const permitNumber = `PMT-${dateStr}-${random}`;

    const newPermit = await Permit.create({
      permitNumber,
      department: user.department_id,
      roadName,
      ward: wardName,
      latitude: lat,
      longitude: lon,
      geometry,
      centroid: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      purpose,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      depth,
      restorationPlan,
      attachments: attachments || [],
      status: status || 'Draft',
      createdBy: user.id,
    });

    // Evaluate conflicts if submitted
    if (newPermit.status !== 'Draft') {
      await evaluateConflicts(newPermit._id.toString());
    }

    const populatedPermit = await Permit.findById(newPermit._id)
      .populate('department')
      .populate('createdBy', 'firstName lastName email');

    // Socket.IO Broadcast
    const io = req.app.get('socketio');
    if (io) {
      io.to('permits').emit('permit_created', populatedPermit);
      if (user.department_id) {
        io.to(`dept_${user.department_id}`).emit('permit_created', populatedPermit);
      }
    }

    return res.status(201).json(populatedPermit);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Query/List Permits
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, department, ward, search } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (ward) filter.ward = ward;
    if (search) {
      filter.roadName = { $regex: search, $options: 'i' };
    }

    const permits = await Permit.find(filter)
      .populate('department')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.status(200).json(permits);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Fetch Permit Detail with Conflicts & Meetings
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const permit = await Permit.findById(req.params.id)
      .populate('department')
      .populate('createdBy', 'firstName lastName email');

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found.' });
    }

    const conflicts = await Conflict.find({ permitId: permit._id }).populate({
      path: 'conflictingPermitId',
      populate: { path: 'department' },
    });

    const meetings = await CoordinationMeeting.find({ permitId: permit._id });

    return res.status(200).json({
      permit,
      conflicts,
      meetings,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Update Permit Details/Status
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    const permit = await Permit.findById(req.params.id);
    if (!permit) {
      return res.status(404).json({ error: 'Permit not found.' });
    }

    const { status, roadName, geometry, purpose, startDate, endDate, depth, restorationPlan, attachments } = req.body;

    const isOwner = permit.createdBy.toString() === user.id || 
                    (user.department_id && permit.department.toString() === user.department_id);
    
    const isPrivileged = user.role === 'Super Admin' || user.role === 'Nodal Officer' || 
                         (user.role === 'Department Admin' && user.department_id && permit.department.toString() === user.department_id);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to modify this permit.' });
    }

    const updateData: any = {};

    if (status) {
      if (!isPrivileged && status !== 'Submitted' && status !== 'Draft') {
        return res.status(403).json({ error: 'Only administrators or nodal officers can change permit approval statuses.' });
      }
      updateData.status = status;
    }

    // If it's a draft, allow changing details
    if (permit.status === 'Draft' || isPrivileged) {
      if (roadName) updateData.roadName = roadName;
      if (purpose) updateData.purpose = purpose;
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (depth) updateData.depth = depth;
      if (restorationPlan) updateData.restorationPlan = restorationPlan;
      if (attachments) updateData.attachments = attachments;

      if (geometry && geometry.coordinates) {
        updateData.geometry = geometry;
        const [lon, lat] = calculateCentroid(geometry.type, geometry.coordinates);
        updateData.latitude = lat;
        updateData.longitude = lon;
        updateData.centroid = {
          type: 'Point',
          coordinates: [lon, lat],
        };

        // Recalculate ward
        const matchedWard = await BhopalWard.findOne({
          geometry: {
            $geoIntersects: {
              $geometry: {
                type: 'Point',
                coordinates: [lon, lat],
              },
            },
          },
        });
        if (matchedWard) updateData.ward = matchedWard.name;
      }
    }

    const updatedPermit = await Permit.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('department')
      .populate('createdBy', 'firstName lastName email');

    // Run conflict detection if it's now Submitted, Approved, or Under Review
    if (updatedPermit && updatedPermit.status !== 'Draft' && updatedPermit.status !== 'Rejected') {
      await evaluateConflicts(updatedPermit._id.toString());
    }

    // Refresh model data after conflict evaluation
    const finalPermit = await Permit.findById(req.params.id)
      .populate('department')
      .populate('createdBy', 'firstName lastName email');

    // Socket.IO Broadcast
    const io = req.app.get('socketio');
    if (io && finalPermit) {
      io.to('permits').emit('permit_updated', finalPermit);
      io.to(`dept_${(finalPermit.department as any)._id}`).emit('permit_updated', finalPermit);
    }

    return res.status(200).json(finalPermit);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Schedule Joint Coordination Meeting
router.post('/:id/meetings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Nodal Officer' && user.role !== 'Department Admin')) {
      return res.status(403).json({ error: 'Only administrative users can schedule coordination meetings.' });
    }

    const { meetingDate, notes, participants } = req.body;
    if (!meetingDate || !notes) {
      return res.status(400).json({ error: 'Meeting date and notes are required.' });
    }

    const permit = await Permit.findById(req.params.id);
    if (!permit) {
      return res.status(404).json({ error: 'Permit not found.' });
    }

    const newMeeting = await CoordinationMeeting.create({
      permitId: permit._id,
      meetingDate: new Date(meetingDate),
      notes,
      participants: participants || [],
    });

    return res.status(201).json(newMeeting);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. List Meetings for Permit
router.get('/:id/meetings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const meetings = await CoordinationMeeting.find({ permitId: req.params.id }).sort({ meetingDate: 1 });
    return res.status(200).json(meetings);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
