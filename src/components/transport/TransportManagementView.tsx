import React, { useState, useEffect } from 'react';
import {
  Bus,
  Navigation,
  Users,
  Calendar,
  Wrench,
  Fuel,
  AlertTriangle,
  Bell,
  FileText,
  BarChart3,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Shield,
  Download,
  Check,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  MapPin,
  Smartphone,
  Eye,
  RefreshCw,
  IndianRupee,
  CreditCard,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import type {
  School,
  AcademicSession,
  Vehicle,
  VehicleDocument,
  TransportDriver,
  TransportStaffAssignment,
  TransportRoute,
  TransportRouteStop,
  StudentTransportEnrollment,
  TransportTrip,
  VehicleMaintenance,
  VehicleFuelRecord,
  TransportIncident,
  TransportNotice,
  TransportSettings,
  TransportDashboardData
} from '../../types/erp.js';

import { AddVehicleModal } from './AddVehicleModal.js';
import { VehicleDocumentModal } from './VehicleDocumentModal.js';
import { AddDriverModal } from './AddDriverModal.js';
import { AddRouteModal } from './AddRouteModal.js';
import { AddStopModal } from './AddStopModal.js';
import { AssignStudentModal } from './AssignStudentModal.js';
import { CreateTripModal } from './CreateTripModal.js';
import { VehicleMaintenanceModal } from './VehicleMaintenanceModal.js';
import { FuelLogModal } from './FuelLogModal.js';
import { ReportIncidentModal } from './ReportIncidentModal.js';
import { TransportNoticeModal } from './TransportNoticeModal.js';

export const TransportManagementView: React.FC = () => {
  const { user, isSuperAdmin, activeSchool, hasPermission } = useAuth();

  // Subtabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'vehicles' | 'documents' | 'drivers' | 'routes' |
    'students' | 'trips' | 'workspace' | 'maintenance' | 'fuel' |
    'incidents' | 'notices' | 'portal' | 'fees' | 'reports'
  >('overview');

  // Filters & State
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(activeSchool?.id || '');
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<TransportDashboardData | null>(null);

  // Entities
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [drivers, setDrivers] = useState<TransportDriver[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<TransportStaffAssignment[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [enrollments, setEnrollments] = useState<StudentTransportEnrollment[]>([]);
  const [trips, setTrips] = useState<TransportTrip[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<VehicleMaintenance[]>([]);
  const [fuelRecords, setFuelRecords] = useState<VehicleFuelRecord[]>([]);
  const [incidents, setIncidents] = useState<TransportIncident[]>([]);
  const [notices, setNotices] = useState<TransportNotice[]>([]);
  const [portalInfo, setPortalInfo] = useState<any>(null);
  const [feesData, setFeesData] = useState<{ summary: any; routeBreakdown: any[]; studentFees: any[] } | null>(null);
  const [syncingFees, setSyncingFees] = useState(false);
  const [feeSyncMessage, setFeeSyncMessage] = useState<string | null>(null);

  // Workspace live trip
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [manifestData, setManifestData] = useState<{ trip: TransportTrip; students: any[] } | null>(null);
  const [markingStudentId, setMarkingStudentId] = useState<string | null>(null);

  // Selected Route for Stops sub-view
  const [selectedRouteForStops, setSelectedRouteForStops] = useState<TransportRoute | null>(null);
  const [routeStops, setRouteStops] = useState<TransportRouteStop[]>([]);

  // Search / Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  // Load Schools & Active Session
  useEffect(() => {
    api.schools.list()
      .then(res => {
        setSchools(res.schools || []);
        if (!selectedSchoolId && res.schools?.length > 0) {
          setSelectedSchoolId(res.schools[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) return;

    api.sessions.list(selectedSchoolId)
      .then(res => {
        setSessions(res.sessions || []);
        const current = res.sessions?.find(s => s.is_current) || res.sessions?.[0];
        if (current) setSelectedSessionId(current.id);
      })
      .catch(console.error);

    loadAllData();
  }, [selectedSchoolId]);

  const loadAllData = () => {
    if (!selectedSchoolId) return;
    setLoading(true);

    Promise.all([
      api.transport.getDashboard(selectedSchoolId).catch(() => null),
      api.transport.getVehicles({ schoolId: selectedSchoolId }).catch(() => ({ vehicles: [] })),
      api.transport.getDrivers(selectedSchoolId).catch(() => ({ drivers: [] })),
      api.transport.getStaffAssignments(selectedSchoolId).catch(() => ({ assignments: [] })),
      api.transport.getRoutes(selectedSchoolId).catch(() => ({ routes: [] })),
      api.transport.getEnrollments({ schoolId: selectedSchoolId }).catch(() => ({ enrollments: [] })),
      api.transport.getTrips({ schoolId: selectedSchoolId }).catch(() => ({ trips: [] })),
      api.transport.getExpiringDocuments(selectedSchoolId).catch(() => ({ expiringDocuments: [] })),
      api.transport.getMaintenance({ schoolId: selectedSchoolId }).catch(() => ({ maintenanceRecords: [] })),
      api.transport.getFuel({ schoolId: selectedSchoolId }).catch(() => ({ fuelRecords: [] })),
      api.transport.getIncidents(selectedSchoolId).catch(() => ({ incidents: [] })),
      api.transport.getNotices(selectedSchoolId).catch(() => ({ notices: [] })),
      api.transport.getMyTransport({ schoolId: selectedSchoolId }).catch(() => null),
      api.transport.getFeesSummary(selectedSchoolId).catch(() => null)
    ])
      .then(([dashRes, vehRes, drvRes, staffRes, rteRes, enrRes, tripRes, docRes, maintRes, fuelRes, incRes, notRes, portRes, feesRes]) => {
        if (dashRes) setDashboardData(dashRes);
        setVehicles(vehRes.vehicles || []);
        setDrivers(drvRes.drivers || []);
        setStaffAssignments(staffRes.assignments || []);
        setRoutes(rteRes.routes || []);
        setEnrollments(enrRes.enrollments || []);
        setTrips(tripRes.trips || []);
        setDocuments(docRes.expiringDocuments || []);
        setMaintenanceRecords(maintRes.maintenanceRecords || []);
        setFuelRecords(fuelRes.fuelRecords || []);
        setIncidents(incRes.incidents || []);
        setNotices(notRes.notices || []);
        setPortalInfo(portRes);
        if (feesRes) setFeesData(feesRes);

        // Auto select first trip for workspace if available
        if (tripRes.trips?.length > 0 && !selectedTripId) {
          loadTripManifest(tripRes.trips[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleSyncFees = async () => {
    try {
      setSyncingFees(true);
      setFeeSyncMessage(null);
      const res = await api.transport.syncFees({ schoolId: selectedSchoolId, sessionId: selectedSessionId });
      setFeeSyncMessage(res.message);
      const updatedFees = await api.transport.getFeesSummary(selectedSchoolId);
      setFeesData(updatedFees);
    } catch (err: any) {
      setFeeSyncMessage(`Error syncing: ${err.message}`);
    } finally {
      setSyncingFees(false);
    }
  };

  const loadTripManifest = (tripId: string) => {
    setSelectedTripId(tripId);
    api.transport.getTripManifest(tripId, selectedSchoolId)
      .then(res => setManifestData(res))
      .catch(console.error);
  };

  const handleMarkStudentAttendance = async (
    studentId: string,
    routeId: string,
    stopId: string,
    pickupStatus?: string,
    dropStatus?: string
  ) => {
    if (!selectedTripId) return;
    try {
      setMarkingStudentId(studentId);
      await api.transport.markAttendance(selectedTripId, {
        schoolId: selectedSchoolId,
        studentId,
        routeId,
        stopId,
        pickupStatus,
        dropStatus
      });
      // Refresh manifest
      loadTripManifest(selectedTripId);
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingStudentId(null);
    }
  };

  const loadRouteStops = (route: TransportRoute) => {
    setSelectedRouteForStops(route);
    api.transport.getRouteStops(route.id, selectedSchoolId)
      .then(res => setRouteStops(res.stops || []))
      .catch(console.error);
  };

  const handleTripStatusChange = async (tripId: string, status: string) => {
    try {
      await api.transport.updateTripStatus(tripId, { status });
      loadAllData();
      if (selectedTripId === tripId) {
        loadTripManifest(tripId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export current list to CSV
  const handleExportCSV = () => {
    let rows: any[] = [];
    let headers: string[] = [];

    if (activeTab === 'vehicles') {
      headers = ['Vehicle Number', 'Registration', 'Type', 'Make', 'Model', 'Capacity', 'Mileage', 'Fuel', 'Status'];
      rows = vehicles.map(v => [v.vehicle_number, v.registration_number, v.vehicle_type, v.make, v.model, v.total_capacity, v.current_mileage, v.fuel_type, v.status]);
    } else if (activeTab === 'students') {
      headers = ['Student Name', 'Admission No', 'Route Code', 'Route Name', 'Pickup Stop', 'Drop Stop', 'Fare (Rs)', 'Status'];
      rows = enrollments.map(e => [e.student_name, e.admission_number, e.route_code, e.route_name, e.pickup_stop_name, e.drop_stop_name, e.monthly_fare, e.status]);
    } else if (activeTab === 'routes') {
      headers = ['Route Code', 'Route Name', 'Start Point', 'End Point', 'Distance (km)', 'Stops', 'Enrolled Students', 'Vehicle'];
      rows = routes.map(r => [r.code, r.name, r.start_point, r.end_point, r.estimated_distance_km, r.stops_count, r.enrolled_students_count, r.vehicle_number || 'N/A']);
    } else if (activeTab === 'fuel') {
      headers = ['Date', 'Vehicle', 'Fuel Type', 'Quantity (L)', 'Rate (Rs)', 'Total Amount (Rs)', 'Odometer (km)', 'Station'];
      rows = fuelRecords.map(f => [f.fuel_date, f.vehicle_number, f.fuel_type, f.quantity_litres, f.rate_per_litre, f.total_amount, f.odometer_reading, f.fuel_station || '']);
    } else {
      headers = ['Date', 'Vehicle', 'Type', 'Vendor', 'Cost (Rs)', 'Odometer', 'Invoice'];
      rows = maintenanceRecords.map(m => [m.maintenance_date, m.vehicle_number, m.maintenance_type, m.vendor_center, m.cost, m.odometer_reading || '', m.invoice_number || '']);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map((c: any) => `"${c || ''}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transport_${activeTab}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Transport & Fleet Management</h1>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Phase 9
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Fleet vehicles, GPS-ready routes, student conveyance, daily trips, fuel & accounts integration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Multi-School Switcher */}
          {isSuperAdmin && (
            <select
              value={selectedSchoolId}
              onChange={e => setSelectedSchoolId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          )}

          {/* Quick Actions Dropdown / Buttons */}
          <button
            onClick={() => setShowAddVehicleModal(true)}
            className="px-3 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm hover:shadow flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vehicle</span>
          </button>

          <button
            onClick={() => setShowCreateTripModal(true)}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Dispatch Trip</span>
          </button>

          <button
            onClick={loadAllData}
            title="Refresh Data"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* NAVIGATION SUBTABS */}
      <div className="bg-slate-200/70 p-1 rounded-xl flex items-center gap-1 overflow-x-auto text-xs font-semibold text-slate-600">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'vehicles', label: 'Fleet Vehicles', icon: Bus },
          { id: 'documents', label: 'Documents & Expiry', icon: FileText },
          { id: 'drivers', label: 'Drivers & Crew', icon: UserCheck },
          { id: 'routes', label: 'Routes & Stops', icon: Navigation },
          { id: 'students', label: 'Transport Students', icon: Users },
          { id: 'trips', label: 'Daily Trips', icon: Calendar },
          { id: 'workspace', label: 'Driver Workspace', icon: Smartphone, highlight: true },
          { id: 'maintenance', label: 'Maintenance & Repairs', icon: Wrench },
          { id: 'fuel', label: 'Fuel Log', icon: Fuel },
          { id: 'incidents', label: 'Incidents & Safety', icon: AlertTriangle },
          { id: 'notices', label: 'Notices', icon: Bell },
          { id: 'fees', label: 'Conveyance & Fees', icon: CreditCard },
          { id: 'portal', label: 'Student / Parent View', icon: Eye },
          { id: 'reports', label: 'Reports & Export', icon: Download }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'hover:text-slate-900 hover:bg-white/50'
              } ${tab.highlight ? 'text-cyan-700' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* 1. OVERVIEW / DASHBOARD TAB */}
      {/* ==================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fleet Vehicles</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {dashboardData?.vehicles?.total || vehicles.length}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {dashboardData?.vehicles?.active || 0} in active service
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Routes</span>
              <div className="text-2xl font-bold text-indigo-700 mt-1">
                {dashboardData?.routes?.active || routes.length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                {routes.reduce((acc, r) => acc + parseInt(r.stops_count?.toString() || '0', 10), 0)} total stops
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Enrolled Students</span>
              <div className="text-2xl font-bold text-teal-700 mt-1">
                {dashboardData?.enrollments?.total_students || enrollments.length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                ₹{parseInt(dashboardData?.enrollments?.total_monthly_fare_expected?.toString() || '0', 10).toLocaleString('en-IN')}/mo
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Today's Trips</span>
              <div className="text-2xl font-bold text-cyan-700 mt-1">
                {dashboardData?.trips?.total_trips || trips.length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                {dashboardData?.trips?.completed_trips || 0} completed
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Expiring Docs</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {parseInt(dashboardData?.expiringDocuments?.expired_docs?.toString() || '0', 10) +
                 parseInt(dashboardData?.expiringDocuments?.expiring_soon_docs?.toString() || '0', 10)}
              </div>
              <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                RC, Insurance & Fitness
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Safety Incidents</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {dashboardData?.incidents?.open_incidents || 0}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Open / Under Review
              </div>
            </div>
          </div>

          {/* Compliance & Expiry Alert Banner */}
          {(parseInt(dashboardData?.expiringDocuments?.expiring_soon_docs?.toString() || '0', 10) > 0 ||
            parseInt(dashboardData?.expiringDocuments?.expired_docs?.toString() || '0', 10) > 0) && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-200/60 text-rose-800 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-900 text-sm">Regulatory Compliance Warning</h4>
                  <p className="text-xs text-rose-700">
                    {dashboardData?.expiringDocuments?.expired_docs || 0} expired compliance certificates and{' '}
                    {dashboardData?.expiringDocuments?.expiring_soon_docs || 0} certificates expiring within 30 days.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('documents')}
                className="px-3 py-1.5 text-xs font-bold text-rose-900 bg-rose-200 hover:bg-rose-300 rounded-lg transition-colors"
              >
                Review Documents &rarr;
              </button>
            </div>
          )}

          {/* Today's Trips & Live Movement Board */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Today's Scheduled Trips & Live Movements</h3>
                <p className="text-xs text-slate-500">Live progress of morning student pickup and afternoon return runs</p>
              </div>
              <button
                onClick={() => setShowCreateTripModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 rounded-lg flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Trip</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {dashboardData?.todayTrips && dashboardData.todayTrips.length > 0 ? (
                dashboardData.todayTrips.map(trip => (
                  <div key={trip.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                        trip.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        trip.status === 'In Progress' ? 'bg-cyan-100 text-cyan-800 animate-pulse' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        <Bus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{trip.route_code}: {trip.route_name}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            trip.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            trip.status === 'In Progress' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {trip.status}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600">
                            {trip.trip_type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Bus: <strong className="text-slate-700">{trip.vehicle_number}</strong> ({trip.registration_number})</span>
                          <span>Driver: <strong className="text-slate-700">{trip.driver_name}</strong> ({trip.driver_phone || 'N/A'})</span>
                          {trip.conductor_name && <span>Conductor: <strong className="text-slate-700">{trip.conductor_name}</strong></span>}
                          <span>Timing: <strong className="text-slate-700">{trip.scheduled_start_time} - {trip.scheduled_end_time}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-800">
                          {trip.boarded_students_count || 0} / {trip.enrolled_students_count || 0} Boarded
                        </div>
                        <div className="text-[11px] text-slate-500">Roll-call status</div>
                      </div>

                      <button
                        onClick={() => {
                          loadTripManifest(trip.id);
                          setActiveTab('workspace');
                        }}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Conductor Workspace</span>
                      </button>

                      {trip.status === 'Scheduled' && (
                        <button
                          onClick={() => handleTripStatusChange(trip.id, 'In Progress')}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl"
                        >
                          Start
                        </button>
                      )}
                      {trip.status === 'In Progress' && (
                        <button
                          onClick={() => handleTripStatusChange(trip.id, 'Completed')}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No trips scheduled for today yet. Click "New Trip" to dispatch buses.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. FLEET VEHICLES TAB */}
      {/* ==================================================== */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search vehicle number, registration, model..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => { setEditingVehicle(null); setShowAddVehicleModal(true); }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Vehicle</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles
              .filter(v => {
                if (statusFilter !== 'all' && v.status !== statusFilter) return false;
                if (searchQuery && !v.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) && !v.registration_number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                return true;
              })
              .map(v => (
                <div key={v.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 font-mono">{v.vehicle_number}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          v.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          v.status === 'Under Maintenance' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">{v.registration_number}</div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                      {v.vehicle_type}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Make & Model:</span>
                      <span className="font-semibold text-slate-800">{v.make} {v.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capacity:</span>
                      <span className="font-semibold text-slate-800">{v.seating_capacity} Seats ({v.total_capacity} Total)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fuel & Odometer:</span>
                      <span className="font-semibold text-slate-800">{v.fuel_type} &bull; {v.current_mileage.toLocaleString('en-IN')} km</span>
                    </div>
                    {v.assigned_route_code && (
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Assigned Route:</span>
                        <span className="font-bold text-indigo-700">{v.assigned_route_code}</span>
                      </div>
                    )}
                  </div>

                  {v.notes && (
                    <p className="text-[11px] text-slate-500 italic line-clamp-2">"{v.notes}"</p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Documents: <strong className="text-slate-800">{v.documents_count || 0}</strong>
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowDocModal(true);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                      >
                        + Document
                      </button>
                      <button
                        onClick={() => { setEditingVehicle(v); setShowAddVehicleModal(true); }}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. DOCUMENTS & EXPIRY TAB */}
      {/* ==================================================== */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Fleet Compliance & Expiry Register</h3>
              <p className="text-xs text-slate-500">Registration, Fitness, Commercial Insurance, Pollution (PUC), Speed Governor</p>
            </div>
            <button
              onClick={() => setShowDocModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Vehicle</th>
                    <th className="p-3.5">Document Type</th>
                    <th className="p-3.5">Policy / Reg No.</th>
                    <th className="p-3.5">Issue Date</th>
                    <th className="p-3.5">Expiry Date</th>
                    <th className="p-3.5">Days Left</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {documents.map(doc => {
                    const days = doc.days_until_expiry !== undefined ? doc.days_until_expiry : 0;
                    const isExp = days < 0;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold font-mono text-slate-900">
                          {doc.vehicle_number} <span className="text-[11px] font-normal text-slate-500">({doc.registration_number})</span>
                        </td>
                        <td className="p-3.5 font-medium">{doc.document_type}</td>
                        <td className="p-3.5 font-mono">{doc.document_number}</td>
                        <td className="p-3.5">{doc.issue_date?.split('T')[0]}</td>
                        <td className="p-3.5 font-semibold">{doc.expiry_date?.split('T')[0]}</td>
                        <td className="p-3.5">
                          <span className={`font-bold ${isExp ? 'text-rose-600' : days <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {isExp ? `${Math.abs(days)} days overdue` : `${days} days left`}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isExp ? 'bg-rose-100 text-rose-800' :
                            days <= 30 ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isExp ? 'EXPIRED' : days <= 30 ? 'EXPIRING SOON' : 'VALID'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. DRIVERS & CREW TAB */}
      {/* ==================================================== */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Transport Drivers & Conductor Roster</h3>
              <p className="text-xs text-slate-500">Integrated directly with existing Staff & Employee profiles (No duplicate database)</p>
            </div>
            <button
              onClick={() => setShowAddDriverModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Driver</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map(drv => (
              <div key={drv.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{drv.driver_name}</h4>
                    <span className="text-xs font-mono text-slate-500">{drv.employee_id_number}</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {drv.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Commercial License:</span>
                    <span className="font-mono font-bold text-slate-800">{drv.license_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">License Expiry:</span>
                    <span className="font-semibold text-slate-800">{drv.license_expiry_date?.split('T')[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Experience:</span>
                    <span className="font-semibold text-slate-800">{drv.experience_years} Years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Medical & Police:</span>
                    <span className="font-semibold text-emerald-700">{drv.medical_fitness_status} &bull; {drv.police_verification_status}</span>
                  </div>
                  {drv.assigned_route_code && (
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Assigned Route:</span>
                      <span className="font-bold text-indigo-700">{drv.assigned_route_code} ({drv.assigned_vehicle_number})</span>
                    </div>
                  )}
                </div>

                {drv.mobile_number && (
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{drv.mobile_number}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Conductors & Helpers Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Transport Conductors & Female Bus Escorts</h4>
            <div className="divide-y divide-slate-100 text-xs">
              {staffAssignments.map(cnd => (
                <div key={cnd.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">{cnd.staff_name} ({cnd.role})</div>
                    <div className="text-slate-500 text-[11px]">Staff ID: {cnd.employee_id_number} &bull; Contact: {cnd.phone || 'N/A'}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-medium text-slate-700">
                    Vehicle: {cnd.vehicle_number || 'Unassigned'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. ROUTES & STOPS TAB */}
      {/* ==================================================== */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">School Bus Routes & Stop Sequence</h3>
              <p className="text-xs text-slate-500">Pick-up and drop timings, distance, allocated bus, and stop fares</p>
            </div>
            <button
              onClick={() => { setEditingRoute(null); setShowAddRouteModal(true); }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Route</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {r.code}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{r.start_point} &rarr; {r.end_point}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                    {r.estimated_distance_km} km ({r.estimated_duration_mins} mins)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Vehicle</span>
                    <strong className="text-slate-800">{r.vehicle_number || 'Unassigned'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Driver</span>
                    <strong className="text-slate-800">{r.driver_name || 'Unassigned'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Stops</span>
                    <strong className="text-slate-800">{r.stops_count || 0} Stops</strong>
                  </div>
                </div>

                {/* Capacity Utilization Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Seat Capacity Utilization</span>
                    <span className="font-bold text-slate-800">
                      {r.enrolled_students_count || 0} / {r.total_capacity || 40} ({r.capacity_utilization_pct || 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        parseFloat(r.capacity_utilization_pct?.toString() || '0') > 90 ? 'bg-rose-500' :
                        parseFloat(r.capacity_utilization_pct?.toString() || '0') > 70 ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, parseFloat(r.capacity_utilization_pct?.toString() || '0'))}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => loadRouteStops(r)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>View & Manage Stops ({r.stops_count || 0})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => { setEditingRoute(r); setShowAddRouteModal(true); }}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Edit Route
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Stops Drawer / Detail if Route Selected */}
          {selectedRouteForStops && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-5 space-y-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-indigo-950 text-base">
                    Stops for Route: {selectedRouteForStops.code} - {selectedRouteForStops.name}
                  </h4>
                  <p className="text-xs text-slate-500">Ordered sequence of morning pick-up and afternoon drop stops</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddStopModal(true)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Stop</span>
                  </button>
                  <button
                    onClick={() => setSelectedRouteForStops(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {routeStops.map((st, idx) => (
                  <div key={st.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-xs">
                        {st.sequence_order || idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{st.stop_name}</div>
                        <div className="text-slate-500 text-xs">
                          {st.landmark && <span>Near: {st.landmark} &bull; </span>}
                          <span>Pickup: <strong className="text-slate-700">{st.pickup_time}</strong></span> &bull;{' '}
                          <span>Drop: <strong className="text-slate-700">{st.drop_time}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm">₹{st.fare_amount}/mo</div>
                      <div className="text-[11px] text-slate-500">
                        {st.pickup_students_count || 0} students boarding
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. STUDENTS TRANSPORT ENROLLMENT TAB */}
      {/* ==================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search student, admission no, class..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setShowEnrollModal(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll Student</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Student Details</th>
                    <th className="p-3.5">Assigned Route</th>
                    <th className="p-3.5">Morning Pickup Stop</th>
                    <th className="p-3.5">Afternoon Drop Stop</th>
                    <th className="p-3.5">Monthly Fee</th>
                    <th className="p-3.5">Guardian Contact</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {enrollments
                    .filter(e => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return e.student_name.toLowerCase().includes(q) || e.admission_number.toLowerCase().includes(q);
                    })
                    .map(enr => (
                      <tr key={enr.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{enr.student_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {enr.admission_number} &bull; Class {enr.class_name || ''} {enr.section_name || ''}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-indigo-700 font-mono">{enr.route_code}</span>
                          <div className="text-[11px] text-slate-500">Bus: {enr.vehicle_number || 'N/A'}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{enr.pickup_stop_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{enr.pickup_time}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{enr.drop_stop_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{enr.drop_time}</div>
                        </td>
                        <td className="p-3.5 font-bold text-teal-800 font-mono">
                          ₹{enr.monthly_fare}/mo
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-800">{enr.emergency_contact_person || enr.father_name || 'Parent'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{enr.emergency_contact_phone || enr.primary_phone || 'N/A'}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {enr.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. DAILY TRIPS TAB */}
      {/* ==================================================== */}
      {activeTab === 'trips' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daily Bus Trips & Route Dispatch Schedule</h3>
              <p className="text-xs text-slate-500">Track departure, arrival, driver allocation, and passenger roll-call</p>
            </div>
            <button
              onClick={() => setShowCreateTripModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dispatch Trip</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Route</th>
                    <th className="p-3.5">Trip Type</th>
                    <th className="p-3.5">Vehicle</th>
                    <th className="p-3.5">Driver & Crew</th>
                    <th className="p-3.5">Schedule</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {trips.map(tr => (
                    <tr key={tr.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5">
                        <span className="font-bold font-mono text-indigo-700">{tr.route_code}</span>
                        <div className="text-[11px] text-slate-500">{tr.route_name}</div>
                      </td>
                      <td className="p-3.5 font-medium">{tr.trip_type}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {tr.vehicle_number}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{tr.driver_name}</div>
                        {tr.conductor_name && <div className="text-[11px] text-slate-500">Conductor: {tr.conductor_name}</div>}
                      </td>
                      <td className="p-3.5 font-mono">
                        {tr.scheduled_start_time} - {tr.scheduled_end_time}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          tr.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          tr.status === 'In Progress' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {tr.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            loadTripManifest(tr.id);
                            setActiveTab('workspace');
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg"
                        >
                          Manifest / Roll Call
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 8. DRIVER & CONDUCTOR MOBILE WORKSPACE TAB */}
      {/* ==================================================== */}
      {activeTab === 'workspace' && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Trip Selector Header */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Live Bus Conductor Workspace</h3>
                  <p className="text-xs text-slate-400">Mobile-optimized interface for student boarding and drop roll-call</p>
                </div>
              </div>

              {/* Trip Switcher */}
              <select
                value={selectedTripId}
                onChange={e => loadTripManifest(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {trips.map(tr => (
                  <option key={tr.id} value={tr.id}>
                    {tr.route_code} &bull; {tr.trip_type} ({tr.vehicle_number})
                  </option>
                ))}
              </select>
            </div>

            {manifestData?.trip && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Bus</span>
                  <strong className="text-white font-mono">{manifestData.trip.vehicle_number}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Driver</span>
                  <strong className="text-white">{manifestData.trip.driver_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Trip Status</span>
                  <span className="font-bold text-cyan-400">{manifestData.trip.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Passenger Count</span>
                  <strong className="text-white">{manifestData.students?.length || 0} Students</strong>
                </div>
              </div>
            )}
          </div>

          {/* Stop by Stop Roll Call */}
          <div className="space-y-3">
            {manifestData?.students && manifestData.students.length > 0 ? (
              manifestData.students.map(st => (
                <div
                  key={st.student_id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0 text-xs">
                      {st.pickup_stop_seq || '#'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{st.student_name}</h4>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {st.admission_number}
                        </span>
                        {st.medical_alert_notes && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            Medical Alert
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Stop: <strong className="text-slate-700">{st.pickup_stop_name}</strong> ({st.scheduled_pickup_time})
                      </div>
                      {st.emergency_contact_phone && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{st.emergency_contact_person || 'Parent'}: {st.emergency_contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Big Touch-Friendly Buttons for Morning / Afternoon */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Boarding Actions */}
                    <button
                      type="button"
                      disabled={markingStudentId === st.student_id}
                      onClick={() => handleMarkStudentAttendance(st.student_id, manifestData.trip.route_id, st.pickup_stop_id, 'Boarded', undefined)}
                      className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                        st.pickup_status === 'Boarded'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{st.pickup_status === 'Boarded' ? `Boarded (${st.actual_pickup_time || 'OK'})` : 'Boarded'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={markingStudentId === st.student_id}
                      onClick={() => handleMarkStudentAttendance(st.student_id, manifestData.trip.route_id, st.pickup_stop_id, 'Absent', undefined)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                        st.pickup_status === 'Absent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      <span>Absent</span>
                    </button>

                    <button
                      type="button"
                      disabled={markingStudentId === st.student_id}
                      onClick={() => handleMarkStudentAttendance(st.student_id, manifestData.trip.route_id, st.drop_stop_id, undefined, 'Dropped')}
                      className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                        st.drop_status === 'Dropped'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{st.drop_status === 'Dropped' ? 'Dropped' : 'Mark Drop'}</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                No students enrolled or found for this trip. Please dispatch or choose another trip.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 9. MAINTENANCE & SERVICE TAB */}
      {/* ==================================================== */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Fleet Maintenance & Servicing Register</h3>
              <p className="text-xs text-slate-500">Workshop repairs, cost log, and automatic expense posting to school accounts</p>
            </div>
            <button
              onClick={() => setShowMaintenanceModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Maintenance</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Vehicle</th>
                    <th className="p-3.5">Work Type</th>
                    <th className="p-3.5">Workshop / Vendor</th>
                    <th className="p-3.5">Odometer</th>
                    <th className="p-3.5">Cost (₹)</th>
                    <th className="p-3.5">Finance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {maintenanceRecords.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-medium">{m.maintenance_date?.split('T')[0]}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{m.vehicle_number}</td>
                      <td className="p-3.5 font-medium text-slate-800">
                        {m.maintenance_type}
                        <div className="text-[11px] text-slate-500 font-normal line-clamp-1">{m.description}</div>
                      </td>
                      <td className="p-3.5">{m.vendor_center}</td>
                      <td className="p-3.5 font-mono">{m.odometer_reading ? `${m.odometer_reading.toLocaleString('en-IN')} km` : 'N/A'}</td>
                      <td className="p-3.5 font-bold text-slate-900 font-mono">
                        ₹{parseFloat(m.cost?.toString() || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Posted to Accounts
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 10. FUEL LOG TAB */}
      {/* ==================================================== */}
      {activeTab === 'fuel' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Vehicle Fuel Log & Consumption Ledger</h3>
              <p className="text-xs text-slate-500">Tracks litres refueled, pump rates, odometer, and automatic finance posting</p>
            </div>
            <button
              onClick={() => setShowFuelModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Refueling</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Vehicle</th>
                    <th className="p-3.5">Fuel Type</th>
                    <th className="p-3.5">Litres</th>
                    <th className="p-3.5">Rate / L</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5">Odometer</th>
                    <th className="p-3.5">Fuel Station</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {fuelRecords.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-medium">{f.fuel_date?.split('T')[0]}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{f.vehicle_number}</td>
                      <td className="p-3.5 font-semibold text-slate-700">{f.fuel_type}</td>
                      <td className="p-3.5 font-mono">{f.quantity_litres} L</td>
                      <td className="p-3.5 font-mono">₹{f.rate_per_litre}</td>
                      <td className="p-3.5 font-bold font-mono text-rose-700">
                        ₹{parseFloat(f.total_amount?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 font-mono">{f.odometer_reading?.toLocaleString('en-IN')} km</td>
                      <td className="p-3.5 text-slate-600">{f.fuel_station || 'Commercial Station'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 11. INCIDENTS & SAFETY TAB */}
      {/* ==================================================== */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Transport Incidents & Emergency Log</h3>
              <p className="text-xs text-slate-500">Accident reports, delays, vehicle breakdowns, and student safety resolutions</p>
            </div>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Incident</span>
            </button>
          </div>

          <div className="space-y-3">
            {incidents.map(inc => (
              <div key={inc.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      inc.severity === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      inc.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                      inc.severity === 'Medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {inc.severity} Severity
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{inc.incident_type}</h4>
                    <span className="text-xs text-slate-400">&bull; {inc.incident_date?.split('T')[0]} ({inc.incident_time || 'Morning'})</span>
                  </div>

                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    inc.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {inc.status}
                  </span>
                </div>

                <p className="text-xs text-slate-700">{inc.description}</p>

                {inc.location && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location: {inc.location}</span>
                  </div>
                )}

                {inc.action_taken && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-800 space-y-1">
                    <span className="font-bold text-slate-900">Action Taken:</span>
                    <p>{inc.action_taken}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 12. NOTICES TAB */}
      {/* ==================================================== */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Transport Circulars & Bulletins</h3>
              <p className="text-xs text-slate-500">Route delay alerts, holiday bus schedules, and parent broadcasts</p>
            </div>
            <button
              onClick={() => setShowNoticeModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publish Notice</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map(nt => (
              <div key={nt.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {nt.notice_type}
                    </span>
                    <span className="text-[11px] text-slate-400">{nt.publish_date?.split('T')[0]}</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Audience: {nt.target_audience}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">{nt.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{nt.content}</p>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  Published by: <strong className="text-slate-600">{nt.created_by || 'Transport Department'}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 13. STUDENT & PARENT PORTAL TAB */}
      {/* ==================================================== */}
      {activeTab === 'portal' && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-amber-400">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">My Child's School Bus Information</h3>
                <p className="text-xs text-slate-300">
                  Student: <strong>{portalInfo?.transport?.student_name || 'Enrolled Student'}</strong> ({portalInfo?.transport?.admission_number || 'VVP-2025-0001'})
                </p>
              </div>
            </div>

            {portalInfo?.transport ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Route</span>
                  <strong className="text-white font-mono">{portalInfo.transport.route_code}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Bus Number</span>
                  <strong className="text-amber-400 font-mono">{portalInfo.transport.vehicle_number}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Driver Name</span>
                  <strong className="text-white">{portalInfo.transport.driver_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Driver Phone</span>
                  <strong className="text-white">{portalInfo.transport.driver_phone || 'Emergency Control Room'}</strong>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-300 py-2">
                No active transport enrollment mapped for this profile.
              </div>
            )}
          </div>

          {portalInfo?.transport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Morning Pick-up Schedule</span>
                </h4>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <div className="text-slate-500">Pick-up Stop:</div>
                  <div className="font-bold text-slate-800 text-sm">{portalInfo.transport.pickup_stop_name}</div>
                  <div className="text-emerald-700 font-mono font-bold">
                    Scheduled Time: {portalInfo.transport.scheduled_pickup_time}
                  </div>
                  {portalInfo.transport.pickup_landmark && (
                    <div className="text-slate-500 text-[11px]">Landmark: {portalInfo.transport.pickup_landmark}</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Afternoon Return Drop Schedule</span>
                </h4>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <div className="text-slate-500">Drop Stop:</div>
                  <div className="font-bold text-slate-800 text-sm">{portalInfo.transport.drop_stop_name}</div>
                  <div className="text-indigo-700 font-mono font-bold">
                    Scheduled Time: {portalInfo.transport.scheduled_drop_time}
                  </div>
                  {portalInfo.transport.drop_landmark && (
                    <div className="text-slate-500 text-[11px]">Landmark: {portalInfo.transport.drop_landmark}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 13. CONVEYANCE & FEES INTEGRATION TAB */}
      {/* ==================================================== */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Transport Conveyance & Fee Integration</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Phase 6 Integrated
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Integrates directly with the core Accounts module. Fares sync to student fee ledgers and fee receipts without duplicate payment tables.
              </p>
            </div>
            <button
              onClick={handleSyncFees}
              disabled={syncingFees}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingFees ? 'animate-spin' : ''}`} />
              <span>{syncingFees ? 'Posting to Ledger...' : 'Sync Dues to Student Accounts'}</span>
            </button>
          </div>

          {feeSyncMessage && (
            <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
              feeSyncMessage.includes('Error')
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feeSyncMessage}</span>
            </div>
          )}

          {/* Top Finance Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Transport Students</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {feesData?.summary?.enrolled_count || enrollments.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Active bus conveyance enrollments</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Monthly Fare Potential</span>
              <div className="text-2xl font-bold text-teal-700 font-mono mt-1">
                ₹{parseFloat(feesData?.summary?.total_monthly_potential || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-teal-600 font-medium mt-0.5">Recurring monthly fee revenue</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fee-Generating Routes</span>
              <div className="text-2xl font-bold text-indigo-700 mt-1">
                {feesData?.summary?.active_routes_count || routes.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Routes configured with stop fares</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Accounts Linkage</span>
              <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 mt-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Category: TRANS_FEE</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Receipt & Ledger integration live</p>
            </div>
          </div>

          {/* Route-wise Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200/80 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Route Conveyance Tariff Summary</h4>
              <span className="text-xs text-slate-500">{feesData?.routeBreakdown?.length || 0} configured routes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/60 font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Route Code</th>
                    <th className="py-2.5 px-4">Route Name</th>
                    <th className="py-2.5 px-4 text-center">Enrolled Students</th>
                    <th className="py-2.5 px-4 text-right">Monthly Collection Potential</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feesData?.routeBreakdown && feesData.routeBreakdown.length > 0 ? (
                    feesData.routeBreakdown.map((rb: any) => (
                      <tr key={rb.route_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">{rb.route_code}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{rb.route_name}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            {rb.students_count} students
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-teal-700">
                          ₹{parseFloat(rb.route_monthly_total || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">No route conveyance data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Conveyance Fee Roster */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200/80 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Student Conveyance Fee Roster</h4>
                <p className="text-[11px] text-slate-500">Student-specific monthly transport fee assignments linked to academic session</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg">
                {feesData?.studentFees?.length || 0} Active Student Plans
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/60 font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Adm No</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-4">Route & Stops</th>
                    <th className="py-2.5 px-4">Conveyance Type</th>
                    <th className="py-2.5 px-4 text-right">Monthly Fare</th>
                    <th className="py-2.5 px-4 text-center">Finance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feesData?.studentFees && feesData.studentFees.length > 0 ? (
                    feesData.studentFees.map((sf: any) => (
                      <tr key={sf.enrollment_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{sf.admission_number}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{sf.student_name}</td>
                        <td className="py-3 px-4 text-slate-600">{sf.class_name} {sf.section_name && `(${sf.section_name})`}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{sf.route_name}</div>
                          <div className="text-[11px] text-slate-500">
                            P: {sf.pickup_stop_name} | D: {sf.drop_stop_name}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {sf.transport_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{parseFloat(sf.monthly_fare || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ledger Active
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">No student conveyance records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 14. REPORTS & ANALYTICS TAB */}
      {/* ==================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Transport Analytics & Operational Reports</h3>
              <p className="text-xs text-slate-500">Fleet seat utilization, fuel costs, maintenance expenditure, and attendance rates</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fuel Expenses</span>
              <div className="text-2xl font-bold text-rose-700 font-mono">
                ₹{fuelRecords.reduce((acc, f) => acc + parseFloat(f.total_amount?.toString() || '0'), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500">Recorded across {fuelRecords.length} fuel station fill-ups</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Maintenance Cost</span>
              <div className="text-2xl font-bold text-orange-700 font-mono">
                ₹{maintenanceRecords.reduce((acc, m) => acc + parseFloat(m.cost?.toString() || '0'), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500">Recorded across {maintenanceRecords.length} service/repair tickets</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Transport Fee Potential</span>
              <div className="text-2xl font-bold text-teal-700 font-mono">
                ₹{enrollments.reduce((acc, e) => acc + parseFloat(e.monthly_fare?.toString() || '0'), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500">From {enrollments.length} enrolled student passengers</p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS */}
      {/* ==================================================== */}
      {showAddVehicleModal && (
        <AddVehicleModal
          schoolId={selectedSchoolId}
          initialVehicle={editingVehicle}
          onClose={() => setShowAddVehicleModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showDocModal && (
        <VehicleDocumentModal
          schoolId={selectedSchoolId}
          vehicles={vehicles}
          onClose={() => setShowDocModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showAddDriverModal && (
        <AddDriverModal
          schoolId={selectedSchoolId}
          onClose={() => setShowAddDriverModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showAddRouteModal && (
        <AddRouteModal
          schoolId={selectedSchoolId}
          sessionId={selectedSessionId}
          vehicles={vehicles}
          drivers={drivers}
          conductors={staffAssignments.map(s => ({ id: s.employee_id, first_name: s.staff_name.split(' ')[0], last_name: s.staff_name.split(' ')[1] || '' } as any))}
          initialRoute={editingRoute}
          onClose={() => setShowAddRouteModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showAddStopModal && selectedRouteForStops && (
        <AddStopModal
          schoolId={selectedSchoolId}
          routeId={selectedRouteForStops.id}
          routeName={selectedRouteForStops.name}
          onClose={() => setShowAddStopModal(false)}
          onSuccess={() => loadRouteStops(selectedRouteForStops)}
        />
      )}

      {showEnrollModal && (
        <AssignStudentModal
          schoolId={selectedSchoolId}
          sessionId={selectedSessionId}
          routes={routes}
          onClose={() => setShowEnrollModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showCreateTripModal && (
        <CreateTripModal
          schoolId={selectedSchoolId}
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          conductors={staffAssignments.map(s => ({ id: s.employee_id, first_name: s.staff_name.split(' ')[0], last_name: s.staff_name.split(' ')[1] || '' } as any))}
          onClose={() => setShowCreateTripModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showMaintenanceModal && (
        <VehicleMaintenanceModal
          schoolId={selectedSchoolId}
          vehicles={vehicles}
          onClose={() => setShowMaintenanceModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showFuelModal && (
        <FuelLogModal
          schoolId={selectedSchoolId}
          vehicles={vehicles}
          onClose={() => setShowFuelModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showIncidentModal && (
        <ReportIncidentModal
          schoolId={selectedSchoolId}
          vehicles={vehicles}
          routes={routes}
          drivers={drivers}
          onClose={() => setShowIncidentModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showNoticeModal && (
        <TransportNoticeModal
          schoolId={selectedSchoolId}
          routes={routes}
          onClose={() => setShowNoticeModal(false)}
          onSuccess={loadAllData}
        />
      )}
    </div>
  );
};
