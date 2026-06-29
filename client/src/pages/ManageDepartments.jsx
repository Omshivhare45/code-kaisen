import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { FolderTree, Plus, PlusCircle, Check, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

const ManageDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      color: '#14b8a6',
    }
  });

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('/api/departments');
      if (res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const onSubmit = async (data) => {
    setSubmitLoading(true);
    try {
      const res = await axios.post('/api/departments', data);
      if (res.data.success) {
        toast.success('New department added successfully!');
        reset();
        setFormOpen(false);
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add department');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Utility Departments Registry</h2>
          <p className="text-xs text-slate-400 mt-1">Configure and index municipal coordination divisions (Water, Telecom, PWD)</p>
        </div>

        <button
          onClick={() => setFormOpen(!formOpen)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gov-600 hover:bg-gov-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg"
        >
          {formOpen ? 'Cancel' : (
            <>
              <PlusCircle className="h-4.5 w-4.5" />
              Register Department
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add department */}
        {formOpen && (
          <div className="lg:col-span-1 glass-panel p-5 rounded-2xl border border-slate-850 h-fit">
            <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 mb-4 flex items-center gap-2">
              <Plus className="h-4.5 w-4.5 text-gov-400" />
              Register Utility Code
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sewage & Drainage"
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('name', { required: 'Department name is required' })}
                />
                {errors.name && <span className="text-[10px] text-rose-400">{errors.name.message}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Division Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SEW"
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-gov-500"
                    {...register('code', { required: 'Code is required' })}
                  />
                  {errors.code && <span className="text-[10px] text-rose-400">{errors.code.message}</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Color Tag</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="w-10 h-10 bg-transparent outline-none border-0 cursor-pointer"
                      {...register('color', { required: true })}
                    />
                    <span className="text-[10px] text-slate-400 font-mono uppercase">Color Map</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  rows={2}
                  placeholder="Service description details..."
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('description', { required: 'Description is required' })}
                />
                {errors.description && <span className="text-[10px] text-rose-400">{errors.description.message}</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Head of Department (HoD)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Vivek Dev"
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('headOfDepartment', { required: 'HoD name is required' })}
                />
                {errors.headOfDepartment && <span className="text-[10px] text-rose-400">{errors.headOfDepartment.message}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 011-234567"
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                    {...register('phone', { required: 'Phone contact is required' })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. sew@setu.gov.in"
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                    {...register('email', { required: 'Email contact is required' })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gov-600 hover:bg-gov-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg"
              >
                {submitLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Add Department
              </button>
            </form>
          </div>
        )}

        {/* Right Grid: Department cards */}
        <div className={`space-y-4 ${formOpen ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading departments...</div>
          ) : departments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No departments configured in the registry.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {departments.map((dept) => (
                <div key={dept._id} className="p-5 glass-panel rounded-2xl border border-slate-850 hover:border-slate-700/60 transition-all flex flex-col justify-between h-48">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-sm text-slate-200">{dept.name}</span>
                      <span
                        className="px-2.5 py-0.5 rounded text-[10px] font-bold border"
                        style={{
                          borderColor: `${dept.color}35`,
                          backgroundColor: `${dept.color}15`,
                          color: dept.color,
                        }}
                      >
                        {dept.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {dept.description}
                    </p>
                  </div>

                  <div className="border-t border-slate-850 pt-3 flex justify-between items-center text-[10px] text-slate-500">
                    <span>HoD: {dept.headOfDepartment}</span>
                    <span>Contact: {dept.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageDepartments;
