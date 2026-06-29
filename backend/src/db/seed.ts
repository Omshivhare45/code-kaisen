import bcrypt from 'bcryptjs';
import { Department } from '../models/Department';
import { User } from '../models/User';
import { BhopalWard } from '../models/BhopalWard';
import { BhopalRoad } from '../models/BhopalRoad';

export async function seedDatabase() {
  console.log('Checking database status for seeding...');

  // 1. Seed Departments
  const departmentCount = await Department.countDocuments();
  if (departmentCount === 0) {
    console.log('Seeding departments...');
    const depts = [
      { name: 'Public Works Department', slug: 'pwd', color: '#EF4444' },
      { name: 'Jal Sansadhan (Water Resources)', slug: 'jal-sansadhan', color: '#3B82F6' },
      { name: 'Madhya Pradesh Discom', slug: 'discom', color: '#F59E0B' },
      { name: 'Gas Authority (GAIL)', slug: 'gas-authority', color: '#10B981' },
      { name: 'BSNL / Telecom', slug: 'telecom', color: '#8B5CF6' },
      { name: 'Bhopal Metro & Smart City', slug: 'metro-smartcity', color: '#EC4899' },
    ];
    await Department.insertMany(depts);
    console.log('Departments seeded.');
  }

  // 2. Seed Users
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('Seeding users...');
    const pwdDept = await Department.findOne({ slug: 'pwd' });
    const jalDept = await Department.findOne({ slug: 'jal-sansadhan' });
    const discomDept = await Department.findOne({ slug: 'discom' });

    const passwordHash = bcrypt.hashSync('password123', 10);

    const users = [
      {
        email: 'admin@setu.gov.in',
        passwordHash,
        firstName: 'Alok',
        lastName: 'Sharma',
        role: 'Super Admin',
        status: 'active',
        department: null,
      },
      {
        email: 'nodal@setu.gov.in',
        passwordHash,
        firstName: 'Sanjay',
        lastName: 'Verma',
        role: 'Nodal Officer',
        status: 'active',
        department: null,
      },
      {
        email: 'pwd.admin@setu.gov.in',
        passwordHash,
        firstName: 'Rajesh',
        lastName: 'Kumar',
        role: 'Department Admin',
        status: 'active',
        department: pwdDept ? pwdDept._id : null,
      },
      {
        email: 'pwd.eng@setu.gov.in',
        passwordHash,
        firstName: 'Amit',
        lastName: 'Patel',
        role: 'Department Engineer',
        status: 'active',
        department: pwdDept ? pwdDept._id : null,
      },
      {
        email: 'jal.admin@setu.gov.in',
        passwordHash,
        firstName: 'Vijay',
        lastName: 'Singh',
        role: 'Department Admin',
        status: 'active',
        department: jalDept ? jalDept._id : null,
      },
      {
        email: 'discom.eng@setu.gov.in',
        passwordHash,
        firstName: 'Rahul',
        lastName: 'Mishra',
        role: 'Department Engineer',
        status: 'active',
        department: discomDept ? discomDept._id : null,
      },
      {
        email: 'auditor@setu.gov.in',
        passwordHash,
        firstName: 'Sunita',
        lastName: 'Joshi',
        role: 'Read-only Auditor',
        status: 'active',
        department: null,
      },
      {
        email: 'citizen@gmail.com',
        passwordHash,
        firstName: 'Rohan',
        lastName: 'Gupta',
        role: 'Citizen',
        status: 'active',
        department: null,
      },
    ];
    await User.insertMany(users);
    console.log('Users seeded.');
  }

  // 3. Seed Bhopal Wards
  const wardCount = await BhopalWard.countDocuments();
  if (wardCount === 0) {
    console.log('Seeding Bhopal wards...');
    const wards = [
      {
        name: 'Maharana Pratap Nagar',
        geometry: {
          type: 'Polygon',
          coordinates: [[[77.425, 23.235], [77.445, 23.235], [77.445, 23.220], [77.425, 23.220], [77.425, 23.235]]],
        },
      },
      {
        name: 'Arera Colony',
        geometry: {
          type: 'Polygon',
          coordinates: [[[77.420, 23.218], [77.440, 23.218], [77.440, 23.200], [77.420, 23.200], [77.420, 23.218]]],
        },
      },
      {
        name: 'TT Nagar',
        geometry: {
          type: 'Polygon',
          coordinates: [[[77.395, 23.245], [77.415, 23.245], [77.415, 23.230], [77.395, 23.230], [77.395, 23.245]]],
        },
      },
      {
        name: 'Indrapuri',
        geometry: {
          type: 'Polygon',
          coordinates: [[[77.450, 23.260], [77.470, 23.260], [77.470, 23.245], [77.450, 23.245], [77.450, 23.260]]],
        },
      },
      {
        name: 'Kolar Road',
        geometry: {
          type: 'Polygon',
          coordinates: [[[77.400, 23.190], [77.420, 23.190], [77.420, 23.150], [77.400, 23.150], [77.400, 23.190]]],
        },
      },
    ];
    await BhopalWard.insertMany(wards);
    console.log('Bhopal wards seeded.');
  }

  // 4. Seed Bhopal Roads
  const roadCount = await BhopalRoad.countDocuments();
  if (roadCount === 0) {
    console.log('Seeding Bhopal roads...');
    const now = new Date();
    const roads = [
      {
        name: 'Link Road 1',
        roadType: 'Arterial',
        geometry: {
          type: 'LineString',
          coordinates: [[77.398, 23.240], [77.415, 23.235], [77.428, 23.230]],
        },
        lastResurfacedAt: new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000), // 3 months ago
      },
      {
        name: 'Hoshangabad Road',
        roadType: 'Highway',
        geometry: {
          type: 'LineString',
          coordinates: [[77.435, 23.230], [77.445, 23.210], [77.460, 23.180]],
        },
        lastResurfacedAt: new Date(now.getTime() - 14 * 30 * 24 * 60 * 60 * 1000), // 14 months ago
      },
      {
        name: 'Hamidia Road',
        roadType: 'Arterial',
        geometry: {
          type: 'LineString',
          coordinates: [[77.400, 23.265], [77.412, 23.260], [77.425, 23.262]],
        },
        lastResurfacedAt: new Date(now.getTime() - 5 * 30 * 24 * 60 * 60 * 1000), // 5 months ago
      },
      {
        name: 'Kolar Main Road',
        roadType: 'Local',
        geometry: {
          type: 'LineString',
          coordinates: [[77.410, 23.190], [77.408, 23.170], [77.405, 23.150]],
        },
        lastResurfacedAt: new Date(now.getTime() - 18 * 30 * 24 * 60 * 60 * 1000), // 18 months ago
      },
    ];
    await BhopalRoad.insertMany(roads);
    console.log('Bhopal roads seeded.');
  }

  console.log('Database seeding finished.');
}
