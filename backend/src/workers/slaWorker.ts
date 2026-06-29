import { Complaint } from '../models/Complaint';
import { ComplaintHistory } from '../models/ComplaintHistory';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import app from '../app';

async function checkSlaBreaches() {
  try {
    const now = new Date();

    // Find active complaints that have breached their SLA deadline and are not yet escalated
    const breachedComplaints: any[] = await Complaint.find({
      status: { $nin: ['Resolved', 'Closed'] },
      slaDeadline: { $lt: now },
      isEscalated: false,
    });

    if (breachedComplaints.length === 0) return;

    console.log(`[SLA Worker] Found ${breachedComplaints.length} new SLA breaches. Escalating...`);

    for (const complaint of breachedComplaints) {
      complaint.isEscalated = true;
      await complaint.save();

      // Log in history
      await ComplaintHistory.create({
        complaintId: complaint._id,
        fromStatus: complaint.status,
        toStatus: complaint.status,
        notes: `SLA deadline breached on ${complaint.slaDeadline.toDateString()}. System automatically escalated this ticket.`,
        changedBy: null,
      });

      // Find users to notify:
      // 1. Super Admins and Nodal Officers
      // 2. Department Admins of the assigned department
      const notifyRoles = ['Super Admin', 'Nodal Officer'];
      const queryFilters: any[] = [{ role: { $in: notifyRoles } }];

      if (complaint.assignedDepartment) {
        queryFilters.push({
          role: 'Department Admin',
          department: complaint.assignedDepartment,
        });
      }

      const usersToNotify = await User.find({
        $or: queryFilters,
        status: 'active',
      });

      // Create Notifications
      const notificationPromises = usersToNotify.map((user) =>
        Notification.create({
          userId: user._id,
          title: `SLA Breach: Ticket ${complaint.ticketNumber}`,
          message: `Complaint regarding "${complaint.roadName}" (${complaint.complaintType}) has exceeded its SLA deadline of ${complaint.slaDeadline.toDateString()}. Urgent attention required.`,
          channel: 'in-app',
        })
      );

      // Create a global notification broadcast if no department is assigned
      if (!complaint.assignedDepartment) {
        notificationPromises.push(
          Notification.create({
            userId: null, // Broadcast
            title: `SLA Breach: Ticket ${complaint.ticketNumber}`,
            message: `Unassigned complaint regarding "${complaint.roadName}" (${complaint.complaintType}) has breached its SLA deadline.`,
            channel: 'in-app',
          })
        );
      }

      await Promise.all(notificationPromises);

      // Populate department for frontend broadcast
      const populatedComplaint = await Complaint.findById(complaint._id).populate('assignedDepartment');

      // Broadcast to Socket.IO
      const io = app.get('socketio');
      if (io && populatedComplaint) {
        io.to('complaints').emit('complaint_updated', populatedComplaint);
        if (populatedComplaint.assignedDepartment) {
          io.to(`dept_${(populatedComplaint.assignedDepartment as any)._id}`).emit('complaint_updated', populatedComplaint);
        }
        // Send a direct notification alert to the notified users
        usersToNotify.forEach((user) => {
          io.to(`user_${user._id}`).emit('notification_received', {
            title: `SLA Breach: Ticket ${complaint.ticketNumber}`,
            message: `Ticket escalated.`,
          });
        });
      }
    }
  } catch (error) {
    console.error('[SLA Worker] Error checking SLA breaches:', error);
  }
}

// Run immediately on boot, and then check every 60 seconds
setTimeout(() => {
  checkSlaBreaches();
  setInterval(checkSlaBreaches, 60 * 1000);
  console.log('[SLA Worker] Periodic SLA breach detector started.');
}, 5000); // 5s delay to ensure DB and SocketIO are initialized
