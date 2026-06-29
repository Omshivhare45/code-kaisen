import React, { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Calendar, Layers, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const ConflictCard = ({ permit, onUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isOfficer = user?.role === 'Department Officer';
  const myDeptId = user?.department?._id;

  // Check if my department has already agreed to joint excavation
  const hasAgreed = permit.jointExcavationAgreedBy?.includes(myDeptId);

  const handleAgreeJoint = async () => {
    setLoading(true);
    try {
      const res = await axios.put(`/api/permits/${permit._id}/agree-joint`);
      if (res.data.success) {
        toast.success('Successfully agreed to Joint Excavation coordination!');
        if (onUpdate) onUpdate(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to agree to joint excavation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-5 backdrop-blur-sm flex flex-col gap-4 animate-pulse-border">
      {/* Title Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-red-500/20 p-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-extrabold text-sm text-red-200">Utility Permit Conflict Flagged</h4>
          <p className="text-xs text-red-400/80 mt-0.5">
            A collision has been detected. Overlapping schedules/geography on <span className="font-bold text-red-200">{permit.roadName}</span>
          </p>
        </div>
        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider self-start">
          Conflict
        </span>
      </div>

      {/* Details Comparison Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-y border-red-950/30 py-3 text-xs">
        {/* original project */}
        <div className="space-y-1 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
          <p className="font-bold text-gov-400 uppercase tracking-wide text-[10px]">Your Department Request</p>
          <p className="font-semibold text-slate-200">{permit.department?.name || 'My Department'}</p>
          <p className="text-slate-400"><span className="font-semibold">Schedule:</span> {new Date(permit.startDate).toLocaleDateString()} to {new Date(permit.endDate).toLocaleDateString()}</p>
          <p className="text-slate-400"><span className="font-semibold">Depth:</span> {permit.depth} m | <span className="font-semibold">Ward:</span> {permit.ward}</p>
          <p className="text-slate-300 line-clamp-1 italic">"{permit.purpose}"</p>
        </div>

        {/* conflicting project */}
        {permit.conflictingPermits?.map((other) => (
          <div key={other._id} className="space-y-1 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
            <p className="font-bold text-rose-400 uppercase tracking-wide text-[10px]">Conflicting Request</p>
            <p className="font-semibold text-slate-200">{other.department?.name}</p>
            <p className="text-slate-400"><span className="font-semibold">Schedule:</span> {new Date(other.startDate).toLocaleDateString()} to {new Date(other.endDate).toLocaleDateString()}</p>
            <p className="text-slate-400"><span className="font-semibold">Depth:</span> {other.depth} m | <span className="font-semibold">Purpose:</span> {other.purpose}</p>
            <p className="text-slate-300 line-clamp-1 italic">"{other.purpose}"</p>
          </div>
        ))}
      </div>

      {/* Joint Excavation proposal action */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h5 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-gov-400" />
            Joint Excavation Recommended
          </h5>
          <p className="text-slate-400 text-[11px] mt-1 max-w-xl">
            To prevent repeatedly digging up {permit.roadName}, the Nodal Officer suggests coordinating and executing digging simultaneously. Both departments can share cost and reduce public downtime.
          </p>
        </div>

        {isOfficer && (
          <div>
            {hasAgreed ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                <ShieldCheck className="h-4 w-4" /> Agreed to Joint Work
              </span>
            ) : (
              <button
                onClick={handleAgreeJoint}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-gov-600 hover:bg-gov-500 text-slate-950 font-bold rounded-lg text-xs transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                Coordinate Joint Work
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConflictCard;
