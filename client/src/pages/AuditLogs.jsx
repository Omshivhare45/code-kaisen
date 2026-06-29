import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, ShieldAlert } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get('/api/admin/audit-logs');
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">System Audit Trail</h2>
        <p className="text-xs text-slate-400 mt-1">Review authenticated actions, administrator overrides, and coordinate logs</p>
      </div>

      <div className="glass-panel p-5 rounded-2xl border border-slate-850">
        <h3 className="font-bold text-sm text-slate-200 border-b border-slate-850 pb-3 mb-4 flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-gov-400" />
          Audit Logs
        </h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading system logs...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-slate-600" />
            <p className="text-xs">No audit records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  <th className="pb-3 pl-2">Timestamp</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Executing User</th>
                  <th className="pb-3">Log Details</th>
                  <th className="pb-3 text-right pr-2">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 pl-2 text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 font-semibold text-slate-300">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-gov-400 border border-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {log.user ? `${log.user.name} (${log.user.role})` : 'System Task'}
                    </td>
                    <td className="py-3 text-slate-300 leading-normal max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3 text-right text-slate-500 font-mono pr-2">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
