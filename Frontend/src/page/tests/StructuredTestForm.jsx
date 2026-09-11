import React from 'react';
import { computeDerivedFields } from './testFormCalculations';

const inputClass = "rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 disabled:bg-gray-50";
const cellInputClass = "w-20 rounded-md border border-gray-300 px-1.5 py-1 text-xs outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 disabled:bg-gray-50";

function FieldsSection({ section, formData, onFieldChange, readOnly }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{section.label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {section.fields.map((field) => {
          const key = `${section.key}.${field.key}`;
          const value = formData[key] ?? '';
          const disabled = readOnly || field.auto;
          return (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">
                {field.label}{field.auto ? ' (auto)' : ''}
              </label>
              {field.multiline ? (
                <textarea
                  disabled={disabled}
                  value={value}
                  onChange={(e) => onFieldChange(key, e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              ) : (
                <input
                  disabled={disabled}
                  value={value}
                  onChange={(e) => onFieldChange(key, e.target.value)}
                  placeholder={field.defaultValue || ''}
                  className={inputClass}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableSection({ section, formData, onFieldChange, readOnly }) {
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
                <td className="px-2 py-1 font-medium text-gray-700 whitespace-nowrap bg-gray-50">
                  {row.label}{row.auto ? ' *' : ''}
                </td>
                {section.columns.map((col) => {
                  const key = `${section.key}.${row.key}.${col.key}`;
                  const value = formData[key] ?? '';
                  const disabled = readOnly || row.auto || col.auto;
                  return (
                    <td key={col.key} className="px-1 py-1">
                      <input
                        disabled={disabled}
                        value={value}
                        onChange={(e) => onFieldChange(key, e.target.value)}
                        className={cellInputClass}
                      />
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
export default function StructuredTestForm({ schema, formData, onChange, readOnly }) {
  if (!schema) return null;

  const handleFieldChange = (key, value) => {
    const draft = { ...formData, [key]: value };
    onChange(computeDerivedFields(schema.formula_set, draft));
  };

  return (
    <div className="space-y-5">
      {schema.sections.map((section) =>
        section.type === 'table' ? (
          <TableSection key={section.key} section={section} formData={formData} onFieldChange={handleFieldChange} readOnly={readOnly} />
        ) : (
          <FieldsSection key={section.key} section={section} formData={formData} onFieldChange={handleFieldChange} readOnly={readOnly} />
        )
      )}
    </div>
  );
}
