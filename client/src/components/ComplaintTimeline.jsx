import React from 'react';
import { Calendar, ShieldAlert, CheckCircle2, ChevronRight, Check } from 'lucide-react';

const ComplaintTimeline = ({ steps = [], currentStatus }) => {
  const allStages = ['Received', 'Assigned', 'In Progress', 'Resolved'];
  
  // Find index of current status
  const currentIdx = allStages.indexOf(currentStatus);

  return (
    <div className="flex flex-col gap-6 p-5 glass-card rounded-2xl border border-slate-800">
      <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-2 mb-2">Complaint Status Timeline</h3>

      {/* Dynamic horizontal timeline indicator for desktop, stacking on mobile */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-2">
        {allStages.map((stage, idx) => {
          const isDone = idx <= currentIdx;
          const isCurrent = stage === currentStatus;

          // Find specific metadata log for this stage if it occurred
          const logEntry = steps.find((s) => s.status === stage);

          return (
            <React.Fragment key={stage}>
              <div className="flex items-center gap-3 md:flex-col md:items-center md:text-center md:flex-1">
                {/* Step Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                    isCurrent
                      ? 'bg-gov-500 text-slate-950 border-gov-400 ring-4 ring-gov-500/20'
                      : isDone
                      ? 'bg-gov-950 text-gov-400 border-gov-600'
                      : 'bg-slate-900 text-slate-600 border-slate-800'
                  }`}
                >
                  {isDone && !isCurrent ? <Check className="h-4.5 w-4.5" /> : idx + 1}
                </div>

                {/* Step Text Label */}
                <div className="text-left md:text-center mt-1">
                  <p
                    className={`font-semibold text-xs transition-colors ${
                      isCurrent ? 'text-gov-400' : isDone ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {stage}
                  </p>
                  
                  {logEntry ? (
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(logEntry.updatedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600 block">Pending</span>
                  )}
                </div>
              </div>

              {/* Separator Arrow */}
              {idx < allStages.length - 1 && (
                <div className="hidden md:block flex-1 h-0.5 bg-slate-800 mx-2">
                  <div
                    className={`h-full bg-gov-500 transition-all duration-500 ${
                      idx < currentIdx ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Detail remarks for each completed step */}
      <div className="mt-4 border-t border-slate-850 pt-4 space-y-3.5">
        <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Action & Remarks History</h4>
        <div className="relative border-l-2 border-slate-850 pl-4 ml-3 space-y-4">
          {steps.map((log, idx) => (
            <div key={idx} className="relative">
              {/* Pulse Circle for bullet */}
              <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-gov-500 ring-4 ring-gov-500/10"></span>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  {log.status} <span className="text-[10px] font-normal text-slate-500 ml-1.5">— {new Date(log.updatedAt).toLocaleString()}</span>
                </p>
                {log.remarks && (
                  <p className="text-xs text-slate-400 mt-1 pl-2 border-l border-slate-800 italic">
                    "{log.remarks}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComplaintTimeline;
