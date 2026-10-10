import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { saveTestData, submitTest, reviewTest, decideTest, saveReviewProgress } from '../../api/tests';
import { getErrorMessage } from '../../api/client';
import { loadSchemaForTest } from './useTestSchema';
import StructuredTestForm from './StructuredTestForm';

function parseFormData(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

// A generic label/value editor for legacy free-form tests (no schema_id) -- each of the
// 80+ non-catalog report types has different fields, so form_data is stored as free-form
// JSON on the backend for those.
function KeyValueEditor({ pairs, setPairs, readOnly }) {
  const update = (idx, field, value) => {
    setPairs((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };
  const remove = (idx) => setPairs((prev) => prev.filter((_, i) => i !== idx));
  const add = () => setPairs((prev) => [...prev, { key: '', value: '' }]);

  return (
    <div className="space-y-2">
      {pairs.map((p, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            disabled={readOnly}
            value={p.key}
            onChange={(e) => update(idx, 'key', e.target.value)}
            placeholder="Parameter (e.g. Engine Power)"
            className="w-1/2 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 disabled:bg-gray-50"
          />
          <input
            disabled={readOnly}
            value={p.value}
            onChange={(e) => update(idx, 'value', e.target.value)}
            placeholder="Value"
            className="w-1/2 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 disabled:bg-gray-50"
          />
          {!readOnly && (
            <button type="button" onClick={() => remove(idx)} className="text-gray-400 hover:text-red-600 flex-shrink-0">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button type="button" onClick={add} className="flex items-center gap-1.5 text-xs font-semibold text-[#006B33] hover:underline mt-1">
          <Plus size={14} /> Add parameter
        </button>
      )}
      {pairs.length === 0 && readOnly && <p className="text-sm text-gray-400">No test parameters recorded.</p>}
    </div>
  );
}

// Which action this user can take on this test, derived directly from role/status/ids so the
// modal works the same whether it was opened from a role+queue list (Assigned/Pending/
// Completed) or straight off the Machinery page's test list.
function getMode(test, role, userId) {
  if (role === 'TA' && test.status === 'Draft' && test.assigned_ta_id === userId) return 'entry';
  if (role === 'ME' && test.status === 'Submitted') return 'review';
  // Tractor-catalog tests skip the per-test CE decision -- CE approves the compiled
  // final report as a whole instead, from the separate Reports for Approval screen.
  if (role === 'CE' && test.status === 'Reviewed' && test.catalog_key !== 'FOUR_WHEEL_TRACTOR') return 'decide';
  return 'readonly';
}

// Full test detail/fill modal: data entry (TA), review (ME), decide (CE), or a read-only
// view for anyone else / any other status. Reused by RoleTestList (Assigned/Pending/
// Completed) and Machinery (click a test straight off a machine's row).
export default function TestDetailModal({ test, role, userId, onClose, onSaved }) {
  const [pairs, setPairs] = useState([]);
  const [structuredData, setStructuredData] = useState(null);
  const [activeSchema, setActiveSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [recommendation, setRecommendation] = useState('Recommended');
  const [decision, setDecision] = useState('Approved');
  const [comments, setComments] = useState('');
  const [meReviewProgress, setMeReviewProgress] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setRecommendation('Recommended');
    setDecision('Approved');
    setComments('');
    setError('');
    setMeReviewProgress(test.me_review_progress || {});

    if (test.schema_id) {
      setPairs([]);
      setActiveSchema(null);
      setStructuredData(parseFormData(test.form_data));
      setSchemaLoading(true);
      loadSchemaForTest(test)
        .then((schema) => { if (!cancelled) setActiveSchema(schema); })
        .catch((err) => { if (!cancelled) setError(getErrorMessage(err, 'Could not load the test form.')); })
        .finally(() => { if (!cancelled) setSchemaLoading(false); });
    } else {
      setPairs(Object.entries(parseFormData(test.form_data)).map(([key, value]) => ({ key, value: String(value) })));
      setStructuredData(null);
      setActiveSchema(null);
      setSchemaLoading(false);
    }

    return () => { cancelled = true; };
  }, [test.test_id]);

  const mode = getMode(test, role, userId);

  const buildFormDataObject = () => {
    if (activeSchema) return structuredData || {};
    const obj = {};
    pairs.forEach((p) => { if (p.key.trim()) obj[p.key.trim()] = p.value; });
    return obj;
  };

  const finish = () => {
    onSaved();
    onClose();
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    try {
      await saveTestData(test.test_id, buildFormDataObject());
      if (!navigator.onLine) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Draft saved offline. Will sync when reconnected.', showConfirmButton: false, timer: 4000 });
      } else {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Draft saved successfully!', showConfirmButton: false, timer: 3000 });
      }
      finish();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save test data.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const result = await Swal.fire({ title: 'Are you sure?', text: 'Submit this test for review? You will not be able to edit the data after submission.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#006B33', cancelButtonColor: '#d33', confirmButtonText: 'Yes, submit it' });
    if (!result.isConfirmed) return;

    setSaving(true);
    setError('');
    try {
      await saveTestData(test.test_id, buildFormDataObject());
      await submitTest(test.test_id);
      if (!navigator.onLine) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Test submitted offline. Will sync when reconnected.', showConfirmButton: false, timer: 4000 });
      } else {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Test submitted successfully!', showConfirmButton: false, timer: 3000 });
      }
      finish();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit test.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReview = (key) => {
    setMeReviewProgress(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveReviewDraft = async () => {
    setSaving(true);
    setError('');
    try {
      await saveReviewProgress(test.test_id, meReviewProgress);
      if (!navigator.onLine) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Review progress saved offline.', showConfirmButton: false, timer: 3000 });
      } else {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Review progress saved!', showConfirmButton: false, timer: 2000 });
      }
      finish();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save review progress.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async () => {
    const result = await Swal.fire({ title: 'Are you sure?', text: `Submit as "${recommendation}"? This will send the test to the Chief Engineer.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#006B33', cancelButtonColor: '#d33', confirmButtonText: 'Yes, submit review' });
    if (!result.isConfirmed) return;

    setSaving(true);
    setError('');
    try {
      await reviewTest(test.test_id, recommendation, comments);
      if (!navigator.onLine) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Review submitted offline. Will sync when reconnected.', showConfirmButton: false, timer: 4000 });
      } else {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Review submitted successfully!', showConfirmButton: false, timer: 3000 });
      }
      finish();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not review test.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDecide = async () => {
    const result = await Swal.fire({ title: 'Are you sure?', text: `Submit final decision as "${decision}"? This action cannot be undone.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#006B33', cancelButtonColor: '#d33', confirmButtonText: 'Yes, submit decision' });
    if (!result.isConfirmed) return;

    setSaving(true);
    setError('');
    try {
      await decideTest(test.test_id, decision, comments);
      if (!navigator.onLine) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Decision submitted offline. Will sync when reconnected.', showConfirmButton: false, timer: 4000 });
      } else {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Decision submitted successfully!', showConfirmButton: false, timer: 3000 });
      }
      finish();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not decide on test.'));
    } finally {
      setSaving(false);
    }
  };

  const renderParams = (readOnly) =>
    activeSchema ? (
      <StructuredTestForm schema={activeSchema} formData={structuredData} onChange={setStructuredData} readOnly={readOnly} reviewMode={mode === 'review'} reviewProgress={meReviewProgress} onToggleReview={handleToggleReview} />
    ) : schemaLoading ? (
      <p className="text-sm text-gray-400">Loading form...</p>
    ) : (
      <KeyValueEditor pairs={pairs} setPairs={setPairs} readOnly={readOnly} />
    );

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X size={20} />
        </button>
        <h3 className="text-lg font-bold text-gray-900">{test.machine_name}</h3>
        <p className="text-sm text-gray-500 mb-4">{test.test_name}</p>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-medium mb-4">{error}</div>
        )}

        {mode === 'entry' && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">Test Parameters</p>
            {renderParams(false)}
            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveDraft} disabled={saving} className="flex-1 border border-[#006B33] text-[#006B33] py-2.5 rounded-lg font-semibold text-sm hover:bg-green-50 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button onClick={handleSubmit} disabled={saving} className="flex-1 bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </div>
        )}

        {mode === 'review' && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">Recorded Test Parameters</p>
            {renderParams(true)}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Recommendation</p>
              <div className="flex gap-2.5">
                <button onClick={() => setRecommendation('Recommended')} className={`flex-1 p-2.5 rounded-lg font-semibold text-sm transition-colors ${recommendation === 'Recommended' ? 'border-2 border-green-600 bg-green-50 text-green-700' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  Recommend
                </button>
                <button onClick={() => setRecommendation('Not Recommended')} className={`flex-1 p-2.5 rounded-lg font-semibold text-sm transition-colors ${recommendation === 'Not Recommended' ? 'border-2 border-red-600 bg-red-50 text-red-700' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  Not Recommend
                </button>
              </div>
            </div>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} placeholder="Comments (optional)"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-[#006B33]/20 focus:border-[#006B33]" />
            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveReviewDraft} disabled={saving} className="flex-1 border border-[#006B33] text-[#006B33] py-2.5 rounded-lg font-semibold text-sm hover:bg-green-50 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
              <button onClick={handleReview} disabled={saving} className="flex-1 bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        )}

        {mode === 'decide' && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">Recorded Test Parameters</p>
            {renderParams(true)}
            {test.group_key && (
              <p className={`text-sm font-semibold ${test.include_in_final_report ? 'text-[#006B33]' : 'text-gray-400'}`}>
                {test.include_in_final_report ? '✓ Marked for the Final Report' : 'Not marked for the Final Report'}
              </p>
            )}
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 space-y-1">
              <p><span className="font-semibold">ME Recommendation:</span> {test.me_recommendation}</p>
              {test.me_comments && <p><span className="font-semibold">ME Comments:</span> {test.me_comments}</p>}
              {test.mechanical_engineer_name && <p><span className="font-semibold">Reviewed by:</span> {test.mechanical_engineer_name}</p>}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Final Decision</p>
              <div className="flex gap-2.5">
                <button onClick={() => setDecision('Approved')} className={`flex-1 p-2.5 rounded-lg font-semibold text-sm transition-colors ${decision === 'Approved' ? 'border-2 border-green-600 bg-green-50 text-green-700' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  Approve
                </button>
                <button onClick={() => setDecision('Rejected')} className={`flex-1 p-2.5 rounded-lg font-semibold text-sm transition-colors ${decision === 'Rejected' ? 'border-2 border-red-600 bg-red-50 text-red-700' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  Reject
                </button>
              </div>
            </div>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} placeholder="Comments (optional)"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-[#006B33]/20 focus:border-[#006B33]" />
            <button onClick={handleDecide} disabled={saving} className="w-full bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
              {saving ? 'Submitting...' : decision === 'Approved' ? 'Approve Test' : 'Reject Test'}
            </button>
          </div>
        )}

        {mode === 'readonly' && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">Recorded Test Parameters</p>
            {renderParams(true)}
            {test.group_key && (
              <p className={`text-sm font-semibold ${test.include_in_final_report ? 'text-[#006B33]' : 'text-gray-400'}`}>
                {test.include_in_final_report ? '✓ Marked for the Final Report' : 'Not marked for the Final Report'}
              </p>
            )}
            {test.me_recommendation && test.me_recommendation !== 'Pending' && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 space-y-1">
                <p><span className="font-semibold">ME Recommendation:</span> {test.me_recommendation}</p>
                {test.me_comments && <p><span className="font-semibold">ME Comments:</span> {test.me_comments}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
