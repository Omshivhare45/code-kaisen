import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMsg('');
    const res = await login(data.email, data.password);
    
    if (res.success) {
      toast.success('Logged in successfully!');
      navigate('/');
    } else {
      setErrorMsg(res.error);
      toast.error(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white">Sign In</h3>
        <p className="text-xs text-slate-400 mt-1">Access your citizen portal or department dashboard</p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="email"
              placeholder="e.g. name@domain.com"
              className={`w-full bg-slate-900/60 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none transition focus:border-gov-500 focus:ring-1 focus:ring-gov-500 ${
                errors.email ? 'border-rose-500' : 'border-slate-700/60'
              }`}
              {...register('email', {
                required: 'Email address is required',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Invalid email address format',
                },
              })}
            />
          </div>
          {errors.email && <span className="text-[10px] text-rose-400">{errors.email.message}</span>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <Link to="/forgotpassword" className="text-[10px] text-gov-400 hover:text-gov-300 font-medium">
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="password"
              placeholder="••••••••"
              className={`w-full bg-slate-900/60 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none transition focus:border-gov-500 focus:ring-1 focus:ring-gov-500 ${
                errors.password ? 'border-rose-500' : 'border-slate-700/60'
              }`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
          </div>
          {errors.password && <span className="text-[10px] text-rose-400">{errors.password.message}</span>}
        </div>

        {/* Submit */}
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
              Authenticate Session
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400">
        New to the portal?{' '}
        <Link to="/register" className="text-gov-400 hover:text-gov-300 font-semibold underline">
          Register here
        </Link>
      </div>
    </div>
  );
};

export default Login;
