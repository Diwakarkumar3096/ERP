import React from 'react';

export interface ChildStudent {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  profile_photo?: string;
  roll_number?: string;
  student_status: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  school_id: string;
  school_name?: string;
  school_code?: string;
  relationship?: string;
  is_primary_guardian?: boolean;
}

export type PortalTab =
  | 'dashboard'
  | 'academic'
  | 'attendance'
  | 'fees'
  | 'exams'
  | 'homework'
  | 'services'
  | 'appointments'
  | 'events'
  | 'grievances'
  | 'admin_management';

interface PortalTabButtonProps {
  id: PortalTab;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
}

export const PortalTabButton: React.FC<PortalTabButtonProps> = ({
  label,
  icon,
  active,
  onClick,
  badge
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 min-h-[40px] shrink-0 ${
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80'
      }`}
    >
      <span className={active ? 'text-white' : 'text-slate-500'}>{icon}</span>
      <span>{label}</span>
      {badge !== undefined && badge !== 0 && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            active ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};
