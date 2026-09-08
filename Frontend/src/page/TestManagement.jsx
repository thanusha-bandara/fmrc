import React from 'react';
import TestManagementHub from './tests/TestManagementHub';

export default function TestManagement() {
  const role = localStorage.getItem('userRole') || 'TA';
  return <TestManagementHub role={role} />;
}
