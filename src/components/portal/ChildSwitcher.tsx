import React from 'react';
import { ChildStudent } from './PortalCommon.js';
import { User, Users, ChevronDown, Check, GraduationCap } from 'lucide-react';

interface ChildSwitcherProps {
  childrenList: ChildStudent[];
  selectedChild: ChildStudent | null;
  onSelectChild: (child: ChildStudent) => void;
  isStaffOrAdmin?: boolean;
}

export const ChildSwitcher: React.FC<ChildSwitcherProps> = ({
  childrenList,
  selectedChild,
  onSelectChild,
  isStaffOrAdmin
}) => {
  if (childrenList.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
        <Users className="w-4 h-4 text-amber-600 shrink-0" />
        <span>No student wards linked to this account. Please contact the school administration office.</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isStaffOrAdmin ? 'Student Preview Context' : 'Multi-Child Switcher'}
            </span>
            <h4 className="text-xs font-bold text-slate-800">
              {isStaffOrAdmin ? 'Active Student Record' : `Linked Wards (${childrenList.length})`}
            </h4>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Tap child to switch dashboard data
        </span>
      </div>

      {/* Child Pill Buttons */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
        {childrenList.map((child) => {
          const isSelected = selectedChild?.id === child.id;
          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onSelectChild(child)}
              className={`flex items-center gap-3 p-2.5 pr-4 rounded-xl text-left transition-all shrink-0 border ${
                isSelected
                  ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                  : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                {child.first_name[0]}{child.last_name[0]}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                    {child.first_name} {child.last_name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className="font-medium text-slate-700">Class {child.class_name}-{child.section_name}</span>
                  <span>•</span>
                  <span className="font-mono">#{child.admission_number}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
