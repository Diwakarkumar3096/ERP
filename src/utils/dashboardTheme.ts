// Centralized Dashboard Color System and Theme Mapping
// Strict adherence to specified module color identities:
// 🔵 STUDENTS: Blue
// 🟢 ATTENDANCE: Green
// 🔴 ABSENCE / ATTENTION: Red
// 🟠 FEES & FINANCE: Orange / Amber
// 🟣 EXAMINATION: Purple
// 🟦 ACADEMICS: Indigo / Blue
// 🟡 ADMISSIONS: Yellow / Gold
// 🩷 COMMUNICATION: Pink
// 🟤 TRANSPORT: Teal / Brown
// 🩵 HOSTEL: Cyan
// 🟦 LIBRARY: Sky Blue
// 🟩 INVENTORY: Emerald
// ⚫ HR & STAFF: Slate / Dark Gray

export interface ModuleTheme {
  name: string;
  category: string;
  iconName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  iconBg: string;
  iconText: string;
  accentBg: string;
  accentText: string;
  progressBg: string;
  dotColor: string;
}

export const DASHBOARD_THEME: Record<string, ModuleTheme> = {
  students: {
    name: 'Students',
    category: 'Student Administration',
    iconName: 'GraduationCap',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-blue-50/30',
    cardBorder: 'border-blue-200/80',
    cardHoverBorder: 'hover:border-blue-400',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    accentBg: 'bg-blue-600',
    accentText: 'text-blue-600',
    progressBg: 'bg-blue-500',
    dotColor: 'bg-blue-500'
  },
  attendance: {
    name: 'Attendance',
    category: 'Daily Operations',
    iconName: 'CheckCircle2',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-emerald-50/30',
    cardBorder: 'border-emerald-200/80',
    cardHoverBorder: 'hover:border-emerald-400',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-600',
    progressBg: 'bg-emerald-500',
    dotColor: 'bg-emerald-500'
  },
  absenceAlert: {
    name: 'Absence & Critical Attention',
    category: 'Action Center',
    iconName: 'AlertTriangle',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-rose-50/30',
    cardBorder: 'border-rose-200/80',
    cardHoverBorder: 'hover:border-rose-400',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    accentBg: 'bg-rose-600',
    accentText: 'text-rose-600',
    progressBg: 'bg-rose-500',
    dotColor: 'bg-rose-500'
  },
  fees: {
    name: 'Fees & Finance',
    category: 'Financial Accounts',
    iconName: 'IndianRupee',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-amber-50/30',
    cardBorder: 'border-amber-200/80',
    cardHoverBorder: 'hover:border-amber-400',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    accentBg: 'bg-amber-600',
    accentText: 'text-amber-700',
    progressBg: 'bg-amber-500',
    dotColor: 'bg-amber-500'
  },
  examination: {
    name: 'Examination',
    category: 'Assessment & Marks',
    iconName: 'Award',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-purple-50/30',
    cardBorder: 'border-purple-200/80',
    cardHoverBorder: 'hover:border-purple-400',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    accentBg: 'bg-purple-600',
    accentText: 'text-purple-600',
    progressBg: 'bg-purple-500',
    dotColor: 'bg-purple-500'
  },
  academics: {
    name: 'Academics & LMS',
    category: 'Curriculum & Classes',
    iconName: 'BookOpen',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-indigo-50/30',
    cardBorder: 'border-indigo-200/80',
    cardHoverBorder: 'hover:border-indigo-400',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    accentBg: 'bg-indigo-600',
    accentText: 'text-indigo-600',
    progressBg: 'bg-indigo-500',
    dotColor: 'bg-indigo-500'
  },
  admissions: {
    name: 'Admissions',
    category: 'Enrollment Funnel',
    iconName: 'UserPlus',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-800',
    badgeBorder: 'border-yellow-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-yellow-50/30',
    cardBorder: 'border-yellow-200/80',
    cardHoverBorder: 'hover:border-yellow-400',
    iconBg: 'bg-yellow-100',
    iconText: 'text-yellow-700',
    accentBg: 'bg-yellow-500',
    accentText: 'text-yellow-700',
    progressBg: 'bg-yellow-500',
    dotColor: 'bg-yellow-500'
  },
  communication: {
    name: 'Communication',
    category: 'Notice & Alerts',
    iconName: 'MessageSquare',
    badgeBg: 'bg-pink-50',
    badgeText: 'text-pink-700',
    badgeBorder: 'border-pink-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-pink-50/30',
    cardBorder: 'border-pink-200/80',
    cardHoverBorder: 'hover:border-pink-400',
    iconBg: 'bg-pink-100',
    iconText: 'text-pink-600',
    accentBg: 'bg-pink-500',
    accentText: 'text-pink-600',
    progressBg: 'bg-pink-500',
    dotColor: 'bg-pink-500'
  },
  transport: {
    name: 'Transport',
    category: 'Fleet & Logistics',
    iconName: 'Bus',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    badgeBorder: 'border-teal-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-teal-50/30',
    cardBorder: 'border-teal-200/80',
    cardHoverBorder: 'hover:border-teal-400',
    iconBg: 'bg-teal-100',
    iconText: 'text-teal-600',
    accentBg: 'bg-teal-600',
    accentText: 'text-teal-600',
    progressBg: 'bg-teal-500',
    dotColor: 'bg-teal-500'
  },
  hostel: {
    name: 'Hostel',
    category: 'Residential Life',
    iconName: 'Home',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    badgeBorder: 'border-cyan-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-cyan-50/30',
    cardBorder: 'border-cyan-200/80',
    cardHoverBorder: 'hover:border-cyan-400',
    iconBg: 'bg-cyan-100',
    iconText: 'text-cyan-600',
    accentBg: 'bg-cyan-600',
    accentText: 'text-cyan-600',
    progressBg: 'bg-cyan-500',
    dotColor: 'bg-cyan-500'
  },
  library: {
    name: 'Library',
    category: 'Books & Resources',
    iconName: 'Library',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    cardBg: 'bg-gradient-to-br from-white via-white to-sky-50/30',
    cardBorder: 'border-sky-200/80',
    cardHoverBorder: 'hover:border-sky-400',
    iconBg: 'bg-sky-100',
    iconText: 'text-sky-600',
    accentBg: 'bg-sky-600',
    accentText: 'text-sky-600',
    progressBg: 'bg-sky-500',
    dotColor: 'bg-sky-500'
  },
  inventory: {
    name: 'Inventory & Assets',
    category: 'Supplies & Equipment',
    iconName: 'Package',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    cardBg: 'bg-gradient-to-br from-white via-white to-emerald-50/30',
    cardBorder: 'border-emerald-200/80',
    cardHoverBorder: 'hover:border-emerald-400',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-700',
    progressBg: 'bg-emerald-500',
    dotColor: 'bg-emerald-500'
  },
  hr: {
    name: 'HR & Staff',
    category: 'Workforce & Faculty',
    iconName: 'Briefcase',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    cardBg: 'bg-gradient-to-br from-white via-white to-slate-50',
    cardBorder: 'border-slate-300/80',
    cardHoverBorder: 'hover:border-slate-400',
    iconBg: 'bg-slate-200',
    iconText: 'text-slate-700',
    accentBg: 'bg-slate-700',
    accentText: 'text-slate-700',
    progressBg: 'bg-slate-600',
    dotColor: 'bg-slate-600'
  }
};

export const SEVERITY_THEME = {
  critical: {
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    dot: 'bg-rose-500',
    icon: 'text-rose-600',
    border: 'border-l-rose-500'
  },
  warning: {
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
    icon: 'text-amber-600',
    border: 'border-l-amber-500'
  },
  info: {
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    dot: 'bg-blue-500',
    icon: 'text-blue-600',
    border: 'border-l-blue-500'
  },
  success: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
    icon: 'text-emerald-600',
    border: 'border-l-emerald-500'
  }
};
