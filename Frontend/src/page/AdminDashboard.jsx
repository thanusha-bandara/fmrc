import React, { useEffect, useState } from 'react';
import { Users, Database, ClipboardList, FileCheck2, Calendar, Clock, CloudRain, Calculator, Sun, AlertCircle } from 'lucide-react';
import { getDashboardSummary } from '../api/dashboard';
import { listReports } from '../api/reports';
import { calculateEstimation } from '../api/estimation';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Simulator state
  const [showSim, setShowSim] = useState(false);
  const [simMachine, setSimMachine] = useState('4-Wheel Tractor');
  const [simQueueCount, setSimQueueCount] = useState(3);
  const [simSeasonalDelay, setSimSeasonalDelay] = useState(0);
  const [simWeatherBuffer, setSimWeatherBuffer] = useState(1);
  const [simResult, setSimResult] = useState(null);

  const fetchDashboardData = () => {
    setLoading(true);
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
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const runSimulation = async (machineName, queueCount, seasonalDelay, weatherBuffer) => {
    try {
      const res = await calculateEstimation({
        machineName: machineName || simMachine,
        queueCount: queueCount !== undefined ? queueCount : simQueueCount,
        seasonalDelayOverride: seasonalDelay !== undefined ? seasonalDelay : simSeasonalDelay,
        weatherBufferOverride: weatherBuffer !== undefined ? weatherBuffer : simWeatherBuffer
      });
      setSimResult(res);
    } catch (e) {
      console.error("Simulation failed:", e);
    }
  };

  useEffect(() => {
    if (showSim) {
      runSimulation(simMachine, simQueueCount, simSeasonalDelay, simWeatherBuffer);
    }
  }, [simMachine, simQueueCount, simSeasonalDelay, simWeatherBuffer, showSim]);

  const stats = [
    { title: 'Active Users', value: summary?.activeUsers ?? '-', icon: Users },
    { title: 'Registered Machines', value: summary?.totalMachines ?? '-', icon: Database },
    { title: 'Total Tests', value: summary?.totalTests ?? '-', icon: ClipboardList },
    { title: 'Reports Issued', value: summary?.reportsIssued ?? '-', icon: FileCheck2 },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Overview</h1>
          <p className="text-sm text-gray-500">Live operational metrics and AI-driven predictive insights</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSim(!showSim)}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 px-3.5 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <Calculator size={17} className="text-emerald-700" />
            <span>{showSim ? 'Close Estimation Simulator' : 'Rule-Based Estimation Simulator'}</span>
          </button>
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
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">{error}</div>
      )}

      {/* Simulator Modal/Card */}
      {showSim && (
        <div className="bg-gradient-to-br from-emerald-50 to-green-50/40 p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                <Calculator size={20} className="text-[#006B33]" />
                Rule-Based Predictive Estimation Simulator
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                Formula: <span className="font-semibold">Standard Benchmark + Queue Delay (1 day/test) + Seasonal Wait Delay + Weather Buffer</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSimMachine('4-Wheel Tractor');
                  setSimQueueCount(3);
                  setSimSeasonalDelay(0);
                  setSimWeatherBuffer(1);
                }}
                className="text-xs bg-white text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded hover:bg-emerald-100 font-medium"
              >
                In-Season Tractor (+3d queue)
              </button>
              <button
                onClick={() => {
                  setSimMachine('Combine Harvester');
                  setSimQueueCount(2);
                  setSimSeasonalDelay(45);
                  setSimWeatherBuffer(2);
                }}
                className="text-xs bg-white text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded hover:bg-emerald-100 font-medium"
              >
                Off-Season Harvester (+45d season)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-emerald-900 block mb-1">Machine Type</label>
              <select
                value={simMachine}
                onChange={(e) => setSimMachine(e.target.value)}
                className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="4-Wheel Tractor">4-Wheel Tractor (Benchmark: 11d)</option>
                <option value="Combine Harvester">Combine Harvester (Benchmark: 12d)</option>
                <option value="Seeder">Seeder (Benchmark: 8d)</option>
                <option value="Disc Plough">Disc Plough (Benchmark: 5d)</option>
                <option value="Rotary Tiller">Rotary Tiller (Benchmark: 6d)</option>
                <option value="Shredder">Shredder (Benchmark: 4d)</option>
                <option value="Brush Cutter">Brush Cutter (Benchmark: 7d)</option>
                <option value="Water pump">Water pump (Benchmark: 5d)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-900 block mb-1">Pending Tests in Queue</label>
              <input
                type="number"
                min="0"
                max="30"
                value={simQueueCount}
                onChange={(e) => setSimQueueCount(Number(e.target.value))}
                className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-emerald-700">1 test = +1 day delay</span>
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-900 block mb-1">Seasonal Wait (Days)</label>
              <input
                type="number"
                min="0"
                max="180"
                value={simSeasonalDelay}
                onChange={(e) => setSimSeasonalDelay(Number(e.target.value))}
                className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-emerald-700">Days to next season window</span>
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-900 block mb-1">Weather Buffer (Days)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={simWeatherBuffer}
                onChange={(e) => setSimWeatherBuffer(Number(e.target.value))}
                className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-emerald-700">Forecasted rain days</span>
            </div>
          </div>

          {simResult && (
            <div className="bg-white p-4 rounded-xl border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-[#006B33]">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Total Estimated Duration</p>
                  <p className="text-2xl font-black text-gray-900">
                    {simResult.estimatedDuration} Days
                  </p>
                  <p className="text-xs text-emerald-700">
                    {simResult.standardDuration}d standard + {simResult.workloadDelay}d queue + {simResult.seasonalDelay}d season + {simResult.weatherBuffer}d weather
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold uppercase">Projected Delivery Date</p>
                <p className="text-lg font-bold text-[#006B33]">{simResult.estimatedCompletionDate}</p>
                <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded">
                  Season: {simResult.requiredSeason}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Stats Cards */}
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

      {/* Predictive Report Completion Estimates Table */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock size={20} className="text-[#006B33]" />
              Predictive Report Completion Dates
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Estimations factoring benchmark duration, 1-day/test queue delay, seasonal wait periods, and weather buffer
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
            Rule-Based Expert AI
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading predictions...</p>
        ) : !summary?.predictiveEstimations || summary.predictiveEstimations.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No active machinery in queue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Benchmark</th>
                  <th className="py-3 px-4">Queue Delay</th>
                  <th className="py-3 px-4">Seasonal Delay</th>
                  <th className="py-3 px-4">Weather Buffer</th>
                  <th className="py-3 px-4">Total Days</th>
                  <th className="py-3 px-4 font-bold text-[#006B33]">Estimated Report Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.predictiveEstimations.map((m) => (
                  <tr key={m.machineId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{m.machineName}</div>
                      <div className="text-xs text-gray-400">{m.model || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-medium">
                      {m.standardDuration}d
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      +{m.workloadDelay}d <span className="text-xs text-gray-400">({m.queueCount} queue)</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {m.seasonalDelay > 0 ? (
                        <span className="text-amber-700 font-medium">+{m.seasonalDelay}d ({m.requiredSeason})</span>
                      ) : (
                        <span className="text-emerald-700 text-xs">Active ({m.requiredSeason})</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      +{m.weatherBuffer}d <span className="text-xs text-gray-400">({m.rainyDaysCount} rain)</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {m.estimatedDuration} days
                    </td>
                    <td className="py-3 px-4 font-bold text-[#006B33] whitespace-nowrap">
                      {new Date(m.estimatedCompletionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
