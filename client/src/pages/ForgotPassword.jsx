import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/forgotpassword', { email: data.email });
      if (res.data.success) {
        setSuccess(true);
        toast.success('Password reset instructions emailed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Email could not be sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white">Recover Password</h3>
        <p className="text-xs text-slate-400 mt-1">We will send a reset link to your email</p>
      </div>

      {success ? (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <h4 className="font-bold text-slate-100 text-sm">Reset Link Transmitted</h4>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Please check your email client for reset details. (If using dev fallback, watch the backend logs outbox).
          </p>
          <Link
            to="/login"
            className="mt-2 text-xs font-semibold text-gov-400 hover:text-gov-300 underline"
          >
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                placeholder="e.g. name@domain.com"
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-gov-500"
                {...register('email', { required: 'Email address is required' })}
              />
            </div>
            {errors.email && <span className="text-[10px] text-rose-400">{errors.email.message}</span>}
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
                <Send className="h-4 w-4" />
                Transmit Link
              </>
            )}
          </button>

          <div className="text-center text-xs text-slate-400 pt-2">
            Remembered your credentials?{' '}
            <Link to="/login" className="text-gov-400 hover:text-gov-300 font-semibold underline">
              Sign In here
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPassword;
