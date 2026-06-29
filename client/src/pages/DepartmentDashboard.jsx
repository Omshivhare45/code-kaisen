import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { FileText, CheckCircle2, Clock, AlertTriangle, FileDown, PlusCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const DepartmentDashboard = () => {
  const { user } = useAuth();
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPermits = async () => {
    try {
      const res = await axios.get(`/api/permits?department=${user?.department?._id}`);
      if (res.data.success) {
        setPermits(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching department permits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.department?._id) {
      fetchPermits();
    }
  }, [user]);

  const activePermits = permits.filter(p => p.status === 'Active').length;
  const pendingPermits = permits.filter(p => p.status === 'Pending').length;
  const conflictPermits = permits.filter(p => p.status === 'Conflict').length;
  const completedPermits = permits.filter(p => p.status === 'Completed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Utility Control Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">Manage excavations, track coordination workflows, and download approved permits</p>
        </div>
        
        <Link
          to="/permits/create"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gov-600 hover:bg-gov-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-gov-950/20"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          Request Dig Permit
        </Link>
      </div>

      {/* Stats block */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Active Excavations"
          value={activePermits}
          icon={Clock}
          description="In progress on-site"
          loading={loading}
        />
        <StatCard
          title="Pending Approval"
          value={pendingPermits}
          icon={FileText}
          description="Awaiting nodal review"
          loading={loading}
        />
        <StatCard
          title="Conflict Warnings"
          value={conflictPermits}
          icon={AlertTriangle}
          description="Clashes with other utilities"
          trend={conflictPermits > 0 ? 'Urgent' : ''}
          trendType="down"
          loading={loading}
        />
        <StatCard
          title="Completed Restorations"
          value={completedPermits}
          icon={CheckCircle2}
          description="Re-metalled and closed"
          loading={loading}
        />
      </div>

      {/* Permits Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-850">
        <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 mb-4">
          Excavation Permits Log
        </h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading permit list...</div>
        ) : permits.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No permit requests logged for your department.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  <th className="pb-3 pl-2">Reference ID</th>
                  <th className="pb-3">Road Segment</th>
                  <th className="pb-3">Ward</th>
                  <th className="pb-3">Schedule</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {permits.map((permit) => {
                  let statusBadge = 'bg-slate-900 text-slate-400';
                  if (permit.status === 'Active') statusBadge = 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
                  if (permit.status === 'Conflict') statusBadge = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                  if (permit.status === 'Completed') statusBadge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                  if (permit.status === 'Approved') statusBadge = 'bg-gov-500/10 text-gov-400 border border-gov-500/20';
                  if (permit.status === 'Pending') statusBadge = 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';

                  return (
                    <tr key={permit._id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 pl-2 font-mono text-slate-400">{permit._id.substring(12)}</td>
                      <td className="py-3.5 font-semibold text-slate-200">{permit.roadName}</td>
                      <td className="py-3.5 text-slate-300">{permit.ward}</td>
                      <td className="py-3.5 text-slate-400">
                        {new Date(permit.startDate).toLocaleDateString()} - {new Date(permit.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${statusBadge}`}>
                          {permit.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex justify-end gap-2">
                          {/* Only show PDF export if approved or active or completed */}
                          {['Approved', 'Active', 'Completed'].includes(permit.status) && (
                            <a
                              href={`/api/permits/${permit._id}/pdf`}
                              download
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-gov-400 hover:text-gov-300 transition"
                              title="Download PDF Permit Card"
                            >
                              <FileDown className="h-4 w-4" />
                            </a>
                          )}
                          
                          {/* If conflict, link to conflict detail manager */}
                          {permit.status === 'Conflict' && (
                            <Link
                              to="/admin/conflicts"
                              className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 hover:text-red-300 transition"
                              title="Manage Conflicts"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentDashboard;
