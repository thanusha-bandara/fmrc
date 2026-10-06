import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Ban, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { listUsers, registerUser, deactivateUser, updateUser, deleteUser } from '../api/users';
import { getErrorMessage } from '../api/client';
import PasswordResetRequests from '../component/PasswordResetRequests';
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_MESSAGE } from '../utils/password';

const ROLE_LABELS = {
  Admin: 'Admin',
  Technical_Assistant: 'TA',
  Mechanical_Engineer: 'ME',
  Chief_Engineer: 'CE'
};

const emptyForm = { full_name: '', username: '', email: '', password: '', phone: '', role: 'Technical_Assistant' };

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadUsers = () => {
    setLoading(true);
    listUsers()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err, 'Could not load users.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!PASSWORD_PATTERN.test(form.password)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    setSaving(true);
    try {
      await registerUser(form);
      setShowModal(false);
      setForm(emptyForm);
      loadUsers();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'User added successfully', showConfirmButton: false, timer: 3000 });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create user.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      if (user.is_active) {
        await deactivateUser(user.user_id);
      } else {
        await updateUser(user.user_id, { is_active: true });
      }
      loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update user.'));
    }
  };

  const handleDelete = async (user) => {
    const result = await Swal.fire({ title: 'Are you sure?', text: `Delete user "${user.full_name}"? This cannot be undone.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#006B33', cancelButtonColor: '#d33', confirmButtonText: 'Yes, delete it!' });
    if (!result.isConfirmed) return;
    try {
      await deleteUser(user.user_id);
      loadUsers();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'User deleted', showConfirmButton: false, timer: 3000 });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete user.'));
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#006B33] text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">
          <UserPlus size={18} />
          <span>Add User</span>
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      <PasswordResetRequests />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
            <tr>
              <th className="py-4 px-6">Name</th>
              <th className="py-4 px-6">Role</th>
              <th className="py-4 px-6">Email</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="py-8 px-6 text-center text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="py-8 px-6 text-center text-gray-400">No users found.</td></tr>
            ) : users.map(user => (
              <tr key={user.user_id} className="hover:bg-gray-50">
                <td className="py-4 px-6 font-medium text-gray-900">{user.full_name}</td>
                <td className="py-4 px-6 text-gray-600">{ROLE_LABELS[user.role] || user.role}</td>
                <td className="py-4 px-6 text-gray-500">{user.email}</td>
                <td className="py-4 px-6">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  <button onClick={() => handleToggleActive(user)} title={user.is_active ? 'Deactivate' : 'Reactivate'} className="text-amber-600 hover:text-amber-800">
                    <Ban size={18} />
                  </button>
                  <button onClick={() => handleDelete(user)} title="Delete" className="text-red-600 hover:text-red-800">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New User</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full Name *</label>
                <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Username *</label>
                  <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Temporary Password *</label>
                <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
                <p className="mt-1.5 text-[11px] text-gray-400">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20">
                  <option value="Technical_Assistant">Technical Assistant</option>
                  <option value="Mechanical_Engineer">Mechanical Engineer</option>
                  <option value="Chief_Engineer">Chief Engineer</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
