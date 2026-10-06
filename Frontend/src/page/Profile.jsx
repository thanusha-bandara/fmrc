import React, { useState, useEffect } from 'react';
import { UserCircle } from 'lucide-react';
import { getMe } from '../api/auth';
import { getErrorMessage } from '../api/client';
import PasswordResetRequests from '../component/PasswordResetRequests';

const ROLE_TITLES = {
  Admin: 'System Administrator',
  Technical_Assistant: 'Technical Assistant',
  Mechanical_Engineer: 'Mechanical Engineer',
  Chief_Engineer: 'Chief Engineer'
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((err) => setError(getErrorMessage(err, 'Could not load your details.')));
  }, []);

  const details = user ? [
    ['Full Name', user.full_name],
    ['Username', user.username],
    ['Email', user.email],
    ['Phone', user.phone || '-'],
    ['Role', ROLE_TITLES[user.role] || user.role]
  ] : [];

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
        {user?.role === 'Admin' ? 'Admin Details' : 'My Details'}
      </h1>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">{error}</div>
      )}

      {user && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <UserCircle size={40} className="text-[#006B33]" />
            <div>
              <p className="font-bold text-gray-900">{user.full_name}</p>
              <p className="text-xs text-gray-500">{ROLE_TITLES[user.role] || user.role}</p>
            </div>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {user?.role === 'Admin' && <PasswordResetRequests />}
    </div>
  );
}
