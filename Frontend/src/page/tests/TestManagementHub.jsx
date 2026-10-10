import React, { useEffect, useState } from 'react';
import { ChevronRight, CheckCircle2, Maximize2, Minimize2, Clock, CalendarDays, Wrench, X } from 'lucide-react';
import { listTests, requestReschedule, approveReschedule } from '../../api/tests';
import TestDetailModal from './TestDetailModal';
import Swal from 'sweetalert2';

const currentUserId = () => Number(localStorage.getItem('userId'));

function hasData(formData) {
  try {
    if (!formData) return false;
    const obj = typeof formData === 'string' ? JSON.parse(formData) : formData;
    return Object.keys(obj).length > 0;
  } catch { return false; }
}

function bucketize(tests, role, queueType, userId) {
  if (role === 'TA') {
    const mine = tests.filter((t) => t.assigned_ta_id === userId);
    if (queueType === 'assigned') return mine.filter((t) => t.status === 'Draft' && !hasData(t.form_data));
    if (queueType === 'pending') return mine.filter((t) => t.status === 'Draft' && hasData(t.form_data));
    return mine.filter((t) => ['Submitted', 'Reviewed', 'Approved', 'Rejected'].includes(t.status));
  }
  if (role === 'ME') {
    if (queueType === 'assigned') return tests.filter((t) => t.status === 'Submitted');
    if (queueType === 'pending') return tests.filter((t) => t.status === 'Reviewed' && t.mechanical_engineer_id === userId);
    return tests.filter((t) => t.mechanical_engineer_id === userId && ['Approved', 'Rejected'].includes(t.status));
  }
  if (queueType === 'assigned') return tests.filter((t) => t.status === 'Reviewed' && t.me_recommendation === 'Recommended');
  if (queueType === 'pending') return tests.filter((t) => t.status === 'Reviewed' && t.me_recommendation === 'Not Recommended');
  return tests.filter((t) => t.chief_engineer_id === userId && ['Approved', 'Rejected'].includes(t.status));
}

const CARD_LABELS = {
  TA: { assigned: 'Assigned Tests', pending: 'Pending Tests', completed: 'Completed Tests' },
  ME: { assigned: 'Assigned Tests', pending: 'Pending Tests', completed: 'Completed Tests' },
  CE: { assigned: 'Assigned Tests', pending: 'Pending Tests', completed: 'Completed Tests' }
};

const ACTION_LABEL = { TA: 'Start Test', ME: 'Review Test', CE: 'Review & Decide' };

// Shared test item row for both assigned card views
function AssignedTestItem({ t, isSelected, onClick, today }) {
  const tDate = t.scheduled_date ? new Date(t.scheduled_date) : null;
  const tIsToday = tDate && new Date(t.scheduled_date).setHours(0,0,0,0) === today.getTime();
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#006B33] bg-green-50' : 'border-gray-100 hover:border-[#006B33]/30 bg-white'}`}
    >
      {tDate && (
        <div className={`flex items-center gap-1 text-xs font-bold mb-1 ${tIsToday ? 'text-[#006B33]' : 'text-gray-400'}`}>
          <Clock size={11} /> {tIsToday ? 'Today' : tDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      )}
      <p className="font-bold text-sm text-gray-900 leading-tight">{t.machine_name} {t.machine_model ? `(${t.machine_model})` : ''}</p>
      <p className="text-xs text-gray-500 mt-0.5">{t.test_name}</p>
    </div>
  );
}

// Shared item row for Pending / Completed cards
function SimpleTestItem({ t, showCheck }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-bold text-sm text-gray-900">{t.machine_name} {t.machine_model ? `(${t.machine_model})` : ''}</p>
        <p className="text-xs text-gray-500">{t.test_name}</p>
      </div>
      {showCheck && <CheckCircle2 size={16} className={t.status === 'Approved' ? 'text-[#10b981]' : 'text-red-400'} />}
    </div>
  );
}

export default function TestManagementHub({ role }) {
  const userId = currentUserId();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [activeTest, setActiveTest] = useState(null);
  const [viewMode, setViewMode] = useState('date'); // 'date' | 'machine'
  const [expandedCard, setExpandedCard] = useState(null); // null | 'assigned' | 'pending' | 'completed'

  const load = () => {
    listTests({}).then((data) => {
      setTests(data);
      const assignedBucket = bucketize(data, role, 'assigned', userId).sort((a, b) => {
        const dA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : Infinity;
        const dB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : Infinity;
        return dA - dB;
      });
      if (assignedBucket.length > 0) {
        const t0 = new Date(); t0.setHours(0,0,0,0);
        let focus = assignedBucket[0];
        for (const t of assignedBucket) {
          if (t.scheduled_date) { const d = new Date(t.scheduled_date); d.setHours(0,0,0,0); if (d >= t0) { focus = t; break; } }
        }
        setSelectedTest(focus);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [role]);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const assigned = bucketize(tests, role, 'assigned', userId).sort((a, b) => {
    const dA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : Infinity;
    const dB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : Infinity;
    return dA - dB;
  });
  const pending = bucketize(tests, role, 'pending', userId);
  const completed = bucketize(tests, role, 'completed', userId);

  const isToday = selectedTest && selectedTest.scheduled_date &&
    new Date(selectedTest.scheduled_date).setHours(0,0,0,0) === today.getTime();
  const canStart = role !== 'TA' ? !!selectedTest : isToday;

  // Assigned list body (reused in card + modal)
  const AssignedListBody = ({ maxH }) => (
    <div className={`overflow-y-auto ${maxH || 'flex-1'}`}>
      {loading ? <p className="text-sm text-gray-400 py-3">Loading...</p>
      : assigned.length === 0 ? <p className="text-sm text-gray-400 py-3">No assigned tests right now.</p>
      : viewMode === 'date' ? (
        <div className="space-y-2 pb-2">
          {assigned.map(t => (
            <AssignedTestItem key={t.test_id} t={t} isSelected={selectedTest?.test_id === t.test_id} onClick={() => setSelectedTest(t)} today={today} />
          ))}
        </div>
      ) : (
        <div className="space-y-3 pb-2">
          {(() => {
            const groups = {};
            assigned.forEach(t => {
              const key = t.machine_name + (t.machine_model ? ` (${t.machine_model})` : '');
              if (!groups[key]) groups[key] = [];
              groups[key].push(t);
            });
            return Object.entries(groups).map(([machineName, machineTests]) => (
              <div key={machineName} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 flex items-center gap-2">
                  <Wrench size={12} className="text-[#006B33]" />
                  <span className="text-xs font-bold text-gray-800">{machineName}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {machineTests.map(t => {
                    const isSelected = selectedTest?.test_id === t.test_id;
                    const tDate = t.scheduled_date ? new Date(t.scheduled_date) : null;
                    const tIsToday = tDate && new Date(t.scheduled_date).setHours(0,0,0,0) === today.getTime();
                    return (
                      <div key={t.test_id} onClick={() => setSelectedTest(t)}
                        className={`px-3 py-2.5 cursor-pointer flex items-center justify-between transition-all ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                        <div>
                          <p className={`text-sm font-semibold ${isSelected ? 'text-[#006B33]' : 'text-gray-800'}`}>{t.test_name}</p>
                          {tDate && (
                            <div className={`flex items-center gap-1 text-xs font-bold mt-0.5 ${tIsToday ? 'text-[#006B33]' : 'text-gray-400'}`}>
                              <Clock size={10} /> {tIsToday ? 'Today' : tDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-[#006B33] flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );

  const handleRequestReschedule = async () => {
    if (!selectedTest) return;
    const { value: reason } = await Swal.fire({
      title: 'Request Early Test',
      html: `You are requesting to do <b>${selectedTest.test_name}</b> today.<br/><br/>Why do you need to do this instead of the scheduled date?`,
      input: 'textarea',
      inputPlaceholder: 'Type your reason here...',
      showCancelButton: true,
      confirmButtonText: 'Submit Request',
      confirmButtonColor: '#006B33',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Please provide a reason before submitting!';
        }
      }
    });

    if (reason && reason.trim()) {
      try {
        await requestReschedule(selectedTest.test_id, reason);
        Swal.fire({
          icon: 'success',
          title: 'Request Sent',
          text: 'The Mechanical Engineer will review your request.',
          timer: 2000,
          showConfirmButton: false
        });
        load();
      } catch (e) {
        const errorMsg = e.response?.data?.message || e.message || 'Could not send request.';
        Swal.fire('Error', errorMsg, 'error');
      }
    }
  };

  // Start Test button (reused in card + modal)
  const StartTestBtn = () => {
    if (!selectedTest) {
      return (
        <div className="pt-3 border-t border-gray-100">
          <button disabled className="w-full py-2.5 rounded-xl font-bold text-sm bg-gray-200 text-gray-400 cursor-not-allowed">
            {ACTION_LABEL[role]}
          </button>
        </div>
      );
    }

    if (role === 'TA' && !isToday) {
      if (selectedTest.reschedule_requested) {
         return (
           <div className="pt-3 border-t border-gray-100">
             <button disabled className="w-full py-2.5 rounded-xl font-bold text-sm bg-amber-100 text-amber-600 border border-amber-200 cursor-not-allowed">
               Reschedule Request Pending
             </button>
             <p className="text-center text-xs text-gray-400 mt-1.5 font-semibold">Waiting for ME approval</p>
           </div>
         );
      } else {
         return (
           <div className="pt-3 border-t border-gray-100">
             <button
               onClick={handleRequestReschedule}
               className="w-full py-2.5 rounded-xl font-bold text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all"
             >
               Request to do Today
             </button>
             <p className="text-center text-xs text-gray-400 mt-1.5 font-semibold">Scheduled for: {new Date(selectedTest.scheduled_date).toLocaleDateString()}</p>
           </div>
         );
      }
    }

    return (
      <div className="pt-3 border-t border-gray-100">
        <button
          onClick={() => { setExpandedCard(null); setActiveTest(selectedTest); }}
          className="w-full py-2.5 rounded-xl font-bold text-sm bg-[#1a6b3c] text-white hover:bg-[#124d2b] shadow-sm transition-all"
        >
          {ACTION_LABEL[role]}
        </button>
      </div>
    );
  };

  const handleApproveReschedule = async (t) => {
    try {
      await approveReschedule(t.test_id);
      Swal.fire({
        icon: 'success',
        title: 'Approved',
        text: 'The test has been rescheduled for today and locked.',
        timer: 2000,
        showConfirmButton: false
      });
      load();
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.message || 'Failed to approve reschedule.';
      Swal.fire('Error', errorMsg, 'error');
    }
  };

  const rescheduleRequests = tests.filter(t => t.reschedule_requested);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Test Management</h1>
      
      {/* ME Banner for Reschedule Requests */}
      {role === 'ME' && rescheduleRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-amber-800 text-sm">Reschedule Requests ({rescheduleRequests.length})</h3>
            <p className="text-xs text-amber-700">Technical Assistants have requested to perform scheduled tests today.</p>
          </div>
          <div className="flex gap-2">
            {rescheduleRequests.map(t => (
              <button
                key={t.test_id}
                onClick={() => Swal.fire({
                  title: 'Reschedule Request',
                  html: `<b>${t.technical_assistant_name || 'TA'}</b> requested to do <b>${t.test_name}</b> on <b>${t.machine_name}</b> today.<br/><br/><b>Reason:</b> ${t.reschedule_reason}`,
                  showCancelButton: true,
                  confirmButtonText: 'Approve & Move to Today',
                  confirmButtonColor: '#006B33'
                }).then(res => { if (res.isConfirmed) handleApproveReschedule(t); })}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100"
              >
                Review: {t.test_name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

        {/* ---- ASSIGNED TESTS CARD ---- */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-[420px]">
          {/* Header */}
          <div className="p-5 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">{CARD_LABELS[role]['assigned']}</h2>
                <span className="text-xs text-gray-500 font-bold border border-gray-200 rounded-full px-2 py-0.5">{loading ? '·' : assigned.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setViewMode('date')} title="Date view"
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${viewMode === 'date' ? 'bg-[#006B33] border-[#006B33] text-white' : 'border-gray-200 text-gray-400 hover:text-[#006B33]'}`}>
                  <CalendarDays size={13} />
                </button>
                <button onClick={() => setViewMode('machine')} title="Machine view"
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${viewMode === 'machine' ? 'bg-[#006B33] border-[#006B33] text-white' : 'border-gray-200 text-gray-400 hover:text-[#006B33]'}`}>
                  <Wrench size={13} />
                </button>
                <button onClick={() => setExpandedCard('assigned')} title="Expand"
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#006B33] hover:border-[#006B33]/40 transition-colors">
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>
          </div>
          {/* Scrollable list fills remaining space */}
          <div className="flex-1 overflow-y-auto px-5 min-h-0">
            <AssignedListBody maxH="h-full" />
          </div>
          {/* Start Test button pinned at bottom */}
          <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-gray-100">
            <StartTestBtn />
          </div>
        </div>

        {/* ---- SAVED DRAFTS card ---- */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-[420px]">
          <div className="p-5 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">{CARD_LABELS[role]['pending']}</h2>
                <span className="text-xs text-gray-500 font-bold border border-gray-200 rounded-full px-2 py-0.5">{loading ? '·' : pending.length}</span>
              </div>
              <button onClick={() => setExpandedCard('pending')} title="Expand"
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#006B33] hover:border-[#006B33]/40 transition-colors">
                <Maximize2 size={13} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 min-h-0 pb-5">
            {loading ? <p className="text-sm text-gray-400 py-3">Loading...</p>
            : pending.length === 0 ? <p className="text-sm text-gray-400 py-3">Nothing here right now.</p>
            : pending.map(t => <SimpleTestItem key={t.test_id} t={t} showCheck={false} />)}
          </div>
        </div>

        {/* ---- COMPLETED card ---- */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-[420px]">
          <div className="p-5 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">{CARD_LABELS[role]['completed']}</h2>
                <span className="text-xs text-gray-500 font-bold border border-gray-200 rounded-full px-2 py-0.5">{loading ? '·' : completed.length}</span>
              </div>
              <button onClick={() => setExpandedCard('completed')} title="Expand"
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#006B33] hover:border-[#006B33]/40 transition-colors">
                <Maximize2 size={13} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 min-h-0 pb-5">
            {loading ? <p className="text-sm text-gray-400 py-3">Loading...</p>
            : completed.length === 0 ? <p className="text-sm text-gray-400 py-3">Nothing here right now.</p>
            : completed.map(t => <SimpleTestItem key={t.test_id} t={t} showCheck={true} />)}
          </div>
        </div>

      </div>

      {/* ===== EXPAND MODAL OVERLAY ===== */}
      {expandedCard && (
        <div onClick={() => setExpandedCard(null)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh]">
            {/* Modal header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{CARD_LABELS[role][expandedCard === 'assigned' ? 'assigned' : expandedCard === 'pending' ? 'pending' : 'completed']}</h2>
                <span className="text-xs text-gray-500 font-bold border border-gray-200 rounded-full px-2 py-0.5">
                  {expandedCard === 'assigned' ? assigned.length : expandedCard === 'pending' ? pending.length : completed.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {expandedCard === 'assigned' && (
                  <>
                    <button onClick={() => setViewMode('date')} title="Date view"
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${viewMode === 'date' ? 'bg-[#006B33] border-[#006B33] text-white' : 'border-gray-200 text-gray-400'}`}>
                      <CalendarDays size={13} />
                    </button>
                    <button onClick={() => setViewMode('machine')} title="Machine view"
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${viewMode === 'machine' ? 'bg-[#006B33] border-[#006B33] text-white' : 'border-gray-200 text-gray-400'}`}>
                      <Wrench size={13} />
                    </button>
                  </>
                )}
                <button onClick={() => setExpandedCard(null)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-5">
              {expandedCard === 'assigned' ? (
                <AssignedListBody maxH="max-h-none" />
              ) : expandedCard === 'pending' ? (
                pending.length === 0 ? <p className="text-sm text-gray-400">Nothing here right now.</p>
                : pending.map(t => <SimpleTestItem key={t.test_id} t={t} showCheck={false} />)
              ) : (
                completed.length === 0 ? <p className="text-sm text-gray-400">Nothing here right now.</p>
                : completed.map(t => <SimpleTestItem key={t.test_id} t={t} showCheck={true} />)
              )}
            </div>

            {/* Start Test button in modal (assigned only) */}
            {expandedCard === 'assigned' && (
              <div className="p-5 border-t border-gray-100">
                <StartTestBtn />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test detail modal */}
      {activeTest && (
        <TestDetailModal
          test={activeTest}
          role={role}
          userId={userId}
          onClose={() => setActiveTest(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
