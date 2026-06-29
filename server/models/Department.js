import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a department name'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Please add a department code (e.g. PWD, ELEC)'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    color: {
      type: String,
      default: '#14b8a6', // CSS Hex color code for maps/charts
    },
    headOfDepartment: {
      type: String,
      required: [true, 'Please add HoD name'],
    },
    phone: {
      type: String,
      required: [true, 'Please add phone contact'],
    },
    email: {
      type: String,
      required: [true, 'Please add department email'],
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Department', DepartmentSchema);
