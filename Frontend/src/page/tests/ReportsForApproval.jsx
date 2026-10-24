import React, { useEffect, useState } from 'react';
import { FileCheck2, Wrench, Eye, Download, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { listPendingReports, listReports, decideReport, viewReport, downloadReport } from '../../api/reports';
import { getErrorMessage } from '../../api/client';

const TRACTOR_REPORT_TYPE = 'Official Tractor Certification Report';

// Chief Engineer's queue: one Approve/Reject decision per ME-finalized compiled report (not
// per individual test) -- see backend/controllers/reportController.js#decideReport. Pending
// reports can only be viewed inline (no save-to-disk) before a decision is made; once Approved,
// the report moves to the Approved tab where it can actually be downloaded.
export default function ReportsForApproval() {
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeReport, setActiveReport] = useState(null);
  const [decision, setDecision] = useState('Approved');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([listPendingReports(), listReports()])
      .then(([pendingReports, allReports]) => {
        setPending(pendingReports);
        setApproved(allReports.filter((r) => r.ce_status === 'Approved'));
        setRejected(allReports.filter((r) => r.ce_status === 'Rejected'));
      })
      .catch((err) => setError(getErrorMessage(err, 'Could not load reports.')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openDecide = (report) => {
    setActiveReport(report);
    setDecision('Approved');
    setComments('');
    setError('');
  };

  const handleView = async (report) => {
    setError('');
    try {
      await viewReport(report.report_id);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not open the report.'));
    }
  };

  const handleDownload = async (report) => {
    setError('');
    try {
      await downloadReport(report.report_id);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not download the report.'));
    }
  };

  const handleDecide = async () => {
    const result = await Swal.fire({ title: 'Are you sure?', text: `Submit final decision as "${decision}"? This action cannot be undone.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#006B33', cancelButtonColor: '#d33', confirmButtonText: 'Yes, submit decision' });
    if (!result.isConfirmed) return;

    setSaving(true);
    setError('');
    try {
      await decideReport(activeReport.report_id, decision, comments);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Report for ${activeReport.machine_name} ${decision.toLowerCase()}.`, showConfirmButton: false, timer: 3000 });
      setActiveReport(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not decide on report.'));
    } finally {
      setSaving(false);
    }
  };

  const rows = tab === 'pending' ? pending : tab === 'approved' ? approved : rejected;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <FileCheck2 size={26} className="text-[#006B33]" />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports for Approval</h1>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === 'pending' ? 'bg-[#006B33] text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab('approved')}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === 'approved' ? 'bg-[#006B33] text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
        >
          Approved ({approved.length})
        </button>
        <button
          onClick={() => setTab('rejected')}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === 'rejected' ? 'bg-red-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
        >
          Rejected ({rejected.length})
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white border-b border-gray-200 text-sm font-semibold text-gray-600">
            <tr>
              <th className="py-4 px-6">Machine</th>
              <th className="py-4 px-6">Report Type</th>
              <th className="py-4 px-6">{tab === 'pending' ? 'Generated' : tab === 'approved' ? 'Approved' : 'Rejected'}</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="py-8 px-6 text-center text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="py-8 px-6 text-center text-gray-400">
                {tab === 'pending' ? 'No reports pending approval.' : tab === 'approved' ? 'No approved reports yet.' : 'No rejected reports.'}
              </td></tr>
            ) : rows.map((r) => (
              <tr key={r.report_id} className="hover:bg-gray-50">
                <td className="py-4 px-6 font-bold text-gray-900 flex items-center gap-2">
                  <Wrench size={16} className={tab === 'rejected' ? 'text-red-600' : 'text-[#006B33]'} /> {r.machine_name} {r.machine_model ? `(${r.machine_model})` : ''}
                </td>
                <td className="py-4 px-6 text-gray-600">
                  <div>{r.report_type}</div>
                  {tab === 'rejected' && r.ce_comments && (
                    <div className="text-xs text-red-600 font-medium mt-0.5">Reason: {r.ce_comments}</div>
                  )}
                </td>
                <td className="py-4 px-6 text-gray-600 whitespace-nowrap">{new Date(tab === 'pending' ? r.approval_date : r.decided_at || r.approval_date).toLocaleDateString()}</td>
                <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                  {tab === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleView(r)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#006B33] hover:underline bg-[#006B33]/10 px-3 py-1.5 rounded-full"
                      >
                        <Eye size={12} /> View PDF
                      </button>
                      <button
                        onClick={() => openDecide(r)}
                        className="text-xs font-bold text-white bg-[#006B33] hover:bg-green-700 px-3 py-1.5 rounded-full"
                      >
                        Approve / Reject
                      </button>
                    </>
                  ) : tab === 'approved' ? (
                    <button
                      onClick={() => handleDownload(r)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#006B33] hover:bg-green-700 px-3 py-1.5 rounded-full"
                    >
                      <Download size={12} /> Download PDF
                    </button>
                  ) : (
                    <button
                      onClick={() => handleView(r)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:underline bg-red-50 border border-red-200 px-3 py-1.5 rounded-full"
                    >
                      <Eye size={12} /> View PDF
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeReport && (
        <div onClick={() => setActiveReport(null)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
            <button onClick={() => setActiveReport(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900">{activeReport.machine_name}</h3>
            <p className="text-sm text-gray-500 mb-4">{activeReport.report_type}</p>

            <button
              onClick={() => handleView(activeReport)}
              className="w-full mb-4 inline-flex items-center justify-center gap-2 border border-[#006B33] text-[#006B33] py-2 rounded-lg font-semibold text-sm hover:bg-green-50"
            >
              <Eye size={16} /> View PDF
            </button>
            <p className="text-xs text-gray-400 -mt-3 mb-4">Downloading is available once this report is approved.</p>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Decision</p>
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
              className="w-full mt-3 rounded-lg border border-gray-300 p-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-[#006B33]/20 focus:border-[#006B33]" />
            <button onClick={handleDecide} disabled={saving} className="w-full mt-3 bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
              {saving ? 'Submitting...' : decision === 'Approved' ? 'Approve Report' : 'Reject Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
