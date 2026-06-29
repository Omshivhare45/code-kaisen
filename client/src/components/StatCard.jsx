import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, description, trend, trendType = 'up', loading = false }) => {
  if (loading) {
    return (
      <div className="p-5 glass-card rounded-2xl border border-slate-800 animate-pulse space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-slate-800 rounded w-24"></div>
          <div className="h-8 bg-slate-800 rounded-lg w-8"></div>
        </div>
        <div className="h-8 bg-slate-800 rounded w-16"></div>
        <div className="h-3 bg-slate-800 rounded w-32"></div>
      </div>
    );
  }

  return (
    <div className="p-5 glass-card rounded-2xl border border-slate-850 hover:border-slate-700/60 transition-all duration-300 shadow-lg flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-gov-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-2xl font-extrabold text-white tracking-tight">{value}</h3>
      </div>

      {(description || trend) && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
          {trend && (
            <span
              className={`flex items-center font-bold ${
                trendType === 'up' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trendType === 'up' ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
              {trend}
            </span>
          )}
          <span className="truncate">{description}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
