import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ComplaintTimeline from '../components/ComplaintTimeline';
import { FileText, Eye, AlertCircle, Edit, CheckSquare, MessageSquareCode } from 'lucide-react';
import { toast } from 'react-toastify';

const ComplaintsQueue = () => {
  const [complaints, setComplaints] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [status, setStatus] = useState('In Progress');
  const [remarks, setRemarks] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchQueue = async () => {
    try {
      const res = await axios.get('/api/complaints');
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching complaints queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const selectComplaint = async (id) => {
    try {
      const res = await axios.get(`/api/complaints/${id}`);
      if (res.data.success) {
        setSelectedComp(res.data.data);
        setStatus(res.data.data.status === 'Received' ? 'In Progress' : res.data.data.status);
        setRemarks('');
      }
    } catch (err) {
      toast.error('Could not fetch complaint details');
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedComp) return;
    setSubmitLoading(true);

    try {
      const res = await axios.put(`/api/complaints/${selectedComp._id}/status`, {
        status,
        remarks,
      });

      if (res.data.success) {
        toast.success('Complaint status updated successfully!');
        setSelectedComp(res.data.data);
        fetchQueue();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Citizen Complaints Queue</h2>
        <p className="text-xs text-slate-400 mt-1">Review issues assigned to your department, log inspections, and submit resolutions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-850 h-[65vh] overflow-y-auto pr-1">
            <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 mb-4 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-gov-400" />
              Incoming Tickets
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading complaints...</div>
            ) : complaints.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No complaints currently queued.</div>
            ) : (
              <div className="space-y-3">
                {complaints.map((comp) => {
                  const isSelected = selectedComp?._id === comp._id;
                  let priorityColor = 'text-blue-400 bg-blue-500/10 border-blue-500/25';
                  if (comp.priority === 'High') priorityColor = 'text-rose-400 bg-rose-500/10 border-rose-500/25';

                  return (
                    <div
                      key={comp._id}
                      onClick={() => selectComplaint(comp._id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? 'bg-gov-750/20 border-gov-500/40 shadow-lg'
                          : 'bg-slate-900/40 border-slate-850 hover:border-slate-850'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-slate-200 truncate max-w-[120px]">{comp.complaintType}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${priorityColor}`}>
                          {comp.priority}
                        </span>
                      </div>
                      
                      <p className="text-slate-400 text-xs mt-1.5 line-clamp-1 italic">
                        "{comp.description}"
                      </p>

                      <div className="flex justify-between items-center mt-3 border-t border-slate-850/60 pt-2.5">
                        <span className="text-[10px] font-bold text-gov-400 uppercase">
                          {comp.status}
                        </span>
                        <span className="text-[9px] text-slate-500">{comp.ward}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-2 space-y-4">
          {selectedComp ? (
            <div className="space-y-4">
              <div className="glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
                <div className="flex justify-between items-start border-b border-slate-850 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-200">{selectedComp.complaintType}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">ID: {selectedComp._id} | Ward: {selectedComp.ward}</p>
                  </div>
                  
                  <span className="px-3 py-1 bg-gov-600/10 text-gov-400 border border-gov-500/20 text-xs font-bold rounded-lg uppercase tracking-wider">
                    {selectedComp.status}
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-2">
                  <p><span className="font-bold text-slate-400">Reporter:</span> {selectedComp.citizen?.name} ({selectedComp.citizen?.phone})</p>
                  <p className="leading-relaxed"><span className="font-bold text-slate-400">Issue Details:</span> {selectedComp.description}</p>
                  <p><span className="font-bold text-slate-400">GPS Coordinates:</span> {selectedComp.latitude}, {selectedComp.longitude}</p>
                </div>

                {selectedComp.photoUrl && (
                  <div className="rounded-xl overflow-hidden max-w-sm border border-slate-800">
                    <img src={selectedComp.photoUrl} alt="Complaint Attachment" className="w-full object-cover max-h-56" />
                  </div>
                )}
              </div>

              {/* Status form update */}
              {selectedComp.status !== 'Resolved' && (
                <div className="glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
                  <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <Edit className="h-4.5 w-4.5 text-gov-400" />
                    Log Progress Update
                  </h3>

                  <form onSubmit={handleStatusUpdate} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Set Update Status</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="In Progress">In Progress (Under Investigation)</option>
                        <option value="Resolved">Resolved (Excavation Rectified/Closed)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Action Remarks / Log Comments</label>
                      <textarea
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                        placeholder="Log detailed updates (e.g. trench filled, asphalt paved)..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-gov-600 hover:bg-gov-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Save Status Update
                    </button>
                  </form>
                </div>
              )}

              {/* Timeline components */}
              <ComplaintTimeline steps={selectedComp.statusTimeline} currentStatus={selectedComp.status} />
            </div>
          ) : (
            <div className="glass-panel p-16 rounded-2xl border border-slate-850 flex flex-col items-center justify-center text-center text-slate-500 gap-3 h-full">
              <Eye className="h-10 w-10 text-slate-600 animate-pulse" />
              <p className="text-xs">Select any citizen complaint from the left-hand queue to inspect details and log updates</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintsQueue;
