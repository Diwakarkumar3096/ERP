import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  Sparkles,
  School as SchoolIcon,
  Calendar,
  UserCheck,
  UserPlus,
  IndianRupee,
  BookOpen,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface DashboardHeaderProps {
  onNavigateTab: (tab: NavTab) => void;
  schools?: any[];
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onNavigateTab, schools = [] }) => {
  const { user, activeSchool, isSuperAdmin, switchSchool } = useAuth();
  const [avatarError, setAvatarError] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = user?.displayName?.trim() || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Administrator';
  const roleName = user?.roleDisplayName || 'Super Admin';

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* User profile & School greeting info */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {user?.avatarUrl && !avatarError ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                onError={() => setAvatarError(true)}
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                {getInitials(displayName)}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Online" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Live School ERP
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {roleName}
              </span>
              {activeSchool?.affiliation_no && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Affiliation: {activeSchool.affiliation_no}
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              {getGreeting()}, <span className="text-indigo-600">{displayName}</span>
            </h1>

            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <div className="flex items-center gap-1 font-medium text-slate-700">
                <SchoolIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeSchool ? activeSchool.name : 'Central Multi-School Administration'}</span>
                {activeSchool?.code && (
                  <span className="text-slate-400 font-mono text-[11px]">({activeSchool.code})</span>
                )}
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Academic Session: <strong className="text-slate-700 font-semibold">2025–2026</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-school switcher and quick navigation triggers */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {isSuperAdmin && schools.length > 1 && (
            <div className="relative">
              <label htmlFor="school-select" className="sr-only">Switch School</label>
              <select
                id="school-select"
                value={activeSchool?.id || ''}
                onChange={(e) => switchSchool(e.target.value)}
                className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onNavigateTab('students')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all shadow-xs"
              title="Add or Manage Students"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Student</span>
            </button>

            <button
              onClick={() => onNavigateTab('fees')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all shadow-xs"
              title="Collect Fees & Invoices"
            >
              <IndianRupee className="w-3.5 h-3.5 text-amber-700" />
              <span>Collect Fee</span>
            </button>

            <button
              onClick={() => onNavigateTab('attendance')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-xs"
              title="Mark or View Attendance"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Attendance</span>
            </button>

            <button
              onClick={() => onNavigateTab('communication')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition-all shadow-xs"
              title="Publish Notice or Announcement"
            >
              <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
              <span>Notice</span>
            </button>

            <button
              onClick={() => onNavigateTab('mis')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all shadow-xs"
              title="MIS Reports & Analytics"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
