import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronRight, CheckSquare, Wrench, Clock, AlertCircle } from 'lucide-react';
import { getDashboardSummary } from '../../api/dashboard';
import { listTests } from '../../api/tests';
import { listMachinery } from '../../api/machinery';
import { getSchedules } from '../../api/schedule';

const currentUserId = () => Number(localStorage.getItem('userId'));

const myTestsFor = (tests, role, userId) => {
  if ((role === 'TA' || role === 'AI')) return tests.filter((t) => t.assigned_ta_id === userId);
  if (role === 'ME') return tests.filter((t) => t.mechanical_engineer_id === userId || t.status === 'Submitted');
  return tests.filter((t) => t.chief_engineer_id === userId || t.status === 'Reviewed');
};

export default function RoleDashboard({ role }) {
  const navigate = useNavigate();
  const userId = currentUserId();
  const [summary, setSummary] = useState(null);
  const [recentTests, setRecentTests] = useState([]);
  const [machines, setMachines] = useState([]);
  const [scheduledDates, setScheduledDates] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardSummary(), listTests({}), listMachinery(), getSchedules()])
      .then(([summaryData, tests, machineList, schedules]) => {
        setSummary(summaryData);
        const mine = myTestsFor(tests, role, userId)
          .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
          .slice(0, 8);
        setRecentTests(mine);
        setMachines(machineList.slice(0, 6));
        setScheduledDates(new Set(schedules.map((s) => new Date(s.scheduled_date).toDateString())));
      })
      .finally(() => setLoading(false));
  }, [role]);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const overviewLines = summary ? [
    (role === 'TA' || role === 'AI') && { label: 'My Assigned Tests', value: summary.myAssignedTests ?? 0 },
    (role === 'TA' || role === 'AI') && { label: 'My Draft Entries', value: summary.myDraftTests ?? 0 },
    role === 'ME' && { label: 'Awaiting My Review', value: summary.pendingReview ?? 0 },
    role === 'CE' && { label: 'Awaiting My Approval', value: summary.pendingApproval ?? 0 },
    { label: 'Upcoming Schedules', value: summary.upcomingSchedules ?? 0 },
    { label: 'Reports Issued', value: summary.reportsIssued ?? 0 }
  ].filter(Boolean) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recently Accessed Tests</h2>
            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : recentTests.length === 0 ? (
              <p className="text-sm text-gray-400">No tests to show yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTests.map((test) => (
                  <div
                    key={test.test_id}
                    onClick={() => navigate('/test-management')}
                    className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="font-semibold text-sm text-gray-800">{test.machine_name} — {test.test_name}</span>
                    {['Approved', 'Rejected'].includes(test.status) ? (
                      <CheckSquare size={18} className="text-[#10b981]" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Predictive Report Completion Estimates */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Clock size={18} className="text-[#006B33]" />
                  Predictive Report Completion Dates (Rule-Based AI Estimation)
                </h3>
                <p className="text-xs text-gray-500">
                  Factors benchmark, queue (1 day/test), season window availability, and rain forecast
                </p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
                Live Estimates
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400 py-3">Loading predictions...</p>
            ) : !summary?.predictiveEstimations || summary.predictiveEstimations.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">No active machines requiring report prediction.</p>
            ) : (
              <div className="space-y-2.5">
                {summary.predictiveEstimations.slice(0, 4).map((est) => (
                  <div key={est.machineId} className="p-3 bg-gray-50 rounded-lg border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Wrench size={16} className="text-[#006B33] flex-shrink-0" />
                      <div>
                        <span className="font-bold text-sm text-gray-800">{est.machineName}</span>
                        <div className="text-[11px] text-gray-500">
                          Base: {est.standardDuration}d | Queue: +{est.workloadDelay}d {est.seasonalDelay > 0 ? `| Season wait: +${est.seasonalDelay}d` : ''} | Weather: +{est.weatherBuffer}d
                        </div>
                      </div>
                    </div>
                    <div className="text-right sm:flex-shrink-0">
                      <div className="text-xs font-bold text-[#006B33]">
                        Est. Date: {new Date(est.estimatedCompletionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Total duration: {est.estimatedDuration} days
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4">Progress</h2>
            <div className="space-y-4">
              {overviewLines.map((line) => {
                const percent = Math.min(100, Math.max(5, (line.value / 10) * 100)); // Visual estimation
                return (
                  <div key={line.label}>
                    <div className="flex justify-between items-center text-sm mb-1.5">
                      <span className="text-gray-600 font-semibold">{line.label}</span>
                      <span className="font-bold text-gray-900">{line.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#10b981] h-2 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-gray-900">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
              <CalendarIcon size={18} className="text-gray-500" />
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-gray-600">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i} className="font-bold text-gray-500 pb-1">{d}</span>
              ))}
              {cells.map((d, i) => {
                if (!d) return <span key={`e-${i}`} />;
                const isToday = d === today.getDate();
                const isScheduled = scheduledDates.has(new Date(year, month, d).toDateString());
                return (
                  <span
                    key={d}
                    className={`py-1 rounded-lg ${isToday ? 'bg-[#10b981] text-white font-bold' : isScheduled ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-700'}`}
                  >
                    {d}
                  </span>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-4">Registered Machinery</h2>
        <div className="flex gap-4 items-center overflow-x-auto pb-2">
          {machines.length === 0 && !loading ? (
            <p className="text-sm text-gray-400">No machinery registered yet.</p>
          ) : machines.map((m) => (
            <div key={m.machine_id} className="w-44 h-28 rounded-xl border border-gray-200 p-3 flex flex-col items-center justify-center bg-gray-50 flex-shrink-0 hover:shadow-md transition-shadow text-center">
              <Wrench size={22} className="text-[#006B33] mb-2" />
              <p className="text-sm font-bold text-gray-900 truncate w-full">{m.machine_name}</p>
              <p className="text-xs text-gray-500 truncate w-full">{m.model || 'No model info'}</p>
            </div>
          ))}
          <button onClick={() => navigate('/machinery')} className="w-16 h-28 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0 transition-colors">
            <ChevronRight size={24} />
          </button>
        </div>
      </section>
    </div>
  );
}
