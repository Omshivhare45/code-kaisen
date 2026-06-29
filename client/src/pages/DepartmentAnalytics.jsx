import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, HelpCircle } from 'lucide-react';

const DepartmentAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get('/api/analytics');
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-500">Loading department analytics dashboards...</div>;
  }

  // Formatting permits data for pie chart
  const permitPieData = Object.entries(data?.permits || {}).map(([key, value]) => ({
    name: key,
    value,
  })).filter(item => item.value > 0);

  const PIE_COLORS = {
    Pending: '#eab308', // Yellow
    Approved: '#0f766e', // Teal
    Active: '#f97316', // Orange
    Completed: '#10b981', // Green
    Conflict: '#ef4444', // Red
    Rejected: '#64748b' // Slate
  };

  // Formatting ward complaints for bar chart
  const wardBarData = data?.complaintsByWard?.map(w => ({
    ward: w._id || 'Unknown',
    Complaints: w.count
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Utility Coordination Analytics</h2>
        <p className="text-xs text-slate-400 mt-1">Review statistical graphs, department SLA performance, and GIS conflict rates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Permits Distribution */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 flex items-center gap-2">
            <PieIcon className="h-4.5 w-4.5 text-gov-400" />
            Excavation Permits Status Breakdown
          </h3>

          <div className="h-[250px] w-full flex items-center justify-center">
            {permitPieData.length === 0 ? (
              <span className="text-xs text-slate-500">No permit records found</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={permitPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {permitPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || '#ffffff'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Complaints by Ward */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-gov-400" />
            Citizen Complaints Distribution per Ward
          </h3>

          <div className="h-[250px] w-full">
            {wardBarData.length === 0 ? (
              <span className="text-xs text-slate-500">No complaints reported</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wardBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="ward" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="Complaints" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Department Performance Comparison */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-gov-400" />
            Multi-Utility Performance (Assigned vs Resolved Complaints)
          </h3>

          <div className="h-[250px] w-full">
            {data?.departmentPerformance?.length === 0 ? (
              <span className="text-xs text-slate-500">No multi-utility stats logged</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.departmentPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="department" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="complaints" name="Total Assigned Complaints" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved Complaints" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="permits" name="Permit Requests" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentAnalytics;
