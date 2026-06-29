import { Router, Response } from 'express';
import { Permit } from '../models/Permit';
import { Complaint } from '../models/Complaint';
import { Conflict } from '../models/Conflict';
import { BhopalWard } from '../models/BhopalWard';
import { BhopalRoad } from '../models/BhopalRoad';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// 1. Get Aggregated Summary Statistics
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    // Scoping query if department-bound
    const permitFilter: any = {};
    const complaintFilter: any = {};

    if (user.role === 'Department Admin' || user.role === 'Department Engineer') {
      if (user.department_id) {
        permitFilter.department = user.department_id;
        complaintFilter.assignedDepartment = user.department_id;
      }
    }

    // 1. Permits Count
    const totalPermits = await Permit.countDocuments(permitFilter);
    const draftPermits = await Permit.countDocuments({ ...permitFilter, status: 'Draft' });
    const submittedPermits = await Permit.countDocuments({ ...permitFilter, status: 'Submitted' });
    const reviewPermits = await Permit.countDocuments({ ...permitFilter, status: 'Under Review' });
    const approvedPermits = await Permit.countDocuments({ ...permitFilter, status: 'Approved' });
    const completedPermits = await Permit.countDocuments({ ...permitFilter, status: 'Completed' });
    const rejectedPermits = await Permit.countDocuments({ ...permitFilter, status: 'Rejected' });

    // 2. Complaints Count
    const totalComplaints = await Complaint.countDocuments(complaintFilter);
    const receivedComplaints = await Complaint.countDocuments({ ...complaintFilter, status: 'Received' });
    const assignedComplaints = await Complaint.countDocuments({ ...complaintFilter, status: 'Assigned' });
    const progressComplaints = await Complaint.countDocuments({ ...complaintFilter, status: 'In Progress' });
    const resolvedComplaints = await Complaint.countDocuments({ ...complaintFilter, status: 'Resolved' });
    const closedComplaints = await Complaint.countDocuments({ ...complaintFilter, status: 'Closed' });

    // SLA Breaches
    const now = new Date();
    const activeBreachedComplaints = await Complaint.countDocuments({
      ...complaintFilter,
      status: { $nin: ['Resolved', 'Closed'] },
      slaDeadline: { $lt: now },
    });

    const totalBreachedComplaints = await Complaint.countDocuments({
      ...complaintFilter,
      isEscalated: true,
    });

    // 3. Conflicts Count (Only for Super Admin/Nodal/Department Admins)
    let totalConflicts = 0;
    let highRiskConflicts = 0;
    let mediumRiskConflicts = 0;

    if (user.department_id && (user.role === 'Department Admin' || user.role === 'Department Engineer')) {
      // Find permits belonging to this department
      const deptPermitIds = await Permit.find({ department: user.department_id }).select('_id');
      totalConflicts = await Conflict.countDocuments({ permitId: { $in: deptPermitIds } });
      
      const conflictPermits = await Permit.find({ department: user.department_id, conflictScore: { $gt: 0 } });
      highRiskConflicts = conflictPermits.filter(p => p.riskLevel === 'High').length;
      mediumRiskConflicts = conflictPermits.filter(p => p.riskLevel === 'Medium').length;
    } else {
      totalConflicts = await Conflict.countDocuments();
      highRiskConflicts = await Permit.countDocuments({ conflictScore: { $gt: 0 }, riskLevel: 'High', status: { $nin: ['Draft', 'Rejected'] } });
      mediumRiskConflicts = await Permit.countDocuments({ conflictScore: { $gt: 0 }, riskLevel: 'Medium', status: { $nin: ['Draft', 'Rejected'] } });
    }

    return res.status(200).json({
      permits: {
        total: totalPermits,
        draft: draftPermits,
        submitted: submittedPermits,
        underReview: reviewPermits,
        approved: approvedPermits,
        completed: completedPermits,
        rejected: rejectedPermits,
      },
      complaints: {
        total: totalComplaints,
        received: receivedComplaints,
        assigned: assignedComplaints,
        inProgress: progressComplaints,
        resolved: resolvedComplaints,
        closed: closedComplaints,
        activeBreached: activeBreachedComplaints,
        totalBreached: totalBreachedComplaints,
      },
      conflicts: {
        total: totalConflicts,
        highRisk: highRiskConflicts,
        mediumRisk: mediumRiskConflicts,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get All Spatial Layers in GeoJSON Format
router.get('/gis', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Fetch Wards
    const wards = await BhopalWard.find();
    const wardFeatures = wards.map(ward => ({
      type: 'Feature',
      id: ward._id,
      geometry: ward.geometry,
      properties: {
        name: ward.name,
        layerType: 'Ward',
      },
    }));

    // 2. Fetch Roads
    const roads = await BhopalRoad.find();
    const roadFeatures = roads.map(road => ({
      type: 'Feature',
      id: road._id,
      geometry: road.geometry,
      properties: {
        name: road.name,
        roadType: road.roadType,
        lastResurfacedAt: road.lastResurfacedAt,
        layerType: 'Road',
      },
    }));

    // 3. Fetch Permits
    const permits = await Permit.find().populate('department');
    const permitFeatures = permits.map(permit => ({
      type: 'Feature',
      id: permit._id,
      geometry: permit.geometry,
      properties: {
        permitNumber: permit.permitNumber,
        roadName: permit.roadName,
        ward: permit.ward,
        purpose: permit.purpose,
        status: permit.status,
        conflictScore: permit.conflictScore,
        riskLevel: permit.riskLevel,
        startDate: permit.startDate,
        endDate: permit.endDate,
        depth: permit.depth,
        departmentName: (permit.department as any)?.name,
        departmentColor: (permit.department as any)?.color || '#3B82F6',
        layerType: 'Permit',
      },
    }));

    // 4. Fetch Complaints
    const complaints = await Complaint.find().populate('assignedDepartment');
    const complaintFeatures = complaints.map(complaint => ({
      type: 'Feature',
      id: complaint._id,
      geometry: complaint.geometry,
      properties: {
        ticketNumber: complaint.ticketNumber,
        complaintType: complaint.complaintType,
        description: complaint.description,
        roadName: complaint.roadName,
        status: complaint.status,
        photoUrl: complaint.photoUrl,
        slaDeadline: complaint.slaDeadline,
        isEscalated: complaint.isEscalated,
        departmentName: (complaint.assignedDepartment as any)?.name,
        layerType: 'Complaint',
      },
    }));

    return res.status(200).json({
      wards: {
        type: 'FeatureCollection',
        features: wardFeatures,
      },
      roads: {
        type: 'FeatureCollection',
        features: roadFeatures,
      },
      permits: {
        type: 'FeatureCollection',
        features: permitFeatures,
      },
      complaints: {
        type: 'FeatureCollection',
        features: complaintFeatures,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
