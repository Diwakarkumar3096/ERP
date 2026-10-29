import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  Building2,
  Calendar,
  User,
  KeyRound,
  LogOut,
  ChevronDown,
  Check,
  Download,
  Menu,
  School
} from 'lucide-react';
import { ChangePasswordModal } from '../profile/ChangePasswordModal.js';
import { EditProfileModal } from '../profile/EditProfileModal.js';
import { GlobalSearch } from './GlobalSearch.js';
import { NotificationBell } from './NotificationBell.js';
import { PWAInstallButton } from './PWAInstallButton.js';
import type { NavTab } from './Sidebar.js';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onNavigateTab?: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onNavigateTab }) => {
  const {
    user,
    activeSchool,
    activeSession,
    availableSchools,
    availableSessions,
    isSuperAdmin,
    switchSchool,
    switchSession,
    logout
  } = useAuth();

  const [isSchoolMenuOpen, setIsSchoolMenuOpen] = useState(false);
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const canSwitchSchools = isSuperAdmin || user?.permissions.includes('schools.switch');

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 h-16 px-3 sm:px-6 bg-white border-b border-slate-200 shrink-0 select-none">
        {/* Zone 1: Hamburger (Mobile) + Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Navigation Drawer Trigger */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onNavigateTab?.('dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm shrink-0">
              SE
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                School ERP
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-none mt-1 truncate max-w-[110px] sm:max-w-[180px] md:max-w-[220px]">
                {activeSchool ? activeSchool.name : 'All Campuses'}
              </span>
            </div>
          </div>
        </div>

        {/* Zone 1.5: Global Search Bar */}
        <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-2 min-w-0">
          <GlobalSearch onNavigateTab={onNavigateTab} schoolId={activeSchool?.id} />
        </div>

        {/* Zone 2: Contextual School & Session Switchers (Desktop) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {canSwitchSchools && availableSchools.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSchoolMenuOpen(!isSchoolMenuOpen);
                  setIsSessionMenuOpen(false);
                  setIsUserMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="max-w-[140px] lg:max-w-[180px] truncate">
                  {activeSchool ? activeSchool.name : 'All Campuses'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isSchoolMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSchoolMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Switch Campus
                    </div>
                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          switchSchool(null);
                          setIsSchoolMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                          !activeSchool ? 'text-indigo-600 font-semibold bg-indigo-50/50' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-medium">All Campuses Overview</div>
                          <div className="text-[10px] text-slate-400">Aggregated multi-school metrics</div>
                        </div>
                        {!activeSchool && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    )}
                    {availableSchools.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          switchSchool(s.id);
                          setIsSchoolMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                          activeSchool?.id === s.id ? 'text-indigo-600 font-semibold bg-indigo-50/50' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Code: {s.code} · {s.city || 'Campus'}
                          </div>
                        </div>
                        {activeSchool?.id === s.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Academic Session Selector */}
          {activeSchool && availableSessions.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSessionMenuOpen(!isSessionMenuOpen);
                  setIsSchoolMenuOpen(false);
                  setIsUserMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate max-w-[100px]">{activeSession?.name || 'Session'}</span>
                {activeSession?.is_current && (
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded font-semibold">Live</span>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isSessionMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSessionMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Academic Session
                    </div>
                    {availableSessions.map((ses) => (
                      <button
                        key={ses.id}
                        onClick={() => {
                          switchSession(ses.id);
                          setIsSessionMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                          activeSession?.id === ses.id ? 'text-indigo-600 font-semibold bg-indigo-50/50' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono">{ses.name}</span>
                          {ses.is_current && (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded font-sans font-semibold">
                              Current
                            </span>
                          )}
                        </div>
                        {activeSession?.id === ses.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Zone 3: PWA Install, Notifications & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* PWA Install Button */}
          <PWAInstallButton variant="header" />

          {/* Download Project Zip (Desktop) */}
          <a
            href="/api/download-zip"
            download="school-erp-project.zip"
            title="Download Full Project Source (ZIP)"
            className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>ZIP</span>
          </a>

          {/* Notifications Bell */}
          <NotificationBell onNavigateTab={onNavigateTab} schoolId={activeSchool?.id} />

          {/* User Profile Dropdown */}
          {/* User Profile Dropdown */}
          <div className="relative">
            {(() => {
              const displayName = user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
              const initials = displayName
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'U';

              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                      setIsSchoolMenuOpen(false);
                      setIsSessionMenuOpen(false);
                    }}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors text-left min-h-[40px]"
                    aria-label="User account menu"
                  >
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
                        {initials}
                      </div>
                    )}
                    <div className="hidden sm:flex flex-col">
                      <span className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        {user?.roleDisplayName}
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-150">
                        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full ring-2 ring-slate-100 overflow-hidden bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {user?.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {displayName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{user?.email}</p>
                            <div className="mt-0.5 text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                              <span>Role:</span>
                              <span>{user?.roleDisplayName}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsProfileModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Personal Profile &amp; Settings</span>
                        </button>

                        <a
                          href="/api/download-zip"
                          download="school-erp-project.zip"
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Download Project ZIP</span>
                        </a>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsPasswordModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                          <span>Change Password</span>
                        </button>

                        <div className="my-1 border-t border-slate-100" />

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </header>

      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};
