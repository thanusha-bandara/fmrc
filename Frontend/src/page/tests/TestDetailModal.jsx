import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
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
function KeyValueEditor({ pairs, setPairs, readOnly, errors = {}, locked = false, onClearError }) {
  const update = (idx, field, value) => {
    if (onClearError) {
      onClearError(`pair_${idx}_${field}`);
      onClearError('_general');
    }
    setPairs((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };
  const remove = (idx) => setPairs((prev) => prev.filter((_, i) => i !== idx));
  const add = () => setPairs((prev) => [...prev, { key: '', value: '' }]);

  return (
    <div className="space-y-3">
      {errors['_general'] && (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs font-semibold text-red-600">
          ⚠️ {errors['_general']}
        </div>
      )}
      {pairs.map((p, idx) => {
        const keyErr = errors[`pair_${idx}_key`];
        const valErr = errors[`pair_${idx}_value`];
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1/2">
                <input
                  disabled={readOnly || locked}
                  value={p.key}
                  onChange={(e) => update(idx, 'key', e.target.value)}
                  placeholder="Parameter (e.g. Engine Power) *"
                  className={`w-full rounded-md border px-2.5 py-1.5 text-sm outline-none ${
                    keyErr
                      ? 'border-2 border-red-500 bg-red-50 text-red-900'
                      : 'border-gray-300 focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20'
                  } ${locked ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'disabled:bg-gray-50'}`}
                />
                {keyErr && (
                  <p className="text-[11px] font-semibold text-red-600 mt-0.5">⚠️ Cannot submit without filling</p>
                )}
              </div>
              <div className="w-1/2">
                <input
                  disabled={readOnly || locked}
                  value={p.value}
                  onChange={(e) => update(idx, 'value', e.target.value)}
                  placeholder="Value *"
                  className={`w-full rounded-md border px-2.5 py-1.5 text-sm outline-none ${
                    valErr
                      ? 'border-2 border-red-500 bg-red-50 text-red-900'
                      : 'border-gray-300 focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20'
                  } ${locked ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'disabled:bg-gray-50'}`}
                />
                {valErr && (
                  <p className="text-[11px] font-semibold text-red-600 mt-0.5">⚠️ Cannot submit without filling</p>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  disabled={locked}
                  className="text-gray-400 hover:text-red-600 flex-shrink-0 disabled:opacity-40"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        );
      })}
      {!readOnly && (
        <button
          type="button"
          onClick={add}
          disabled={locked}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#006B33] hover:underline mt-1 disabled:opacity-40 disabled:no-underline"
        >
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
  if (Boolean(test.machine_on_hold) && role !== 'CE') return 'readonly';
  if ((role === 'TA' || role === 'AI') && test.status === 'Draft' && test.assigned_ta_id === userId) return 'entry';
  if (role === 'ME' && test.status === 'Submitted') return 'review';
  // Chief Engineer only views individual tests here -- final Approve/Reject decision happens
  // on the compiled Final Report in Reports for Approval.
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

  // Mandatory Start Date & Time
  const [testDate, setTestDate] = useState('');
  const [startTime, setStartTime] = useState('');
  // Validation errors for mandatory blanks: { [fieldKey]: 'Cannot submit without filling' }
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    setRecommendation('Recommended');
    setDecision('Approved');
    setComments('');
    setError('');
    setFieldErrors({});
    setMeReviewProgress(test.me_review_progress || {});

    const parsedData = parseFormData(test.form_data);
    const initialDate =
      parsedData.test_date ||
      parsedData['site_soil.test_date'] ||
      (test.scheduled_date ? String(test.scheduled_date).slice(0, 10) : '');
    const initialTime =
      parsedData.start_time ||
      parsedData['operational_fuel_test.start_time'] ||
      parsedData['trip_details.start_time'] ||
      '';

    setTestDate(initialDate);
    setStartTime(initialTime);

    if (test.schema_id) {
      setPairs([]);
      setActiveSchema(null);
      setStructuredData(parsedData);
      setSchemaLoading(true);
      loadSchemaForTest(test)
        .then((schema) => { if (!cancelled) setActiveSchema(schema); })
        .catch((err) => { if (!cancelled) setError(getErrorMessage(err, 'Could not load the test form.')); })
        .finally(() => { if (!cancelled) setSchemaLoading(false); });
    } else {
      setPairs(Object.entries(parsedData).filter(([k]) => k !== 'test_date' && k !== 'start_time').map(([key, value]) => ({ key, value: String(value) })));
      setStructuredData(null);
      setActiveSchema(null);
      setSchemaLoading(false);
    }

    return () => { cancelled = true; };
  }, [test.test_id]);

  const mode = getMode(test, role, userId);
  const isFormLocked = mode === 'entry' && (!testDate || !startTime);

  const handleClearError = (key) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleDateChange = (val) => {
    setTestDate(val);
    handleClearError('test_date');
    if (activeSchema) {
      setStructuredData((prev) => ({
        ...prev,
        test_date: val,
        ...(prev && 'site_soil.test_date' in prev ? { 'site_soil.test_date': val } : {})
      }));
    }
  };

  const handleStartTimeChange = (val) => {
    setStartTime(val);
    handleClearError('start_time');
    if (activeSchema) {
      setStructuredData((prev) => ({
        ...prev,
        start_time: val,
        ...(prev && 'operational_fuel_test.start_time' in prev ? { 'operational_fuel_test.start_time': val } : {}),
        ...(prev && 'trip_details.start_time' in prev ? { 'trip_details.start_time': val } : {})
      }));
    }
  };

  const buildFormDataObject = () => {
    if (activeSchema) {
      const data = { ...(structuredData || {}) };
      if (testDate) {
        data.test_date = testDate;
        const hasSiteSoil = activeSchema.sections?.some(
          (s) => s.key === 'site_soil' && s.fields?.some((f) => f.key === 'test_date')
        );
        if (hasSiteSoil) data['site_soil.test_date'] = testDate;
      }
      if (startTime) {
        data.start_time = startTime;
        const hasFuelTest = activeSchema.sections?.some(
          (s) => s.key === 'operational_fuel_test' && s.fields?.some((f) => f.key === 'start_time')
        );
        if (hasFuelTest) data['operational_fuel_test.start_time'] = startTime;
        const hasTripDetails = activeSchema.sections?.some(
          (s) => s.key === 'trip_details' && s.fields?.some((f) => f.key === 'start_time')
        );
        if (hasTripDetails) data['trip_details.start_time'] = startTime;
      }
      return data;
    }
    const obj = {};
    if (testDate) obj.test_date = testDate;
    if (startTime) obj.start_time = startTime;
    pairs.forEach((p) => { if (p.key.trim()) obj[p.key.trim()] = p.value; });
    return obj;
  };

  const validateAllFields = () => {
    const errors = {};
    if (!testDate || !String(testDate).trim()) {
      errors['test_date'] = 'Cannot submit without filling';
    }
    if (!startTime || !String(startTime).trim()) {
      errors['start_time'] = 'Cannot submit without filling';
    }

    if (activeSchema) {
      const data = structuredData || {};
      if (Array.isArray(activeSchema.sections)) {
        activeSchema.sections.forEach((section) => {
          if (section.type === 'fields' && Array.isArray(section.fields)) {
            section.fields.forEach((field) => {
              if (!field.auto) {
                const key = `${section.key}.${field.key}`;
                const val = data[key];
                if (val === undefined || val === null || String(val).trim() === '') {
                  errors[key] = 'Cannot submit without filling';
                }
              }
            });
          } else if (section.type === 'table' && Array.isArray(section.rows) && Array.isArray(section.columns)) {
            section.rows.forEach((row) => {
              section.columns.forEach((col) => {
                if (!row.auto && !col.auto) {
                  const key = `${section.key}.${row.key}.${col.key}`;
                  const val = data[key];
                  if (val === undefined || val === null || String(val).trim() === '') {
                    errors[key] = 'Cannot submit without filling';
                  }
                }
              });
            });
          }
        });
      }
    } else {
      if (pairs.length === 0) {
        errors['_general'] = 'Cannot submit without filling. Add at least one test parameter.';
      }
      pairs.forEach((p, idx) => {
        if (!p.key.trim()) {
          errors[`pair_${idx}_key`] = 'Cannot submit without filling';
        }
        if (!p.value.trim()) {
          errors[`pair_${idx}_value`] = 'Cannot submit without filling';
        }
      });
    }

    return errors;
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
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Draft saved offline. Will sync when reconnected.',
          showConfirmButton: false,
          timer: 4000
        });
      } else {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Draft saved successfully!',
          showConfirmButton: false,
          timer: 3000
        });
      }
      finish();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save test data.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validate all blank spaces
    const errors = validateAllFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Swal.fire({
        icon: 'error',
        title: 'Cannot Submit Form',
        html: `
          <div style="text-align: left; font-size: 14px; color: #374151;">
            <p style="font-weight: 700; color: #dc2626; margin-bottom: 8px;">Cannot submit without filling all fields!</p>
            <p>All blank spaces in the test data sheet must be filled before submission. <b>${Object.keys(errors).length} blank space(s)</b> detected.</p>
            <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">Please fill in all fields marked in red to proceed.</p>
          </div>
        `,
        confirmButtonColor: '#006B33',
        confirmButtonText: 'OK'
      });

      // Scroll to the first error
      setTimeout(() => {
        const firstKey = Object.keys(errors)[0];
        const el =
          document.getElementById(`field-${firstKey.replace(/\./g, '-')}`) ||
          document.getElementById('session-start-box');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Submit this test for review? You will not be able to edit the data after submission.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#006B33',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, submit it'
    });
    if (!result.isConfirmed) return;

    setSaving(true);
    setError('');
    try {
      const fullFormData = buildFormDataObject();
      await saveTestData(test.test_id, fullFormData);
      await submitTest(test.test_id);
      if (!navigator.onLine) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Test submitted offline. Will sync when reconnected.',
          showConfirmButton: false,
          timer: 4000
        });
      } else {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Test submitted successfully!',
          showConfirmButton: false,
          timer: 3000
        });
      }
      finish();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit test.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReview = (key) => {
    setMeReviewProgress((prev) => ({
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
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Review progress saved offline.',
          showConfirmButton: false,
          timer: 3000
        });
      } else {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Review progress saved!',
          showConfirmButton: false,
          timer: 2000
        });
      }
      finish();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save review progress.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Submit as "${recommendation}"? This will send the test to the Chief Engineer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#006B33',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, submit review'
    });
    if (!result.isConfirmed) return;

    setSaving(true);
    setError('');
    try {
      await reviewTest(test.test_id, recommendation, comments);
      if (!navigator.onLine) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Review submitted offline. Will sync when reconnected.',
          showConfirmButton: false,
          timer: 4000
        });
      } else {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Review submitted successfully!',
          showConfirmButton: false,
          timer: 3000
        });
      }
      finish();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not review test.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDecide = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Submit final decision as "${decision}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#006B33',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, submit decision'
    });
    if (!result.isConfirmed) return;

    setSaving(true);
    setError('');
    try {
      await decideTest(test.test_id, decision, comments);
      if (!navigator.onLine) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Decision submitted offline. Will sync when reconnected.',
          showConfirmButton: false,
          timer: 4000
        });
      } else {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Decision submitted successfully!',
          showConfirmButton: false,
          timer: 3000
        });
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
      <StructuredTestForm
        schema={activeSchema}
        formData={structuredData}
        onChange={setStructuredData}
        readOnly={readOnly}
        reviewMode={mode === 'review'}
        reviewProgress={meReviewProgress}
        onToggleReview={handleToggleReview}
        errors={fieldErrors}
        locked={isFormLocked}
        onClearError={handleClearError}
      />
    ) : schemaLoading ? (
      <p className="text-sm text-gray-400">Loading form...</p>
    ) : (
      <KeyValueEditor
        pairs={pairs}
        setPairs={setPairs}
        readOnly={readOnly}
        errors={fieldErrors}
        locked={isFormLocked}
        onClearError={handleClearError}
      />
    );

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X size={20} />
        </button>
        <h3 className="text-lg font-bold text-gray-900">{test.machine_name}</h3>
        <p className="text-sm text-gray-500 mb-4">{test.test_name}</p>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-medium mb-4">
            {error}
          </div>
        )}

        {/* Test Session Date & Start Time Section (Mandatory to unlock form) */}
        <div
          id="session-start-box"
          className={`p-4 rounded-xl border-2 transition-all mb-5 ${
            isFormLocked
              ? 'border-amber-300 bg-amber-50/60'
              : 'border-green-300 bg-green-50/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock size={16} className={isFormLocked ? 'text-amber-600' : 'text-green-700'} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Test Session Date & Start Time
              </h4>
            </div>
            {mode === 'entry' && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  !isFormLocked ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {!isFormLocked ? 'Unlocked ✓' : 'Mandatory to Unlock'}
              </span>
            )}
            {mode !== 'entry' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                Recorded
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div id="field-test_date">
              <label
                className={`block text-xs font-medium mb-1 ${
                  fieldErrors['test_date'] ? 'text-red-600 font-bold' : 'text-gray-700'
                }`}
              >
                Test Date {mode === 'entry' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                disabled={mode !== 'entry'}
                value={testDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`w-full rounded-md border px-3 py-1.5 text-sm outline-none ${
                  fieldErrors['test_date']
                    ? 'border-2 border-red-500 bg-red-50 text-red-900'
                    : 'border-gray-300 focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20'
                } disabled:bg-gray-100 disabled:text-gray-600`}
              />
              {fieldErrors['test_date'] && (
                <p className="text-[11px] font-semibold text-red-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> Cannot submit without filling
                </p>
              )}
            </div>

            <div id="field-start_time">
              <label
                className={`block text-xs font-medium mb-1 ${
                  fieldErrors['start_time'] ? 'text-red-600 font-bold' : 'text-gray-700'
                }`}
              >
                Start Time {mode === 'entry' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="time"
                disabled={mode !== 'entry'}
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className={`w-full rounded-md border px-3 py-1.5 text-sm outline-none ${
                  fieldErrors['start_time']
                    ? 'border-2 border-red-500 bg-red-50 text-red-900'
                    : 'border-gray-300 focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20'
                } disabled:bg-gray-100 disabled:text-gray-600`}
              />
              {fieldErrors['start_time'] && (
                <p className="text-[11px] font-semibold text-red-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> Cannot submit without filling
                </p>
              )}
            </div>
          </div>

          {mode === 'entry' && isFormLocked && (
            <div className="mt-2.5 p-2 bg-amber-100/70 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800 font-medium">
              <span>🔒</span>
              <span>
                Please enter the Test Date and Start Time first. All subsequent test fields are locked until provided.
              </span>
            </div>
          )}
          {mode === 'entry' && !isFormLocked && (
            <div className="mt-2 text-[11px] text-green-700 font-medium flex items-center gap-1.5">
              <span>✓</span> Test Date and Start Time recorded. You can now fill in the test parameters below.
            </div>
          )}
        </div>
        {Boolean(test.machine_on_hold) && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 font-medium mb-4">
            <span className="font-bold">Machine On Hold:</span> {test.machine_hold_reason || 'Paused by Chief Engineer.'} All recorded test data is safely preserved until the machine is unheld.
          </div>
        )}

        {mode === 'entry' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-gray-700">Test Parameters & Measurements</p>
              {isFormLocked && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Locked until Start Date & Time is filled
                </span>
              )}
            </div>
            {renderParams(false)}
            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex-1 border border-[#006B33] text-[#006B33] py-2.5 rounded-lg font-semibold text-sm hover:bg-green-50 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60"
              >
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
                <button
                  onClick={() => setRecommendation('Recommended')}
                  className={`flex-1 p-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    recommendation === 'Recommended'
                      ? 'border-2 border-green-600 bg-green-50 text-green-700'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Recommend
                </button>
                <button
                  onClick={() => setRecommendation('Not Recommended')}
                  className={`flex-1 p-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    recommendation === 'Not Recommended'
                      ? 'border-2 border-red-600 bg-red-50 text-red-700'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Not Recommend
                </button>
              </div>
            </div>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Comments (optional)"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-[#006B33]/20 focus:border-[#006B33]"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveReviewDraft}
                disabled={saving}
                className="flex-1 border border-[#006B33] text-[#006B33] py-2.5 rounded-lg font-semibold text-sm hover:bg-green-50 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
              <button
                onClick={handleReview}
                disabled={saving}
                className="flex-1 bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60"
              >
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
              <p
                className={`text-sm font-semibold ${
                  test.include_in_final_report ? 'text-[#006B33]' : 'text-gray-400'
                }`}
              >
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
                <button
                  onClick={() => setDecision('Approved')}
                  className={`flex-1 p-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    decision === 'Approved'
                      ? 'border-2 border-green-600 bg-green-50 text-green-700'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Approve
                </button>
                <button
                  onClick={() => setDecision('Rejected')}
                  className={`flex-1 p-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    decision === 'Rejected'
                      ? 'border-2 border-red-600 bg-red-50 text-red-700'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Reject
                </button>
              </div>
            </div>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Comments (optional)"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-[#006B33]/20 focus:border-[#006B33]"
            />
            <button
              onClick={handleDecide}
              disabled={saving}
              className="w-full bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? 'Submitting...' : decision === 'Approved' ? 'Approve Test' : 'Reject Test'}
            </button>
          </div>
        )}

        {mode === 'readonly' && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">Recorded Test Parameters</p>
            {renderParams(true)}
            {test.group_key && (
              <p
                className={`text-sm font-semibold ${
                  test.include_in_final_report ? 'text-[#006B33]' : 'text-gray-400'
                }`}
              >
                {test.include_in_final_report ? '✓ Marked for the Final Report' : 'Not marked for the Final Report'}
              </p>
            )}
            {test.me_recommendation && test.me_recommendation !== 'Pending' && (
              <div className={`rounded-lg p-3 text-sm space-y-1 border ${test.me_recommendation === 'Not Recommended' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <p><span className="font-semibold">ME Recommendation:</span> {test.me_recommendation}</p>
                {test.me_comments && <p><span className="font-semibold">ME Comments:</span> {test.me_comments}</p>}
                {test.mechanical_engineer_name && <p><span className="font-semibold">Reviewed by:</span> {test.mechanical_engineer_name}</p>}
              </div>
            )}
            {(test.status === 'Approved' || test.status === 'Rejected') && (
              <div className={`rounded-lg p-3 text-sm space-y-1 border ${test.status === 'Rejected' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                <p><span className="font-semibold">CE Decision:</span> {test.status}</p>
                {test.ce_comments && <p><span className="font-semibold">CE Comments:</span> {test.ce_comments}</p>}
                {test.chief_engineer_name && <p><span className="font-semibold">Decided by:</span> {test.chief_engineer_name}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
