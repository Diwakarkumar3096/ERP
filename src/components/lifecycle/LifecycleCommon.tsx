import React from 'react';

interface LifecycleTabButtonProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
}

export const LifecycleTabButton: React.FC<LifecycleTabButtonProps> = ({
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
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 min-h-[40px] ${
        active
          ? 'bg-indigo-600 text-white shadow-sm font-semibold'
          : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80'
      }`}
    >
      <span className={active ? 'text-white' : 'text-slate-500'}>{icon}</span>
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};
