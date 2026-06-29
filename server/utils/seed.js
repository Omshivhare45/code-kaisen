import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Permit from '../models/Permit.js';
import Complaint from '../models/Complaint.js';
import Notification from '../models/Notification.js';
import Road from '../models/Road.js';
import ActivityLog from '../models/ActivityLog.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/setu');
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Department.deleteMany();
    await Permit.deleteMany();
    await Complaint.deleteMany();
    await Notification.deleteMany();
    await Road.deleteMany();
    await ActivityLog.deleteMany();

    console.log('Database cleared.');

    // 1. Seed Departments
    const depts = [
      {
        name: 'Public Works Department',
        code: 'PWD',
        description: 'Responsible for road construction, repair, and overall infrastructure.',
        color: '#f43f5e', // Rose
        headOfDepartment: 'Shri R. K. Sharma',
        phone: '011-23456781',
        email: 'pwd@setu.gov.in',
      },
      {
        name: 'Electricity Board',
        code: 'ELEC',
        description: 'Manages electric cabling, power distribution grid, and sub-stations.',
        color: '#eab308', // Yellow
        headOfDepartment: 'Smt. Anjali Gupta',
        phone: '011-23456782',
        email: 'elec@setu.gov.in',
      },
      {
        name: 'Water Supply Board',
        code: 'WATER',
        description: 'Maintains main pipelines, potable water supply networks, and pumping plants.',
        color: '#06b6d4', // Cyan
        headOfDepartment: 'Shri Manoj Mishra',
        phone: '011-23456783',
        email: 'water@setu.gov.in',
      },
      {
        name: 'Telecommunications Division',
        code: 'TELE',
        description: 'Laying fiber optic cables and establishing communication nodes.',
        color: '#a855f7', // Purple
        headOfDepartment: 'Dr. Vivek Dev',
        phone: '011-23456784',
        email: 'tele@setu.gov.in',
      },
    ];

    const createdDepts = await Department.create(depts);
    console.log(`${createdDepts.length} departments seeded.`);

    const deptMap = {};
    createdDepts.forEach((d) => {
      deptMap[d.code] = d._id;
    });

    // 2. Seed Users
    const users = [
      {
        name: 'Nodal Officer (Admin)',
        email: 'admin@setu.gov.in',
        password: 'admin123',
        role: 'Super Admin',
        phone: '9999999999',
      },
      {
        name: 'PWD Officer',
        email: 'pwd@setu.gov.in',
        password: 'pwd123',
        role: 'Department Officer',
        department: deptMap['PWD'],
        phone: '9888888881',
      },
      {
        name: 'Electricity Officer',
        email: 'elec@setu.gov.in',
        password: 'elec123',
        role: 'Department Officer',
        department: deptMap['ELEC'],
        phone: '9888888882',
      },
      {
        name: 'Water Supply Officer',
        email: 'water@setu.gov.in',
        password: 'water123',
        role: 'Department Officer',
        department: deptMap['WATER'],
        phone: '9888888883',
      },
      {
        name: 'Telecom Officer',
        email: 'tele@setu.gov.in',
        password: 'tele123',
        role: 'Department Officer',
        department: deptMap['TELE'],
        phone: '9888888884',
      },
      {
        name: 'Tarun Citizen',
        email: 'citizen@gmail.com',
        password: 'citizen123',
        role: 'Citizen',
        phone: '9777777777',
        ward: 'Ward 45 (MP Nagar)',
      },
    ];

    // Password encryption is handled by User pre-save hook
    const createdUsers = [];
    for (const u of users) {
      const newUser = await User.create(u);
      createdUsers.push(newUser);
    }
    console.log(`${createdUsers.length} users seeded.`);

    const citizenUser = createdUsers.find((user) => user.role === 'Citizen');

    // 3. Seed Roads (GIS LineString geometry in Delhi region: 28.6139, 77.2090)
    // We represent coordinates as [longitude, latitude]
    const roads = [
      {
        name: 'Link Road No. 1',
        ward: 'Ward 45 (MP Nagar)',
        status: 'Closed',
        closureReason: 'Telecom fiber laying project in progress.',
        geometry: {
          type: 'LineString',
          coordinates: [
            [77.4000, 23.2500],
            [77.4050, 23.2520],
            [77.4100, 23.2550],
          ],
        },
      },
      {
        name: 'Hoshangabad Road',
        ward: 'Ward 52 (Habibganj)',
        status: 'Open',
        geometry: {
          type: 'LineString',
          coordinates: [
            [77.4200, 23.2300],
            [77.4250, 23.2320],
            [77.4300, 23.2350],
          ],
        },
      },
      {
        name: 'Kolar Road Expressway',
        ward: 'Ward 80 (Kolar)',
        status: 'Open',
        geometry: {
          type: 'LineString',
          coordinates: [
            [77.3900, 23.1800],
            [77.3950, 23.1820],
            [77.4000, 23.1850],
          ],
        },
      },
    ];

    const createdRoads = await Road.create(roads);
    console.log(`${createdRoads.length} roads seeded.`);

    // 4. Seed Permits
    const permits = [
      {
        department: deptMap['TELE'],
        roadName: 'Link Road No. 1',
        ward: 'Ward 45 (MP Nagar)',
        latitude: 23.2520,
        longitude: 77.4050,
        location: {
          type: 'Point',
          coordinates: [77.4050, 23.2520],
        },
        radius: 100,
        purpose: 'Laying ultra high-speed fiber cables for Smart City infrastructure.',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        depth: 1.5,
        restorationPlan: 'Refilling with crushed stone, followed by hot asphalt re-metalling.',
        status: 'Active',
        applicantName: 'Telecom Officer',
        applicantPhone: '9888888884',
      },
      // Conflicting permits at the exact same location and overlapping dates
      {
        department: deptMap['WATER'],
        roadName: 'Link Road No. 1',
        ward: 'Ward 45 (MP Nagar)',
        latitude: 23.2525,
        longitude: 77.4055,
        location: {
          type: 'Point',
          coordinates: [77.4055, 23.2525],
        },
        radius: 100,
        purpose: 'Repairing main water mains that leak under Ring Road.',
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        depth: 2.5,
        restorationPlan: 'Soil compaction, structural concrete base, and tarmac top layer.',
        status: 'Conflict',
        isJointExcavationSuggested: true,
        applicantName: 'Water Supply Officer',
        applicantPhone: '9888888883',
      },
      {
        department: deptMap['PWD'],
        roadName: 'Hoshangabad Road',
        ward: 'Ward 52 (Habibganj)',
        latitude: 23.2320,
        longitude: 77.4250,
        location: {
          type: 'Point',
          coordinates: [77.4250, 23.2320],
        },
        radius: 50,
        purpose: 'Constructing reinforced flyover support base.',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // future
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        depth: 4.0,
        restorationPlan: 'Comprehensive cement-concrete road restoration.',
        status: 'Pending',
        applicantName: 'PWD Officer',
        applicantPhone: '9888888881',
      },
      {
        department: deptMap['ELEC'],
        roadName: 'Kolar Road Expressway',
        ward: 'Ward 80 (Kolar)',
        latitude: 23.1820,
        longitude: 77.3950,
        location: {
          type: 'Point',
          coordinates: [77.3950, 23.1820],
        },
        radius: 50,
        purpose: 'Laying underground high tension power cable grid line.',
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // finished in past
        depth: 1.8,
        restorationPlan: 'Trench backfill with sand, standard paving tiles restoration.',
        status: 'Completed',
        applicantName: 'Electricity Officer',
        applicantPhone: '9888888882',
      },
    ];

    const createdPermits = await Permit.create(permits);
    console.log(`${createdPermits.length} permits seeded.`);

    // Map conflicts
    createdPermits[1].conflictingPermits = [createdPermits[0]._id];
    await createdPermits[1].save();

    // Link Road ClosedByPermit
    await Road.findOneAndUpdate({ name: 'Link Road No. 1' }, { closedByPermit: createdPermits[0]._id });

    // 5. Seed Complaints
    const complaints = [
      {
        citizen: citizenUser._id,
        photoUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800',
        description: 'Unauthorized trench digging left unattended in front of residential apartments, causing massive traffic hazard.',
        latitude: 23.2510,
        longitude: 77.4010,
        location: {
          type: 'Point',
          coordinates: [77.4010, 23.2510],
        },
        ward: 'Ward 45 (MP Nagar)',
        complaintType: 'Unauthorized Digging',
        department: deptMap['PWD'],
        priority: 'High',
        status: 'In Progress',
        statusTimeline: [
          {
            status: 'Received',
            remarks: 'Complaint registered by Citizen.',
            updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
          {
            status: 'Assigned',
            remarks: 'Auto-assigned to Public Works Department for investigation.',
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            status: 'In Progress',
            remarks: 'Site inspection completed. Excavation contractor notified to show authorization permit.',
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      {
        citizen: citizenUser._id,
        photoUrl: 'https://images.unsplash.com/photo-1599740831146-80e6f755c553?auto=format&fit=crop&q=80&w=800',
        description: 'Large leakage in drinking water main pipe. Gushing water flooded the local roadway, eroding road foundation.',
        latitude: 23.2310,
        longitude: 77.4220,
        location: {
          type: 'Point',
          coordinates: [77.4220, 23.2310],
        },
        ward: 'Ward 52 (Habibganj)',
        complaintType: 'Water Leakage',
        department: deptMap['WATER'],
        priority: 'High',
        status: 'Resolved',
        statusTimeline: [
          {
            status: 'Received',
            remarks: 'Complaint registered by Citizen.',
            updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
          {
            status: 'Assigned',
            remarks: 'Assigned to Water Supply Board.',
            updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
          },
          {
            status: 'In Progress',
            remarks: 'Trench excavated to reach pipeline. Valve replaced.',
            updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          },
          {
            status: 'Resolved',
            remarks: 'Main pipeline leak sealed. Road restored to original shape.',
            updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        ],
        rating: {
          score: 5,
          comment: 'Very rapid response! Leak was sealed within days and road paved back.',
        },
      },
    ];

    const createdComplaints = await Complaint.create(complaints);
    console.log(`${createdComplaints.length} complaints seeded.`);

    // 6. Seed Notifications
    const notifications = [
      {
        recipientDepartment: deptMap['TELE'],
        title: 'Conflict Alert',
        message: 'Conflict alert triggered with Water Supply Board on Link Road No. 1.',
        type: 'Conflict',
        metadata: { permitId: createdPermits[0]._id },
      },
      {
        recipientDepartment: deptMap['WATER'],
        title: 'Conflict Alert',
        message: 'Conflict alert triggered with Telecommunications Division on Link Road No. 1.',
        type: 'Conflict',
        metadata: { permitId: createdPermits[1]._id },
      },
      {
        recipient: citizenUser._id,
        title: 'Water Leakage Resolved',
        message: 'Your complaint regarding the water pipe leakage on Rajouri road was marked as Resolved. Please leave your rating feedback!',
        type: 'Complaint',
        metadata: { complaintId: createdComplaints[1]._id },
        read: false,
      },
    ];

    await Notification.create(notifications);
    console.log('Sample Notifications seeded.');

    // 7. Seed Activity Logs
    const logs = [
      {
        action: 'SYSTEM_SEED',
        details: 'Initial system database setup and master records seed.',
      },
    ];
    await ActivityLog.create(logs);

    console.log('Database Seeding Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
