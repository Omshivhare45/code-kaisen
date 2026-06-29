import { Permit } from '../models/Permit';
import { Conflict } from '../models/Conflict';
import { BhopalRoad } from '../models/BhopalRoad';
import { BhopalWard } from '../models/BhopalWard';

export function calculateCentroid(type: string, coordinates: any): [number, number] {
  let lons: number[] = [];
  let lats: number[] = [];

  if (type === 'LineString') {
    lons = coordinates.map((c: any) => c[0]);
    lats = coordinates.map((c: any) => c[1]);
  } else if (type === 'Polygon') {
    const outerRing = coordinates[0] || [];
    lons = outerRing.map((c: any) => c[0]);
    lats = outerRing.map((c: any) => c[1]);
  } else if (type === 'Point') {
    return [coordinates[0], coordinates[1]];
  }

  if (lons.length === 0 || lats.length === 0) {
    return [77.4126, 23.2599];
  }

  const avgLon = lons.reduce((sum, val) => sum + val, 0) / lons.length;
  const avgLat = lats.reduce((sum, val) => sum + val, 0) / lats.length;
  return [avgLon, avgLat];
}

export async function evaluateConflicts(permitId: string): Promise<number> {
  const permit: any = await Permit.findById(permitId).populate('department');
  if (!permit) return 0;

  // Clear existing conflicts for this permit
  await Conflict.deleteMany({ permitId });

  const conflictRecords: any[] = [];
  let conflictScore = 0;

  // Only check conflicts if the status is not 'Draft' or 'Rejected'
  if (permit.status === 'Draft' || permit.status === 'Rejected') {
    await Permit.findByIdAndUpdate(permitId, { conflictScore: 0, riskLevel: 'Low', recommendations: 'Draft permit. Submit to calculate conflicts.' });
    return 0;
  }

  const permitDeptName = permit.department?.name || 'Unknown Department';

  // 1. Check Spatial and Schedule Conflicts with other Active/Submitted/Approved permits
  const potentialConflicts: any[] = await Permit.find({
    _id: { $ne: permit._id },
    status: { $in: ['Submitted', 'Under Review', 'Approved'] },
    geometry: {
      $geoIntersects: {
        $geometry: permit.geometry,
      },
    },
  }).populate('department');

  for (const other of potentialConflicts) {
    const otherDeptName = other.department?.name || 'Unknown Department';
    
    // Check schedule overlap
    const scheduleOverlap = permit.startDate <= other.endDate && permit.endDate >= other.startDate;

    if (scheduleOverlap) {
      conflictScore += 50;
      conflictRecords.push({
        permitId: permit._id,
        conflictingPermitId: other._id,
        conflictType: 'Schedule Overlap',
        description: `Schedule overlap detected with permit ${other.permitNumber} (${otherDeptName}) on ${other.roadName} between ${other.startDate.toDateString()} and ${other.endDate.toDateString()}.`,
      });
    } else {
      conflictScore += 10;
      conflictRecords.push({
        permitId: permit._id,
        conflictingPermitId: other._id,
        conflictType: 'Spatial Proximity',
        description: `Spatial proximity detected with permit ${other.permitNumber} (${otherDeptName}) on ${other.roadName}. Different schedules, but potential disruption to the same area.`,
      });
    }

    // Check if it's an upcoming project (other starts in the future after this one ends, but within 6 months)
    const upcomingGap = other.startDate.getTime() - permit.endDate.getTime();
    const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;
    if (upcomingGap > 0 && upcomingGap <= sixMonthsMs) {
      conflictScore += 20;
      conflictRecords.push({
        permitId: permit._id,
        conflictingPermitId: other._id,
        conflictType: 'Upcoming Project',
        description: `Upcoming project conflict: Permit ${other.permitNumber} (${otherDeptName}) is scheduled to start on ${other.startDate.toDateString()} shortly after this digging ends.`,
      });
    }
  }

  // 2. Check Conflicts with Recently Resurfaced Roads
  const intersectingRoads: any[] = await BhopalRoad.find({
    geometry: {
      $geoIntersects: {
        $geometry: permit.geometry,
      },
    },
  });

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  for (const road of intersectingRoads) {
    if (road.lastResurfacedAt && road.lastResurfacedAt > twelveMonthsAgo) {
      conflictScore += 30;
      conflictRecords.push({
        permitId: permit._id,
        conflictingPermitId: null,
        conflictType: 'Recently Resurfaced Road',
        description: `Digging proposed on recently resurfaced road: "${road.name}". This road was resurfaced on ${road.lastResurfacedAt.toDateString()} (within 12 months restriction).`,
      });
    }
  }

  // Save detected conflicts
  if (conflictRecords.length > 0) {
    await Conflict.insertMany(conflictRecords);
  }

  // Calculate risk level
  let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
  if (conflictScore >= 50) {
    riskLevel = 'High';
  } else if (conflictScore >= 20) {
    riskLevel = 'Medium';
  }

  // Generate recommendations
  let recommendations = 'No critical conflicts detected. Approved for coordination.';
  if (riskLevel === 'High') {
    recommendations = 'CRITICAL CONFLICTS: Rescheduling recommended. Coordinate joint digging timeline with conflicting departments to minimize public inconvenience and avoid duplicate excavation.';
  } else if (riskLevel === 'Medium') {
    recommendations = 'MEDIUM CONFLICTS: Restrict digging depth, ensure speedier restoration, or adjust schedule by a few weeks. Coordinate on-site traffic plans.';
  }

  // Update permit in DB
  await Permit.findByIdAndUpdate(permitId, {
    conflictScore,
    riskLevel,
    recommendations,
  });

  return conflictScore;
}
