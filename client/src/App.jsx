import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';

// GIS Map Page
import GISMap from './pages/GISMap';

// Citizen Pages
import CitizenDashboard from './pages/CitizenDashboard';
import ReportComplaint from './pages/ReportComplaint';
import TrackComplaints from './pages/TrackComplaints';

// Officer Pages
import DepartmentDashboard from './pages/DepartmentDashboard';
import CreatePermit from './pages/CreatePermit';
import ComplaintsQueue from './pages/ComplaintsQueue';
import CalendarView from './pages/CalendarView';
import DepartmentAnalytics from './pages/DepartmentAnalytics';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import ManageDepartments from './pages/ManageDepartments';
import ConflictManager from './pages/ConflictManager';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';

// Helper component to lock private views
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-500 font-mono">
        Restoring session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Dispatch dashboard wrapper based on role
const RoleDashboardDispatch = () => {
  const { user } = useAuth();

  if (user?.role === 'Citizen') {
    return <CitizenDashboard />;
  }
  if (user?.role === 'Department Officer') {
    return <DepartmentDashboard />;
  }
  if (user?.role === 'Super Admin') {
    return <AdminDashboard />;
  }
  return null;
};

const App = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/register"
        element={
          <AuthLayout>
            <Register />
          </AuthLayout>
        }
      />
      <Route
        path="/forgotpassword"
        element={
          <AuthLayout>
            <ForgotPassword />
          </AuthLayout>
        }
      />
      <Route
        path="/resetpassword/:resettoken"
        element={
          <AuthLayout>
            <ResetPassword />
          </AuthLayout>
        }
      />

      {/* Private Pages (Dashboard Layout) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <RoleDashboardDispatch />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <GISMap />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Citizen Specific Routes */}
      <Route
        path="/report"
        element={
          <ProtectedRoute allowedRoles={['Citizen', 'Super Admin']}>
            <DashboardLayout>
              <ReportComplaint />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tracking"
        element={
          <ProtectedRoute allowedRoles={['Citizen', 'Super Admin']}>
            <DashboardLayout>
              <TrackComplaints />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Officer Specific Routes */}
      <Route
        path="/permits/create"
        element={
          <ProtectedRoute allowedRoles={['Department Officer', 'Super Admin']}>
            <DashboardLayout>
              <CreatePermit />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints-queue"
        element={
          <ProtectedRoute allowedRoles={['Department Officer', 'Super Admin']}>
            <DashboardLayout>
              <ComplaintsQueue />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute allowedRoles={['Department Officer', 'Super Admin']}>
            <DashboardLayout>
              <CalendarView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={['Department Officer', 'Super Admin']}>
            <DashboardLayout>
              <DepartmentAnalytics />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Specific Routes */}
      <Route
        path="/admin/departments"
        element={
          <ProtectedRoute allowedRoles={['Super Admin']}>
            <DashboardLayout>
              <ManageDepartments />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/conflicts"
        element={
          <ProtectedRoute allowedRoles={['Super Admin', 'Department Officer']}>
            <DashboardLayout>
              <ConflictManager />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['Super Admin']}>
            <DashboardLayout>
              <UserManagement />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute allowedRoles={['Super Admin']}>
            <DashboardLayout>
              <AuditLogs />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
