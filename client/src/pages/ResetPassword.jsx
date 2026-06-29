import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Check } from 'lucide-react';
import { toast } from 'react-toastify';

const ResetPassword = () => {
  const { resettoken } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await axios.put(`/api/auth/resetpassword/${resettoken}`, { password: data.password });
      if (res.data.success) {
        toast.success('Your password has been successfully updated.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white">Reset Password</h3>
        <p className="text-xs text-slate-400 mt-1">Configure a new secure password for your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="password"
              placeholder="Min. 6 characters"
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-gov-500"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 chars' },
              })}
            />
          </div>
          {errors.password && <span className="text-[10px] text-rose-400">{errors.password.message}</span>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="password"
              placeholder="Retype password"
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-gov-500"
              {...register('confirmPassword', {
                required: 'Confirm password is required',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />
          </div>
          {errors.confirmPassword && (
            <span className="text-[10px] text-rose-400">{errors.confirmPassword.message}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gov-600 hover:bg-gov-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-gov-950/20"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Configure Password
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
