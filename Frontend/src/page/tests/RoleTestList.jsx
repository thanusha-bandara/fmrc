import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { listTests, requestReschedule } from '../../api/tests';
import { listReports } from '../../api/reports';
import { getErrorMessage } from '../../api/client';
import TestDetailModal from './TestDetailModal';
import Swal from 'sweetalert2';

const currentUserId = () => Number(localStorage.getItem('userId'));

function hasData(formData) {
  try {
    if (!formData) return false;
    const obj = typeof formData === 'string' ? JSON.parse(formData) : formData;
    return Object.keys(obj).length > 0;
  } catch {
    return false;
  }
}

// Splits the full test list into the bucket relevant to this role + queue type.
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
  // CE
  if (queueType === 'assigned') return tests.filter((t) => t.status === 'Reviewed' && t.me_recommendation === 'Recommended');
  if (queueType === 'pending') return tests.filter((t) => t.status === 'Reviewed' && t.me_recommendation === 'Not Recommended');
  return tests.filter((t) => t.chief_engineer_id === userId && ['Approved', 'Rejected'].includes(t.status));
}

const TITLES = {
  TA: { assigned: 'Assigned Tests', pending: 'Pending Tests', completed: 'Completed Tests' },
  ME: { assigned: 'Assigned Tests', pending: 'Pending Tests', completed: 'Completed Tests' },
  CE: { assigned: 'Assigned Tests', pending: 'Pending Tests', completed: 'Completed Tests' }
};

const STATUS_STYLES = {
  Draft: 'bg-gray-100 text-gray-700',
  Submitted: 'bg-amber-100 text-amber-700',
  Reviewed: 'bg-blue-100 text-blue-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700'
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function parseFormData(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

const CircularProgress = ({ test }) => {
  if (test.status === 'Rejected') {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm bg-yellow-200 border border-yellow-400 shadow-sm"></span>
        <span className="text-gray-900 font-semibold text-sm">on hold</span>
      </div>
    );
  }

  if (test.status === 'Approved' || test.status === 'Submitted' || test.status === 'Reviewed') {
    return (
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <svg className="transform -rotate-90 w-10 h-10">
            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-green-100" />
            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="100.53" strokeDashoffset="0" className="text-[#1a6b3c]" />
          </svg>
          <span className="absolute text-[10px] font-bold text-gray-700">100%</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">completed</span>
      </div>
    );
  }

  // Draft status - Calculate pseudo percentage
  const data = parseFormData(test.form_data);
  const keys = Object.keys(data).length;
  // Let's cap at 90% for drafts. Each key is ~15%.
  let pct = Math.min(Math.round((keys * 15)), 90);
  if (pct === 0) pct = 5;

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex items-center justify-center">
        <svg className="transform -rotate-90 w-10 h-10">
          <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-green-100" />
          <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-[#1a6b3c]" />
        </svg>
        <span className="absolute text-[10px] font-bold text-gray-700">{pct}%</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">completed</span>
    </div>
  );
};

export default function RoleTestList({ role, queueType }) {
  const navigate = useNavigate();
  const userId = currentUserId();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportsByTest, setReportsByTest] = useState({});
  const [activeTest, setActiveTest] = useState(null);
  const [selectedAssignedTest, setSelectedAssignedTest] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [machineFilter, setMachineFilter] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    listTests({})
      .then(setTests)
      .catch((err) => setError(getErrorMessage(err, 'Could not load tests.')))
      .finally(() => setLoading(false));

    if (queueType === 'completed') {
      listReports().then((reports) => {
        const map = {};
        reports.forEach((r) => { map[r.test_id] = r; });
        setReportsByTest(map);
      }).catch(() => {});
    }
  };

  useEffect(() => { load(); }, [role, queueType]);

  const bucket = bucketize(tests, role, queueType, userId)
    .filter(t => t.machine_name.toLowerCase().includes(machineFilter.toLowerCase()))
    .sort((a, b) => {
      if (queueType === 'assigned') {
        const dA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : Infinity;
        const dB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : Infinity;
        return dA - dB;
      }
      return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
    });

  useEffect(() => {
    if (queueType === 'assigned' && bucket.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let foundIndex = 0;
      for (let i = 0; i < bucket.length; i++) {
        if (bucket[i].scheduled_date) {
          const d = new Date(bucket[i].scheduled_date);
          d.setHours(0, 0, 0, 0);
          if (d >= today) {
            foundIndex = i;
            break;
          }
        }
      }
      setCurrentIndex(foundIndex);
      setSelectedAssignedTest(bucket[foundIndex]);
    } else {
      setCurrentIndex(0);
      setSelectedAssignedTest(null);
    }
  }, [tests, queueType, role]);

  const openTest = (test) => setActiveTest(test);
  const closeModal = () => setActiveTest(null);

  const isActionable = queueType === 'assigned' || (queueType === 'pending' && role === 'CE');
  const isTableView = queueType === 'pending' || queueType === 'completed'; // Matches requirement for 'pending' to have this UI

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/test-management')}
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{TITLES[role][queueType]}</h1>
        </div>
        
        <input 
          type="text" 
          placeholder="Filter by machine name..." 
          value={machineFilter}
          onChange={(e) => setMachineFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 w-full sm:w-72"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">{error}</div>
      )}

      <div className={`bg-[#fafbfa] rounded-2xl shadow-sm overflow-hidden border border-gray-200 ${isTableView ? 'py-4' : 'py-10'}`}>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : bucket.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No tests in this queue.</div>
        ) : isTableView ? (
          <div className="px-6 pb-2">
            <table className="w-full text-left border-collapse bg-white rounded-xl overflow-hidden border border-[#006B33]/20 shadow-sm">
              <tbody className="divide-y divide-[#006B33]/20">
                {bucket.map(test => (
                  <tr key={test.test_id} onClick={() => openTest(test)} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                    <td className="py-4 px-6 border-r border-[#006B33]/20 w-1/3">
                      <p className="font-bold text-lg text-gray-900">
                        {test.machine_name} {test.machine_model ? `(${test.machine_model})` : ''}
                      </p>
                      <p className="text-sm text-gray-700 mt-0.5">{test.test_name}</p>
                    </td>
                    <td className="py-4 px-6 border-r border-[#006B33]/20 w-1/3">
                      {test.scheduled_date ? (
                        <div className="text-gray-900 text-sm font-semibold">
                          scheduled for<br/>
                          <span className="text-lg">{new Date(test.scheduled_date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}</span>
                        </div>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="py-4 px-8 w-1/3">
                      <CircularProgress test={test} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col h-[520px]">
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
              {bucket.map((test) => {
                const isSelected = selectedAssignedTest?.test_id === test.test_id;
                return (
                  <div
                    key={test.test_id}
                    onClick={() => setSelectedAssignedTest(test)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#006B33] bg-green-50 shadow-md' : 'border-gray-200 bg-white hover:border-[#006B33]/30'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      {test.scheduled_date ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-[#006B33]">
                           <Clock size={16} /> 
                           {new Date(test.scheduled_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                           <Clock size={16} /> Not scheduled
                        </div>
                      )}
                      <StatusBadge status={test.status} />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">
                      {test.machine_name} {test.machine_model ? `(${test.machine_model})` : ''}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 font-medium">{test.test_name}</p>
                    {test.me_recommendation && test.me_recommendation !== 'Pending' && (
                      <p className={`text-xs font-bold mt-2 ${test.me_recommendation === 'Recommended' ? 'text-[#10b981]' : 'text-red-500'}`}>
                        ME Recommendation: {test.me_recommendation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl">
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isToday = selectedAssignedTest && selectedAssignedTest.scheduled_date && new Date(selectedAssignedTest.scheduled_date).setHours(0, 0, 0, 0) === today.getTime();
                
                const handleRoleTestListRequest = async () => {
                  if (!selectedAssignedTest) return;
                  const { value: reason } = await Swal.fire({
                    title: 'Request Early Test',
                    html: `You are requesting to do <b>${selectedAssignedTest.test_name}</b> today.<br/><br/>Why do you need to do this instead of the scheduled date?`,
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
                      await requestReschedule(selectedAssignedTest.test_id, reason);
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

                if (role === 'TA' && !isToday && selectedAssignedTest) {
                  if (selectedAssignedTest.reschedule_requested) {
                    return (
                      <div>
                        <button disabled className="w-full py-3.5 rounded-xl font-bold text-base bg-amber-100 text-amber-600 border border-amber-200 cursor-not-allowed">
                          Reschedule Request Pending
                        </button>
                        <p className="text-center text-xs text-gray-500 mt-2 font-semibold">
                          Waiting for Mechanical Engineer approval.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div>
                      <button
                        onClick={handleRoleTestListRequest}
                        className="w-full py-3.5 rounded-xl font-bold text-base bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        Request to do Today
                      </button>
                      <p className="text-center text-xs text-gray-500 mt-2 font-semibold">
                        Scheduled for: {new Date(selectedAssignedTest.scheduled_date).toLocaleDateString()}. Click above to request doing it today.
                      </p>
                    </div>
                  );
                }

                let canAction = false;
                if (role === 'TA') {
                  canAction = isToday;
                } else {
                  canAction = !!selectedAssignedTest;
                }

                return (
                  <div>
                    <button
                      disabled={!canAction}
                      onClick={() => openTest(selectedAssignedTest)}
                      className={`w-full py-3.5 rounded-xl font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 ${
                        canAction 
                          ? 'bg-[#1a6b3c] text-white hover:bg-[#124d2b]' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {role === 'TA' ? 'Start Test' : role === 'CE' ? 'Review & Decide' : 'Review Test'}
                    </button>
                    {role === 'TA' && selectedAssignedTest && (
                       <p className="text-center text-xs text-gray-500 mt-2 font-semibold">
                         {isToday 
                           ? "This test is scheduled for today. You can start it now." 
                           : "You can only start a test on its scheduled date."}
                       </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {activeTest && (
        <TestDetailModal
          test={activeTest}
          role={role}
          userId={userId}
          onClose={closeModal}
          onSaved={load}
        />
      )}
    </div>
  );
}
