import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Sliders,
  DollarSign,
  Calendar,
  Check,
  X
} from 'lucide-react';

interface PortalAnalytics {
  totalParentUsers: number;
  totalStudentUsers: number;
  pendingServiceRequests: number;
  pendingLeaveApplications: number;
  pendingProfileCorrections: number;
  upcomingAppointments: number;
  activeGrievances: number;
}

interface LeaveRequestItem {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name: string;
  section_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason_category: string;
  reason: string;
  is_emergency: boolean;
  status: string;
  applicant_role: string;
  supporting_document?: string;
  created_at: string;
}

interface ProfileCorrectionItem {
  id: string;
  request_number: string;
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name: string;
  field_category: string;
  field_name: string;
  current_value: string;
  requested_value: string;
  reason: string;
  status: string;
  created_at: string;
}

interface ServiceTypeItem {
  id: string;
  code: string;
  title: string;
  description: string;
  fee_amount: number;
  sla_days: number;
  is_active: boolean;
}

export const AdminPortalManagementView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'leaves' | 'corrections' | 'services' | 'analytics'>('leaves');
  const [analytics, setAnalytics] = useState<PortalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Leave applications
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [leaveFilter, setLeaveFilter] = useState<'ALL' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('SUBMITTED');
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequestItem | null>(null);
  const [leaveRemarks, setLeaveRemarks] = useState('');
  const [processingLeave, setProcessingLeave] = useState(false);

  // Corrections
  const [corrections, setCorrections] = useState<ProfileCorrectionItem[]>([]);
  const [selectedCorrection, setSelectedCorrection] = useState<ProfileCorrectionItem | null>(null);
  const [correctionRemarks, setCorrectionRemarks] = useState('');
  const [processingCorrection, setProcessingCorrection] = useState(false);

  // Services Catalog
  const [services, setServices] = useState<ServiceTypeItem[]>([]);
  const [editingService, setEditingService] = useState<ServiceTypeItem | null>(null);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [serviceSla, setServiceSla] = useState<number>(1);
  const [savingService, setSavingService] = useState(false);

  // Feedback message
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [anRes, lvRes, pcRes, svRes] = await Promise.all([
        fetch('/api/portal/analytics').then(r => r.ok ? r.json() : null),
        fetch('/api/portal/leave-requests').then(r => r.ok ? r.json() : { leaveRequests: [] }),
        fetch('/api/portal/profile-corrections').then(r => r.ok ? r.json() : { corrections: [] }),
        fetch('/api/portal/services').then(r => r.ok ? r.json() : { services: [] })
      ]);

      if (anRes) setAnalytics(anRes);
      if (lvRes?.leaveRequests) setLeaves(lvRes.leaveRequests);
      if (pcRes?.corrections) setCorrections(pcRes.corrections);
      if (svRes?.services) setServices(svRes.services);
    } catch (err) {
      console.error('Failed to load admin portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleReviewLeave = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedLeave) return;
    setProcessingLeave(true);
    try {
      const res = await fetch(`/api/portal/leave-requests/${selectedLeave.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewRemarks: leaveRemarks })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update leave request');

      setBannerMessage({ type: 'success', text: `Leave application for ${selectedLeave.first_name} marked as ${status}.` });
      setSelectedLeave(null);
      setLeaveRemarks('');
      fetchAllData();
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.message });
    } finally {
      setProcessingLeave(false);
    }
  };

  const handleReviewCorrection = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedCorrection) return;
    setProcessingCorrection(true);
    try {
      const res = await fetch(`/api/portal/profile-corrections/${selectedCorrection.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewRemarks: correctionRemarks })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update correction status');

      setBannerMessage({
        type: 'success',
        text: `Correction request #${selectedCorrection.request_number} ${status === 'APPROVED' ? 'approved and applied to student profile' : 'rejected'}.`
      });
      setSelectedCorrection(null);
      setCorrectionRemarks('');
      fetchAllData();
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.message });
    } finally {
      setProcessingCorrection(false);
    }
  };

  const handleToggleServiceActive = async (service: ServiceTypeItem) => {
    try {
      const res = await fetch(`/api/portal/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !service.is_active })
      });
      if (res.ok) {
        setServices(services.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s));
        setBannerMessage({ type: 'success', text: `Updated availability status for ${service.title}.` });
      }
    } catch (err) {
      setBannerMessage({ type: 'error', text: 'Failed to update service availability' });
    }
  };

  const handleSaveServiceConfig = async () => {
    if (!editingService) return;
    setSavingService(true);
    try {
      const res = await fetch(`/api/portal/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fee_amount: serviceFee, sla_days: serviceSla })
      });
      if (!res.ok) throw new Error('Failed to update service');

      setServices(services.map(s => s.id === editingService.id ? { ...s, fee_amount: serviceFee, sla_days: serviceSla } : s));
      setEditingService(null);
      setBannerMessage({ type: 'success', text: `Service "${editingService.title}" configuration updated.` });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.message });
    } finally {
      setSavingService(false);
    }
  };

  const filteredLeaves = leaves.filter(l => leaveFilter === 'ALL' || l.status === leaveFilter);

  return (
    <div className="space-y-6">
      {/* Top Banner Message */}
      {bannerMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${
          bannerMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
            <span>{bannerMessage.text}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <div className="text-xs text-gray-500 font-medium">Active Parents</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{analytics?.totalParentUsers ?? '-'}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">Verified Accounts</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <div className="text-xs text-gray-500 font-medium">Active Learners</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{analytics?.totalStudentUsers ?? '-'}</div>
          <div className="text-[10px] text-indigo-600 font-medium mt-1">Student Portal Logins</div>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 shadow-xs">
          <div className="text-xs text-amber-800 font-medium">Pending Leaves</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{analytics?.pendingLeaveApplications ?? 0}</div>
          <div className="text-[10px] text-amber-700 font-medium mt-1">Awaiting Review</div>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200/80 shadow-xs">
          <div className="text-xs text-blue-800 font-medium">Pending Services</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{analytics?.pendingServiceRequests ?? 0}</div>
          <div className="text-[10px] text-blue-700 font-medium mt-1">Certificates / Docs</div>
        </div>
        <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200/80 shadow-xs">
          <div className="text-xs text-purple-800 font-medium">Profile Corrections</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">{analytics?.pendingProfileCorrections ?? 0}</div>
          <div className="text-[10px] text-purple-700 font-medium mt-1">Demographic Audits</div>
        </div>
        <div className="bg-teal-50/70 p-4 rounded-xl border border-teal-200/80 shadow-xs">
          <div className="text-xs text-teal-800 font-medium">Appointments</div>
          <div className="text-2xl font-bold text-teal-900 mt-1">{analytics?.upcomingAppointments ?? 0}</div>
          <div className="text-[10px] text-teal-700 font-medium mt-1">Upcoming Scheduled</div>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200/80 shadow-xs">
          <div className="text-xs text-rose-800 font-medium">Active Grievances</div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{analytics?.activeGrievances ?? 0}</div>
          <div className="text-[10px] text-rose-700 font-medium mt-1">Escalated Redressal</div>
        </div>
      </div>

      {/* Main Admin Tab Navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('leaves')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'leaves' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Leave Applications Queue</span>
            {leaves.filter(l => l.status === 'SUBMITTED').length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                {leaves.filter(l => l.status === 'SUBMITTED').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('corrections')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'corrections' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Profile Corrections Queue</span>
            {corrections.filter(c => c.status === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold">
                {corrections.filter(c => c.status === 'PENDING').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('services')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'services' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Online Services Catalog & SLAs</span>
          </button>

          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'analytics' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Portal Security & SLA Matrix</span>
          </button>

          <div className="ml-auto flex items-center pr-2">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab 1: Leave Applications Queue */}
        {activeSubTab === 'leaves' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Student Leave Applications</h3>
                <p className="text-xs text-gray-500">Review, approve, or reject absence requests submitted by parents or students.</p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">Filter Status:</span>
                {(['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setLeaveFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      leaveFilter === st ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filteredLeaves.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No leave requests found</p>
                <p className="text-xs text-gray-400 mt-1">There are no applications matching the status filter "{leaveFilter}".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold">
                      <th className="py-3 px-4">Student & Class</th>
                      <th className="py-3 px-4">Duration & Days</th>
                      <th className="py-3 px-4">Category & Reason</th>
                      <th className="py-3 px-4">Urgency</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLeaves.map(leave => (
                      <tr key={leave.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{leave.first_name} {leave.last_name}</div>
                          <div className="text-[11px] text-gray-500">Adm: {leave.admission_number} | {leave.class_name} - {leave.section_name}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-800">{leave.start_date} to {leave.end_date}</div>
                          <div className="text-[11px] text-indigo-600 font-medium">{leave.total_days} day(s) total</div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold text-[10px] mb-1">
                            {leave.reason_category}
                          </span>
                          <p className="text-gray-600 line-clamp-2">{leave.reason}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          {leave.is_emergency ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold text-[10px]">
                              <AlertTriangle className="w-3 h-3" /> Emergency
                            </span>
                          ) : (
                            <span className="text-gray-400">Regular</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            leave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                            leave.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {leave.status === 'SUBMITTED' ? (
                            <button
                              onClick={() => {
                                setSelectedLeave(leave);
                                setLeaveRemarks('');
                              }}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 text-xs shadow-xs"
                            >
                              Review & Act
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedLeave(leave);
                                setLeaveRemarks('');
                              }}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 text-xs"
                            >
                              View Details
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Profile Corrections Queue */}
        {activeSubTab === 'corrections' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Demographic Correction Requests</h3>
                <p className="text-xs text-gray-500">Verify and officially commit changes to student master database with complete audit trail.</p>
              </div>
            </div>

            {corrections.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No profile correction requests</p>
                <p className="text-xs text-gray-400 mt-1">All student demographic records are verified.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold">
                      <th className="py-3 px-4">Req # & Date</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Category & Field</th>
                      <th className="py-3 px-4">Current Value</th>
                      <th className="py-3 px-4">Requested Value</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {corrections.map(corr => (
                      <tr key={corr.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-indigo-600">{corr.request_number}</div>
                          <div className="text-[11px] text-gray-400">{new Date(corr.created_at).toLocaleDateString()}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{corr.first_name} {corr.last_name}</div>
                          <div className="text-[11px] text-gray-500">{corr.admission_number} | {corr.class_name}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-gray-800">{corr.field_name}</span>
                          <div className="text-[10px] text-gray-400">{corr.field_category}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-rose-700 font-mono bg-rose-50 px-2 py-0.5 rounded line-through">
                            {corr.current_value || '(Empty)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded">
                            {corr.requested_value}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            corr.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                            corr.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {corr.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {corr.status === 'PENDING' ? (
                            <button
                              onClick={() => {
                                setSelectedCorrection(corr);
                                setCorrectionRemarks('');
                              }}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 text-xs shadow-xs"
                            >
                              Verify & Apply
                            </button>
                          ) : (
                            <span className="text-gray-400 text-[11px]">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Online Services Catalog & SLAs */}
        {activeSubTab === 'services' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Online School Services Catalog (Phase 19 Core Catalog)</h3>
                <p className="text-xs text-gray-500">Configure processing SLA turnaround commitments, service fees, and availability.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map(srv => (
                <div key={srv.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-indigo-300 transition-all flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[10px] rounded font-bold">
                        {srv.code}
                      </span>
                      <button
                        onClick={() => handleToggleServiceActive(srv)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                          srv.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {srv.is_active ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">{srv.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{srv.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-gray-400">Fee / SLA</div>
                      <div className="font-semibold text-gray-800">
                        {srv.fee_amount > 0 ? `₹${srv.fee_amount}` : 'Free'} · {srv.sla_days} day(s) SLA
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingService(srv);
                        setServiceFee(srv.fee_amount);
                        setServiceSla(srv.sla_days);
                      }}
                      className="px-2.5 py-1 bg-gray-50 hover:bg-indigo-50 text-indigo-600 rounded-lg font-medium text-xs border border-gray-200 hover:border-indigo-200 transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Security Matrix & SLAs */}
        {activeSubTab === 'analytics' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                <h4 className="font-bold text-indigo-900 flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Parent-Ward Security & IDOR Enforcement
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Every request targeting child records passes through the server-side validator <code>authorizeStudentAccess()</code>.
                  Parents can only view or act on wards linked to their account in <code>student_parents</code>. Cross-school access is strictly isolated by school boundary ID.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-indigo-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Active Enforcement: Ramesh Kumar → Aarav Kumar & Ananya Sharma
                </div>
              </div>

              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                <h4 className="font-bold text-emerald-900 flex items-center gap-2 text-sm">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  Online Service Delivery SLA Guarantee
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  All service requests are assigned verifiable identifiers (<code>SR-2026-XXXXXX</code>) and tracked against configured SLA turnarounds. Certificates generated include SHA-256 digital verification hashes and direct scan URLs for third-party validation.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Real-time SLA Alerting Enabled
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leave Review Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 text-sm">Review Leave Application</h3>
              </div>
              <button onClick={() => setSelectedLeave(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1.5 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Student:</span>
                  <span className="font-bold text-gray-900">{selectedLeave.first_name} {selectedLeave.last_name} ({selectedLeave.class_name})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dates:</span>
                  <span className="font-semibold text-indigo-600">{selectedLeave.start_date} to {selectedLeave.end_date} ({selectedLeave.total_days} days)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category:</span>
                  <span className="font-medium text-gray-800">{selectedLeave.reason_category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Urgency:</span>
                  <span className={`font-bold ${selectedLeave.is_emergency ? 'text-rose-600' : 'text-gray-700'}`}>
                    {selectedLeave.is_emergency ? 'Emergency' : 'Standard'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Reason for Absence:</label>
                <p className="p-3 bg-gray-50 rounded-xl text-gray-700 italic border border-gray-100">
                  "{selectedLeave.reason}"
                </p>
              </div>

              {selectedLeave.status === 'SUBMITTED' && (
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Teacher / Admin Review Remarks:</label>
                  <textarea
                    rows={3}
                    value={leaveRemarks}
                    onChange={e => setLeaveRemarks(e.target.value)}
                    placeholder="Enter approval comments, advice, or reason for rejection..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Close
              </button>
              {selectedLeave.status === 'SUBMITTED' && (
                <>
                  <button
                    disabled={processingLeave}
                    onClick={() => handleReviewLeave('REJECTED')}
                    className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl disabled:opacity-50"
                  >
                    Reject Application
                  </button>
                  <button
                    disabled={processingLeave}
                    onClick={() => handleReviewLeave('APPROVED')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50"
                  >
                    Approve Leave
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Correction Review Modal */}
      {selectedCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900 text-sm">Verify Demographic Correction</h3>
              </div>
              <button onClick={() => setSelectedCorrection(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1.5 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Request #:</span>
                  <span className="font-mono font-bold text-purple-700">{selectedCorrection.request_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Student:</span>
                  <span className="font-bold text-gray-900">{selectedCorrection.first_name} {selectedCorrection.last_name} ({selectedCorrection.admission_number})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Field:</span>
                  <span className="font-semibold text-gray-800">{selectedCorrection.field_name} ({selectedCorrection.field_category})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                  <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block mb-1">Current Master Data</span>
                  <div className="font-mono font-bold text-rose-900">{selectedCorrection.current_value || '(None)'}</div>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mb-1">Requested Update</span>
                  <div className="font-mono font-bold text-emerald-900">{selectedCorrection.requested_value}</div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Stated Reason & Proof:</label>
                <p className="p-3 bg-gray-50 rounded-xl text-gray-700 border border-gray-100">
                  "{selectedCorrection.reason}"
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Audit Verification Remarks:</label>
                <textarea
                  rows={2}
                  value={correctionRemarks}
                  onChange={e => setCorrectionRemarks(e.target.value)}
                  placeholder="e.g., Verified against original birth certificate submitted at office."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedCorrection(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={processingCorrection}
                onClick={() => handleReviewCorrection('REJECTED')}
                className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl disabled:opacity-50"
              >
                Reject Request
              </button>
              <button
                disabled={processingCorrection}
                onClick={() => handleReviewCorrection('APPROVED')}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                Approve & Commit to Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Edit Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 text-sm">Configure Service: {editingService.title}</h3>
              </div>
              <button onClick={() => setEditingService(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Service Fee (₹):</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={serviceFee}
                    onChange={e => setServiceFee(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Set to 0 for free complimentary certificates.</p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">SLA Processing Guarantee (Working Days):</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={serviceSla}
                    onChange={e => setServiceSla(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Turnaround commitment shown to parents & students.</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingService(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={savingService}
                onClick={handleSaveServiceConfig}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                {savingService ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
