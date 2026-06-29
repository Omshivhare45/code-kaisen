import Complaint from '../models/Complaint.js';
import Permit from '../models/Permit.js';
import Department from '../models/Department.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get dashboard analytics metrics
// @route   GET /api/analytics
// @access  Private (Department Officer / Super Admin)
export const getAnalytics = asyncHandler(async (req, res, next) => {
  // 1. General Permits Stats
  const permitStats = await Permit.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const formattedPermits = {
    Pending: 0,
    Approved: 0,
    Active: 0,
    Completed: 0,
    Conflict: 0,
    Rejected: 0,
  };
  permitStats.forEach((stat) => {
    if (formattedPermits[stat._id] !== undefined) {
      formattedPermits[stat._id] = stat.count;
    }
  });

  // 2. Complaints by Ward
  const complaintsByWard = await Complaint.aggregate([
    {
      $group: {
        _id: '$ward',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // 3. Department Performance (Complaints Assigned vs Resolved)
  const departments = await Department.find();
  const deptPerformance = [];

  for (const dept of departments) {
    const totalComplaints = await Complaint.countDocuments({ department: dept._id });
    const resolvedComplaints = await Complaint.countDocuments({ department: dept._id, status: 'Resolved' });
    const totalPermits = await Permit.countDocuments({ department: dept._id });
    const conflictPermits = await Permit.countDocuments({ department: dept._id, status: 'Conflict' });

    deptPerformance.push({
      department: dept.code,
      name: dept.name,
      color: dept.color,
      complaints: totalComplaints,
      resolved: resolvedComplaints,
      permits: totalPermits,
      conflicts: conflictPermits,
    });
  }

  // 4. Average Resolution Time (in hours)
  // For complaints that are "Resolved", compute average duration from createdAt to resolutionDate (last step in statusTimeline)
  const resolvedList = await Complaint.find({ status: 'Resolved' });
  let avgResolutionTimeHours = 0;

  if (resolvedList.length > 0) {
    let totalMs = 0;
    resolvedList.forEach((complaint) => {
      const resolvedStep = complaint.statusTimeline.find(step => step.status === 'Resolved');
      if (resolvedStep) {
        totalMs += (new Date(resolvedStep.updatedAt) - new Date(complaint.createdAt));
      }
    });
    avgResolutionTimeHours = Math.round((totalMs / resolvedList.length) / (1000 * 60 * 60)); // convert to hours
  }

  // 5. Conflict Statistics
  const totalConflicts = await Permit.countDocuments({ status: 'Conflict' });
  const jointExcavationsAgreed = await Permit.countDocuments({ 
    status: 'Conflict', 
    'jointExcavationAgreedBy.0': { $exists: true } 
  });

  res.status(200).json({
    success: true,
    data: {
      permits: formattedPermits,
      complaintsByWard,
      departmentPerformance: deptPerformance,
      averageResolutionHours: avgResolutionTimeHours,
      conflicts: {
        total: totalConflicts,
        jointAgreed: jointExcavationsAgreed,
      },
    },
  });
});
