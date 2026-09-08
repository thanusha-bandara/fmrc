import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Search, X, ChevronDown, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { listMachinery, registerMachine } from '../api/machinery';
import { createTest, listTests } from '../api/tests';
import { getErrorMessage } from '../api/client';

export default function Machinery() {
  const role = localStorage.getItem('userRole') || 'TA';
  const isAdmin = role === 'ADMIN';

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ machine_name: '', model: '', supplier: '', registration_date: '' });
  const [showTestModal, setShowTestModal] = useState(false);
  const [activeMachine, setActiveMachine] = useState(null);
  const [testForm, setTestForm] = useState({ test_name: '', is_field_test: true, requires_water: false, required_season: 'Any' });

  // Expanding rows state
  const [expandedMachine, setExpandedMachine] = useState(null);
  const [machineTests, setMachineTests] = useState({});
  const [loadingTests, setLoadingTests] = useState(false);

  const loadMachines = () => {
    setLoading(true);
    listMachinery()
      .then((data) => setMachines(data))
      .catch((err) => setError(getErrorMessage(err, 'Could not load machinery.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMachines(); }, []);

  const toggleExpand = async (machineId) => {
    if (expandedMachine === machineId) {
      setExpandedMachine(null);
      return;
    }
    setExpandedMachine(machineId);
    if (!machineTests[machineId]) {
      setLoadingTests(true);
      try {
        const tests = await listTests({ machineId });
        setMachineTests((prev) => ({ ...prev, [machineId]: tests }));
      } catch (err) {
        console.error("Failed to load tests", err);
      } finally {
        setLoadingTests(false);
      }
    }
  };

  const statusFor = (m) => {
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
      await registerMachine(form);
      setShowModal(false);
      setForm({ machine_name: '', model: '', supplier: '', registration_date: '' });
      loadMachines();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not register machine.'));
    } finally {
      setSaving(false);
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
      
      // Clear cache for this machine and reload machines
      setMachineTests((prev) => {
        const newCache = { ...prev };
        delete newCache[activeMachine.machine_id];
        return newCache;
      });
      if (expandedMachine === activeMachine.machine_id) {
        setExpandedMachine(null); // Collapse so they can reopen to fetch fresh
      }
      
      loadMachines();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not schedule test.'));
    } finally {
      setSaving(false);
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
        <table className="w-full text-left border-collapse">
          <thead className="bg-white border-b border-gray-200 text-sm font-semibold text-gray-600">
            <tr>
              <th className="py-4 px-6 w-10"></th>
              <th className="py-4 px-6">Machine Name</th>
              <th className="py-4 px-6">Model</th>
              <th className="py-4 px-6">Supplier</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-center">Tests</th>
              {isAdmin && <th className="py-4 px-6 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={isAdmin ? 7 : 6} className="py-8 px-6 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={isAdmin ? 7 : 6} className="py-8 px-6 text-center text-gray-400">No machinery found.</td></tr>
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
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                      {statusFor(machine)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center text-gray-600">{machine.total_tests || 0}</td>
                  {isAdmin && (
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMachine(machine); setShowTestModal(true); }}
                        className="text-xs font-bold text-[#006B33] hover:underline bg-[#006B33]/10 px-3 py-1.5 rounded-full"
                      >
                        + Add Test
                      </button>
                    </td>
                  )}
                </tr>

                {/* Expanded Tests Sub-table */}
                {expandedMachine === machine.machine_id && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="p-0 border-b border-gray-200">
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
                                    <tr key={t.test_id} className="hover:bg-gray-50">
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

      {/* Registration Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative">
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
              <div>
                <label className="block text-sm text-gray-600 mb-1">Model</label>
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="e.g. MF-385" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Supplier</label>
                <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" placeholder="e.g. Massey Ferguson" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Registration Date *</label>
                <input required type="date" value={form.registration_date} onChange={(e) => setForm({ ...form, registration_date: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
              </div>
              <button type="submit" disabled={saving} className="w-full bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Register Machine'}
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
                      <option value="Yala">Yala</option>
                      <option value="Maha">Maha</option>
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
    </div>
  );
}
