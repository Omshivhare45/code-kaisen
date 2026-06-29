import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { User, Phone, MapPin, Building, Save, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      ward: user?.ward || '',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const res = await updateProfile(data);
    if (res.success) {
      toast.success('Profile settings updated successfully!');
    } else {
      toast.error(res.error || 'Failed to update profile.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Profile Settings</h2>
        <p className="text-xs text-slate-400 mt-1">Manage user contact details and portal credentials</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Avatar Card */}
        <div className="md:col-span-1 glass-card p-5 rounded-2xl border border-slate-850 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-gov-750/30 text-gov-400 border border-gov-500/25 flex items-center justify-center text-2xl font-bold mb-4 shadow-xl">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <h3 className="font-extrabold text-slate-200 text-sm truncate w-full">{user?.name}</h3>
          <span className="mt-1 px-2.5 py-0.5 rounded-lg bg-gov-500/10 text-gov-400 font-bold text-[10px] uppercase tracking-wider">
            {user?.role}
          </span>
          <p className="text-[11px] text-slate-500 mt-2 truncate w-full">{user?.email}</p>
        </div>

        {/* Right Side: Edit Form */}
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-850">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                    {...register('name', { required: 'Name is required' })}
                  />
                </div>
                {errors.name && <span className="text-[10px] text-rose-400">{errors.name.message}</span>}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Phone Contact</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                    {...register('phone', { required: 'Phone is required' })}
                  />
                </div>
                {errors.phone && <span className="text-[10px] text-rose-400">{errors.phone.message}</span>}
              </div>
            </div>

            {/* Role/Department/Ward Readonly Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-850 pt-4 mt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Security Group / Role</label>
                <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 px-3 py-2.5 rounded-xl border border-slate-800">
                  <Building className="h-4.5 w-4.5 text-slate-500" />
                  <span>{user?.role}</span>
                </div>
              </div>

              {/* Citizen Ward Modification or Officer Department Readonly */}
              {user?.role === 'Citizen' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Residential Ward</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <select
                      className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                      {...register('ward', { required: 'Ward is required for citizens' })}
                    >
                      <option value="Ward 12 (TT Nagar)">Ward 12 (TT Nagar)</option>
                      <option value="Ward 45 (MP Nagar)">Ward 45 (MP Nagar)</option>
                      <option value="Ward 52 (Habibganj)">Ward 52 (Habibganj)</option>
                      <option value="Ward 80 (Kolar)">Ward 80 (Kolar)</option>
                    </select>
                  </div>
                  {errors.ward && <span className="text-[10px] text-rose-400">{errors.ward.message}</span>}
                </div>
              ) : user?.department ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Affiliated Department</label>
                  <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 px-3 py-2.5 rounded-xl border border-slate-800">
                    <Building className="h-4.5 w-4.5 text-slate-500" />
                    <span>{user.department.name} ({user.department.code})</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gov-600 hover:bg-gov-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-gov-950/20"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
