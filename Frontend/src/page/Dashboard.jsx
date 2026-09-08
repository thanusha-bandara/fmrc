import React from 'react';
import RoleDashboard from './dashboard/RoleDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const role = localStorage.getItem('userRole') || 'TA';
  
  if (role === 'ADMIN') return <AdminDashboard />;
  
  return <RoleDashboard role={role} />;
}
