import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import MainLayout from './component/MainLayout';
import Dashboard from './page/Dashboard';
import TestManagement from './page/TestManagement';
import AssignedTests from './page/AssignedTests';
import PendingTests from './page/PendingTests';
import CompletedTests from './page/CompletedTests';
import Login from './page/Login';
import Machinery from './page/Machinery';
import AdminUserManagement from './page/AdminUserManagement';

// New Pages
import SchedulePage from './page/Schedulepage';
import ResourceDashboard from './page/ResourceManagement/ResourceDashboard';
import FMRCCalendar from './page/ResourceManagement/FMRCCalendar';
import WaterSchedule from './page/ResourceManagement/WaterSchedule';
import WeatherConditions from './page/ResourceManagement/WeatherConditions';
import FieldAvailability from './page/ResourceManagement/FieldAvailability';
import HumanAvailability from './page/ResourceManagement/HumanAvailability';

function ProtectedLayout() {
  const isAuthenticated = Boolean(localStorage.getItem('token'));
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout />;
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      {
        path: "/",
        element: <Navigate to="/login" replace />
      },
      {
        path: "dashboard",
        element: <Dashboard />
      },
      {
        path: "machinery",
        element: <Machinery />
      },
      {
        path: "user-management",
        element: <AdminUserManagement />
      },
      {
        path: "test-management",
        element: <TestManagement />
      },
      {
        path: "assigned-tests",
        element: <AssignedTests />
      },
      {
        path: "pending-tests",
        element: <PendingTests />
      },
      {
        path: "completed-tests",
        element: <CompletedTests />
      },
      {
        path: "schedule",
        element: <SchedulePage />
      },
      {
        path: "resource-management",
        element: <ResourceDashboard />
      },
      {
        path: "resource-management/fmrc-calendar",
        element: <FMRCCalendar />
      },
      {
        path: "resource-management/water-schedule",
        element: <WaterSchedule />
      },
      {
        path: "resource-management/weather-conditions",
        element: <WeatherConditions />
      },
      {
        path: "resource-management/field-availability",
        element: <FieldAvailability />
      },
      {
        path: "resource-management/human-availability",
        element: <HumanAvailability />
      }
    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
