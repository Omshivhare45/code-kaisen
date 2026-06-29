import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Permit } from '../models/Permit';
import { Conflict } from '../models/Conflict';
import { BhopalRoad } from '../models/BhopalRoad';
import { BhopalWard } from '../models/BhopalWard';
import { Department } from '../models/Department';
import { evaluateConflicts } from '../utils/conflictDetector';

describe('Spatial-Schedule Conflict Detection Engine Tests', () => {
  let mongoServer: MongoMemoryServer;
  let pwdDeptId: mongoose.Types.ObjectId;
  let telecomDeptId: mongoose.Types.ObjectId;
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed test departments
    const pwd = await Department.create({
      name: 'Public Works Department (PWD)',
      slug: 'pwd',
      color: '#3B82F6',
      contactEmail: 'pwd@bhopal.gov.in',
      contactPhone: '0755-1234567',
    });
    pwdDeptId = pwd._id as any;

    const telecom = await Department.create({
      name: 'Telecom & Fiber Authority',
      slug: 'telecom',
      color: '#8B5CF6',
      contactEmail: 'telecom@bhopal.gov.in',
      contactPhone: '0755-7654321',
    });
    telecomDeptId = telecom._id as any;

    testUserId = new mongoose.Types.ObjectId();

    // Create indexes
    await BhopalRoad.createIndexes();
    await BhopalWard.createIndexes();
    await Permit.createIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Permit.deleteMany({});
    await Conflict.deleteMany({});
    await BhopalRoad.deleteMany({});
  });

  test('Test Case 1: Spatial Proximity Conflict (Overlap in Space, Different Dates)', async () => {
    // Create Permit 1 (Approved)
    const p1 = await Permit.create({
      permitNumber: 'PMT-TEST-001',
      department: pwdDeptId,
      roadName: 'Link Road 1',
      ward: 'Ward 30',
      latitude: 23.235,
      longitude: 77.425,
      geometry: {
        type: 'LineString',
        coordinates: [[77.420, 23.235], [77.430, 23.235]],
      },
      centroid: { type: 'Point', coordinates: [77.425, 23.235] },
      purpose: 'Water Pipeline laying',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-10'),
      depth: 1.5,
      restorationPlan: 'Asphalt resurfacing',
      status: 'Approved',
      createdBy: testUserId,
    });

    // Create Permit 2 (Submitted - Overlapping geometry, but DIFFERENT schedule)
    const p2 = await Permit.create({
      permitNumber: 'PMT-TEST-002',
      department: telecomDeptId,
      roadName: 'Link Road 1',
      ward: 'Ward 30',
      latitude: 23.235,
      longitude: 77.425,
      geometry: {
        type: 'LineString',
        coordinates: [[77.420, 23.235], [77.430, 23.235]],
      },
      centroid: { type: 'Point', coordinates: [77.425, 23.235] },
      purpose: 'Telecom Fiber laying',
      startDate: new Date('2026-08-01'), // Different dates
      endDate: new Date('2026-08-10'),
      depth: 1.0,
      restorationPlan: 'Soil compaction',
      status: 'Submitted',
      createdBy: testUserId,
    });

    // Evaluate conflicts for Permit 2
    const score = await evaluateConflicts(p2._id.toString());

    // Expect score to be 10 (only spatial proximity)
    expect(score).toBe(10);

    const conflicts = await Conflict.find({ permitId: p2._id });
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflictType).toBe('Spatial Proximity');
  });

  test('Test Case 2: Schedule Overlap Conflict (Overlap in Space and Time)', async () => {
    // Create Permit 1 (Approved)
    const p1 = await Permit.create({
      permitNumber: 'PMT-TEST-003',
      department: pwdDeptId,
      roadName: 'Link Road 1',
      ward: 'Ward 30',
      latitude: 23.235,
      longitude: 77.425,
      geometry: {
        type: 'LineString',
        coordinates: [[77.420, 23.235], [77.430, 23.235]],
      },
      centroid: { type: 'Point', coordinates: [77.425, 23.235] },
      purpose: 'Drainage repairs',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-15'),
      depth: 2.0,
      restorationPlan: 'Asphalt resurfacing',
      status: 'Approved',
      createdBy: testUserId,
    });

    // Create Permit 2 (Submitted - Overlapping geometry and overlapping schedule)
    const p2 = await Permit.create({
      permitNumber: 'PMT-TEST-004',
      department: telecomDeptId,
      roadName: 'Link Road 1',
      ward: 'Ward 30',
      latitude: 23.235,
      longitude: 77.425,
      geometry: {
        type: 'LineString',
        coordinates: [[77.420, 23.235], [77.430, 23.235]],
      },
      centroid: { type: 'Point', coordinates: [77.425, 23.235] },
      purpose: 'Telecom fiber install',
      startDate: new Date('2026-07-10'), // Overlaps with p1 (July 1 to July 15)
      endDate: new Date('2026-07-20'),
      depth: 1.0,
      restorationPlan: 'Soil compaction',
      status: 'Submitted',
      createdBy: testUserId,
    });

    // Evaluate conflicts for Permit 2
    const score = await evaluateConflicts(p2._id.toString());

    // Expect score to be 50 (spatial & schedule overlap)
    expect(score).toBe(50);

    const conflicts = await Conflict.find({ permitId: p2._id });
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflictType).toBe('Schedule Overlap');
  });

  test('Test Case 3: Upcoming Project Conflict (Starts shortly after this one ends)', async () => {
    // Create Permit 1 (Approved - scheduled in future)
    const p1 = await Permit.create({
      permitNumber: 'PMT-TEST-005',
      department: telecomDeptId,
      roadName: 'Link Road 1',
      ward: 'Ward 30',
      latitude: 23.235,
      longitude: 77.425,
      geometry: {
        type: 'LineString',
        coordinates: [[77.420, 23.235], [77.430, 23.235]],
      },
      centroid: { type: 'Point', coordinates: [77.425, 23.235] },
      purpose: 'Fiber network laying',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-10'),
      depth: 1.0,
      restorationPlan: 'Soil compaction',
      status: 'Approved',
      createdBy: testUserId,
    });

    // Create Permit 2 (Submitted - ends before p1 starts, but within 6 months gap)
    const p2 = await Permit.create({
      permitNumber: 'PMT-TEST-006',
      department: pwdDeptId,
      roadName: 'Link Road 1',
      ward: 'Ward 30',
      latitude: 23.235,
      longitude: 77.425,
      geometry: {
        type: 'LineString',
        coordinates: [[77.420, 23.235], [77.430, 23.235]],
      },
      centroid: { type: 'Point', coordinates: [77.425, 23.235] },
      purpose: 'Sewer construction',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-15'), // Ends July 15. Gap to Aug 1 is 17 days
      depth: 2.0,
      restorationPlan: 'Asphalt resurfacing',
      status: 'Submitted',
      createdBy: testUserId,
    });

    // Evaluate conflicts for Permit 2
    const score = await evaluateConflicts(p2._id.toString());

    // Expect score to be 30 (10 for Spatial Proximity + 20 for Upcoming Project)
    expect(score).toBe(30);

    const conflicts = await Conflict.find({ permitId: p2._id });
    expect(conflicts.length).toBe(2);
    expect(conflicts.some(c => c.conflictType === 'Spatial Proximity')).toBe(true);
    expect(conflicts.some(c => c.conflictType === 'Upcoming Project')).toBe(true);
  });

  test('Test Case 4: Recently Resurfaced Road restriction (resurfaced within 12 months)', async () => {
    // Seed recently resurfaced road
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    await BhopalRoad.create({
      name: 'Link Road 1',
      roadType: 'Sub-Arterial',
      lastResurfacedAt: sixMonthsAgo, // Within 12 months
      geometry: {
        type: 'LineString',
        coordinates: [[77.420, 23.235], [77.430, 23.235]],
      },
    });

    // Create Permit 1 (Submitted - digging on recently resurfaced road)
    const p1 = await Permit.create({
      permitNumber: 'PMT-TEST-007',
      department: pwdDeptId,
      roadName: 'Link Road 1',
      ward: 'Ward 30',
      latitude: 23.235,
      longitude: 77.425,
      geometry: {
        type: 'LineString',
        coordinates: [[77.420, 23.235], [77.430, 23.235]],
      },
      centroid: { type: 'Point', coordinates: [77.425, 23.235] },
      purpose: 'Emergency pipeline repairs',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-05'),
      depth: 1.5,
      restorationPlan: 'Asphalt patches',
      status: 'Submitted',
      createdBy: testUserId,
    });

    // Evaluate conflicts for Permit 1
    const score = await evaluateConflicts(p1._id.toString());

    // Expect score to be 30 (Recently Resurfaced Road restriction)
    expect(score).toBe(30);

    const conflicts = await Conflict.find({ permitId: p1._id });
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflictType).toBe('Recently Resurfaced Road');
  });
});
