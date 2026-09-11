import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { listTests } from '../../api/tests';
import { listReports } from '../../api/reports';
import { getErrorMessage } from '../../api/client';
import TestDetailModal from './TestDetailModal';

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
  TA: { assigned: 'New Assigned Tests', pending: 'Saved Drafts (In Progress)', completed: 'Submitted & Completed' },
  ME: { assigned: 'Assigned Tests (from TA)', pending: 'Pending Tests (Awaiting CE Approval)', completed: 'Completed Tests' },
  CE: { assigned: 'Recommended Tests', pending: 'Non-Recommended Tests', completed: 'Approved Tests' }
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
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const bucket = bucketize(tests, role, queueType, userId).sort((a, b) => {
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
    } else {
      setCurrentIndex(0);
    }
  }, [tests, queueType, role]);

  const openTest = (test) => setActiveTest(test);
  const closeModal = () => setActiveTest(null);

  const isActionable = queueType === 'assigned' || (queueType === 'pending' && role === 'CE');
  const isTableView = queueType === 'pending' || queueType === 'completed'; // Matches requirement for 'pending' to have this UI

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/test-management')}
          className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{TITLES[role][queueType]}</h1>
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
                      <p className="font-bold text-lg text-gray-900">{test.machine_name}</p>
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
          <div className="relative flex items-center justify-center max-w-5xl mx-auto px-10 min-h-[400px]" style={{ perspective: '1200px' }}>
            {bucket.length > 1 && (
              <button
                onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : bucket.length - 1))}
                className="absolute left-0 z-20 w-12 h-12 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#1a6b3c] hover:bg-gray-50 transition"
              >
                <ArrowLeft size={24} />
              </button>
            )}

            <div className="relative w-full h-[380px] flex items-center justify-center pointer-events-none">
              {bucket.map((test, index) => {
                const diff = (index - currentIndex + bucket.length) % bucket.length;
                let position = 'hidden';
                if (diff === 0) position = 'center';
                else if (diff === 1 || diff === -(bucket.length - 1)) position = 'right';
                else if (diff === bucket.length - 1 || diff === -1) position = 'left';

                let transform = '';
                let zIndex = 0;
                let opacity = 0;

                if (position === 'center') {
                  transform = 'translateX(0) scale(1) translateZ(0)';
                  zIndex = 10;
                  opacity = 1;
                } else if (position === 'left') {
                  transform = 'translateX(-60%) scale(0.85) translateZ(-100px) rotateY(15deg)';
                  zIndex = 5;
                  opacity = 0.7;
                } else if (position === 'right') {
                  transform = 'translateX(60%) scale(0.85) translateZ(-100px) rotateY(-15deg)';
                  zIndex = 5;
                  opacity = 0.7;
                }

                if (position === 'hidden') return null;

                return (
                  <div
                    key={test.test_id}
                    className="absolute w-[340px] bg-white rounded-2xl shadow-xl border border-gray-200 p-6 flex flex-col justify-between transition-all duration-500 ease-out pointer-events-auto"
                    style={{
                      transform,
                      zIndex,
                      opacity,
                      boxShadow: position === 'center' ? '0 25px 50px -12px rgba(0,0,0,0.15)' : '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <StatusBadge status={test.status} />
                        {test.scheduled_date && (
                          <span className="flex items-center gap-1 text-xs text-gray-400 font-semibold">
                            <Clock size={12} /> {new Date(test.scheduled_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-xl text-gray-900 leading-tight">{test.machine_name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{test.test_name}</p>

                      {test.me_recommendation && test.me_recommendation !== 'Pending' && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 font-semibold mb-1">ME Recommendation</p>
                          <p className={`text-sm font-bold ${test.me_recommendation === 'Recommended' ? 'text-[#10b981]' : 'text-red-500'}`}>
                            {test.me_recommendation}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 space-y-2">
                      {isActionable && (
                        <button
                          onClick={() => openTest(test)}
                          className="w-full bg-[#1a6b3c] text-white py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-[#124d2b] transition-all"
                        >
                          {role === 'TA' ? 'Start Test' : role === 'CE' ? 'Review & Decide' : 'Review Test'}
                        </button>
                      )}
                      {!isActionable && (
                        <button
                          onClick={() => openTest(test)}
                          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {bucket.length > 1 && (
              <button
                onClick={() => setCurrentIndex((prev) => (prev < bucket.length - 1 ? prev + 1 : 0))}
                className="absolute right-0 z-20 w-12 h-12 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#1a6b3c] hover:bg-gray-50 transition"
              >
                <ArrowLeft size={24} className="rotate-180" />
              </button>
            )}
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
