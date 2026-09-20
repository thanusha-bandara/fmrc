import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Menu, Bell, Cloud, CloudCheck, CloudOff, User,
  LayoutDashboard, Wrench, ClipboardList,
  SlidersHorizontal, Calendar as CalendarIcon,
  HelpCircle, X, Users, FileCheck2, Eye, EyeOff, ArrowRight
} from 'lucide-react';
import fmrcLogo from '../assets/FMRClogo.png';
import { syncOfflineData } from '../api/syncManager';
import { db } from '../db/offlineDB';
import { changeMyPassword } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_MESSAGE } from '../utils/password';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [syncState, setSyncState] = useState('synced'); // 'synced', 'offline', 'syncing', 'error'
  const [pendingCount, setPendingCount] = useState(0);
  
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'TA');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'User');

  useEffect(() => {
    const updateCount = async () => {
      try {
        const count = await db.syncQueue.count();
        setPendingCount(count);
        if (count > 0 && navigator.onLine) {
          syncOfflineData();
        } else if (!navigator.onLine) {
          setSyncState('offline');
        } else if (count === 0) {
          setSyncState('synced');
        }
      } catch (err) {}
    };

    updateCount();

    const handleOnline = () => {
      setSyncState('syncing');
      syncOfflineData();
    };
    
    const handleOffline = () => setSyncState('offline');
    const handleSyncStatus = (e) => setSyncState(e.detail);
    const handleDataAdded = () => updateCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-status', handleSyncStatus);
    window.addEventListener('offline-data-added', handleDataAdded);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-status', handleSyncStatus);
      window.removeEventListener('offline-data-added', handleDataAdded);
    };
  }, []);


  const getRoleName = (role) => {
    switch(role) {
      case 'TA': return 'Technical Assistant';
      case 'ME': return 'Mechanical Engineer';
      case 'CE': return 'Chief Engineer';
      case 'ADMIN': return 'System Administrator';
      default: return 'User';
    }
  };

  const currentUser = {
    name: userName,
    roleTitle: getRoleName(userRole),
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80"
  };

  const closeChangePasswordModal = () => {
    setShowChangePasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields.');
      return;
    }
    if (!PASSWORD_PATTERN.test(newPassword)) {
      setPasswordError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(getErrorMessage(err, 'Failed to change password.'));
    } finally {
      setPasswordLoading(false);
    }
  };


  const allNavItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['TA', 'ME', 'CE', 'ADMIN'] },
    { id: 'machinery', path: '/machinery', label: 'Machinery', icon: Wrench, roles: ['TA', 'ME', 'CE', 'ADMIN'] }, 
    { id: 'test-management', path: '/test-management', label: 'Test Management', icon: ClipboardList, roles: ['TA', 'ME', 'CE'] },
    { id: 'finalize-reports', path: '/finalize-reports', label: 'Finalize Reports', icon: FileCheck2, roles: ['ME'] },
    { id: 'reports-for-approval', path: '/reports-for-approval', label: 'Reports for Approval', icon: FileCheck2, roles: ['CE'] },
    { id: 'resource-management', path: '/resource-management', label: 'Resource Management', icon: SlidersHorizontal, roles: ['TA', 'ME', 'CE', 'ADMIN'] },
    { id: 'user-management', path: '/user-management', label: 'User Management', icon: Users, roles: ['ADMIN'] }, 
    { id: 'schedule', path: '/schedule', label: 'Schedule', icon: CalendarIcon, roles: ['TA', 'ME', 'CE', 'ADMIN'] },
  ];

  
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] text-gray-800 font-sans overflow-hidden">
      
      {/*  FULL WIDTH TOP HEADER  */}
      <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0 z-30 relative">
        {/* Left Side (Menu + Logo) */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors flex justify-center items-center"
          >
            <Menu size={22} />
          </button>
          <img src={fmrcLogo} alt="FMRC Logo" className="h-12 w-[85px] md:w-auto object-cover md:object-contain object-left" />
        </div>

        {/* Right Side (User Profile & Notifications) */}
        <div className="flex items-center gap-5 pr-2">
          <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full relative">
            <Bell size={20} />
          </button>

          <div className={`flex items-center gap-1.5 px-2 md:px-3 py-1 border rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            syncState === 'offline' ? 'bg-red-50 text-red-700 border-red-200' :
            syncState === 'syncing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            syncState === 'error' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
            'bg-green-50 text-[#006B33] border-green-200'
          }`} onClick={() => { if(syncState !== 'synced') syncOfflineData(); }}>
            {syncState === 'offline' ? <CloudOff size={16} className="text-red-500" /> :
             syncState === 'syncing' ? <Cloud size={16} className="text-blue-500 animate-pulse" /> :
             <CloudCheck size={16} className={syncState === 'error' ? 'text-yellow-500' : 'text-[#10b981]'} />}
            <span className="hidden sm:inline">
              {syncState === 'offline' ? `Offline (${pendingCount} pending)` :
               syncState === 'syncing' ? 'Syncing...' :
               syncState === 'error' ? `Sync Failed (${pendingCount} pending)` :
               'System Synced'}
            </span>
          </div>

          <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full">
            <Cloud size={20} />
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:ring-2 hover:ring-[#006B33] text-gray-700"
            >
              <User size={18} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-40">
                <div className="px-4 py-3 border-b border-gray-100 mb-1">
                   <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
                   <p className="text-xs text-gray-500 font-medium truncate">{currentUser.roleTitle}</p>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); setShowChangePasswordModal(true); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Change Password
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('userRole'); localStorage.removeItem('userName'); localStorage.removeItem('userId'); window.location.href = '/login'; }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">Log Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/*  BOTTOM SECTION (SIDEBAR + MAIN CONTENT)  */}
      <div className="flex flex-1 overflow-hidden">
        
        {/*  SIDEBAR  */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col justify-between flex-shrink-0 z-20 overflow-y-auto`}>
          <div>
            <nav className="mt-4 px-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) => `w-full flex items-center ${sidebarOpen ? 'gap-3 px-3' : 'justify-center'} py-2.5 rounded-lg font-medium text-sm transition-colors text-left ${
                      isActive 
                        ? 'bg-[#e8f5e9] text-[#006B33] font-semibold border-r-4 border-[#006B33]' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#006B33]'
                    }`}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-gray-100">
            <button 
              onClick={() => setShowSupportModal(true)}
              className={`w-full flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors px-1`}
            >
              <HelpCircle size={20} className="flex-shrink-0" />
              {sidebarOpen && <span>Support</span>}
            </button>
          </div>
        </aside>

        {/*  MAIN CONTENT  */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl relative">
            <button 
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Dashboard Guide & Support</h3>
            <div className="text-sm text-gray-600 space-y-2 max-h-80 overflow-y-auto">
              <p>• <strong>Sidebar</strong>: Switch between modules.</p>
              <p>• <strong>System Synced</strong>: Shows offline IndexedDB data synchronization state.</p>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative">
            <button
              onClick={closeChangePasswordModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Change Password</h3>

            {passwordSuccess ? (
              <div className="space-y-4">
                <div className="rounded-md border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-800">
                  Your password has been changed successfully.
                </div>
                <button
                  type="button"
                  onClick={closeChangePasswordModal}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-[#1a6b3c] hover:bg-[#155530] text-white font-semibold py-2.5 text-sm transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 font-medium">
                    {passwordError}
                  </div>
                )}

                <div>
                  <label htmlFor="currentPassword" className="block text-sm text-gray-600 mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showPasswordFields ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1a6b3c] focus:ring-2 focus:ring-[#1a6b3c]/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPasswordField" className="block text-sm text-gray-600 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPasswordField"
                      type={showPasswordFields ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 pr-16 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1a6b3c] focus:ring-2 focus:ring-[#1a6b3c]/20 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-[#1a6b3c] hover:text-[#134f2c]"
                    >
                      {showPasswordFields ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showPasswordFields ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
                </div>

                <div>
                  <label htmlFor="confirmPasswordField" className="block text-sm text-gray-600 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPasswordField"
                    type={showPasswordFields ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1a6b3c] focus:ring-2 focus:ring-[#1a6b3c]/20 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-[#1a6b3c] hover:bg-[#155530] text-white font-semibold py-2.5 text-sm transition disabled:opacity-70"
                >
                  {passwordLoading ? "Saving..." : "Change Password"}
                  {!passwordLoading && <ArrowRight size={16} />}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}