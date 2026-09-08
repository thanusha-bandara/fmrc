import React from 'react';
import RoleTestList from './tests/RoleTestList';

export default function PendingTests() {
  const role = localStorage.getItem('userRole') || 'TA';
  return <RoleTestList role={role} queueType="pending" />;
}
