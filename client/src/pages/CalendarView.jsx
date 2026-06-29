import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const CalendarView = () => {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermits = async () => {
      try {
        const res = await axios.get('/api/permits');
        if (res.data.success) {
          setPermits(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching calendar schedule:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPermits();
  }, []);

  // Filter permits into active, upcoming and completed
  const activePermits = permits.filter(p => p.status === 'Active');
  const upcomingPermits = permits.filter(p => p.status === 'Pending' || p.status === 'Approved');
  const conflictPermits = permits.filter(p => p.status === 'Conflict');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Excavation Schedules & Calendar</h2>
        <p className="text-xs text-slate-400 mt-1">Review active digging coordinates and upcoming utility schedules to prevent coordination collisions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Schedule list */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-orange-400" />
            Active Schedules
          </h3>
          
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading schedules...</div>
          ) : activePermits.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No active excavations today.</div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {activePermits.map(p => (
                <div key={p._id} className="p-3.5 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-orange-400">{p.department?.code}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{p.ward}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{p.roadName}</p>
                  <p className="text-[10px] text-slate-400">Ends: {new Date(p.endDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conflict Schedule warnings */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
            Conflict Schedules
          </h3>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading conflicts...</div>
          ) : conflictPermits.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No coordinated conflicts detected.</div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {conflictPermits.map(p => (
                <div key={p._id} className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-rose-400">{p.department?.code}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{p.ward}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{p.roadName}</p>
                  <p className="text-[10px] text-slate-400">Timeline: {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming schedules */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-gov-400" />
            Upcoming Schedules
          </h3>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading upcoming...</div>
          ) : upcomingPermits.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No upcoming permits scheduled.</div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {upcomingPermits.map(p => (
                <div key={p._id} className="p-3.5 bg-slate-900 border border-slate-850 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-gov-400">{p.department?.code}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{p.ward}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{p.roadName}</p>
                  <p className="text-[10px] text-slate-400">Starts: {new Date(p.startDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
