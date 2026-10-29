import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Search,
  Plus,
  X,
  ChevronRight,
  Filter,
  Check,
  Download,
  AlertCircle,
  TrendingUp,
  MapPin,
  CalendarDays,
  FileText,
  UserCheck,
  UserX,
  Truck,
  Wrench,
  Printer,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';

interface AdministrationManagementViewProps {
  selectedSchoolId?: string;
}

export const AdministrationManagementView: React.FC<AdministrationManagementViewProps> = ({ selectedSchoolId }) => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();

  const activeSchoolId = selectedSchoolId || user?.schoolId || 'sch_vvps';

  // Sub-tabs
  type AdminTab = 'dashboard' | 'calendar' | 'events' | 'holidays_terms' | 'meetings' | 'appointments' | 'visitors' | 'venues' | 'reports';
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Loading state
  const [loading, setLoading] = useState(true);

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Calendar State
  const [calendarItems, setCalendarItems] = useState<any[]>([]);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [calendarFilter, setCalendarFilter] = useState<'ALL' | 'EVENT' | 'HOLIDAY' | 'MEETING' | 'APPOINTMENT'>('ALL');
  const [selectedCalendarItem, setSelectedCalendarItem] = useState<any>(null);

  // Events State
  const [events, setEvents] = useState<any[]>([]);
  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
  const [eventTasks, setEventTasks] = useState<any[]>([]);
  const [showNewEventModal, setShowNewEventModal] = useState(false);

  // Venues State
  const [venues, setVenues] = useState<any[]>([]);
  const [venueBookings, setVenueBookings] = useState<any[]>([]);
  const [showVenueBookingModal, setShowVenueBookingModal] = useState(false);
  const [venueConflictError, setVenueConflictError] = useState<string | null>(null);

  // Holidays & Terms State
  const [holidays, setHolidays] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [showNewHolidayModal, setShowNewHolidayModal] = useState(false);

  // Meetings State
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [showMinutesModal, setShowMinutesModal] = useState(false);
  const [actionItems, setActionItems] = useState<any[]>([]);

  // Appointments State
  const [appointments, setAppointments] = useState<any[]>([]);
  const [staffAvailability, setStaffAvailability] = useState<any[]>([]);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);

  // Visitors State
  const [visitors, setVisitors] = useState<any[]>([]);
  const [insideVisitors, setInsideVisitors] = useState<any[]>([]);
  const [visitsLog, setVisitsLog] = useState<any[]>([]);
  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorTypeFilter, setVisitorTypeFilter] = useState('');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [selectedVisitForCheckout, setSelectedVisitForCheckout] = useState<any>(null);
  const [printablePass, setPrintablePass] = useState<any>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [selectedVisitorForSecurity, setSelectedVisitorForSecurity] = useState<any>(null);

  // Reports State
  const [reportsData, setReportsData] = useState<any>(null);

  // Fetch initial data based on active tab
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.administration.getDashboard(activeSchoolId);
      setDashboardData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const res = await api.administration.getAggregatedCalendar({ schoolId: activeSchoolId });
      setCalendarItems(res.items || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load calendar events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventsData = async () => {
    try {
      setLoading(true);
      const res = await api.administration.getEvents({ schoolId: activeSchoolId });
      setEvents(res.events || []);
      const vRes = await api.administration.getVenues(activeSchoolId);
      setVenues(vRes.venues || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVenuesData = async () => {
    try {
      setLoading(true);
      const [vRes, bRes] = await Promise.all([
        api.administration.getVenues(activeSchoolId),
        api.administration.getVenueBookings({ schoolId: activeSchoolId })
      ]);
      setVenues(vRes.venues || []);
      setVenueBookings(bRes.bookings || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load venues', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidaysAndTerms = async () => {
    try {
      setLoading(true);
      const [hRes, tRes] = await Promise.all([
        api.administration.getHolidays(activeSchoolId),
        api.administration.getTerms(activeSchoolId)
      ]);
      setHolidays(hRes.holidays || []);
      setTerms(tRes.terms || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load holidays & terms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingsData = async () => {
    try {
      setLoading(true);
      const [mRes, aRes] = await Promise.all([
        api.administration.getMeetings({ schoolId: activeSchoolId }),
        api.administration.getActionItems({ schoolId: activeSchoolId })
      ]);
      setMeetings(mRes.meetings || []);
      setActionItems(aRes.actionItems || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load meetings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentsData = async () => {
    try {
      setLoading(true);
      const [aptRes, avlRes] = await Promise.all([
        api.administration.getAppointments({ schoolId: activeSchoolId }),
        api.administration.getStaffAvailability(activeSchoolId)
      ]);
      setAppointments(aptRes.appointments || []);
      setStaffAvailability(avlRes.availability || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitorsData = async () => {
    try {
      setLoading(true);
      const [visRes, insideRes, logRes] = await Promise.all([
        api.administration.getVisitors({ schoolId: activeSchoolId }),
        api.administration.getInsideVisitors(activeSchoolId),
        api.administration.getVisitsLog({ schoolId: activeSchoolId })
      ]);
      setVisitors(visRes.visitors || []);
      setInsideVisitors(insideRes.insideVisitors || []);
      setVisitsLog(logRes.visits || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load visitors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const res = await api.administration.getReports(activeSchoolId);
      setReportsData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboardData();
    else if (activeTab === 'calendar') fetchCalendarData();
    else if (activeTab === 'events') fetchEventsData();
    else if (activeTab === 'venues') fetchVenuesData();
    else if (activeTab === 'holidays_terms') fetchHolidaysAndTerms();
    else if (activeTab === 'meetings') fetchMeetingsData();
    else if (activeTab === 'appointments') fetchAppointmentsData();
    else if (activeTab === 'visitors') fetchVisitorsData();
    else if (activeTab === 'reports') fetchReportsData();
  }, [activeTab, activeSchoolId]);

  // Handle Event Selection Drawer
  const handleSelectEvent = async (event: any) => {
    setSelectedEvent(event);
    try {
      const [regRes, tskRes] = await Promise.all([
        api.administration.getEventRegistrations(event.id),
        api.administration.getEventTasks(event.id)
      ]);
      setEventRegistrations(regRes.registrations || []);
      setEventTasks(tskRes.tasks || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Handle Meeting Selection & Minutes
  const handleSelectMeeting = async (meeting: any) => {
    try {
      const res = await api.administration.getMeetingDetails(meeting.id);
      setSelectedMeeting(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load meeting details', 'error');
    }
  };

  // Handle Check-Out Action
  const handleCheckOut = async (visit: any) => {
    try {
      await api.administration.checkOutVisitor({ visitId: visit.id, remarks: 'Normal checkout via reception portal' });
      showToast(`Visitor ${visit.visitor_name} checked out. Pass returned.`, 'success');
      fetchVisitorsData();
    } catch (err: any) {
      showToast(err.message || 'Failed to check out visitor', 'error');
    }
  };

  // Calendar Helpers
  const year = selectedCalendarDate.getFullYear();
  const month = selectedCalendarDate.getMonth();
  const monthName = selectedCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setSelectedCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setSelectedCalendarDate(new Date(year, month + 1, 1));
  const todayMonth = () => setSelectedCalendarDate(new Date());

  const filteredCalendarItems = calendarItems.filter(item => {
    if (calendarFilter === 'ALL') return true;
    return item.category === calendarFilter;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                Phase 15 Master Suite
              </span>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {dashboardData?.school?.name || 'Vidya Vahini Public School'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
              School Administration, Calendar & Visitor Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Centralized daily institutional operations, academic events, parent-staff meetings, appointments, and campus security access control.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {hasPermission('events.create') && (
              <button
                onClick={() => setShowNewEventModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Event
              </button>
            )}
            {hasPermission('meetings.create') && (
              <button
                onClick={() => setShowNewMeetingModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 shadow-sm transition-colors"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Meeting
              </button>
            )}
            {hasPermission('visitors.checkin') && (
              <button
                onClick={() => setShowCheckInModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Check-In Visitor
              </button>
            )}
            {hasPermission('venues.manage') && (
              <button
                onClick={() => setShowVenueBookingModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Book Venue
              </button>
            )}
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 mt-6 overflow-x-auto scrollbar-none">
          {[
            { id: 'dashboard', label: 'Dashboard & Operations' },
            { id: 'calendar', label: 'Central Calendar' },
            { id: 'events', label: 'Events & Activities' },
            { id: 'holidays_terms', label: 'Holidays & Terms' },
            { id: 'meetings', label: 'Meetings & Minutes (MoM)' },
            { id: 'appointments', label: 'Appointments & Slots' },
            { id: 'visitors', label: 'Visitor Management & Security' },
            { id: 'venues', label: 'Venues & Bookings' },
            { id: 'reports', label: 'Admin Reports' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. SUB-TAB CONTENT */}

      {/* ----------------- SUB-TAB: DASHBOARD ----------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Today's Events</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-slate-900">{dashboardData?.metrics?.todayEvents || 0}</span>
                <span className="text-[11px] text-blue-600 font-medium">On Schedule</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Meetings Today</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-indigo-700">{dashboardData?.metrics?.todayMeetings || 0}</span>
                <span className="text-[11px] text-indigo-600 font-medium">Scheduled</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Inside Campus</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-emerald-600">{dashboardData?.metrics?.visitorsInside || 0}</span>
                <span className="text-[11px] text-emerald-600 font-medium">Active Passes</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Today's Appointments</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-slate-900">{dashboardData?.metrics?.todayAppointments || 0}</span>
                <span className="text-[11px] text-slate-500 font-medium">Booked</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Overdue Actions</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-2xl font-bold ${(dashboardData?.metrics?.overdueActionItems || 0) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {dashboardData?.metrics?.overdueActionItems || 0}
                </span>
                <span className="text-[11px] text-rose-600 font-medium">Requires Attention</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Pending Approvals</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-amber-600">{dashboardData?.metrics?.pendingVisitorApprovals || 0}</span>
                <span className="text-[11px] text-amber-600 font-medium">Waiting</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2 Cols): Today's Schedule & Action Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Today's Unified Timeline */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-semibold text-slate-900">Today's Operational Schedule</h2>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>

                <div className="mt-3 divide-y divide-slate-100">
                  {dashboardData?.todaySchedule && dashboardData.todaySchedule.length > 0 ? (
                    dashboardData.todaySchedule.map((item: any) => (
                      <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
                            item.item_type === 'EVENT' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            item.item_type === 'MEETING' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}>
                            {item.item_type}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              {item.venue_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{item.venue_name}</span>}
                              {item.organizer_name && <span>• By {item.organizer_name}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-slate-700 font-medium">
                            {item.start_datetime ? new Date(item.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All Day'}
                          </span>
                          <span className="block text-[10px] text-emerald-600 font-medium mt-0.5 uppercase">{item.status}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No operational events or meetings scheduled for today.
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Action Items & Overdue Tracking */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-semibold text-slate-900">Administrative Action Items</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('meetings')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    View All
                  </button>
                </div>

                <div className="mt-3 divide-y divide-slate-100">
                  {dashboardData?.pendingActionItems && dashboardData.pendingActionItems.length > 0 ? (
                    dashboardData.pendingActionItems.map((act: any) => {
                      const isOverdue = act.status === 'OVERDUE' || (new Date(act.due_date) < new Date() && act.status !== 'COMPLETED');
                      return (
                        <div key={act.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                act.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                                act.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {act.priority}
                              </span>
                              <span className="font-semibold text-slate-900">{act.task_description}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Assigned to: <strong className="text-slate-700">{act.assigned_to_name}</strong> • Due: {act.due_date}
                              {act.remarks && <span className="italic text-slate-400"> ({act.remarks})</span>}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase ${
                            isOverdue ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {isOverdue ? 'OVERDUE' : act.status}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      All administrative action items completed!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Real-time Campus Occupancy & Holidays */}
            <div className="space-y-6">
              {/* Visitors Currently Inside Campus */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-semibold text-slate-900">Campus Occupancy (Visitors Inside)</h2>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {dashboardData?.visitorsInsideList?.length || 0} Present
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {dashboardData?.visitorsInsideList && dashboardData.visitorsInsideList.length > 0 ? (
                    dashboardData.visitorsInsideList.map((vis: any) => (
                      <div key={vis.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 text-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold text-slate-900">{vis.visitor_name}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({vis.pass_number})</span>
                            <p className="text-[11px] text-slate-600 mt-0.5">Meeting: {vis.person_to_meet_name} ({vis.department_to_visit || 'Admin'})</p>
                          </div>
                          {hasPermission('visitors.checkout') && (
                            <button
                              onClick={() => handleCheckOut(vis)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                            >
                              Check-Out
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-200/60">
                          <span>In: {new Date(vis.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {vis.vehicle_number && <span>Veh: {vis.vehicle_number}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">No external visitors currently inside campus.</p>
                  )}
                </div>

                <div className="mt-3 pt-2 text-center">
                  <button
                    onClick={() => setActiveTab('visitors')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    View Access Log & Emergency Drill Roster →
                  </button>
                </div>
              </div>

              {/* Upcoming Holidays & Exams */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <CalendarIcon className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-semibold text-slate-900">Upcoming Holidays & Dates</h2>
                </div>

                <div className="mt-3 space-y-2">
                  {dashboardData?.upcomingHolidays && dashboardData.upcomingHolidays.length > 0 ? (
                    dashboardData.upcomingHolidays.map((h: any) => (
                      <div key={h.id} className="p-2 rounded border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-800">{h.name}</p>
                          <span className="text-[10px] text-slate-400">{h.holiday_type}</span>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {h.start_date}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-3">No upcoming holidays recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: CENTRAL CALENDAR ----------------- */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded hover:bg-white text-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={todayMonth}
                  className="px-2.5 py-1 text-xs font-semibold rounded hover:bg-white text-slate-700 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded hover:bg-white text-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-base font-bold text-slate-900">{monthName}</h2>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 mr-1 text-[11px] font-medium">Filter:</span>
              {[
                { id: 'ALL', label: 'All Entries' },
                { id: 'EVENT', label: 'Events' },
                { id: 'HOLIDAY', label: 'Holidays' },
                { id: 'MEETING', label: 'Meetings' },
                { id: 'APPOINTMENT', label: 'Appointments' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setCalendarFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    calendarFilter === f.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month View Grid */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[500px]">
              {/* Empty leading days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-slate-50/40 p-2 min-h-[100px]" />
              ))}

              {/* Actual month days */}
              {Array.from({ length: daysInMonth }).map((_, d) => {
                const dayNum = d + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                const dayItems = filteredCalendarItems.filter(item => {
                  const startStr = item.start.split('T')[0];
                  const endStr = item.end ? item.end.split('T')[0] : startStr;
                  return dateStr >= startStr && dateStr <= endStr;
                });

                return (
                  <div key={`day-${dayNum}`} className={`p-1.5 min-h-[110px] flex flex-col justify-between ${isToday ? 'bg-indigo-50/20' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                        isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'
                      }`}>
                        {dayNum}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono">{dayItems.length} items</span>
                      )}
                    </div>

                    {/* Day Events Container */}
                    <div className="space-y-1 mt-1 overflow-y-auto max-h-[85px] scrollbar-none">
                      {dayItems.slice(0, 3).map(item => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedCalendarItem(item)}
                          className="w-full text-left truncate px-1.5 py-0.5 rounded text-[11px] font-medium leading-tight block hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `${item.color}15`, color: item.color, borderLeft: `3px solid ${item.color}` }}
                        >
                          {item.title}
                        </button>
                      ))}
                      {dayItems.length > 3 && (
                        <span className="text-[10px] text-slate-500 font-medium block pl-1">
                          +{dayItems.length - 3} more...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: EVENTS & ACTIVITIES ----------------- */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search events by title or venue..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Event Types</option>
                <option value="ACADEMIC">Academic</option>
                <option value="SCHOOL_EVENT">School Event</option>
                <option value="EXAMINATION">Examination</option>
                <option value="PARENT_MEETING">Parent Meeting</option>
                <option value="SPORTS_EVENT">Sports Event</option>
                <option value="COMPETITION">Competition</option>
                <option value="WORKSHOP">Workshop</option>
              </select>
            </div>

            {hasPermission('events.create') && (
              <button
                onClick={() => setShowNewEventModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule New Event
              </button>
            )}
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events
              .filter(e => !eventSearch || e.title.toLowerCase().includes(eventSearch.toLowerCase()))
              .filter(e => !eventTypeFilter || e.event_type === eventTypeFilter)
              .map(evt => (
                <div key={evt.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {evt.event_type}
                      </span>
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {evt.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mt-2">{evt.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{evt.description}</p>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(evt.start_datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                      {evt.venue_name && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{evt.venue_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Audience: <strong>{evt.target_audience}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {evt.registration_count || 0} Registered • Budget: ₹{Number(evt.approved_budget || 0).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleSelectEvent(evt)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      Manage <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: HOLIDAYS & TERMS ----------------- */}
      {activeTab === 'holidays_terms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Holidays Column */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Configured School Holidays</h2>
                <p className="text-xs text-slate-500">Official vacation, national, state, and emergency closures</p>
              </div>
              {hasPermission('holidays.manage') && (
                <button
                  onClick={() => setShowNewHolidayModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  + Add Holiday
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {holidays.map(h => (
                <div key={h.id} className="py-2.5 flex items-start justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{h.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                        {h.holiday_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{h.description}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Applicable to: {h.applicable_classes || 'ALL'}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-slate-700 font-semibold">{h.start_date}</span>
                    {h.start_date !== h.end_date && <span className="font-mono text-[10px] text-slate-400 block">to {h.end_date}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Terms Column */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Academic Terms & Assessment Cycles</h2>
              <p className="text-xs text-slate-500">Term schedules linked to examination results and session weightages</p>
            </div>

            <div className="space-y-3">
              {terms.map(t => (
                <div key={t.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">{t.term_name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase">
                      {t.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-600">
                    <div>Term Dates: <strong>{t.start_date}</strong> to <strong>{t.end_date}</strong></div>
                    <div>Exam Weightage: <strong>{t.weightage_percentage}%</strong></div>
                    <div>Exam Dates: <strong>{t.exam_start_date || 'N/A'}</strong> to <strong>{t.exam_end_date || 'N/A'}</strong></div>
                    <div>Result Declaration: <strong>{t.result_date || 'Pending'}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: MEETINGS & MINUTES (MoM) ----------------- */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Administrative Meetings & Minutes (MoM)</h2>
              <p className="text-xs text-slate-500">Track council agendas, participant RSVPs, decisions taken, and action items</p>
            </div>
            {hasPermission('meetings.create') && (
              <button
                onClick={() => setShowNewMeetingModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule Meeting
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map(m => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {m.meeting_type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-indigo-700 bg-indigo-50">
                      {m.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{m.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.description}</p>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      <span>{m.date} ({m.start_time} - {m.end_time})</span>
                    </div>
                    {m.venue_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{m.venue_name}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-1">
                      Organizer: {m.organizer_name} • {m.participant_count || 0} Participants
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleSelectMeeting(m)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View Minutes & Action Items →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: APPOINTMENTS & SLOTS ----------------- */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Parent & Visitor Appointment Scheduling</h2>
              <p className="text-xs text-slate-500">Staff availability slots, booking review, approval, and conflict prevention</p>
            </div>
            {hasPermission('appointments.request') && (
              <button
                onClick={() => setShowNewAppointmentModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Request Appointment
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Requester</th>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <span className="font-semibold text-slate-900">{apt.requester_name}</span>
                      <span className="text-[10px] text-slate-400 block">{apt.requester_type} • {apt.requester_contact}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800">{apt.staff_name}</span>
                      <span className="text-[10px] text-slate-400 block">{apt.staff_role}</span>
                    </td>
                    <td className="p-3 font-mono">
                      {apt.appointment_date} <br />
                      <span className="text-[11px] text-slate-500">{apt.start_time} ({apt.duration_minutes}m)</span>
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-600">{apt.purpose}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        apt.status === 'CONFIRMED' || apt.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        apt.status === 'REQUESTED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        apt.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {hasPermission('appointments.manage') && apt.status === 'REQUESTED' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={async () => {
                              await api.administration.updateAppointment(apt.id, { status: 'CONFIRMED' });
                              showToast('Appointment approved', 'success');
                              fetchAppointmentsData();
                            }}
                            className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              await api.administration.updateAppointment(apt.id, { status: 'REJECTED', rejectionReason: 'Slot unavailable' });
                              showToast('Appointment rejected', 'info');
                              fetchAppointmentsData();
                            }}
                            className="px-2 py-1 text-[11px] font-semibold bg-rose-600 text-white rounded hover:bg-rose-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: VISITOR MANAGEMENT & SECURITY ----------------- */}
      {activeTab === 'visitors' && (
        <div className="space-y-6">
          {/* Top Bar with Emergency Access & Check-In */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Campus Visitor & Gate Access Management</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time security registry, deliveries, vendor permits, blacklists, and printable passes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {insideVisitors.length} Inside Campus
              </span>

              {hasPermission('visitors.checkin') && (
                <button
                  onClick={() => setShowCheckInModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Check-In Visitor
                </button>
              )}
            </div>
          </div>

          {/* Access Log Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search access log by name, pass # or mobile..."
                  value={visitorSearch}
                  onChange={(e) => setVisitorSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={visitorTypeFilter}
                onChange={(e) => setVisitorTypeFilter(e.target.value)}
                className="text-xs px-2.5 py-1 rounded border border-slate-200 bg-white"
              >
                <option value="">All Visitor Types</option>
                <option value="PARENT">Parent</option>
                <option value="VENDOR">Vendor</option>
                <option value="GOVT_OFFICIAL">Govt Official</option>
                <option value="SERVICE_PROVIDER">Service Provider</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Pass #</th>
                  <th className="p-3">Visitor Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Person To Meet</th>
                  <th className="p-3">Entry / Exit</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visitsLog
                  .filter(v => !visitorSearch || v.visitor_name.toLowerCase().includes(visitorSearch.toLowerCase()) || v.pass_number.toLowerCase().includes(visitorSearch.toLowerCase()))
                  .filter(v => !visitorTypeFilter || v.visitor_type === visitorTypeFilter)
                  .map(visit => (
                    <tr key={visit.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-indigo-700">{visit.pass_number}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-900">{visit.visitor_name}</span>
                        <span className="text-[10px] text-slate-400 block">{visit.visitor_mobile}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {visit.visitor_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-800 font-medium">{visit.person_to_meet_name}</span>
                        <span className="text-[10px] text-slate-400 block">{visit.department_to_visit || 'Admin'}</span>
                      </td>
                      <td className="p-3 text-[11px] font-mono">
                        <div>In: {new Date(visit.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {visit.exit_time && <div className="text-slate-400">Out: {new Date(visit.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">{visit.vehicle_number || 'None'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          visit.status === 'INSIDE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {visit.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPrintablePass(visit)}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            title="Print Pass"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {visit.status === 'INSIDE' && hasPermission('visitors.checkout') && (
                            <button
                              onClick={() => handleCheckOut(visit)}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-white hover:bg-slate-900"
                            >
                              Exit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: VENUES & BOOKINGS ----------------- */}
      {activeTab === 'venues' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Campus Venues & Reservation Schedule</h2>
              <p className="text-xs text-slate-500">Facility booking, capacity thresholds, and automated double-booking prevention</p>
            </div>
            {hasPermission('venues.manage') && (
              <button
                onClick={() => setShowVenueBookingModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Reserve Venue
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {venues.map(ven => (
              <div key={ven.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {ven.code}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {ven.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{ven.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{ven.location}</p>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div>Capacity: <strong>{ven.capacity} persons</strong></div>
                    <div className="text-[11px] text-slate-500 line-clamp-2">Facilities: {ven.facilities}</div>
                    <div className="text-[11px] text-slate-400">Contact: {ven.contact_person}</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-indigo-600 font-semibold">
                  {ven.active_bookings_count || 0} Upcoming Bookings
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: REPORTS ----------------- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Institutional Administration & Operations Summary</h2>
            <p className="text-xs text-slate-500">Comprehensive footprint across campus security, meetings, venue utilization, and event budgets</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Visitor Traffic by Classification</h3>
              <div className="space-y-2">
                {reportsData?.visitorStats?.map((s: any) => (
                  <div key={s.visitor_type} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">{s.visitor_type}</span>
                    <span className="font-bold text-slate-900">{s.count} visits</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Event Budget & Accounts Reconciliation</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Estimated Budget:</span>
                  <span className="font-bold text-slate-900">₹{Number(reportsData?.budgetStats?.total_estimated || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Approved Budget:</span>
                  <span className="font-bold text-emerald-700">₹{Number(reportsData?.budgetStats?.total_approved || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Actual Expense:</span>
                  <span className="font-bold text-indigo-700">₹{Number(reportsData?.budgetStats?.total_actual || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Venue Utilization Index</h3>
              <div className="space-y-2">
                {reportsData?.venueUtilization?.map((v: any) => (
                  <div key={v.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium truncate max-w-[180px]">{v.name}</span>
                    <span className="font-bold text-indigo-600">{v.booking_count} bookings</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: NEW EVENT ----------------- */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Schedule Campus Event</h3>
              <button onClick={() => setShowNewEventModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const title = (form.elements.namedItem('title') as HTMLInputElement).value;
              const eventType = (form.elements.namedItem('eventType') as HTMLSelectElement).value;
              const startDatetime = (form.elements.namedItem('startDatetime') as HTMLInputElement).value;
              const endDatetime = (form.elements.namedItem('endDatetime') as HTMLInputElement).value;
              const venueId = (form.elements.namedItem('venueId') as HTMLSelectElement).value;
              const targetAudience = (form.elements.namedItem('targetAudience') as HTMLSelectElement).value;
              const maxParticipants = Number((form.elements.namedItem('maxParticipants') as HTMLInputElement).value || 0);
              const approvedBudget = Number((form.elements.namedItem('approvedBudget') as HTMLInputElement).value || 0);
              const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
              const broadcast = (form.elements.namedItem('broadcast') as HTMLInputElement).checked;

              const vObj = venues.find(v => v.id === venueId);

              try {
                await api.administration.createEvent({
                  schoolId: activeSchoolId,
                  title,
                  eventType,
                  startDatetime,
                  endDatetime,
                  venueId: venueId || null,
                  venueName: vObj?.name || null,
                  targetAudience,
                  maxParticipants,
                  approvedBudget,
                  description,
                  broadcastAnnouncement: broadcast
                });
                showToast('Event created successfully!', 'success');
                setShowNewEventModal(false);
                fetchEventsData();
              } catch (err: any) {
                showToast(err.message || 'Failed to create event', 'error');
              }
            }} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Event Title *</label>
                <input required name="title" type="text" placeholder="e.g. Annual Science Exhibition 2026" className="w-full px-3 py-1.5 rounded-lg border border-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Event Type</label>
                  <select name="eventType" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                    <option value="SCHOOL_EVENT">School Event</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="EXAMINATION">Examination</option>
                    <option value="PARENT_MEETING">Parent Meeting</option>
                    <option value="SPORTS_EVENT">Sports Event</option>
                    <option value="COMPETITION">Competition</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="INSPECTION">Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Venue</label>
                  <select name="venueId" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                    <option value="">No venue assigned</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.capacity} pax)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Start Datetime *</label>
                  <input required name="startDatetime" type="datetime-local" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">End Datetime *</label>
                  <input required name="endDatetime" type="datetime-local" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Audience</label>
                  <select name="targetAudience" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white">
                    <option value="ALL">All Campus</option>
                    <option value="STUDENTS">Students</option>
                    <option value="PARENTS">Parents</option>
                    <option value="TEACHERS">Teachers</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Max Capacity</label>
                  <input name="maxParticipants" type="number" defaultValue="0" className="w-full px-2 py-1.5 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Budget (₹)</label>
                  <input name="approvedBudget" type="number" defaultValue="0" className="w-full px-2 py-1.5 rounded-lg border border-slate-200" />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea name="description" rows={2} className="w-full px-3 py-1.5 rounded-lg border border-slate-200" placeholder="Objectives, schedule, and judging parameters..."></textarea>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input id="broadcast" name="broadcast" type="checkbox" defaultChecked className="rounded text-indigo-600" />
                <label htmlFor="broadcast" className="text-xs text-slate-700 font-medium">Broadcast announcement via Phase 14 Communication system</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowNewEventModal(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold">Publish Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: PRINTABLE VISITOR PASS ----------------- */}
      {printablePass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 border-2 border-slate-900">
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Visitor Gate Pass</span>
              <h3 className="font-black text-slate-900 text-base">Vidya Vahini Public School</h3>
              <p className="text-[10px] text-slate-500">Deoghar Campus • Security Desk</p>
            </div>

            <div className="text-center py-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Pass Number</span>
              <p className="text-xl font-mono font-black text-indigo-700 tracking-wider">{printablePass.pass_number}</p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700 divide-y divide-slate-100">
              <div className="pt-1 flex justify-between"><span>Visitor:</span><strong className="text-slate-900">{printablePass.visitor_name}</strong></div>
              <div className="pt-1 flex justify-between"><span>Type:</span><strong className="text-slate-900">{printablePass.visitor_type}</strong></div>
              <div className="pt-1 flex justify-between"><span>Meeting:</span><strong className="text-slate-900">{printablePass.person_to_meet_name}</strong></div>
              <div className="pt-1 flex justify-between"><span>Dept:</span><strong className="text-slate-900">{printablePass.department_to_visit || 'Admin Wing'}</strong></div>
              <div className="pt-1 flex justify-between"><span>Entry Time:</span><strong className="font-mono">{new Date(printablePass.entry_time).toLocaleTimeString()}</strong></div>
              <div className="pt-1 flex justify-between"><span>Vehicle:</span><strong className="font-mono">{printablePass.vehicle_number || 'N/A'}</strong></div>
            </div>

            {/* Simulated Barcode */}
            <div className="pt-3 text-center border-t border-dashed border-slate-300">
              <div className="h-8 bg-slate-800 flex items-center justify-center rounded">
                <span className="text-white font-mono text-[10px] tracking-widest">||| | |||| | ||| || |||</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Valid for current day access only. Return pass at exit gate.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintablePass(null)}
                className="w-full py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: VISITOR CHECK-IN ----------------- */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Campus Visitor Gate Check-In</h3>
              <button onClick={() => setShowCheckInModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem('visitorName') as HTMLInputElement).value;
              const mobile = (form.elements.namedItem('mobile') as HTMLInputElement).value;
              const visitorType = (form.elements.namedItem('visitorType') as HTMLSelectElement).value;
              const personToMeetName = (form.elements.namedItem('personToMeetName') as HTMLInputElement).value;
              const departmentToVisit = (form.elements.namedItem('departmentToVisit') as HTMLInputElement).value;
              const purpose = (form.elements.namedItem('purpose') as HTMLInputElement).value;
              const vehicleNumber = (form.elements.namedItem('vehicleNumber') as HTMLInputElement).value;

              try {
                const res = await api.administration.checkInVisitor({
                  schoolId: activeSchoolId,
                  name,
                  mobile,
                  visitorType,
                  personToMeetName,
                  departmentToVisit,
                  purpose,
                  vehicleNumber
                });
                showToast(`Check-In Successful! Pass #${res.passNumber} generated.`, 'success');
                setShowCheckInModal(false);
                fetchVisitorsData();
                setPrintablePass({
                  pass_number: res.passNumber,
                  visitor_name: name,
                  visitor_type: visitorType,
                  person_to_meet_name: personToMeetName,
                  department_to_visit: departmentToVisit,
                  entry_time: new Date().toISOString(),
                  vehicle_number: vehicleNumber
                });
              } catch (err: any) {
                showToast(err.message || 'Check-In failed', 'error');
              }
            }} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Visitor Full Name *</label>
                  <input required name="visitorName" type="text" placeholder="e.g. Ramesh Kumar" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mobile Contact *</label>
                  <input required name="mobile" type="text" placeholder="+91 98000 00000" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Visitor Type</label>
                  <select name="visitorType" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                    <option value="PARENT">Parent / Guardian</option>
                    <option value="VENDOR">Vendor / Contractor</option>
                    <option value="GOVT_OFFICIAL">Govt / CBSE Official</option>
                    <option value="SERVICE_PROVIDER">Service Technician</option>
                    <option value="DELIVERY">Courier / Delivery</option>
                    <option value="GUEST">General Guest</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Vehicle Number</label>
                  <input name="vehicleNumber" type="text" placeholder="e.g. JH-15-AB-1234" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Person To Meet *</label>
                  <input required name="personToMeetName" type="text" placeholder="e.g. Dr. Sunita Mishra (Principal)" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department / Office</label>
                  <input name="departmentToVisit" type="text" placeholder="e.g. Principal Office / Accounts" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Purpose of Visit *</label>
                <input required name="purpose" type="text" placeholder="e.g. Discussion regarding Olympiad leave approval" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowCheckInModal(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold">Generate Pass & Check-In</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: VENUE BOOKING & CONFLICT DETECTION ----------------- */}
      {showVenueBookingModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Reserve Campus Facility / Venue</h3>
              <button onClick={() => { setShowVenueBookingModal(false); setVenueConflictError(null); }}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {venueConflictError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Booking Conflict Detected:</strong>
                  {venueConflictError}
                </div>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const venueId = (form.elements.namedItem('venueId') as HTMLSelectElement).value;
              const title = (form.elements.namedItem('title') as HTMLInputElement).value;
              const startDatetime = (form.elements.namedItem('startDatetime') as HTMLInputElement).value;
              const endDatetime = (form.elements.namedItem('endDatetime') as HTMLInputElement).value;
              const purpose = (form.elements.namedItem('purpose') as HTMLInputElement).value;
              const isOverride = (form.elements.namedItem('isOverride') as HTMLInputElement)?.checked || false;

              try {
                await api.administration.bookVenue({
                  schoolId: activeSchoolId,
                  venueId,
                  title,
                  startDatetime,
                  endDatetime,
                  purpose,
                  isOverride,
                  overrideReason: isOverride ? 'Authorized Executive Override by Principal' : null
                });
                showToast('Facility reserved successfully!', 'success');
                setShowVenueBookingModal(false);
                setVenueConflictError(null);
                fetchVenuesData();
              } catch (err: any) {
                if (err.message && err.message.includes('Conflict')) {
                  setVenueConflictError(err.message);
                } else {
                  showToast(err.message || 'Failed to book venue', 'error');
                }
              }
            }} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Facility *</label>
                <select required name="venueId" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.capacity} pax)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Booking Title / Purpose *</label>
                <input required name="title" type="text" placeholder="e.g. Physics Demonstration Lecture" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Start Datetime *</label>
                  <input required name="startDatetime" type="datetime-local" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">End Datetime *</label>
                  <input required name="endDatetime" type="datetime-local" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Equipment / Remarks</label>
                <input name="purpose" type="text" placeholder="e.g. Sound system, 2 cordless microphones required" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
              </div>

              {venueConflictError && hasPermission('venues.manage') && (
                <div className="flex items-center gap-2 pt-1 bg-amber-50 p-2 rounded border border-amber-200">
                  <input id="isOverride" name="isOverride" type="checkbox" className="rounded text-amber-600" />
                  <label htmlFor="isOverride" className="text-xs text-amber-900 font-semibold">Authorized Administrative Override (Allow Overlapping Booking)</label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => { setShowVenueBookingModal(false); setVenueConflictError(null); }} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold">Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: NEW MEETING ----------------- */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Schedule Administrative Meeting</h3>
              <button onClick={() => setShowNewMeetingModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const title = (form.elements.namedItem('title') as HTMLInputElement).value;
              const meetingType = (form.elements.namedItem('meetingType') as HTMLSelectElement).value;
              const date = (form.elements.namedItem('date') as HTMLInputElement).value;
              const startTime = (form.elements.namedItem('startTime') as HTMLInputElement).value;
              const endTime = (form.elements.namedItem('endTime') as HTMLInputElement).value;
              const venueName = (form.elements.namedItem('venueName') as HTMLInputElement).value;
              const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;

              try {
                await api.administration.createMeeting({
                  schoolId: activeSchoolId,
                  title,
                  meetingType,
                  date,
                  startTime,
                  endTime,
                  venueName,
                  description,
                  agendas: ['Review previous minutes', 'Core agenda discussion', 'Action items assignments']
                });
                showToast('Meeting scheduled and invitations sent!', 'success');
                setShowNewMeetingModal(false);
                fetchMeetingsData();
              } catch (err: any) {
                showToast(err.message || 'Failed to schedule meeting', 'error');
              }
            }} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Meeting Title *</label>
                <input required name="title" type="text" placeholder="e.g. Academic Council Term Review" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Meeting Classification</label>
                  <select name="meetingType" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                    <option value="PRINCIPAL">Principal Council</option>
                    <option value="STAFF">All Staff</option>
                    <option value="DEPARTMENT">Departmental</option>
                    <option value="PTM">Parent-Teacher Interaction</option>
                    <option value="MANAGEMENT">School Management Committee</option>
                    <option value="DISCIPLINARY">Discipline Committee</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Venue / Location</label>
                  <input name="venueName" type="text" defaultValue="Rabindranath Tagore Conference Hall" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date *</label>
                  <input required name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Start Time *</label>
                  <input required name="startTime" type="text" defaultValue="10:30 AM" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">End Time *</label>
                  <input required name="endTime" type="text" defaultValue="11:45 AM" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description & Objective</label>
                <textarea name="description" rows={2} placeholder="Summary of topics for discussion..." className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowNewMeetingModal(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold">Schedule & Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: MEETING MINUTES (MoM) DRAWER ----------------- */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedMeeting.meeting?.meeting_type}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedMeeting.meeting?.title}</h3>
                <p className="text-xs text-slate-500">Date: {selectedMeeting.meeting?.date} • {selectedMeeting.meeting?.start_time} - {selectedMeeting.meeting?.end_time}</p>
              </div>
              <button onClick={() => setSelectedMeeting(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            {/* Agendas */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Agenda Items</h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
                {selectedMeeting.agendas?.map((ag: any, idx: number) => (
                  <div key={ag.id} className="py-1.5 flex items-center justify-between text-xs">
                    <span>{idx + 1}. {ag.title}</span>
                    <span className="text-[10px] text-slate-400">{ag.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Minutes of Meeting (MoM) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Minutes of Meeting (MoM)</h4>
              {selectedMeeting.minutes ? (
                <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-2">
                  <div>
                    <span className="font-semibold text-slate-500 block text-[11px]">Discussion Summary:</span>
                    <p className="text-slate-800 whitespace-pre-line mt-0.5">{selectedMeeting.minutes.discussion_summary}</p>
                  </div>
                  {selectedMeeting.minutes.decisions_taken && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="font-semibold text-slate-500 block text-[11px]">Decisions Taken:</span>
                      <p className="text-slate-800 whitespace-pre-line mt-0.5">{selectedMeeting.minutes.decisions_taken}</p>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 pt-1">
                    Recorded by: {selectedMeeting.minutes.recorded_by_name}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-500">
                  Minutes have not been documented yet for this meeting.
                </div>
              )}
            </div>

            {/* Action Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Resulting Action Items</h4>
              <div className="space-y-1.5">
                {selectedMeeting.actionItems?.map((act: any) => (
                  <div key={act.id} className="p-2 rounded border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{act.task_description}</p>
                      <span className="text-[10px] text-slate-400">Assigned: {act.assigned_to_name} • Due: {act.due_date}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      act.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {act.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setSelectedMeeting(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: EVENT REGISTRATIONS DRAWER ----------------- */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedEvent.event_type}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedEvent.title}</h3>
                <p className="text-xs text-slate-500">Venue: {selectedEvent.venue_name || 'Campus Grounds'}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            {/* Participants Register */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Registered Participants ({eventRegistrations.length})</h4>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Participant</th>
                      <th className="p-2.5">Type / Class</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eventRegistrations.map(reg => (
                      <tr key={reg.id} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-semibold text-slate-900">{reg.participant_name}</td>
                        <td className="p-2.5 text-slate-600">{reg.participant_type} {reg.class_name ? `• ${reg.class_name}` : ''}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700">
                            {reg.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            reg.attendance_status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {reg.attendance_status || 'NOT MARKED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tasks & Budget */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Event Tasks ({eventTasks.length})</h4>
                <div className="space-y-1.5">
                  {eventTasks.map(t => (
                    <div key={t.id} className="p-2 rounded border border-slate-100 bg-slate-50 text-xs">
                      <p className="font-semibold text-slate-800">{t.task_title}</p>
                      <span className="text-[10px] text-slate-500">Assigned: {t.assigned_to_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Budget Tracking</h4>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated:</span>
                    <strong>₹{Number(selectedEvent.estimated_budget || 0).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approved:</span>
                    <strong className="text-emerald-700">₹{Number(selectedEvent.approved_budget || 0).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Actual Expense:</span>
                    <strong className="text-indigo-700">₹{Number(selectedEvent.actual_expense || 0).toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
