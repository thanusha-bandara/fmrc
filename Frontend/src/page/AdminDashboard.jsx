import React, { useEffect, useState } from 'react';
import { Users, Database, ClipboardList, FileCheck2 } from 'lucide-react';
import { getDashboardSummary } from '../api/dashboard';
import { listReports } from '../api/reports';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.allSettled([getDashboardSummary(), listReports()])
      .then(([summaryResult, reportsResult]) => {
        if (summaryResult.status === 'fulfilled') {
          setSummary(summaryResult.value);
        } else {
          setError('Could not load system stats.');
        }
        if (reportsResult.status === 'fulfilled') {
          setReports(reportsResult.value.slice(0, 6));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { title: 'Active Users', value: summary?.activeUsers ?? '-', icon: Users },
    { title: 'Registered Machines', value: summary?.totalMachines ?? '-', icon: Database },
    { title: 'Total Tests', value: summary?.totalTests ?? '-', icon: ClipboardList },
    { title: 'Reports Issued', value: summary?.reportsIssued ?? '-', icon: FileCheck2 },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Overview</h1>
        {summary?.gaAccuracy && (
            <div className="bg-[#006B33] text-white px-4 py-2 rounded-lg flex items-center gap-3 shadow-md">
                <div className="flex flex-col">
                    <span className="text-xs text-green-100 font-medium uppercase tracking-wider">AI Scheduler Health</span>
                    <span className="text-lg font-bold">{summary.gaAccuracy.accuracy}% Optimized</span>
                </div>
                <div className="h-8 w-px bg-green-600 mx-2"></div>
                <div className="flex flex-col text-right">
                    <span className="text-xs text-green-100 font-medium uppercase tracking-wider">Fitness Score</span>
                    <span className="text-lg font-bold">{summary.gaAccuracy.score}</span>
                </div>
            </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-[#006B33]">
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">{s.title}</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {summary?.testsByStatus && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tests by Status</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(summary.testsByStatus).map(([status, count]) => (
              <span key={status} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                {status}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Certifications</h2>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-gray-400">No reports generated yet.</p>
          ) : reports.map((r) => (
            <div key={r.report_id} className="text-sm text-gray-600 flex justify-between border-b border-gray-100 pb-2">
              <span>{r.machine_name} - {r.test_name} approved by {r.approved_by_name}</span>
              <span className="text-gray-400">{new Date(r.approval_date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
