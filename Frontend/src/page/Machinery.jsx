import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Search, X, ChevronDown, ChevronRight, CheckCircle2, Clock, AlertCircle, Edit, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { listMachinery, registerMachine, updateMachine, deleteMachine } from '../api/machinery';
import { createTest, listTests } from '../api/tests';
import { generateStandardTestSet, getCatalogs } from '../api/testTemplates';
import { getErrorMessage } from '../api/client';
import { listUsers } from '../api/users';
import { listLabours } from '../api/labours';
import TestDetailModal from './tests/TestDetailModal';

export default function Machinery() {
  const role = localStorage.getItem('userRole') || 'TA';
  const userId = Number(localStorage.getItem('userId'));
  const isAdmin = role === 'ADMIN';

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  // Create / Edit Modals
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({ machine_name: '', model: '', supplier: '', registration_date: '', responsible_ta_id: '', required_labours: [] });
  const [editForm, setEditForm] = useState({ machine_id: null, machine_name: '', model: '', supplier: '', registration_date: '', responsible_ta_id: '', required_labours: [] });
  
  const [showTestModal, setShowTestModal] = useState(false);
  const [activeMachine, setActiveMachine] = useState(null);
  const [testForm, setTestForm] = useState({ test_name: '', is_field_test: true, requires_water: false, required_season: 'Any' });

  // Expanding rows state
  const [expandedMachine, setExpandedMachine] = useState(null);
  const [machineTests, setMachineTests] = useState({});
  const [loadingTests, setLoadingTests] = useState(false);
  const [activeTest, setActiveTest] = useState(null);

  const [catalogs, setCatalogs] = useState({});
  const [selectedCatalog, setSelectedCatalog] = useState('');

  const [showReportDetailsModal, setShowReportDetailsModal] = useState(false);
  const [reportDetailsMachine, setReportDetailsMachine] = useState(null);
  const [reportDetailsForm, setReportDetailsForm] = useState({
    document_ref_number: '', manufacturer_country: '',
    importer_name: '', importer_address: '', importer_tel: '', importer_fax: '', importer_web: '',
    rops_available: false, safety_note: '', background_note: ''
  });

  // TAs and Labours
  const [tas, setTas] = useState([]);
  const [labours, setLabours] = useState([]);

  const loadMachines = () => {
    setLoading(true);
    listMachinery()
      .then((data) => setMachines(data))
      .catch((err) => setError(getErrorMessage(err, 'Could not load machinery.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMachines(); }, []);

  useEffect(() => {
    getCatalogs().then((data) => {
      setCatalogs(data);
      setSelectedCatalog((prev) => prev || Object.keys(data)[0] || '');
    }).catch(() => {});
    
    listUsers('Technical_Assistant').then(data => setTas(data || [])).catch(() => {});
    listLabours().then(data => setLabours(data || [])).catch(() => {});
  }, []);

  const refreshMachineTests = async (machineId) => {
    try {
      const tests = await listTests({ machineId });
      setMachineTests((prev) => ({ ...prev, [machineId]: tests }));
    } catch (err) {
      console.error("Failed to load tests", err);
    }
  };

  const toggleExpand = async (machineId) => {
    if (expandedMachine === machineId) {
      setExpandedMachine(null);
      return;
    }
    setExpandedMachine(machineId);
    if (!machineTests[machineId]) {
      setLoadingTests(true);
      await refreshMachineTests(machineId);
      setLoadingTests(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
  };

  const statusFor = (m) => {
    if (m.has_approved_report > 0) return 'Certified';
    if (m.approved_tests > 0 && m.approved_tests === m.total_tests) return 'Certified';
    if (m.total_tests > 0) return 'Testing';
    return 'Registered';
  };

  const filtered = machines.filter((m) =>
    m.machine_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.model || '').toLowerCase().includes(search.toLowerCase())
  );

    const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.machine_name || !form.registration_date) return;
    setSaving(true);
    setError('');
    try {
      await registerMachine({
        ...form,
        responsible_ta_id: form.responsible_ta_id ? Number(form.responsible_ta_id) : null,
      });
      setShowModal(false);
      setForm({ machine_name: '', model: '', supplier: '', registration_date: '', responsible_ta_id: '', required_labours: [] });
      loadMachines();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Machine registered successfully', showConfirmButton: false, timer: 3000 });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not register machine.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.machine_name || !editForm.registration_date) return;
    setSaving(true);
    setError('');
    try {
      await updateMachine(editForm.machine_id, {
        machine_name: editForm.machine_name,
        model: editForm.model,
        supplier: editForm.supplier,
        registration_date: editForm.registration_date,
        responsible_ta_id: editForm.responsible_ta_id ? Number(editForm.responsible_ta_id) : null,
        required_labours: editForm.required_labours
      });
      setShowEditModal(false);
      loadMachines();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Machine updated', showConfirmButton: false, timer: 3000 });
      } catch (err) {
        setError(getErrorMessage(err, 'Could not update machine.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMachine = async (machine) => {
    const result = await Swal.fire({ title: 'Are you sure?', text: `Delete ${machine.machine_name}? All associated tests will be deleted.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#006B33', cancelButtonColor: '#d33', confirmButtonText: 'Yes, delete it!' });
    if (!result.isConfirmed) return;
    try {
      await deleteMachine(machine.machine_id);
      loadMachines();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Machine deleted', showConfirmButton: false, timer: 3000 });
      } catch (err) {
        setError(getErrorMessage(err, 'Could not delete machine.'));
    }
  };

  const handleAddTest = async (e) => {
    e.preventDefault();
    if (!testForm.test_name || !activeMachine) return;
    setSaving(true);
    setError('');
    try {
      await createTest({
        machine_id: activeMachine.machine_id,
        ...testForm
      });
      setShowTestModal(false);
      setTestForm({ test_name: '', is_field_test: true, requires_water: false, required_season: 'Any' });
      
      setMachineTests((prev) => {
        const newCache = { ...prev };
        delete newCache[activeMachine.machine_id];
        return newCache;
      });
      if (expandedMachine === activeMachine.machine_id) {
        setExpandedMachine(null);
      }
      
      loadMachines();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Test scheduled successfully', showConfirmButton: false, timer: 3000 });
      } catch (err) {
        setError(getErrorMessage(err, 'Could not schedule test.'));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateStandardSet = async (machine) => {
    if (!selectedCatalog) return;
    const catalogLabel = catalogs[selectedCatalog] || selectedCatalog;
    const result = await Swal.fire({ title: 'Are you sure?', text: `Create standard test set for ${machine.machine_name}?`, icon: 'question', showCancelButton: true, confirmButtonColor: '#006B33', confirmButtonText: 'Yes, create it' });
    if (!result.isConfirmed) return;
    setSaving(true);
    setError('');
    try {
      await generateStandardTestSet(machine.machine_id, selectedCatalog);
      setMachineTests((prev) => {
        const next = { ...prev };
        delete next[machine.machine_id];
        return next;
      });
      if (expandedMachine === machine.machine_id) {
        setExpandedMachine(null);
      }
      loadMachines();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Standard test set generated', showConfirmButton: false, timer: 3000 });
      } catch (err) {
        setError(getErrorMessage(err, 'Could not generate the standard test set.'));
    } finally {
      setSaving(false);
    }
  };

  const openReportDetails = (machine) => {
    setReportDetailsMachine(machine);
    setReportDetailsForm({
      document_ref_number: machine.document_ref_number || '',
      manufacturer_country: machine.manufacturer_country || '',
      importer_name: machine.importer_name || '',
      importer_address: machine.importer_address || '',
      importer_tel: machine.importer_tel || '',
      importer_fax: machine.importer_fax || '',
      importer_web: machine.importer_web || '',
      rops_available: Boolean(machine.rops_available),
      safety_note: machine.safety_note || '',
      background_note: machine.background_note || ''
    });
    setShowReportDetailsModal(true);
  };

  const handleSaveReportDetails = async (e) => {
    e.preventDefault();
    if (!reportDetailsMachine) return;
    setSaving(true);
    setError('');
    try {
      await updateMachine(reportDetailsMachine.machine_id, reportDetailsForm);
      setShowReportDetailsModal(false);
      loadMachines();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Report details saved', showConfirmButton: false, timer: 3000 });
      } catch (err) {
        setError(getErrorMessage(err, 'Could not save report details.'));
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (machine) => {
    let currentLabours = [];
    if (machine.required_labours) {
      try {
        currentLabours = typeof machine.required_labours === 'string' ? JSON.parse(machine.required_labours) : machine.required_labours;
      } catch (e) {}
    }

    setEditForm({
      machine_id: machine.machine_id,
      machine_name: machine.machine_name,
      model: machine.model || '',
      supplier: machine.supplier || '',
      registration_date: machine.registration_date ? machine.registration_date.split('T')[0] : '',
      responsible_ta_id: machine.responsible_ta_id || '',
      required_labours: currentLabours
    });
    setShowEditModal(true);
  };

  const toggleLabourSelection = (labourId, isEdit = false) => {
    const currentList = isEdit ? editForm.required_labours : form.required_labours;
    const newList = currentList.includes(labourId) 
      ? currentList.filter(id => id !== labourId)
      : [...currentList, labourId];
    
    if (isEdit) {
      setEditForm({ ...editForm, required_labours: newList });
    } else {
      setForm({ ...form, required_labours: newList });
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Machinery Directory</h1>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#006B33] text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
          >
            <Plus size={18} />
            <span>Register Machine</span>
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search machines..."
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
          <thead className="bg-white border-b border-gray-200 text-sm font-semibold text-gray-600">
            <tr>
              <th className="py-4 px-6 w-10"></th>
              <th className="py-4 px-6">Machine Name</th>
              <th className="py-4 px-6">Model</th>
              <th className="py-4 px-6">Supplier</th>
              <th className="py-4 px-6">Registered</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-center">Tests</th>
              {isAdmin && <th className="py-4 px-6 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={isAdmin ? 8 : 7} className="py-8 px-6 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={isAdmin ? 8 : 7} className="py-8 px-6 text-center text-gray-400">No machinery found.</td></tr>
            ) : filtered.map(machine => (
              <React.Fragment key={machine.machine_id}>
                <tr 
                  onClick={() => toggleExpand(machine.machine_id)}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedMachine === machine.machine_id ? 'bg-green-50/30' : ''}`}
                >
                  <td className="py-4 px-6 text-gray-400">
                    {expandedMachine === machine.machine_id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </td>
                  <td className="py-4 px-6 font-bold text-gray-900 flex items-center gap-2">
                    <Wrench size={16} className="text-[#006B33]" /> {machine.machine_name}
                  </td>
                  <td className="py-4 px-6 text-gray-600">{machine.model || '-'}</td>
                  <td className="py-4 px-6 text-gray-600">{machine.supplier || '-'}</td>
                  <td className="py-4 px-6 text-gray-600 whitespace-nowrap">{formatDate(machine.registration_date)}</td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                      {statusFor(machine)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center text-gray-600">{machine.total_tests || 0}</td>
                  {isAdmin && (
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMachine(machine); setShowTestModal(true); }}
                        className="text-xs font-bold text-[#006B33] hover:underline bg-[#006B33]/10 px-3 py-1.5 rounded-full"
                      >
                        + Add Test
                      </button>
                      <select
                        value={selectedCatalog}
                        onChange={(e) => setSelectedCatalog(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold text-gray-700 border border-gray-300 rounded-full px-2.5 py-1.5 bg-white outline-none focus:border-[#006B33]"
                      >
                        {Object.entries(catalogs).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleGenerateStandardSet(machine); }}
                        className="text-xs font-bold text-[#006B33] hover:underline bg-[#006B33]/10 px-3 py-1.5 rounded-full"
                      >
                        Generate Set
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openReportDetails(machine); }}
                        className="text-xs font-bold text-[#006B33] hover:underline bg-[#006B33]/10 px-3 py-1.5 rounded-full"
                      >
                        Report Details
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(machine); }}
                        className="text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-1.5 rounded-full ml-2"
                        title="Edit Machine"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMachine(machine); }}
                        className="text-xs font-bold text-red-600 hover:underline bg-red-50 px-2 py-1.5 rounded-full ml-1"
                        title="Delete Machine"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>

                {/* Expanded Tests Sub-table */}
                {expandedMachine === machine.machine_id && (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="p-0 border-b border-gray-200">
                      <div className="bg-gray-50 p-6 shadow-inner">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-sm font-bold text-gray-700">Tests for {machine.machine_name}</h4>
                        </div>
                        
                        {loadingTests ? (
                          <div className="text-sm text-gray-500">Loading tests...</div>
                        ) : !machineTests[machine.machine_id] || machineTests[machine.machine_id].length === 0 ? (
                          <div className="text-sm text-gray-500 bg-white p-4 rounded-lg border border-gray-200 text-center">
                            No tests registered for this machine yet.
                          </div>
                        ) : (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                                <tr>
                                  <th className="py-3 px-4">Test Name</th>
                                  <th className="py-3 px-4">Category</th>
                                  <th className="py-3 px-4">Assigned To</th>
                                  <th className="py-3 px-4">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {machineTests[machine.machine_id].map(t => {
                                  let displayStatus = 'Pending';
                                  let badgeClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                                  let Icon = Clock;
                                  
                                  if (t.status === 'Approved') {
                                    displayStatus = 'Completed';
                                    badgeClass = 'bg-green-50 text-green-700 border-green-200';
                                    Icon = CheckCircle2;
                                  } else if (t.status === 'Rejected') {
                                    displayStatus = 'Hold';
                                    badgeClass = 'bg-red-50 text-red-700 border-red-200';
                                    Icon = AlertCircle;
                                  }

                                  return (
                                    <tr key={t.test_id} onClick={() => setActiveTest(t)} className="hover:bg-gray-50 cursor-pointer">
                                      <td className="py-3 px-4 font-medium text-gray-900">{t.test_name}</td>
                                      <td className="py-3 px-4 text-gray-600">{t.is_field_test ? 'Field Test' : 'Lab Test'}</td>
                                      <td className="py-3 px-4 text-gray-600">{t.technical_assistant_name || 'Unassigned'}</td>
                                      <td className="py-3 px-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}>
                                          <Icon size={12} />
                                          {displayStatus}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Register New Machine</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Machine Name *</label>
                <input required value={form.machine_name} onChange={(e) => setForm({ ...form, machine_name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="e.g. Tractor 01" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Model</label>
                  <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="e.g. MF-385" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Registration Date *</label>
                  <input required type="date" value={form.registration_date} onChange={(e) => setForm({ ...form, registration_date: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Supplier</label>
                <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="e.g. Massey Ferguson" />
              </div>
              <div className="border-t border-gray-100 pt-4 mt-4">
                <label className="block text-sm text-gray-600 mb-1">Responsible Officer (Skilled TA)</label>
                <select 
                  value={form.responsible_ta_id} 
                  onChange={(e) => setForm({ ...form, responsible_ta_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20"
                >
                  <option value="">-- Select Technical Assistant --</option>
                  {tas.map(ta => (
                    <option key={ta.user_id} value={ta.user_id}>{ta.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Skilled Labours</label>
                <div className="space-y-2 border border-gray-200 rounded-md p-3 max-h-40 overflow-y-auto">
                  {labours.map(labour => (
                    <label key={labour.labour_id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={form.required_labours.includes(labour.labour_id)}
                        onChange={() => toggleLabourSelection(labour.labour_id, false)}
                        className="rounded text-[#006B33] focus:ring-[#006B33]"
                      />
                      {labour.name}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Register Machine'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Machine Modal */}
      {showEditModal && (
        <div onClick={() => setShowEditModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Machine</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Machine Name *</label>
                <input required value={editForm.machine_name} onChange={(e) => setEditForm({ ...editForm, machine_name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Model</label>
                  <input value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Registration Date *</label>
                  <input required type="date" value={editForm.registration_date} onChange={(e) => setEditForm({ ...editForm, registration_date: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Supplier</label>
                <input value={editForm.supplier} onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
              </div>
              <div className="border-t border-gray-100 pt-4 mt-4">
                <label className="block text-sm text-gray-600 mb-1">Responsible Officer (Skilled TA)</label>
                <select 
                  value={editForm.responsible_ta_id} 
                  onChange={(e) => setEditForm({ ...editForm, responsible_ta_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20"
                >
                  <option value="">-- Select Technical Assistant --</option>
                  {tas.map(ta => (
                    <option key={ta.user_id} value={ta.user_id}>{ta.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Skilled Labours</label>
                <div className="space-y-2 border border-gray-200 rounded-md p-3 max-h-40 overflow-y-auto">
                  {labours.map(labour => (
                    <label key={labour.labour_id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editForm.required_labours.includes(labour.labour_id)}
                        onChange={() => toggleLabourSelection(labour.labour_id, true)}
                        className="rounded text-[#006B33] focus:ring-[#006B33]"
                      />
                      {labour.name}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Updating...' : 'Update Machine'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Test Modal */}
      {showTestModal && (
        <div onClick={() => setShowTestModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative">
            <button onClick={() => setShowTestModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Schedule New Test</h3>
            <p className="text-sm text-gray-500 mb-4">For {activeMachine?.machine_name}</p>
            <form onSubmit={handleAddTest} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Test Name *</label>
                <input required value={testForm.test_name} onChange={(e) => setTestForm({ ...testForm, test_name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="e.g. Engine Performance Test" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={testForm.is_field_test} onChange={(e) => setTestForm({ ...testForm, is_field_test: e.target.checked })} id="is_field_test" />
                <label htmlFor="is_field_test" className="text-sm text-gray-600">Is this a Field Test?</label>
              </div>
              {testForm.is_field_test && (
                <>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={testForm.requires_water} onChange={(e) => setTestForm({ ...testForm, requires_water: e.target.checked })} id="requires_water" />
                    <label htmlFor="requires_water" className="text-sm text-gray-600">Requires Water?</label>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Required Season</label>
                    <select value={testForm.required_season} onChange={(e) => setTestForm({ ...testForm, required_season: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20">
                      <option value="Any">Any Season</option>
                      <option value="Ploughing">Ploughing Season</option>
                      <option value="Harvesting">Harvesting Season</option>
                    </select>
                  </div>
                </>
              )}
              <button type="submit" disabled={saving} className="w-full bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Adding...' : 'Add Test'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportDetailsModal && (
        <div onClick={() => setShowReportDetailsModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setShowReportDetailsModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Report Details</h3>
            <p className="text-sm text-gray-500 mb-4">For {reportDetailsMachine?.machine_name}</p>
            <form onSubmit={handleSaveReportDetails} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Document Reference No.</label>
                <input value={reportDetailsForm.document_ref_number} onChange={(e) => setReportDetailsForm({ ...reportDetailsForm, document_ref_number: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="e.g. FMRC/FWT/03/2026" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Manufacturer's Country of Origin</label>
                <input value={reportDetailsForm.manufacturer_country} onChange={(e) => setReportDetailsForm({ ...reportDetailsForm, manufacturer_country: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="Leave blank for 'Not provided by the importer'" />
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">Importer's Contact Details</p>
                <div className="space-y-2">
                  <input value={reportDetailsForm.importer_name} onChange={(e) => setReportDetailsForm({ ...reportDetailsForm, importer_name: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="Importer name" />
                  <textarea value={reportDetailsForm.importer_address} onChange={(e) => setReportDetailsForm({ ...reportDetailsForm, importer_address: e.target.value })} rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 resize-none" placeholder="Address" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={reportDetailsForm.importer_tel} onChange={(e) => setReportDetailsForm({ ...reportDetailsForm, importer_tel: e.target.value })}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="Tel" />
                    <input value={reportDetailsForm.importer_fax} onChange={(e) => setReportDetailsForm({ ...reportDetailsForm, importer_fax: e.target.value })}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="Fax" />
                  </div>
                  <input value={reportDetailsForm.importer_web} onChange={(e) => setReportDetailsForm({ ...reportDetailsForm, importer_web: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="Website" />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <label className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={reportDetailsForm.rops_available} onChange={(e) => setReportDetailsForm({ ...reportDetailsForm, rops_available: e.target.checked })} />
                  <span className="text-sm text-gray-600">Fitted with Rollover Protective System (ROPS)?</span>
                </label>
                <textarea value={reportDetailsForm.safety_note} onChange={(e) => setReportDetailsForm({ ...reportDetailsForm, safety_note: e.target.value })} rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 resize-none" placeholder="Additional safety note (optional)" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Background (optional override)</label>
                <textarea value={reportDetailsForm.background_note} onChange={(e) => setReportDetailsForm({ ...reportDetailsForm, background_note: e.target.value })} rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 resize-none" placeholder="Leave blank to auto-generate from the model name" />
              </div>
              <button type="submit" disabled={saving} className="w-full bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Report Details'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTest && (
        <TestDetailModal
          test={activeTest}
          role={role}
          userId={userId}
          onClose={() => setActiveTest(null)}
          onSaved={() => refreshMachineTests(activeTest.machine_id)}
        />
      )}
    </div>
  );
}
