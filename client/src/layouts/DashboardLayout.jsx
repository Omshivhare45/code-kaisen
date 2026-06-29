import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSockets } from '../context/SocketContext';
import {
  LayoutDashboard,
  Map,
  FileSpreadsheet,
  AlertTriangle,
  Users,
  Settings,
  Bell,
  LogOut,
  FolderTree,
  User,
  PlusCircle,
  Calendar,
  Layers,
  BarChart3,
  BookOpen,
  Menu,
  X,
  CheckCircle2,
  BellRing
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markNotificationAsRead, markAllAsRead } = useSockets();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Build sidebar menu links based on role
  const getMenuLinks = () => {
    const role = user?.role;

    if (role === 'Citizen') {
      return [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/map', label: 'Live Dig Map', icon: Map },
        { path: '/report', label: 'Report Complaint', icon: FileSpreadsheet },
        { path: '/tracking', label: 'Complaint Tracking', icon: Layers },
        { path: '/profile', label: 'Profile Management', icon: User },
      ];
    }

    if (role === 'Department Officer') {
      return [
        { path: '/', label: 'Officer Dashboard', icon: LayoutDashboard },
        { path: '/permits/create', label: 'Create Dig Permit', icon: PlusCircle },
        { path: '/map', label: 'GIS Utility Map', icon: Map },
        { path: '/calendar', label: 'Excavation Schedule', icon: Calendar },
        { path: '/complaints-queue', label: 'Complaints Queue', icon: FileSpreadsheet },
        { path: '/analytics', label: 'Department Analytics', icon: BarChart3 },
        { path: '/profile', label: 'Profile Management', icon: User },
      ];
    }

    if (role === 'Super Admin') {
      return [
        { path: '/', label: 'Nodal Dashboard', icon: LayoutDashboard },
        { path: '/map', label: 'All Permits Map', icon: Map },
        { path: '/admin/departments', label: 'Manage Departments', icon: FolderTree },
        { path: '/admin/conflicts', label: 'Conflict Manager', icon: AlertTriangle },
        { path: '/admin/users', label: 'Manage Users', icon: Users },
        { path: '/admin/audit', label: 'System Audit Logs', icon: BookOpen },
        { path: '/profile', label: 'Profile Management', icon: User },
      ];
    }

    return [];
  };

  const menuLinks = getMenuLinks();

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* 1. Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Sidebar Component */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 glass-sidebar transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-0 -translate-x-full'
        }`}
      >
        {/* Sidebar Header Brand */}
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800/80">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="bg-gov-600/20 border border-gov-500/50 p-1.5 rounded-lg">
              <Layers className="h-5 w-5 text-gov-400" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white leading-none block">SETU Portal</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block mt-0.5">Town Utility Coord</span>
            </div>
          </Link>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gov-700/30 border border-gov-500/30 text-gov-300 shadow-lg shadow-gov-950/10'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-gov-400' : 'text-slate-400'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold text-gov-400">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-gov-500 font-medium truncate">{user?.role}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all duration-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout Session
          </button>
        </div>
      </aside>

      {/* 3. Main Application Section */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="flex items-center justify-between h-16 px-6 bg-slate-950/65 backdrop-blur-md border-b border-slate-900 z-30">
          {/* Menu Hamburger */}
          <button
            className="text-slate-400 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Department Tag / Ward Tag */}
          <div className="hidden sm:flex items-center gap-2">
            {user?.department && (
              <span
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-700"
                style={{
                  backgroundColor: `${user.department.color || '#14b8a6'}15`,
                  color: user.department.color || '#14b8a6',
                  borderColor: `${user.department.color || '#14b8a6'}35`,
                }}
              >
                Dept: {user.department.name} ({user.department.code})
              </span>
            )}
            {user?.role === 'Citizen' && user?.ward && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-800 bg-slate-900 text-slate-400">
                Residence: {user.ward}
              </span>
            )}
          </div>

          {/* Notification bell dropdown & User Info */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Notification Dropdown Container */}
            <div className="relative">
              <button
                className={`relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-all ${
                  notifDropdownOpen ? 'bg-slate-900 text-slate-100' : ''
                }`}
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              >
                {unreadCount > 0 ? (
                  <>
                    <BellRing className="h-5 w-5 text-gov-400 animate-pulse" />
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white ring-2 ring-slate-950">
                      {unreadCount}
                    </span>
                  </>
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </button>

              {/* Notification Dropdown List */}
              {notifDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setNotifDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2.5 w-80 glass-panel border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-40">
                    <div className="p-3 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Alerts & Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => {
                            markAllAsRead();
                            setNotifDropdownOpen(false);
                          }}
                          className="text-[10px] text-gov-400 hover:text-gov-300 font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-850/80">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No notifications or warnings found.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif._id}
                            className={`p-3 text-xs transition-colors hover:bg-slate-900/60 flex flex-col gap-1 ${
                              !notif.read ? 'bg-gov-500/5' : 'opacity-70'
                            }`}
                            onClick={() => {
                              markNotificationAsRead(notif._id);
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-200">{notif.title}</span>
                              {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-gov-500"></span>}
                            </div>
                            <p className="text-slate-400 text-[11px] leading-relaxed">{notif.message}</p>
                            <span className="text-[9px] text-slate-500 self-end mt-1">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Greeting */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <span className="hidden md:inline text-xs text-slate-400">
                Welcome, <span className="font-semibold text-slate-200">{user?.name.split(' ')[0]}</span>
              </span>
              <div className="w-8 h-8 rounded-full bg-gov-700/30 text-gov-400 font-bold border border-gov-500/25 flex items-center justify-center text-xs">
                {user?.role.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
