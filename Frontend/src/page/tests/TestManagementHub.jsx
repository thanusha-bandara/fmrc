import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { listTests } from '../../api/tests';

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
  TA: { assigned: 'Assigned Tests', pending: 'Saved Drafts (In Progress)', completed: 'Completed Tests' },
  ME: { assigned: 'Assigned Tests (from TA)', pending: 'Pending Tests (Awaiting CE Approval)', completed: 'Completed Tests' },
  CE: { assigned: 'Recommended Tests', pending: 'Non-Recommended Tests', completed: 'Approved Tests' }
};

export default function TestManagementHub({ role }) {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = currentUserId();

  useEffect(() => {
    listTests({}).then(setTests).finally(() => setLoading(false));
  }, [role]);

  const assigned = bucketize(tests, role, 'assigned', userId);
  const pending = bucketize(tests, role, 'pending', userId);
  const completed = bucketize(tests, role, 'completed', userId);

  const Card = ({ queueType, items, icon }) => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900">{CARD_LABELS[role][queueType]}</h2>
          <span className="text-xs text-gray-500 font-bold border border-gray-200 rounded-full px-2 py-0.5">
            {loading ? '.' : items.length}
          </span>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3 min-h-[110px]">
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing here right now.</p>
          ) : (
            items.slice(0, 3).map((t) => (
              <div key={t.test_id} className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    {t.machine_name} {t.machine_model ? `(${t.machine_model})` : ''}
                  </p>
                  <p className="text-xs text-gray-500">{t.test_name}</p>
                </div>
                {queueType === 'completed' && (
                  <CheckCircle2 size={16} className={t.status === 'Approved' ? 'text-[#10b981]' : 'text-red-400'} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div
        onClick={() => navigate(`/${queueType === 'assigned' ? 'assigned-tests' : queueType === 'pending' ? 'pending-tests' : 'completed-tests'}`)}
        className="border-t border-gray-100 p-4 bg-gray-50/50 flex items-center justify-between text-xs font-semibold text-gray-600 hover:text-[#006B33] cursor-pointer"
      >
        <span>see more</span>
        <ChevronRight size={16} />
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Test Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <Card queueType="assigned" items={assigned} />
        <Card queueType="pending" items={pending} />
        <Card queueType="completed" items={completed} />
      </div>
    </div>
  );
}
