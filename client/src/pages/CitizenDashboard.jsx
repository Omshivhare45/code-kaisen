import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatCard from '../components/StatCard';
import { FileText, CheckCircle2, Clock, AlertOctagon, Info, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CitizenDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [activePermits, setActivePermits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [complaintsRes, permitsRes] = await Promise.all([
          axios.get('/api/complaints'),
          axios.get('/api/permits?status=Active'),
        ]);

        if (complaintsRes.data.success) {
          setComplaints(complaintsRes.data.data);
        }
        if (permitsRes.data.success) {
          setActivePermits(permitsRes.data.data);
        }
      } catch (err) {
        console.error('Error fetching citizen dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === 'Resolved').length;
  const pendingComplaints = totalComplaints - resolvedComplaints;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Citizen Portal Dashboard</h2>
        <p className="text-xs text-slate-400 mt-1">Monitor road-digging activities in your area and report utility issues</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Total Complaints Filed"
          value={totalComplaints}
          icon={FileText}
          description="Complaints submitted by you"
          loading={loading}
        />
        <StatCard
          title="Resolved Complaints"
          value={resolvedComplaints}
          icon={CheckCircle2}
          description="Resolved by departments"
          trend={`${totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0}%`}
          trendType="up"
          loading={loading}
        />
        <StatCard
          title="Pending Resolution"
          value={pendingComplaints}
          icon={Clock}
          description="Currently under investigation"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Road Closures / Permits */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-850">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <AlertOctagon className="h-4.5 w-4.5 text-orange-400" />
                Live Road Closure & Digging Alerts
              </h3>
              <Link to="/map" className="text-xs text-gov-400 hover:text-gov-300 font-semibold flex items-center gap-1">
                View on Map <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading active works...</div>
            ) : activePermits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No active road-digging reported in the city.</div>
            ) : (
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {activePermits.map((permit) => (
                  <div key={permit._id} className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-xl hover:border-slate-800 transition flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">{permit.roadName}</p>
                      <p className="text-[11px] text-slate-400">Ward: {permit.ward} | Depth: {permit.depth} m</p>
                      <p className="text-[10px] text-slate-500 leading-normal italic">"{permit.purpose}"</p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase">
                        Active
                      </span>
                      <span className="text-[9px] text-slate-500">
                        Until {new Date(permit.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Complaints Shortcut */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-850 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
                <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  <Info className="h-4.5 w-4.5 text-gov-400" />
                  Your Complaints
                </h3>
                <Link to="/tracking" className="text-[11px] text-gov-400 hover:text-gov-300 font-semibold">
                  Track
                </Link>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading complaints...</div>
              ) : complaints.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  You haven't reported any complaints yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {complaints.slice(0, 3).map((comp) => (
                    <div key={comp._id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-300 truncate max-w-[120px]">{comp.complaintType}</span>
                        <span className="text-[9px] font-bold text-gov-400 uppercase bg-gov-500/10 px-1.5 py-0.5 rounded">
                          {comp.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[10px] line-clamp-1 italic">"{comp.description}"</p>
                      <p className="text-[9px] text-slate-500 text-right">{new Date(comp.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-850 mt-4">
              <Link
                to="/report"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gov-600 hover:bg-gov-500 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                File Utility Complaint
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
