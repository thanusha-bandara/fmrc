import React, { useEffect, useState } from 'react';
import { FileCheck2, Wrench, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { listMachinery, getFinalizeStatus, finalizeReport } from '../../api/machinery';
import { getErrorMessage } from '../../api/client';

// ME's Finalize Report screen: once every 4-Wheel Tractor test for a machine has been
// reviewed, pick which one of the 3 replicates represents each of the 5 Highland/Lowland
// implement groups, then submit -- this generates the official report immediately, pending
// Chief Engineer approval (see backend/controllers/finalReportController.js).
export default function FinalizeReport() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expanded, setExpanded] = useState(null);
  const [statusByMachine, setStatusByMachine] = useState({});
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [selections, setSelections] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    listMachinery()
      .then(setMachines)
      .catch((err) => setError(getErrorMessage(err, 'Could not load machinery.')))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (machineId) => {
    setSuccessMessage('');
    if (expanded === machineId) {
      setExpanded(null);
      return;
    }
    setExpanded(machineId);
    if (!statusByMachine[machineId]) {
      setLoadingStatus(true);
      try {
        const status = await getFinalizeStatus(machineId);
        setStatusByMachine((prev) => ({ ...prev, [machineId]: status }));
        const initialSelections = {};
        status.groups.forEach((g) => {
          const alreadyTicked = g.tests.find((t) => t.include_in_final_report);
          if (alreadyTicked) initialSelections[g.group_key] = alreadyTicked.test_id;
        });
        setSelections((prev) => ({ ...prev, [machineId]: initialSelections }));
      } catch (err) {
        setError(getErrorMessage(err, 'Could not load finalize status.'));
      } finally {
        setLoadingStatus(false);
      }
    }
  };

  const pick = (machineId, groupKey, testId) => {
    setSelections((prev) => ({
      ...prev,
      [machineId]: { ...(prev[machineId] || {}), [groupKey]: testId }
    }));
  };

  const submit = async (machine) => {
    const status = statusByMachine[machine.machine_id];
    const machineSelections = selections[machine.machine_id] || {};
    if (status.groups.some((g) => !machineSelections[g.group_key])) {
      setError('Pick one replicate for every implement group before submitting.');
      return;
    }
    if (!window.confirm(`Generate the final report for ${machine.machine_name}? This sends it to the Chief Engineer for approval.`)) return;

    setSubmitting(true);
    setError('');
    try {
      await finalizeReport(machine.machine_id, machineSelections);
      setSuccessMessage(`Final report generated for ${machine.machine_name} and sent for Chief Engineer approval.`);
      const status = await getFinalizeStatus(machine.machine_id);
      setStatusByMachine((prev) => ({ ...prev, [machine.machine_id]: status }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not generate the final report.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <FileCheck2 size={26} className="text-[#006B33]" />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finalize Reports</h1>
      </div>
      <p className="text-sm text-gray-500 -mt-4">
        Once every test for a machine has been reviewed, pick one replicate per implement to generate its official report.
      </p>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">{error}</div>
      )}
      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 font-medium">{successMessage}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-8 px-6 text-center text-gray-400">Loading...</div>
        ) : machines.length === 0 ? (
          <div className="py-8 px-6 text-center text-gray-400">No machinery found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {machines.map((machine) => {
              const status = statusByMachine[machine.machine_id];
              const machineSelections = selections[machine.machine_id] || {};
              return (
                <div key={machine.machine_id}>
                  <button
                    onClick={() => toggle(machine.machine_id)}
                    className={`w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors ${expanded === machine.machine_id ? 'bg-green-50/30' : ''}`}
                  >
                    {expanded === machine.machine_id ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                    <Wrench size={16} className="text-[#006B33]" />
                    <span className="font-bold text-gray-900">{machine.machine_name}</span>
                    <span className="text-sm text-gray-500">{machine.model}</span>
                  </button>

                  {expanded === machine.machine_id && (
                    <div className="bg-gray-50 px-6 py-5 shadow-inner">
                      {loadingStatus && !status ? (
                        <div className="text-sm text-gray-500">Loading...</div>
                      ) : !status || status.groups.length === 0 ? (
                        <div className="text-sm text-gray-500 bg-white p-4 rounded-lg border border-gray-200">
                          This machine has no 4-Wheel Tractor implement tests to finalize.
                        </div>
                      ) : status.existingReport && status.existingReport.ce_status !== 'Rejected' ? (
                        <div className="text-sm bg-white p-4 rounded-lg border border-gray-200">
                          <p className="font-semibold text-gray-700">
                            A final report already exists for this machine — {status.existingReport.ce_status === 'Approved' ? 'approved by the Chief Engineer.' : 'pending Chief Engineer approval.'}
                          </p>
                        </div>
                      ) : !status.ready ? (
                        <div className="text-sm bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
                          {status.notReviewedCount} of {status.totalCount} tests still need to be reviewed by a Mechanical Engineer before this machine can be finalized.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {status.groups.map((group) => (
                            <div key={group.group_key} className="bg-white border border-gray-200 rounded-lg p-4">
                              <p className="text-sm font-bold text-gray-800 mb-2">{group.implement_label}</p>
                              <div className="grid sm:grid-cols-3 gap-2">
                                {group.tests.map((t) => (
                                  <label
                                    key={t.test_id}
                                    className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                                      machineSelections[group.group_key] === t.test_id
                                        ? 'border-2 border-[#006B33] bg-green-50'
                                        : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`group-${machine.machine_id}-${group.group_key}`}
                                      checked={machineSelections[group.group_key] === t.test_id}
                                      onChange={() => pick(machine.machine_id, group.group_key, t.test_id)}
                                      className="mt-0.5"
                                    />
                                    <span className="text-xs text-gray-700">
                                      <span className="font-semibold block">{t.test_name}</span>
                                      <span className={t.me_recommendation === 'Recommended' ? 'text-green-700' : 'text-red-600'}>
                                        {t.me_recommendation}
                                      </span>
                                      {t.me_comments && <span className="block text-gray-500 mt-0.5">{t.me_comments}</span>}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}

                          {status.singular.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <p className="text-sm font-bold text-gray-800 mb-2">Other Tests</p>
                              <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
                                {status.singular.map((t) => (
                                  <div key={t.test_id} className="flex items-center gap-1.5">
                                    <CheckCircle2 size={13} className="text-[#006B33] flex-shrink-0" />
                                    {t.test_name} — <span className="font-semibold">{t.me_recommendation}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => submit(machine)}
                            disabled={submitting}
                            className="bg-[#006B33] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60"
                          >
                            {submitting ? 'Generating...' : 'Generate Final Report'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
