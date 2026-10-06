import React, { useState, useEffect } from 'react';
import { X, KeyRound } from 'lucide-react';
import { listPasswordResetRequests, setUserPassword } from '../api/users';
import { getErrorMessage } from '../api/client';
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_MESSAGE } from '../utils/password';

const ROLE_LABELS = {
  Admin: 'Admin',
  Technical_Assistant: 'TA',
  Mechanical_Engineer: 'ME',
  Chief_Engineer: 'CE'
};

export default function PasswordResetRequests() {
  const [requests, setRequests] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [target, setTarget] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRequests = () => {
    listPasswordResetRequests()
      .then(setRequests)
      .catch((err) => setLoadError(getErrorMessage(err, 'Could not load password reset requests.')));
  };

  useEffect(() => { loadRequests(); }, []);

  const closeModal = () => {
    setTarget(null);
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!PASSWORD_PATTERN.test(password)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    setSaving(true);
    try {
      await setUserPassword(target.user_id, password);
      closeModal();
      loadRequests();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not set password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <KeyRound size={16} className="text-[#006B33]" /> Password Reset Requests ({requests.length})
      </h2>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-medium">{loadError}</div>
      )}

      {requests.length === 0 && !loadError && (
        <p className="text-sm text-gray-400">No pending requests.</p>
      )}

      {requests.map((req) => (
        <div key={req.request_id} className="flex items-center justify-between bg-amber-50 rounded-lg border border-amber-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{req.full_name} <span className="font-normal text-gray-500">({req.username})</span></p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[req.role] || req.role} - requested {new Date(req.requested_at).toLocaleString()}</p>
          </div>
          <button onClick={() => setTarget(req)} className="bg-[#006B33] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700">
            Set New Password
          </button>
        </div>
      ))}

      {target && (
        <div onClick={closeModal} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Set New Password</h3>
            <p className="text-sm text-gray-500 mb-4">For {target.full_name} ({target.username})</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-medium">{error}</div>
              )}
              <div>
                <label className="block text-sm text-gray-600 mb-1">New Password</label>
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
                <p className="mt-1.5 text-[11px] text-gray-400">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Set Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
