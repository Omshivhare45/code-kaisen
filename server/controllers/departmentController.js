import Department from '../models/Department.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
export const getDepartments = asyncHandler(async (req, res, next) => {
  const departments = await Department.find();
  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments,
  });
});

// @desc    Create a department
// @route   POST /api/departments
// @access  Private (Super Admin)
export const createDepartment = asyncHandler(async (req, res, next) => {
  const { name, code, description, color, headOfDepartment, phone, email } = req.body;

  const department = await Department.create({
    name,
    code,
    description,
    color,
    headOfDepartment,
    phone,
    email,
  });

  res.status(201).json({
    success: true,
    data: department,
  });
});
