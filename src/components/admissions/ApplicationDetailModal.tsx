import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { AdmissionApplication, AdmissionStatus } from '../../types/erp.js';
import {
  X,
  User,
  GraduationCap,
  Calendar,
  Layers,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  CreditCard,
  History,
  Shield,
  ArrowRight,
  Printer,
  ChevronRight,
  Building2,
  CheckSquare,
  Users
} from 'lucide-react';

interface ApplicationDetailModalProps {
  applicationId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  applicationId,
  onClose,
  onRefresh
}) => {
  const { user, hasPermission } = useAuth();
  const [app, setApp] = useState<AdmissionApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 'test' | 'interview' | 'fee' | 'timeline' | 'confirm'
  >('overview');

  // Sub-actions
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status transition state
  const [nextStatus, setNextStatus] = useState<AdmissionStatus | ''>('');
  const [statusRemarks, setStatusRemarks] = useState('');

  // Schedule Test Form
  const [testForm, setTestForm] = useState({
    test_date: '',
    test_time: '10:00 AM',
    venue: 'Examination Hall A',
    subjects: 'Mathematics, Science, English',
    max_marks: 100,
    remarks: ''
  });

  // Evaluate Test Form
  const [evaluateTestId, setEvaluateTestId] = useState<string | null>(null);
  const [testScore, setTestScore] = useState<number | ''>('');
  const [testStatus, setTestStatus] = useState<'Passed' | 'Failed' | 'Attended' | 'Absent'>('Passed');
  const [testRemarks, setTestRemarks] = useState('');

  // Schedule Interview Form
  const [interviewForm, setInterviewForm] = useState({
    interview_date: '',
    interview_time: '11:00 AM',
    interviewer_name: 'Dr. Sunita Mishra (Principal)',
    interview_mode: 'In-person' as 'In-person' | 'Online',
    remarks: ''
  });

  // Evaluate Interview Form
  const [evaluateInterviewId, setEvaluateInterviewId] = useState<string | null>(null);
  const [interviewRec, setInterviewRec] = useState<'Recommended' | 'Not Recommended' | 'On Hold'>('Recommended');
  const [interviewRemarks, setInterviewRemarks] = useState('');

  // Fee Form
  const [feeForm, setFeeForm] = useState({
    fee_type: 'Admission Fee',
    amount: 12500,
    payment_mode: 'Cash',
    receipt_number: '',
    payment_status: 'Paid' as 'Paid' | 'Pending' | 'Waived',
    notes: ''
  });

  // Confirm Enrollment Form
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [confirmForm, setConfirmForm] = useState({
    section_id: '',
    roll_number: '',
    admission_date: new Date().toISOString().split('T')[0],
    admission_number: '',
    receipt_number: '',
    remarks: ''
  });

  // Load application details
  const fetchAppDetail = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await api.admissions.get(applicationId);
      if (res.application) {
        setApp(res.application);

        // Fetch sections for target class
        if (res.application.applying_class_id) {
          const secRes = await api.sections.list(res.application.applying_class_id, res.application.school_id);
          setSections(secRes.sections || []);
          if (secRes.sections && secRes.sections.length > 0) {
            setConfirmForm(prev => ({
              ...prev,
              section_id: res.application.applying_section_id || secRes.sections[0].id
            }));
          }
        }
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppDetail();
  }, [applicationId]);

  // Transition status handler
  const handleStatusTransition = async (status: AdmissionStatus, customRemark?: string) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.admissions.updateStatus(applicationId, status, customRemark || statusRemarks);
      setActionSuccess(`Application status changed to ${status}`);
      setStatusRemarks('');
      setNextStatus('');
      await fetchAppDetail();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to transition status');
    } finally {
      setActionLoading(false);
    }
  };

  // Document verification
  const handleVerifyDocument = async (docId: string, status: 'Verified' | 'Rejected', remarks: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.admissions.verifyDocument(applicationId, docId, status, remarks);
      setActionSuccess(`Document marked as ${status}`);
      await fetchAppDetail();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to verify document');
    } finally {
      setActionLoading(false);
    }
  };

  // Schedule Test
  const handleScheduleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await api.admissions.scheduleTest(applicationId, testForm);
      setActionSuccess('Entrance test scheduled successfully');
      setTestForm({
        test_date: '',
        test_time: '10:00 AM',
        venue: 'Examination Hall A',
        subjects: 'Mathematics, Science, English',
        max_marks: 100,
        remarks: ''
      });
      await fetchAppDetail();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to schedule test');
    } finally {
      setActionLoading(false);
    }
  };

  // Record Test Score
  const handleRecordTestScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluateTestId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.admissions.updateTest(applicationId, evaluateTestId, {
        marks_obtained: testScore !== '' ? Number(testScore) : null,
        test_status: testStatus,
        remarks: testRemarks
      });
      setActionSuccess('Test evaluation recorded successfully');
      setEvaluateTestId(null);
      await fetchAppDetail();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update test record');
    } finally {
      setActionLoading(false);
    }
  };

  // Schedule Interview
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await api.admissions.scheduleInterview(applicationId, interviewForm);
      setActionSuccess('Interview scheduled successfully');
      setInterviewForm({
        interview_date: '',
        interview_time: '11:00 AM',
        interviewer_name: 'Dr. Sunita Mishra (Principal)',
        interview_mode: 'In-person',
        remarks: ''
      });
      await fetchAppDetail();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to schedule interview');
    } finally {
      setActionLoading(false);
    }
  };

  // Record Interview Evaluation
  const handleRecordInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluateInterviewId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.admissions.updateInterview(applicationId, evaluateInterviewId, {
        status: 'Completed',
        recommendation: interviewRec,
        remarks: interviewRemarks
      });
      setActionSuccess('Interview evaluation recorded');
      setEvaluateInterviewId(null);
      await fetchAppDetail();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record interview evaluation');
    } finally {
      setActionLoading(false);
    }
  };

  // Record Fee Payment
  const handleRecordFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await api.admissions.recordFee(applicationId, feeForm);
      setActionSuccess('Admission fee transaction saved');
      setFeeForm({
        fee_type: 'Admission Fee',
        amount: 12500,
        payment_mode: 'Cash',
        receipt_number: '',
        payment_status: 'Paid',
        notes: ''
      });
      await fetchAppDetail();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save fee transaction');
    } finally {
      setActionLoading(false);
    }
  };

  // One-Click Confirmation & Student Creation
  const handleConfirmEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmForm.section_id) {
      alert('Please allocate a Section for the student enrollment');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await api.admissions.confirmAdmission(applicationId, {
        class_id: app?.applying_class_id,
        section_id: confirmForm.section_id,
        roll_number: confirmForm.roll_number || undefined,
        admission_date: confirmForm.admission_date,
        admission_number: confirmForm.admission_number || undefined,
        receipt_number: confirmForm.receipt_number || undefined,
        remarks: confirmForm.remarks || undefined
      });

      if (res.success) {
        setActionSuccess(`Enrolled successfully! Student Admission No: ${res.admissionNumber}`);
        await fetchAppDetail();
        onRefresh();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to confirm admission and create student');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !app) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-300">Loading Application Dossier...</p>
        </div>
      </div>
    );
  }

  // Next available status options based on current status
  const nextStatusOptions: Record<string, { status: AdmissionStatus; label: string; color: string }[]> = {
    DRAFT: [
      { status: 'SUBMITTED', label: 'Submit Application', color: 'bg-indigo-600' },
      { status: 'CANCELLED', label: 'Cancel', color: 'bg-slate-700' }
    ],
    SUBMITTED: [
      { status: 'UNDER_REVIEW', label: 'Start Review', color: 'bg-blue-600' },
      { status: 'DOCUMENT_PENDING', label: 'Request Documents', color: 'bg-amber-600' },
      { status: 'REJECTED', label: 'Reject', color: 'bg-rose-600' }
    ],
    UNDER_REVIEW: [
      { status: 'DOCUMENT_VERIFICATION', label: 'Send for Doc Verification', color: 'bg-blue-600' },
      { status: 'TEST_SCHEDULED', label: 'Schedule Entrance Test', color: 'bg-indigo-600' },
      { status: 'INTERVIEW_SCHEDULED', label: 'Schedule Interview', color: 'bg-violet-600' },
      { status: 'SELECTED', label: 'Direct Selection', color: 'bg-emerald-600' },
      { status: 'WAITLISTED', label: 'Waitlist', color: 'bg-amber-600' },
      { status: 'REJECTED', label: 'Reject', color: 'bg-rose-600' }
    ],
    DOCUMENT_PENDING: [
      { status: 'DOCUMENT_VERIFICATION', label: 'Mark Documents Received', color: 'bg-blue-600' },
      { status: 'REJECTED', label: 'Reject', color: 'bg-rose-600' }
    ],
    DOCUMENT_VERIFICATION: [
      { status: 'TEST_SCHEDULED', label: 'Schedule Entrance Test', color: 'bg-indigo-600' },
      { status: 'INTERVIEW_SCHEDULED', label: 'Schedule Interview', color: 'bg-violet-600' },
      { status: 'SELECTED', label: 'Select Candidate', color: 'bg-emerald-600' },
      { status: 'APPROVED', label: 'Direct Approve', color: 'bg-teal-600' },
      { status: 'REJECTED', label: 'Reject', color: 'bg-rose-600' }
    ],
    TEST_SCHEDULED: [
      { status: 'TEST_COMPLETED', label: 'Mark Test Completed', color: 'bg-indigo-600' },
      { status: 'CANCELLED', label: 'Cancel', color: 'bg-slate-700' }
    ],
    TEST_COMPLETED: [
      { status: 'INTERVIEW_SCHEDULED', label: 'Schedule Interview', color: 'bg-violet-600' },
      { status: 'SELECTED', label: 'Merit Selection', color: 'bg-emerald-600' },
      { status: 'WAITLISTED', label: 'Waitlist', color: 'bg-amber-600' },
      { status: 'REJECTED', label: 'Reject', color: 'bg-rose-600' }
    ],
    INTERVIEW_SCHEDULED: [
      { status: 'INTERVIEW_COMPLETED', label: 'Mark Interview Completed', color: 'bg-violet-600' },
      { status: 'CANCELLED', label: 'Cancel', color: 'bg-slate-700' }
    ],
    INTERVIEW_COMPLETED: [
      { status: 'SELECTED', label: 'Select Candidate', color: 'bg-emerald-600' },
      { status: 'APPROVED', label: 'Approve Admission', color: 'bg-teal-600' },
      { status: 'WAITLISTED', label: 'Waitlist', color: 'bg-amber-600' },
      { status: 'REJECTED', label: 'Reject', color: 'bg-rose-600' }
    ],
    SELECTED: [
      { status: 'APPROVED', label: 'Approve Admission', color: 'bg-teal-600' },
      { status: 'FEE_PENDING', label: 'Issue Fee Demand Note', color: 'bg-amber-600' },
      { status: 'WAITLISTED', label: 'Move to Waitlist', color: 'bg-slate-700' }
    ],
    WAITLISTED: [
      { status: 'SELECTED', label: 'Promote from Waitlist', color: 'bg-emerald-600' },
      { status: 'REJECTED', label: 'Reject', color: 'bg-rose-600' }
    ],
    APPROVED: [
      { status: 'FEE_PENDING', label: 'Awaiting Fee Payment', color: 'bg-amber-600' },
      { status: 'CONFIRMED', label: 'Direct Confirm', color: 'bg-emerald-600' }
    ],
    FEE_PENDING: [
      { status: 'CONFIRMED', label: 'Confirm & Enroll Student', color: 'bg-emerald-600' }
    ]
  };

  const currentOptions = nextStatusOptions[app.application_status] || [];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden animate-fade-in">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-lg">
              {app.student_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {app.student_name}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {app.application_number}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  app.application_status === 'CONFIRMED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : app.application_status === 'SELECTED' || app.application_status === 'APPROVED'
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : app.application_status === 'REJECTED' || app.application_status === 'CANCELLED'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {app.application_status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {app.school_name} • Session {app.session_name} • Applying for <span className="text-slate-200 font-semibold">{app.applying_class_name}</span> ({app.admission_type})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {app.application_status !== 'CONFIRMED' && hasPermission('admissions.confirm') && (
              <button
                onClick={() => setActiveTab('confirm')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Confirm & Enroll</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Action Banner / Fast Workflow Transitions */}
        {currentOptions.length > 0 && app.application_status !== 'CONFIRMED' && (
          <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-medium">Quick Status Transitions:</span>
            <div className="flex flex-wrap items-center gap-2">
              {currentOptions.map(opt => (
                <button
                  key={opt.status}
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition(opt.status)}
                  className={`px-3 py-1 rounded-lg text-white font-semibold ${opt.color} hover:brightness-110 disabled:opacity-50 transition-all shadow-sm`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notification Alerts */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 bg-slate-900 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: '1. Overview & Profile', icon: <User className="w-3.5 h-3.5" /> },
            { id: 'documents', label: `2. Documents (${app.documents?.length || 0})`, icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'test', label: `3. Entrance Test (${app.tests?.length || 0})`, icon: <GraduationCap className="w-3.5 h-3.5" /> },
            { id: 'interview', label: `4. Interview (${app.interviews?.length || 0})`, icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'fee', label: `5. Fees & Dues (${app.fees?.length || 0})`, icon: <CreditCard className="w-3.5 h-3.5" /> },
            { id: 'timeline', label: '6. Activity Trail', icon: <History className="w-3.5 h-3.5" /> },
            { id: 'confirm', label: '7. Confirm Enrollment', icon: <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Personal Info */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Candidate Demographics</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Date of Birth:</span>
                      <span className="text-slate-200 font-medium">{app.date_of_birth}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Gender:</span>
                      <span className="text-slate-200 font-medium">{app.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Blood Group:</span>
                      <span className="text-slate-200 font-medium">{app.blood_group || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Category:</span>
                      <span className="text-slate-200 font-medium">{app.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Nationality:</span>
                      <span className="text-slate-200 font-medium">{app.nationality}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Religion:</span>
                      <span className="text-slate-200 font-medium">{app.religion || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Aadhaar Number:</span>
                      <span className="text-slate-200 font-mono">{app.aadhaar_number || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                {/* Parents & Guardians */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Parent / Guardian Contacts</span>
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">Father's Name:</span>
                      <span className="text-slate-200 font-medium">{app.father_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">Mother's Name:</span>
                      <span className="text-slate-200 font-medium">{app.mother_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">Primary Mobile:</span>
                      <span className="text-indigo-400 font-mono font-medium">{app.parent_mobile}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">Alternate Mobile:</span>
                      <span className="text-slate-300 font-mono">{app.alternate_mobile || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">Parent Email:</span>
                      <span className="text-slate-200">{app.parent_email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Emergency Contact:</span>
                      <span className="text-slate-200">{app.emergency_contact || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2 md:col-span-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Residential Address</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {app.address}, {app.city}{app.district ? `, ${app.district}` : ''}, {app.state} - <span className="font-mono text-indigo-300 font-semibold">{app.pin_code}</span>
                  </p>
                </div>

                {/* Previous Academic Background */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2 md:col-span-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Previous Academic Records</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Previous School:</span>
                      <span className="text-slate-200 font-medium">{app.previous_school || 'None / Fresher'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Previous Class Passed:</span>
                      <span className="text-slate-200 font-medium">{app.previous_class || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Source of Application:</span>
                      <span className="text-slate-200 font-medium">{app.source_of_application}</span>
                    </div>
                  </div>
                  {app.remarks && (
                    <div className="pt-2 border-t border-slate-900 mt-2">
                      <span className="text-slate-500 block text-xs">Applicant Remarks:</span>
                      <p className="text-xs text-slate-300 mt-0.5">{app.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Submitted Applicant Certificates & ID Copies
                </h4>
                <span className="text-xs text-slate-400">Total {app.documents?.length || 0} Attached</span>
              </div>

              {(!app.documents || app.documents.length === 0) ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                  No documents attached to this application dossier yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {app.documents.map(doc => (
                    <div key={doc.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-bold text-white">{doc.document_type}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          doc.verification_status === 'Verified'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : doc.verification_status === 'Rejected'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {doc.verification_status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-1">
                        <div>File: <span className="text-slate-300 font-mono">{doc.file_name}</span> ({(doc.file_size / 1024).toFixed(0)} KB)</div>
                        {doc.remarks && <div>Remarks: <span className="text-slate-300">{doc.remarks}</span></div>}
                        {doc.verified_by && <div>Verified by: <span className="text-indigo-300">{doc.verified_by}</span> on {doc.verified_at?.slice(0, 10)}</div>}
                      </div>

                      {/* Document Preview Box */}
                      {doc.file_data && (
                        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 max-h-36 flex items-center justify-center p-2">
                          {doc.file_data.startsWith('data:image/') ? (
                            <img src={doc.file_data} alt={doc.document_type} className="max-h-32 object-contain" />
                          ) : (
                            <div className="text-center p-4">
                              <FileText className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                              <span className="text-[11px] text-slate-400 font-mono">PDF Attachment</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Verification Controls */}
                      {hasPermission('admissions.verify_docs') && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                          <button
                            disabled={actionLoading || doc.verification_status === 'Verified'}
                            onClick={() => handleVerifyDocument(doc.id, 'Verified', 'Verified against original certificates')}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold disabled:opacity-50 transition-colors"
                          >
                            Verify Document
                          </button>
                          <button
                            disabled={actionLoading || doc.verification_status === 'Rejected'}
                            onClick={() => {
                              const reason = prompt('Please specify rejection reason:');
                              if (reason) handleVerifyDocument(doc.id, 'Rejected', reason);
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-semibold disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ENTRANCE TEST */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              {/* Existing Tests */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Scheduled & Completed Entrance Tests
                  </h4>
                </div>

                {(!app.tests || app.tests.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    No entrance test scheduled for this candidate yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {app.tests.map(test => (
                      <div key={test.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-white">Date: {test.test_date} at {test.test_time || '10:00 AM'}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            test.test_status === 'Passed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : test.test_status === 'Failed'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {test.test_status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400">
                          <div>Venue: <span className="text-slate-200 font-medium">{test.venue}</span></div>
                          <div>Subjects: <span className="text-slate-200 font-medium">{test.subjects}</span></div>
                          <div>Score: <span className="text-indigo-300 font-mono font-bold">{test.marks_obtained !== null ? `${test.marks_obtained}/${test.max_marks}` : 'Awaiting Score'}</span></div>
                          <div>Conducted by: <span className="text-slate-200">{test.conducted_by || 'Staff'}</span></div>
                        </div>

                        {test.remarks && (
                          <p className="text-xs text-slate-400 italic">Evaluator feedback: {test.remarks}</p>
                        )}

                        {/* Evaluate Score Trigger */}
                        {hasPermission('admissions.schedule_test') && (
                          <div className="pt-2 border-t border-slate-900 flex justify-end">
                            <button
                              onClick={() => {
                                setEvaluateTestId(test.id);
                                setTestScore(test.marks_obtained != null ? Number(test.marks_obtained) : 85);
                                setTestStatus(test.test_status as any);
                                setTestRemarks(test.remarks || '');
                              }}
                              className="px-3 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold transition-colors"
                            >
                              Enter / Update Marks
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Evaluate Modal Inline */}
              {evaluateTestId && (
                <form onSubmit={handleRecordTestScore} className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 space-y-4">
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    Record Entrance Test Score & Result
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Marks Obtained</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={testScore}
                        onChange={e => setTestScore(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Result Status</label>
                      <select
                        value={testStatus}
                        onChange={e => setTestStatus(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Passed">Passed (Recommended)</option>
                        <option value="Attended">Attended</option>
                        <option value="Failed">Failed</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks</label>
                      <input
                        type="text"
                        placeholder="e.g. Excellent aptitude in math"
                        value={testRemarks}
                        onChange={e => setTestRemarks(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEvaluateTestId(null)}
                      className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md"
                    >
                      Save Test Scores
                    </button>
                  </div>
                </form>
              )}

              {/* Schedule New Test Form */}
              {hasPermission('admissions.schedule_test') && (
                <form onSubmit={handleScheduleTest} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Schedule Entrance Examination</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Exam Date *</label>
                      <input
                        type="date"
                        value={testForm.test_date}
                        onChange={e => setTestForm({ ...testForm, test_date: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Time</label>
                      <input
                        type="text"
                        value={testForm.test_time}
                        onChange={e => setTestForm({ ...testForm, test_time: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Venue / Room</label>
                      <input
                        type="text"
                        value={testForm.venue}
                        onChange={e => setTestForm({ ...testForm, venue: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Subjects Covered</label>
                      <input
                        type="text"
                        value={testForm.subjects}
                        onChange={e => setTestForm({ ...testForm, subjects: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Max Marks</label>
                      <input
                        type="number"
                        value={testForm.max_marks}
                        onChange={e => setTestForm({ ...testForm, max_marks: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20"
                    >
                      Schedule Entrance Exam
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: INTERVIEW */}
          {activeTab === 'interview' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Scheduled Candidate & Parent Interviews
                  </h4>
                </div>

                {(!app.interviews || app.interviews.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    No interview scheduled for this applicant yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {app.interviews.map(iv => (
                      <div key={iv.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-violet-400" />
                            <span className="text-xs font-bold text-white">Date: {iv.interview_date} at {iv.interview_time || '11:00 AM'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                              {iv.interview_mode}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              iv.recommendation === 'Recommended'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : iv.recommendation === 'Not Recommended'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                            }`}>
                              {iv.recommendation}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                          <div>Interviewer: <span className="text-slate-200 font-medium">{iv.interviewer_name}</span></div>
                          <div>Status: <span className="text-slate-200 font-medium">{iv.status}</span></div>
                        </div>

                        {iv.remarks && (
                          <p className="text-xs text-slate-300 italic">Recommendation remarks: {iv.remarks}</p>
                        )}

                        {hasPermission('admissions.schedule_interview') && iv.status !== 'Completed' && (
                          <div className="pt-2 border-t border-slate-900 flex justify-end">
                            <button
                              onClick={() => {
                                setEvaluateInterviewId(iv.id);
                                setInterviewRec(iv.recommendation as any);
                                setInterviewRemarks(iv.remarks || '');
                              }}
                              className="px-3 py-1 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/30 text-xs font-semibold transition-colors"
                            >
                              Enter Interview Evaluation
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Evaluate Interview Inline */}
              {evaluateInterviewId && (
                <form onSubmit={handleRecordInterview} className="p-5 rounded-2xl bg-violet-950/40 border border-violet-800/40 space-y-4">
                  <h4 className="text-xs font-bold text-violet-300 uppercase tracking-wider">
                    Record Interview Recommendation
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Recommendation *</label>
                      <select
                        value={interviewRec}
                        onChange={e => setInterviewRec(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Recommended">Recommended for Admission</option>
                        <option value="On Hold">On Hold / Second Review</option>
                        <option value="Not Recommended">Not Recommended</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Interviewer Feedback</label>
                      <input
                        type="text"
                        placeholder="e.g. Articulate, active in sports, supportive parents"
                        value={interviewRemarks}
                        onChange={e => setInterviewRemarks(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEvaluateInterviewId(null)}
                      className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md"
                    >
                      Save Evaluation
                    </button>
                  </div>
                </form>
              )}

              {/* Schedule Interview Form */}
              {hasPermission('admissions.schedule_interview') && (
                <form onSubmit={handleScheduleInterview} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-violet-400" />
                    <span>Schedule Principal / Committee Interview</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Date *</label>
                      <input
                        type="date"
                        value={interviewForm.interview_date}
                        onChange={e => setInterviewForm({ ...interviewForm, interview_date: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Time Slot</label>
                      <input
                        type="text"
                        value={interviewForm.interview_time}
                        onChange={e => setInterviewForm({ ...interviewForm, interview_time: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Mode</label>
                      <select
                        value={interviewForm.interview_mode}
                        onChange={e => setInterviewForm({ ...interviewForm, interview_mode: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="In-person">In-person</option>
                        <option value="Online">Online Video Interaction</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Interviewer / Panel</label>
                      <input
                        type="text"
                        value={interviewForm.interviewer_name}
                        onChange={e => setInterviewForm({ ...interviewForm, interviewer_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20"
                    >
                      Schedule Interview Slot
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 5: FEES */}
          {activeTab === 'fee' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Admission Fee Transactions & Challans
                </h4>

                {(!app.fees || app.fees.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    No fee transactions recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {app.fees.map(f => (
                      <div key={f.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-white">{f.fee_type}</span>
                            <span className="font-mono text-xs text-indigo-400 font-bold">₹{f.amount}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Receipt: <span className="font-mono text-slate-200">{f.receipt_number || 'N/A'}</span> • Mode: {f.payment_mode} • Date: {f.payment_date || f.created_at?.slice(0, 10)}
                          </div>
                          {f.notes && <p className="text-[11px] text-slate-400">{f.notes}</p>}
                        </div>
                        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                          f.payment_status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {f.payment_status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Record Fee Form */}
              {hasPermission('admissions.approve') && (
                <form onSubmit={handleRecordFee} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Record New Fee Payment / Receipt</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Fee Type</label>
                      <select
                        value={feeForm.fee_type}
                        onChange={e => setFeeForm({ ...feeForm, fee_type: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Admission Fee">Admission Fee</option>
                        <option value="Application Fee">Application Fee</option>
                        <option value="Prospectus Fee">Prospectus & Kit Fee</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹) *</label>
                      <input
                        type="number"
                        value={feeForm.amount}
                        onChange={e => setFeeForm({ ...feeForm, amount: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Mode</label>
                      <select
                        value={feeForm.payment_mode}
                        onChange={e => setFeeForm({ ...feeForm, payment_mode: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI / QR</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="Card">Debit / Credit Card</option>
                        <option value="Cheque">Cheque / Demand Draft</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Receipt Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="Auto-generated if empty"
                        value={feeForm.receipt_number}
                        onChange={e => setFeeForm({ ...feeForm, receipt_number: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                      <select
                        value={feeForm.payment_status}
                        onChange={e => setFeeForm({ ...feeForm, payment_status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Waived">Waived / Concession</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Paid at campus fee counter"
                        value={feeForm.notes}
                        onChange={e => setFeeForm({ ...feeForm, notes: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20"
                    >
                      Save Fee Transaction
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 6: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Audit Trail & Application Lifecycle History
              </h4>
              <div className="space-y-2">
                {app.timeline?.map(entry => (
                  <div key={entry.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{entry.action}</span>
                        <span className="text-[11px] font-mono text-slate-500">{entry.created_at?.slice(0, 19).replace('T', ' ')}</span>
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {entry.previous_status && entry.new_status && (
                          <span className="font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded mr-2 text-indigo-300">
                            {entry.previous_status} → {entry.new_status}
                          </span>
                        )}
                        <span>{entry.remarks}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Logged by: {entry.performed_by_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: CONFIRM ENROLLMENT (ONE-CLICK CONVERSION) */}
          {activeTab === 'confirm' && (
            <div className="space-y-6">
              {app.application_status === 'CONFIRMED' ? (
                <div className="p-8 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white">Candidate Is Fully Confirmed & Enrolled!</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Student profile created in Student Directory with Admission Number: <span className="font-mono font-bold text-white">{app.enrolled_admission_number || 'Enrolled'}</span>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleConfirmEnrollment} className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-5">
                  <div className="border-b border-slate-900 pb-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                      <span>One-Click Admission Confirmation & Student Creation</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Finalizes enrollment, allocates Class & Section, generates formal Admission Number, registers student & parent records in the ERP database, and copies verified documents into the student record.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Class</label>
                      <input
                        type="text"
                        disabled
                        value={app.applying_class_name || ''}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Section Allocation <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={confirmForm.section_id}
                        onChange={e => setConfirmForm({ ...confirmForm, section_id: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      >
                        <option value="">Select Section</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>Section {s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Roll Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 01"
                        value={confirmForm.roll_number}
                        onChange={e => setConfirmForm({ ...confirmForm, roll_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Admission Date</label>
                      <input
                        type="date"
                        value={confirmForm.admission_date}
                        onChange={e => setConfirmForm({ ...confirmForm, admission_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Student Admission Number (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Auto-generated if left empty"
                        value={confirmForm.admission_number}
                        onChange={e => setConfirmForm({ ...confirmForm, admission_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fee Receipt Ref</label>
                      <input
                        type="text"
                        placeholder="e.g. REC-2026-081"
                        value={confirmForm.receipt_number}
                        onChange={e => setConfirmForm({ ...confirmForm, receipt_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Enrollment Remarks</label>
                      <input
                        type="text"
                        placeholder="e.g. Admitted on merit after entrance test and interview clearance"
                        value={confirmForm.remarks}
                        onChange={e => setConfirmForm({ ...confirmForm, remarks: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                    <div className="font-semibold">Automatic System Operations on Confirmation:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                      <li>Creates permanent record in <span className="text-white">students</span> table</li>
                      <li>Creates & links <span className="text-white">parents</span> record for guardian portal access</li>
                      <li>Creates active <span className="text-white">student_enrollments</span> record for session 2026-27</li>
                      <li>Transfers verified documents into student registry</li>
                      <li>Transitions application state to <span className="text-emerald-400 font-bold">CONFIRMED</span></li>
                    </ul>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-emerald-600/25 transition-all"
                    >
                      {actionLoading ? (
                        <span>Enrolling Student in Database...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm Admission & Enroll Candidate</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
