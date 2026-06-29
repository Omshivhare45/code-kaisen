import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatCard from '../components/StatCard';
import { Layers, AlertTriangle, FileText, CheckCircle2, Clock, ShieldAlert, BarChart3, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [slaViolations, setSlaViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, permitsRes, complaintsRes] = await Promise.all([
          axios.get('/api/analytics'),
          axios.get('/api/permits?status=Conflict'),
          axios.get('/api/complaints'),
        ]);

        if (analyticsRes.data.success) {
          setData(analyticsRes.data.data);
        }
        if (permitsRes.data.success) {
          setConflicts(permitsRes.data.data);
        }
        if (complaintsRes.data.success) {
          const allComplaints = complaintsRes.data.data;
          
          // Compute SLA violations (complaints > 7 days old and not Resolved)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const violations = allComplaints.filter((comp) => {
            const isUnresolved = comp.status !== 'Resolved';
            const isOverdue = new Date(comp.createdAt) < sevenDaysAgo;
            return isUnresolved && isOverdue;
          });
          setSlaViolations(violations);
        }
      } catch (err) {
        console.error('Error fetching admin dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalPermits = data ? Object.values(data.permits).reduce((a, b) => a + b, 0) : 0;
  const activeConflictsCount = data?.conflicts?.total || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Nodal Officer Admin Console</h2>
        <p className="text-xs text-slate-400 mt-1">Supervise inter-department permits, resolve scheduling conflicts, and monitor city-wide utility SLA timelines</p>
      </div>

      {/* Admin tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Permits Requested"
          value={totalPermits}
          icon={Layers}
          description="Submitted by all departments"
          loading={loading}
        />
        <StatCard
          title="Active Conflicts Detected"
          value={activeConflictsCount}
          icon={AlertTriangle}
          description="Collisions in schedule/GIS"
          trend={activeConflictsCount > 0 ? 'Review Needed' : ''}
          trendType="down"
          loading={loading}
        />
        <StatCard
          title="SLA Violated Complaints"
          value={slaViolations.length}
          icon={ShieldAlert}
          description="Unresolved for over 7 days"
          trend={slaViolations.length > 0 ? 'Overdue' : ''}
          trendType="down"
          loading={loading}
        />
        <StatCard
          title="Average Resolution speed"
          value={`${data?.averageResolutionHours || 0} Hours`}
          icon={CheckCircle2}
          description="Citizen complaint seal time"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Conflict permits queue */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850">
          <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-red-500 animate-pulse" />
              Excavation Conflict Overlaps ({conflicts.length})
            </h3>
            <Link to="/admin/conflicts" className="text-xs text-gov-400 hover:text-gov-300 font-semibold flex items-center gap-1">
              Resolve Conflicts <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading conflicts list...</div>
          ) : conflicts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No active coordinated conflicts detected today.</div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {conflicts.map(c => (
                <div key={c._id} className="p-3.5 bg-red-950/5 border border-red-500/20 rounded-xl flex justify-between items-start gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-200">{c.roadName}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Submitted by: {c.department?.name}</p>
                    <p className="text-[9px] text-red-400 mt-0.5">Timeline: {new Date(c.startDate).toLocaleDateString()} to {new Date(c.endDate).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px] font-bold uppercase tracking-wider">
                    Overlapping
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SLA Violation List */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850">
          <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
              Overdue SLA Complaints ({slaViolations.length})
            </h3>
            <Link to="/complaints-queue" className="text-[11px] text-gov-400 hover:text-gov-300 font-semibold">
              View Queue
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading violations list...</div>
          ) : slaViolations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No utility departments exceeded complaint SLAs.</div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {slaViolations.map(v => {
                const daysOpen = Math.round((new Date() - new Date(v.createdAt)) / (1000 * 60 * 60 * 24));
                return (
                  <div key={v._id} className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-xl flex justify-between items-start gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-200 truncate max-w-[180px]">{v.complaintType}</p>
                      <p className="text-[10px] text-slate-400 mt-1">Assigned Department: {v.department?.name}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Submitted: {new Date(v.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-bold uppercase">
                        {daysOpen} Days Open
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
