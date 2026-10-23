import React from 'react';
import { computeDerivedFields } from './testFormCalculations';

const inputClass = "rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 disabled:bg-gray-50";
const cellInputClass = "w-24 rounded-md border border-gray-300 px-1.5 py-1 text-xs outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 disabled:bg-gray-50";

function FieldsSection({ section, formData, onFieldChange, readOnly, reviewMode, reviewProgress = {}, onToggleReview, errors = {}, locked = false }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{section.label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {section.fields.map((field) => {
          const key = `${section.key}.${field.key}`;
          const value = formData[key] ?? '';
          const disabled = readOnly || field.auto || locked;
          const hasError = !field.auto && !!errors[key];

          const currentClass = hasError
            ? "rounded-md border-2 border-red-500 bg-red-50 px-2.5 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200 text-red-900"
            : `${inputClass} ${locked ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' : ''}`;

          return (
            <div key={key} id={`field-${key.replace(/\./g, '-')}`} className="flex flex-col gap-1 relative">
              <div className="flex justify-between items-center">
                <label className={`text-xs ${hasError ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                  {field.label}{field.auto ? ' (auto)' : ''} {!field.auto && !readOnly && <span className="text-red-500">*</span>}
                </label>
                {reviewMode && (
                  <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => onToggleReview(key)}>
                    <input type="checkbox" checked={!!reviewProgress[key]} readOnly className="cursor-pointer" />
                    <span className={`text-[10px] font-bold ${reviewProgress[key] ? 'text-green-600' : 'text-gray-400'}`}>Verify</span>
                  </div>
                )}
              </div>
              {field.multiline ? (
                <textarea
                  disabled={disabled}
                  value={value}
                  onChange={(e) => onFieldChange(key, e.target.value)}
                  rows={2}
                  placeholder={locked ? 'Locked until date & time entered' : (field.defaultValue || '')}
                  className={`${currentClass} resize-none`}
                />
              ) : (
                <input
                  disabled={disabled}
                  value={value}
                  onChange={(e) => onFieldChange(key, e.target.value)}
                  placeholder={locked ? 'Locked until date & time entered' : (field.defaultValue || '')}
                  className={currentClass}
                />
              )}
              {hasError && (
                <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1 mt-0.5">
                  <span>⚠️</span> Cannot submit without filling
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableSection({ section, formData, onFieldChange, readOnly, reviewMode, reviewProgress = {}, onToggleReview, errors = {}, locked = false }) {
  const hasAuto = section.rows.some((r) => r.auto) || section.columns.some((c) => c.auto);
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{section.label}</p>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-2 py-1.5 border-b border-gray-200"></th>
              {section.columns.map((col) => (
                <th key={col.key} className="text-left px-2 py-1.5 border-b border-gray-200 text-gray-500 font-semibold whitespace-nowrap">
                  {col.label}{col.auto ? ' *' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.key} className="border-b border-gray-100 last:border-b-0">
                <td className="px-2 py-1 font-medium text-gray-700 whitespace-nowrap bg-gray-50 flex items-center justify-between">
                  <span>{row.label}{row.auto ? ' *' : ''}</span>
                  {reviewMode && (
                    <div className="flex items-center gap-1 cursor-pointer select-none ml-2" onClick={() => onToggleReview(`${section.key}.${row.key}`)}>
                      <input type="checkbox" checked={!!reviewProgress[`${section.key}.${row.key}`]} readOnly className="cursor-pointer h-2.5 w-2.5" />
                    </div>
                  )}
                </td>
                {section.columns.map((col) => {
                  const key = `${section.key}.${row.key}.${col.key}`;
                  const value = formData[key] ?? '';
                  const disabled = readOnly || row.auto || col.auto || locked;
                  const hasError = !row.auto && !col.auto && !!errors[key];

                  const currentCellClass = hasError
                    ? "w-24 rounded-md border-2 border-red-500 bg-red-50 px-1.5 py-1 text-xs outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200 text-red-900"
                    : `${cellInputClass} ${locked ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' : ''}`;

                  return (
                    <td key={col.key} id={`field-${key.replace(/\./g, '-')}`} className="px-1 py-1 align-top">
                      <input
                        disabled={disabled}
                        value={value}
                        onChange={(e) => onFieldChange(key, e.target.value)}
                        placeholder={locked ? 'Locked' : ''}
                        className={currentCellClass}
                      />
                      {hasError && (
                        <span className="text-[9px] font-semibold text-red-600 block mt-0.5 leading-tight whitespace-nowrap">
                          Cannot submit without filling
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasAuto && <p className="text-[10px] text-gray-400">* auto-calculated</p>}
    </div>
  );
}

// Renders a full data-entry form for one of the 5 structured test schemas (LAB, SPEED,
// HIGHLAND, LOWLAND, TRANSPORT), fetched from the backend (Test_Form_Schemas), matching
// FMRC's real paper data sheets. `formData` is the flat, composite-dotted-key object stored
// in Test_Records.form_data; auto-calculated fields are recomputed on every change via
// computeDerivedFields (keyed by the schema's formula_set) and are always read-only.
export default function StructuredTestForm({
  schema,
  formData,
  onChange,
  readOnly,
  reviewMode,
  reviewProgress,
  onToggleReview,
  errors = {},
  locked = false,
  onClearError
}) {
  if (!schema) return null;

  const handleFieldChange = (key, value) => {
    if (onClearError) onClearError(key);
    const draft = { ...formData, [key]: value };
    onChange(computeDerivedFields(schema.formula_set, draft));
  };

  return (
    <div className="space-y-5">
      {schema.sections.map((section) =>
        section.type === 'table' ? (
          <TableSection
            key={section.key}
            section={section}
            formData={formData}
            onFieldChange={handleFieldChange}
            readOnly={readOnly}
            reviewMode={reviewMode}
            reviewProgress={reviewProgress}
            onToggleReview={onToggleReview}
            errors={errors}
            locked={locked}
          />
        ) : (
          <FieldsSection
            key={section.key}
            section={section}
            formData={formData}
            onFieldChange={handleFieldChange}
            readOnly={readOnly}
            reviewMode={reviewMode}
            reviewProgress={reviewProgress}
            onToggleReview={onToggleReview}
            errors={errors}
            locked={locked}
          />
        )
      )}
    </div>
  );
}
