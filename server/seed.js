require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Department = require('./models/Department');
const Issue = require('./models/Issue');

const DEPARTMENTS = [
  { name: 'PWD', description: 'Public Works Department' },
  { name: 'BMC', description: 'Bhopal Municipal Corporation' },
  { name: 'Traffic', description: 'Traffic Police' },
  { name: 'Pollution Board', description: 'MP Pollution Control Board' },
  { name: 'Electricity', description: 'MP Madhya Kshetra Vidyut Vitaran' },
  { name: 'Water', description: 'Water Supply Department' }
];

const SEED_DATA = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sahayog-bhopal');
    console.log('MongoDB Connected');

    await User.deleteMany({});
    await Department.deleteMany({});
    await Issue.deleteMany({});

    // Create Departments
    const createdDepts = await Department.insertMany(DEPARTMENTS);
    const getDept = (name) => createdDepts.find(d => d.name === name)._id;

    // Create Users
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);

    const admin = await User.create({
      email: 'admin@bhopal.gov.in',
      password: hash, // Hashed manually since insertMany skips pre-save hooks
      fullName: 'Bhopal Super Admin',
      role: 'super_admin'
    });

    const citizen = await User.create({
      email: 'citizen@example.com',
      password: hash,
      fullName: 'Ramesh Kumar',
      role: 'citizen'
    });

    const pwdOfficial = await User.create({
      email: 'officer@pwd.bhopal.gov.in',
      password: hash,
      fullName: 'Suresh PWD',
      role: 'officer',
      department: getDept('PWD')
    });

    // Create Issues (Geo points around Bhopal)
    // Bhopal approx center: 23.2599, 77.4126
    const issues = [
      {
        title: 'Huge Pothole on Kolar Road',
        description: 'Dangerous pothole near the main junction causing traffic slow down.',
        category: 'pothole',
        urgencyScore: 8,
        status: 'open',
        location: { type: 'Point', coordinates: [77.4260, 23.1720] }, // Lng, Lat
        area: 'Kolar Road',
        primaryDepartment: getDept('PWD'),
        reporterId: citizen._id,
        aiSummary: 'Dangerous pothole on Kolar Road causing traffic issues.'
      },
      {
        title: 'Water pipe burst flooding street',
        description: 'Clean drinking water is being wasted and flooding the road.',
        category: 'waterlogging',
        urgencyScore: 9,
        status: 'assigned',
        location: { type: 'Point', coordinates: [77.4340, 23.2330] }, // MP Nagar
        area: 'MP Nagar',
        primaryDepartment: getDept('Water'),
        linkedDepartments: [getDept('Traffic')],
        reporterId: citizen._id,
        aiSummary: 'Water pipe burst in MP Nagar causing flooding.'
      },
      {
        title: 'Garbage dump burning',
        description: 'Someone set fire to the garbage, causing severe smoke.',
        category: 'pollution',
        urgencyScore: 7,
        status: 'in_progress',
        location: { type: 'Point', coordinates: [77.4020, 23.2612] }, // Old City
        area: 'Old City',
        primaryDepartment: getDept('BMC'),
        linkedDepartments: [getDept('Pollution Board')],
        reporterId: citizen._id,
        aiSummary: 'Garbage burning in Old City causing toxic smoke.'
      }
    ];

    for (let issue of issues) {
      const newIssue = await Issue.create(issue);
      newIssue.clusterId = newIssue._id.toString();
      await newIssue.save();
    }

    console.log('Database Seeded Successfully');
    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

SEED_DATA();
