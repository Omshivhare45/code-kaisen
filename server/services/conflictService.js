import Permit from '../models/Permit.js';
import Notification from '../models/Notification.js';
import Department from '../models/Department.js';
import { getIO } from '../sockets/socketHandler.js';

/**
 * Detects conflicts for a given permit request
 * Checks:
 * 1. Proximity: Within radius of coordinates (GeoJSON 2dsphere $near)
 * 2. Time overlap: Overlapping schedules
 * 3. Recently completed works: Digging on the same segment within a 60-day window after completion
 */
export const detectConflicts = async (permitId) => {
  try {
    const permit = await Permit.findById(permitId).populate('department');
    if (!permit) return;

    const { longitude, latitude, radius, startDate, endDate, roadName } = permit;

    // 1. Find overlapping/nearby permits (using spherical radius in meters)
    // $near requires a 2dsphere index
    const nearbyPermits = await Permit.find({
      _id: { $ne: permit._id },
      status: { $in: ['Approved', 'Active', 'Conflict'] },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radius || 100, // Distance in meters
        },
      },
    }).populate('department');

    // Filter by overlapping dates
    const conflictingPermits = nearbyPermits.filter((other) => {
      const start1 = new Date(startDate);
      const end1 = new Date(endDate);
      const start2 = new Date(other.startDate);
      const end2 = new Date(other.endDate);

      // Check if dates overlap: (StartA <= EndB) and (EndA >= StartB)
      return start1 <= end2 && end1 >= start2;
    });

    // 2. Check recently completed works (same road/vicinity completed in last 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentlyCompleted = await Permit.find({
      _id: { $ne: permit._id },
      status: 'Completed',
      endDate: { $gte: sixtyDaysAgo },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radius || 100,
        },
      },
    }).populate('department');

    const allConflicts = [...conflictingPermits, ...recentlyCompleted];

    if (allConflicts.length > 0) {
      // Set permit status to Conflict
      permit.status = 'Conflict';
      permit.conflictingPermits = allConflicts.map(p => p._id);
      permit.isJointExcavationSuggested = true;
      await permit.save();

      // Send Socket.io notifications & create Notification documents
      const io = getIO();

      for (const conflict of allConflicts) {
        const otherDept = conflict.department;
        const currentDept = permit.department;

        // Title and message
        const title = 'Excavation Conflict Detected!';
        const message = `A conflict has been detected on ${roadName} between your permit request and a project by ${otherDept.name}. A joint excavation has been suggested.`;

        // Save notification for current department
        const notif1 = await Notification.create({
          recipientDepartment: currentDept._id,
          title,
          message,
          type: 'Conflict',
          metadata: {
            permitId: permit._id,
            conflictPermitId: conflict._id,
          },
        });

        // Save notification for conflicting department
        const notif2 = await Notification.create({
          recipientDepartment: otherDept._id,
          title: `Conflict Alert: ${currentDept.name}`,
          message: `The department ${currentDept.name} has submitted a permit request overlapping with your project on ${roadName}. Joint excavation suggested.`,
          type: 'Conflict',
          metadata: {
            permitId: conflict._id,
            conflictPermitId: permit._id,
          },
        });

        // Socket.io alerts
        if (io) {
          // Emit to specific department rooms
          io.to(`dept_${currentDept._id.toString()}`).emit('notification', notif1);
          io.to(`dept_${otherDept._id.toString()}`).emit('notification', notif2);
          
          // Broadcast general conflict alerts to admin and monitoring dashboards
          io.emit('conflict_alert', {
            permit,
            conflict,
            message: `Conflict detected on ${roadName} between ${currentDept.name} and ${otherDept.name}`,
          });
        }
      }
    }

    return permit;
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    throw error;
  }
};
