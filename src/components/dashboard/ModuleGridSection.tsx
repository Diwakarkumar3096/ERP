import React from 'react';
import type { DashboardStats } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Award,
  BookOpen,
  UserPlus,
  MessageSquare,
  Bus,
  Home,
  Library,
  Package,
  Briefcase,
  ArrowRight
} from 'lucide-react';

interface ModuleGridSectionProps {
  data: DashboardStats;
  onNavigateTab: (tab: NavTab) => void;
}

export const ModuleGridSection: React.FC<ModuleGridSectionProps> = ({ data, onNavigateTab }) => {
  const m = data.modulesSummary || {
    students: { total: 0, active: 0 },
    attendance: { rate: 0, present: 0, absent: 0 },
    fees: { collected: 0, outstanding: 0, overdueCount: 0 },
    exams: { upcomingCount: 0, passRate: 0 },
    academics: { classes: 0, subjects: 0, activeHomework: 0 },
    admissions: { total: 0, pendingReview: 0 },
    communication: { noticesCount: 0 },
    transport: { vehiclesCount: 0, routesCount: 0, studentsCount: 0 },
    hostel: { roomsCount: 0, totalBeds: 0, occupiedBeds: 0 },
    library: { booksCount: 0, issuedCount: 0, overdueCount: 0 },
    inventory: { itemsCount: 0, lowStockCount: 0 },
    hr: { totalStaff: 0, teachingStaff: 0, nonTeachingStaff: 0 }
  };

  const modules = [
    // 1. 🔵 STUDENTS (Blue)
    {
      id: 'students',
      name: 'Students',
      category: 'Enrolled Pupils',
      tab: 'students' as NavTab,
      icon: GraduationCap,
      color: 'blue',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      border: 'border-blue-200/90 hover:border-blue-400',
      iconBox: 'bg-blue-100 text-blue-600',
      metric1: { label: 'Active Students', value: `${m.students.active}` },
      metric2: { label: 'Total Registered', value: `${m.students.total}` }
    },
    // 2. 🟢 ATTENDANCE (Green)
    {
      id: 'attendance',
      name: 'Attendance',
      category: 'Daily Presence',
      tab: 'attendance' as NavTab,
      icon: CheckCircle2,
      color: 'green',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      border: 'border-emerald-200/90 hover:border-emerald-400',
      iconBox: 'bg-emerald-100 text-emerald-600',
      metric1: { label: 'Attendance Rate', value: `${m.attendance.rate}%` },
      metric2: { label: 'Present Today', value: `${m.attendance.present}` }
    },
    // 3. 🔴 ABSENCE / ATTENTION (Red)
    {
      id: 'absence',
      name: 'Absence & Alerts',
      category: 'Action Center',
      tab: 'attendance' as NavTab,
      icon: AlertTriangle,
      color: 'red',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      border: 'border-rose-200/90 hover:border-rose-400',
      iconBox: 'bg-rose-100 text-rose-600',
      metric1: { label: 'Absent Students', value: `${m.attendance.absent}` },
      metric2: { label: 'Critical Alerts', value: `${data.attentionAlerts?.length || 0}` }
    },
    // 4. 🟠 FEES & FINANCE (Orange / Amber)
    {
      id: 'fees',
      name: 'Fees & Finance',
      category: 'Accounts & Dues',
      tab: 'fees' as NavTab,
      icon: IndianRupee,
      color: 'amber',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      border: 'border-amber-200/90 hover:border-amber-400',
      iconBox: 'bg-amber-100 text-amber-700',
      metric1: { label: 'Month Realized', value: `₹${m.fees.collected.toLocaleString('en-IN')}` },
      metric2: { label: 'Overdue Dues', value: `${m.fees.overdueCount} bills` }
    },
    // 5. 🟣 EXAMINATION (Purple)
    {
      id: 'exams',
      name: 'Examination',
      category: 'Assessment & Marks',
      tab: 'exams' as NavTab,
      icon: Award,
      color: 'purple',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      border: 'border-purple-200/90 hover:border-purple-400',
      iconBox: 'bg-purple-100 text-purple-600',
      metric1: { label: 'Upcoming Exams', value: `${m.exams.upcomingCount}` },
      metric2: { label: 'Recent Pass Rate', value: `${m.exams.passRate}%` }
    },
    // 6. 🟦 ACADEMICS (Indigo / Blue)
    {
      id: 'academic',
      name: 'Academics & LMS',
      category: 'Curriculum & Classes',
      tab: 'academic' as NavTab,
      icon: BookOpen,
      color: 'indigo',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      border: 'border-indigo-200/90 hover:border-indigo-400',
      iconBox: 'bg-indigo-100 text-indigo-600',
      metric1: { label: 'Total Classes', value: `${m.academics.classes}` },
      metric2: { label: 'Total Subjects', value: `${m.academics.subjects}` }
    },
    // 7. 🟡 ADMISSIONS (Yellow / Gold)
    {
      id: 'admissions',
      name: 'Admissions',
      category: 'Applicant Funnel',
      tab: 'admissions' as NavTab,
      icon: UserPlus,
      color: 'yellow',
      badge: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      border: 'border-yellow-200/90 hover:border-yellow-400',
      iconBox: 'bg-yellow-100 text-yellow-700',
      metric1: { label: 'Total Dossiers', value: `${m.admissions.total}` },
      metric2: { label: 'Pending Review', value: `${m.admissions.pendingReview}` }
    },
    // 8. 🩷 COMMUNICATION (Pink)
    {
      id: 'communication',
      name: 'Communication',
      category: 'Notices & Circulars',
      tab: 'communication' as NavTab,
      icon: MessageSquare,
      color: 'pink',
      badge: 'bg-pink-50 text-pink-700 border-pink-200',
      border: 'border-pink-200/90 hover:border-pink-400',
      iconBox: 'bg-pink-100 text-pink-600',
      metric1: { label: 'Active Notices', value: `${m.communication.noticesCount}` },
      metric2: { label: 'Broadcasts', value: 'Live' }
    },
    // 9. 🟤 TRANSPORT (Teal / Brown)
    {
      id: 'transport',
      name: 'Transport',
      category: 'Fleet & Bus Routes',
      tab: 'transport' as NavTab,
      icon: Bus,
      color: 'teal',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      border: 'border-teal-200/90 hover:border-teal-400',
      iconBox: 'bg-teal-100 text-teal-600',
      metric1: { label: 'Fleet Vehicles', value: `${m.transport.vehiclesCount}` },
      metric2: { label: 'Commuters', value: `${m.transport.studentsCount} students` }
    },
    // 10. 🩵 HOSTEL (Cyan)
    {
      id: 'hostel',
      name: 'Hostel',
      category: 'Residential Living',
      tab: 'hostel' as NavTab,
      icon: Home,
      color: 'cyan',
      badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      border: 'border-cyan-200/90 hover:border-cyan-400',
      iconBox: 'bg-cyan-100 text-cyan-600',
      metric1: { label: 'Hostel Rooms', value: `${m.hostel.roomsCount}` },
      metric2: { label: 'Beds Occupied', value: `${m.hostel.occupiedBeds} / ${m.hostel.totalBeds}` }
    },
    // 11. 🟦 LIBRARY (Sky Blue)
    {
      id: 'library',
      name: 'Library',
      category: 'Catalog & Issues',
      tab: 'library' as NavTab,
      icon: Library,
      color: 'sky',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      border: 'border-sky-200/90 hover:border-sky-400',
      iconBox: 'bg-sky-100 text-sky-600',
      metric1: { label: 'Total Books', value: `${m.library.booksCount}` },
      metric2: { label: 'Active Issues', value: `${m.library.issuedCount}` }
    },
    // 12. 🟩 INVENTORY (Emerald)
    {
      id: 'inventory',
      name: 'Inventory & Assets',
      category: 'Supplies & Stock',
      tab: 'inventory' as NavTab,
      icon: Package,
      color: 'emerald',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      border: 'border-emerald-200/90 hover:border-emerald-400',
      iconBox: 'bg-emerald-100 text-emerald-700',
      metric1: { label: 'Stock Items', value: `${m.inventory.itemsCount}` },
      metric2: { label: 'Low Stock Alerts', value: `${m.inventory.lowStockCount}` }
    },
    // 13. ⚫ HR & STAFF (Slate / Dark Gray)
    {
      id: 'staff',
      name: 'HR & Staff',
      category: 'Faculty & Payroll',
      tab: 'staff' as NavTab,
      icon: Briefcase,
      color: 'slate',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      border: 'border-slate-300/90 hover:border-slate-400',
      iconBox: 'bg-slate-200 text-slate-700',
      metric1: { label: 'Total Employees', value: `${m.hr.totalStaff}` },
      metric2: { label: 'Teaching Faculty', value: `${m.hr.teachingStaff}` }
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
              School ERP Comprehensive Module Matrix
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              12 Enterprise Modules
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time operational indicators across every academic and administrative system
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              onClick={() => onNavigateTab(mod.tab)}
              className={`group bg-white rounded-xl border p-4.5 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between ${mod.border}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${mod.iconBox} transition-transform group-hover:scale-105`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${mod.badge}`}>
                    {mod.category}
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {mod.name}
                  </h3>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">{mod.metric1.label}</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{mod.metric1.value}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">{mod.metric2.label}</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{mod.metric2.value}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
                <span>Access Module</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
