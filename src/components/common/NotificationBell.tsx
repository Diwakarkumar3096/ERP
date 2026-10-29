import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.js';
import { Bell, Check, ExternalLink, AlertTriangle, Info, Clock, CheckCircle2 } from 'lucide-react';
import type { NavTab } from './Sidebar.js';

interface NotificationBellProps {
  onNavigateTab?: (tab: NavTab) => void;
  schoolId?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigateTab, schoolId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.communication.getUnreadNotificationCount();
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Ignore background errors
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.communication.getNotifications({ schoolId });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(timer);
  }, [schoolId]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, schoolId]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.communication.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.communication.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      try {
        await api.communication.markNotificationRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error(err);
      }
    }

    setIsOpen(false);

    // Map action link to NavTab
    if (notif.action_link && onNavigateTab) {
      const link = notif.action_link.replace('/', '') as NavTab;
      const validTabs: NavTab[] = [
        'dashboard', 'schools', 'sessions', 'classes', 'admissions', 'students',
        'parents', 'staff', 'payroll', 'attendance', 'fees', 'exams',
        'classroom', 'transport', 'library', 'hostel', 'inventory', 'communication',
        'users', 'roles', 'audit'
      ];
      if (validTabs.includes(link)) {
        onNavigateTab(link);
      } else {
        onNavigateTab('communication');
      }
    } else if (onNavigateTab) {
      onNavigateTab('communication');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in-50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-0 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold tracking-wide">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/80 text-white font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-indigo-300 hover:text-white font-medium transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                You are all caught up!
              </div>
            ) : (
              notifications.slice(0, 6).map((notif) => {
                const isEmergency = notif.priority === 'EMERGENCY';
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                      !notif.is_read
                        ? isEmergency
                          ? 'bg-rose-50/70 hover:bg-rose-100/70'
                          : 'bg-indigo-50/40 hover:bg-indigo-50/80'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isEmergency ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      ) : notif.category === 'Fees' ? (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
                      ) : notif.category === 'Examination' ? (
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-1" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-slate-900 truncate">{notif.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                          {notif.category}
                        </span>
                        {!notif.is_read && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onNavigateTab) onNavigateTab('communication');
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1.5 w-full py-1"
            >
              <span>Communication & Notification Center</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
