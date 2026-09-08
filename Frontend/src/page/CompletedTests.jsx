import React from 'react';
import RoleTestList from './tests/RoleTestList';

export default function CompletedTests() {
  const role = localStorage.getItem('userRole') || 'TA';
  return <RoleTestList role={role} queueType="completed" />;
}
