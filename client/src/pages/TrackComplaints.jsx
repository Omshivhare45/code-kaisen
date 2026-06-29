import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ComplaintTimeline from '../components/ComplaintTimeline';
import { Star, MessageSquareCode, FileText, Send, Eye, ShieldAlert, Award } from 'lucide-react';
import { toast } from 'react-toastify';

const TrackComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rating forms state
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('/api/complaints');
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const selectComplaint = async (id) => {
    try {
      const res = await axios.get(`/api/complaints/${id}`);
      if (res.data.success) {
        setSelectedComp(res.data.data);
        // Pre-fill rating details if already submitted
        if (res.data.data.rating) {
          setRatingScore(res.data.data.rating.score || 5);
          setRatingComment(res.data.data.rating.comment || '');
        } else {
          setRatingScore(5);
          setRatingComment('');
        }
      }
    } catch (err) {
      toast.error('Could not fetch complaint details.');
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComp) return;
    setSubmitLoading(true);

    try {
      const res = await axios.post(`/api/complaints/${selectedComp._id}/rate`, {
        score: ratingScore,
        comment: ratingComment,
      });

      if (res.data.success) {
        toast.success('Thank you for rating our resolution!');
        // Update local views
        setSelectedComp(res.data.data);
        fetchComplaints();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit rating.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Complaint Tracking Center</h2>
        <p className="text-xs text-slate-400 mt-1">Review status updates and rate resolution quality once resolved</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Complaints List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-850 h-[65vh] overflow-y-auto pr-1">
            <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 mb-4 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-gov-400" />
              Complaints Archive
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading complaints logs...</div>
            ) : complaints.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No tickets reported under your citizen card.
              </div>
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
                          : 'bg-slate-900/40 border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-slate-200">{comp.complaintType}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${priorityColor}`}>
                          {comp.priority}
                        </span>
                      </div>
                      
                      <p className="text-slate-400 text-xs mt-1.5 line-clamp-1 italic">
                        "{comp.description}"
                      </p>

                      <div className="flex justify-between items-center mt-3 border-t border-slate-850/60 pt-2.5">
                        <span className="text-[10px] font-bold text-gov-400 uppercase tracking-wider">
                          {comp.status}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(comp.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Complaint Details & Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {selectedComp ? (
            <div className="space-y-4">
              {/* Detailed Card */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
                <div className="flex justify-between items-start border-b border-slate-850 pb-3.5">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-200">{selectedComp.complaintType}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Reference ID: {selectedComp._id} | Ward: {selectedComp.ward}</p>
                  </div>
                  
                  <span className="px-3 py-1 bg-gov-600/10 text-gov-400 border border-gov-500/20 text-xs font-bold rounded-lg uppercase tracking-wider">
                    {selectedComp.status}
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-2">
                  <p className="leading-relaxed"><span className="font-bold text-slate-400">Description:</span> {selectedComp.description}</p>
                  <p><span className="font-bold text-slate-400">Assigned Department:</span> {selectedComp.department?.name || 'Triage Ongoing'}</p>
                  <p><span className="font-bold text-slate-400">Coordinates:</span> {selectedComp.latitude}, {selectedComp.longitude}</p>
                </div>

                {selectedComp.photoUrl && (
                  <div className="rounded-xl overflow-hidden max-w-sm border border-slate-800">
                    <img src={selectedComp.photoUrl} alt="Incident attachment" className="w-full object-cover max-h-56" />
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              <ComplaintTimeline steps={selectedComp.statusTimeline} currentStatus={selectedComp.status} />

              {/* Citizen Rating Star Form */}
              {selectedComp.status === 'Resolved' && (
                <div className="glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
                  <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <Award className="h-4.5 w-4.5 text-yellow-400" />
                    Rate Resolution Quality
                  </h3>
                  
                  {selectedComp.rating?.score ? (
                    // Readonly rating if already submitted
                    <div className="space-y-2 text-xs">
                      <div className="flex gap-1.5 items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4.5 w-4.5 ${
                              star <= selectedComp.rating.score ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-slate-300 italic">"{selectedComp.rating.comment || 'No comment provided'}"</p>
                      <p className="text-[10px] text-slate-500 font-semibold">Feedback submitted successfully.</p>
                    </div>
                  ) : (
                    // Submit rating form
                    <form onSubmit={handleRatingSubmit} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-semibold">Select Rating:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setRatingScore(star)}
                              className="text-slate-600 hover:scale-110 transition"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  star <= ratingScore ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">Additional Comments / Feedback</label>
                        <textarea
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                          placeholder="Your comments help us improve coordination speed..."
                          value={ratingComment}
                          onChange={(e) => setRatingComment(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gov-600 hover:bg-gov-500 text-slate-950 font-bold rounded-lg text-xs transition"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Submit Feedback
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-16 rounded-2xl border border-slate-850 flex flex-col items-center justify-center text-center text-slate-500 gap-3 h-full">
              <Eye className="h-10 w-10 text-slate-600 animate-pulse" />
              <p className="text-xs">Select any complaint from the sidebar list to view its complete progress history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackComplaints;
