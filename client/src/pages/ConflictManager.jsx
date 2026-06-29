import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Layers, Calendar, HelpCircle, Check, X, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';

const ConflictManager = () => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchConflicts = async () => {
    try {
      const res = await axios.get('/api/permits?status=Conflict');
      if (res.data.success) {
        setConflicts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching conflicts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  const handleResolveConflict = async (id, resolveStatus) => {
    setActionLoading(true);
    try {
      const res = await axios.put(`/api/admin/permits/${id}/resolve`, {
        status: resolveStatus,
        remarks: `Manually resolved by Nodal Officer as ${resolveStatus}`,
      });

      if (res.data.success) {
        toast.success(`Conflict manually overridden to: ${resolveStatus}`);
        fetchConflicts();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve conflict.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">GIS Conflict Management Center</h2>
        <p className="text-xs text-slate-400 mt-1">Review overlapping excavations and execute manual override permits to protect road networks</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading conflict registry...</div>
      ) : conflicts.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3 glass-panel rounded-2xl border border-slate-850">
          <ShieldAlert className="h-10 w-10 text-emerald-500 animate-pulse" />
          <p className="text-xs">No active permits currently report overlapping conflicts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((permit) => (
            <div key={permit._id} className="p-5 glass-panel border border-red-500/20 bg-red-950/5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-200">{permit.roadName} ({permit.ward})</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Ref ID: {permit._id} | Dig Depth: {permit.depth} m</p>
                  </div>
                </div>

                {/* Overriding actions */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleResolveConflict(permit._id, 'Approved')}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Force Approve
                  </button>
                  <button
                    onClick={() => handleResolveConflict(permit._id, 'Rejected')}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Reject Permit
                  </button>
                </div>
              </div>

              {/* Conflict visual layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Requesting department */}
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-gov-400">Requesting Division</span>
                  <p className="font-semibold text-slate-200">{permit.department?.name}</p>
                  <p className="text-slate-400">Schedule: {new Date(permit.startDate).toLocaleDateString()} to {new Date(permit.endDate).toLocaleDateString()}</p>
                  <p className="text-slate-400 italic">"{permit.purpose}"</p>
                  <p className="text-slate-500">Applicant: {permit.applicantName} ({permit.applicantPhone})</p>
                </div>

                {/* Conflicting department details */}
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-400">Overlapping Schedule Collisions</span>
                  {permit.conflictingPermits?.map((other) => (
                    <div key={other._id} className="space-y-1">
                      <p className="font-semibold text-slate-200">{other.department?.name || 'Department'}</p>
                      <p className="text-slate-400">Schedules: {new Date(other.startDate).toLocaleDateString()} to {other.endDate ? new Date(other.endDate).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-slate-500">Status: <span className="text-red-400 font-semibold">{other.status}</span></p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Joint Excavation checklist */}
              <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4.5 w-4.5 text-gov-400" />
                  <span>Joint Excavation Status:</span>
                </div>
                
                <span className="font-semibold text-slate-300">
                  {permit.jointExcavationAgreedBy?.length > 0 ? (
                    <span className="text-emerald-400 font-bold">Agreed by conflicting parties</span>
                  ) : (
                    'Joint work recommended, pending coordination agreement.'
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConflictManager;
