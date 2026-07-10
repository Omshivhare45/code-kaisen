const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Department = require('./models/Department');
const Issue = require('./models/Issue');
const DeptWork = require('./models/DeptWork');

const DEPARTMENTS = [
  { name: 'PWD', description: 'Public Works Department' },
  { name: 'BMC', description: 'Bhopal Municipal Corporation' },
  { name: 'Traffic', description: 'Traffic Police' },
  { name: 'Pollution Board', description: 'MP Pollution Control Board' },
  { name: 'Electricity', description: 'MP Madhya Kshetra Vidyut Vitaran' },
  { name: 'Water', description: 'Water Supply Department' }
];

async function seedMemoryDB() {
  console.log('Seeding memory database...');
  await User.deleteMany({});
  await Department.deleteMany({});
  await Issue.deleteMany({});
  await DeptWork.deleteMany({});

  const createdDepts = await Department.insertMany(DEPARTMENTS);
  const getDept = (name) => createdDepts.find(d => d.name === name)._id;

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);

  const admin = await User.create({ email: 'admin@bhopal.gov.in', password: hash, fullName: 'Bhopal Admin', role: 'super_admin' });
  const citizen = await User.create({ email: 'citizen@example.com', password: hash, fullName: 'Ramesh Kumar', role: 'citizen' });

  const issues = [
    {
      title: 'Deep Pothole',
      description: 'Dangerous pothole on main road',
      category: 'pothole',
      urgencyScore: 8,
      status: 'open',
      location: { type: 'Point', coordinates: [77.4260, 23.1720] },
      area: 'Kolar Road',
      primaryDepartment: getDept('PWD'),
      reporterId: citizen._id
    }
  ];
  for (let issue of issues) {
    const newIssue = await Issue.create(issue);
    newIssue.clusterId = newIssue._id.toString();
    await newIssue.save();
  }
  console.log('Memory DB seeded!');
}

seedMemoryDB();
