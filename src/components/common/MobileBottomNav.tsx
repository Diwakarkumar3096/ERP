import React from 'react';
import type { NavTab } from './Sidebar.js';
import {
  LayoutDashboard,
  CheckSquare,
  IndianRupee,
  GraduationCap,
  Menu
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMenu
}) => {
  const quickItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance' as NavTab, label: 'Attendance', icon: CheckSquare },
    { id: 'fees' as NavTab, label: 'Fees', icon: IndianRupee },
    { id: 'students' as NavTab, label: 'Students', icon: GraduationCap }
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1 flex items-center justify-around safe-bottom"
    >
      {quickItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] ${
              isActive
                ? 'text-indigo-600 font-semibold'
                : 'text-slate-500 hover:text-slate-900 active:scale-95'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">
              {item.label}
            </span>
          </button>
        );
      })}

      {/* More / Menu Drawer Toggle */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-slate-600 hover:text-slate-900 active:scale-95 transition-all duration-150 min-h-[48px]"
        aria-label="Open Full Menu"
      >
        <div className="p-1 rounded-lg bg-slate-100 text-slate-700">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5 leading-none font-medium">
          Menu
        </span>
      </button>
    </nav>
  );
};
