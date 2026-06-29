import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Phone, MapPin, Building, LogIn } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const Register = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: 'Citizen',
    }
  });

  const selectedRole = watch('role');

  // Load departments for registration lookup
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await axios.get('/api/departments');
        if (res.data.success) {
          setDepartments(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepts();
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    const res = await registerAuth(data);
    if (res.success) {
      toast.success('Registration completed! Logged in.');
      navigate('/');
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white">Create Portal Account</h3>
        <p className="text-xs text-slate-400 mt-1">Submit registration for utility e-coordination</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="e.g. Tarun Shivhare"
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-gov-500"
              {...register('name', { required: 'Full name is required' })}
            />
          </div>
          {errors.name && <span className="text-[10px] text-rose-400">{errors.name.message}</span>}
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="email"
              placeholder="e.g. name@domain.com"
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-gov-500"
              {...register('email', { required: 'Email is required' })}
            />
          </div>
          {errors.email && <span className="text-[10px] text-rose-400">{errors.email.message}</span>}
        </div>

        {/* Contact Phone */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Contact Number</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="e.g. +91 9999999999"
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-gov-500"
              {...register('phone', { required: 'Phone number is required' })}
            />
          </div>
          {errors.phone && <span className="text-[10px] text-rose-400">{errors.phone.message}</span>}
        </div>

        {/* Role Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Account Role</label>
          <div className="relative">
            <select
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-gov-500"
              {...register('role')}
            >
              <option value="Citizen">Citizen User</option>
              <option value="Department Officer">Department Officer</option>
            </select>
          </div>
        </div>

        {/* Conditional Ward Field for Citizens */}
        {selectedRole === 'Citizen' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Residential Ward</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <select
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-gov-500"
                {...register('ward', { required: 'Ward is required for citizens' })}
              >
                <option value="">Select Resident Ward</option>
                <option value="Ward 12 (TT Nagar)">Ward 12 (TT Nagar)</option>
                <option value="Ward 45 (MP Nagar)">Ward 45 (MP Nagar)</option>
                <option value="Ward 52 (Habibganj)">Ward 52 (Habibganj)</option>
                <option value="Ward 80 (Kolar)">Ward 80 (Kolar)</option>
              </select>
            </div>
            {errors.ward && <span className="text-[10px] text-rose-400">{errors.ward.message}</span>}
          </div>
        )}

        {/* Conditional Department Selection for Officers */}
        {selectedRole === 'Department Officer' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Assigned Department Code</label>
            <div className="relative">
              <Building className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <select
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-gov-500"
                {...register('departmentCode', { required: 'Department is required for officers' })}
              >
                <option value="">Select Utility Department</option>
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            {errors.departmentCode && (
              <span className="text-[10px] text-rose-400">{errors.departmentCode.message}</span>
            )}
          </div>
        )}

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Set Account Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="password"
              placeholder="Min. 6 characters"
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-gov-500"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
          </div>
          {errors.password && <span className="text-[10px] text-rose-400">{errors.password.message}</span>}
        </div>

        {/* Register Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gov-600 hover:bg-gov-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-gov-950/20"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Register Credentials
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="text-gov-400 hover:text-gov-300 font-semibold underline">
          Sign In here
        </Link>
      </div>
    </div>
  );
};

export default Register;
