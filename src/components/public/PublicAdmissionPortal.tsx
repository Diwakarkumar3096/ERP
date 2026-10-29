import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import type { School, AcademicSession, ClassItem, AdmissionType } from '../../types/erp.js';
import {
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Upload,
  CheckCircle2,
  Search,
  ArrowRight,
  ArrowLeft,
  Printer,
  Copy,
  Clock,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface PublicAdmissionPortalProps {
  onBackToLogin: () => void;
}

export const PublicAdmissionPortal: React.FC<PublicAdmissionPortalProps> = ({ onBackToLogin }) => {
  const [activeTab, setActiveTab] = useState<'apply' | 'track'>('apply');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form Step State (1: School & Class, 2: Student, 3: Address & Parents, 4: Previous School & Documents, 5: Review)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    applicationNumber: string;
    studentName: string;
    applicationId: string;
  } | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    admission_type: 'NEW' as AdmissionType,
    applying_class_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'MALE',
    blood_group: 'B+',
    nationality: 'Indian',
    category: 'General',
    aadhaar_number: '',
    religion: 'Hindu',
    address: '',
    city: '',
    district: '',
    state: '',
    pin_code: '',
    previous_school: '',
    previous_class: '',
    father_name: '',
    mother_name: '',
    guardian_name: '',
    parent_mobile: '',
    alternate_mobile: '',
    parent_email: '',
    emergency_contact: '',
    remarks: ''
  });

  // Attached Documents
  const [documents, setDocuments] = useState<Array<{
    document_type: string;
    file_name: string;
    file_size: number;
    file_data: string;
    mime_type: string;
  }>>([]);

  // Tracking State
  const [trackAppNo, setTrackAppNo] = useState('');
  const [trackContact, setTrackContact] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackedApp, setTrackedApp] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Load initial public schools
  useEffect(() => {
    async function loadSchools() {
      setLoadingConfig(true);
      try {
        const res = await api.admissions.publicSchools();
        if (res.schools && res.schools.length > 0) {
          setSchools(res.schools);
          const firstSchool = res.schools[0];
          setSelectedSchoolId(firstSchool.id);
        }
      } catch (err) {
        console.error('Failed to load schools', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadSchools();
  }, []);

  // When school changes, load sessions & classes
  useEffect(() => {
    if (!selectedSchoolId) return;

    async function loadSchoolMetadata() {
      try {
        const [sessRes, classRes] = await Promise.all([
          api.admissions.publicSessions(selectedSchoolId),
          api.admissions.publicClasses(selectedSchoolId)
        ]);
        setSessions(sessRes.sessions || []);
        if (sessRes.sessions && sessRes.sessions.length > 0) {
          const current = sessRes.sessions.find(s => s.status === 'upcoming' || s.is_current) || sessRes.sessions[0];
          setSelectedSessionId(current.id);
        }
        setClasses(classRes.classes || []);
        if (classRes.classes && classRes.classes.length > 0 && !formData.applying_class_id) {
          setFormData(prev => ({ ...prev, applying_class_id: classRes.classes[0].id }));
        }
      } catch (err) {
        console.error('Failed to load sessions/classes', err);
      }
    }

    loadSchoolMetadata();
  }, [selectedSchoolId]);

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  // Handle Document Upload
  const handleFileUpload = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setDocuments(prev => {
        const filtered = prev.filter(d => d.document_type !== docType);
        return [
          ...filtered,
          {
            document_type: docType,
            file_name: file.name,
            file_size: file.size,
            file_data: base64Data,
            mime_type: file.type || 'application/pdf'
          }
        ];
      });
    };
    reader.readAsDataURL(file);
  };

  // Submit Application
  const handleSubmitApplication = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        school_id: selectedSchoolId,
        session_id: selectedSessionId,
        ...formData,
        documents
      };

      const res = await api.admissions.publicApply(payload);
      if (res.success) {
        setSubmittedResult({
          applicationNumber: res.applicationNumber,
          studentName: res.studentName,
          applicationId: res.applicationId
        });
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit application. Please check all required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  // Search Live Status
  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackAppNo.trim() || !trackContact.trim()) {
      setTrackError('Please provide both Application Number and Mobile / Email.');
      return;
    }
    setTrackLoading(true);
    setTrackError(null);
    setTrackedApp(null);
    try {
      const res = await api.admissions.publicTrack(trackAppNo.trim(), trackContact.trim());
      if (res.application) {
        setTrackedApp(res.application);
      }
    } catch (err: any) {
      setTrackError(err.message || 'No application found with the provided details.');
    } finally {
      setTrackLoading(false);
    }
  };

  const copyAppNo = (no: string) => {
    navigator.clipboard.writeText(no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                {selectedSchool ? selectedSchool.name : 'School ERP Admissions Portal'}
                <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  2026-27 Open
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                {selectedSchool ? `${selectedSchool.board || 'CBSE'} Affiliated • ${selectedSchool.city}, ${selectedSchool.state}` : 'Candidate & Parent Online Admission System'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('apply'); setSubmittedResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'apply'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Apply Online
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'track'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Track Application
            </button>
            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />
            <button
              onClick={onBackToLogin}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-colors"
            >
              Staff ERP Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'track' ? (
          /* ============================================================
             TRACK APPLICATION VIEW
             ============================================================ */
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="max-w-xl mx-auto text-center space-y-2 mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                  <Search className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Track Live Admission Status
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Enter your assigned Application Reference Number and registered parent phone number or email to view the current evaluation progress.
                </p>
              </div>

              <form onSubmit={handleTrackSubmit} className="max-w-xl mx-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Application Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VVP-ADM-2026-0001"
                      value={trackAppNo}
                      onChange={e => setTrackAppNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 uppercase font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Parent Mobile or Email <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98351 11001"
                      value={trackContact}
                      onChange={e => setTrackContact(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                {trackError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{trackError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={trackLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {trackLoading ? (
                    <span>Looking up application records...</span>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Track Application Status</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Tracking Result Card */}
            {trackedApp && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-in shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <span className="text-[11px] font-mono text-indigo-400 font-semibold uppercase tracking-wider">
                      {trackedApp.school_name} • Session {trackedApp.session_name}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                      {trackedApp.student_name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Applied for: <span className="text-slate-200 font-medium">{trackedApp.applying_class_name}</span> • Date: {trackedApp.application_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono font-semibold text-slate-300">
                      Ref: {trackedApp.application_number}
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      trackedApp.application_status === 'CONFIRMED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : trackedApp.application_status === 'SELECTED' || trackedApp.application_status === 'APPROVED'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : trackedApp.application_status === 'REJECTED' || trackedApp.application_status === 'CANCELLED'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {trackedApp.application_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Progress Pipeline */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                    Admission Pipeline Stage
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {[
                      { key: 'SUBMITTED', label: 'Submitted' },
                      { key: 'UNDER_REVIEW', label: 'Under Review' },
                      { key: 'TEST_SCHEDULED', label: 'Entrance Test' },
                      { key: 'INTERVIEW_SCHEDULED', label: 'Interview' },
                      { key: 'SELECTED', label: 'Merit Selection' },
                      { key: 'FEE_PENDING', label: 'Admission Fee' },
                      { key: 'CONFIRMED', label: 'Enrolled' }
                    ].map((step, idx) => {
                      const stages = ['SUBMITTED', 'UNDER_REVIEW', 'TEST_SCHEDULED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'FEE_PENDING', 'CONFIRMED'];
                      const currentIdx = stages.indexOf(trackedApp.application_status);
                      const isPast = currentIdx >= idx;
                      const isCurrent = trackedApp.application_status === step.key;

                      return (
                        <div
                          key={step.key}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            isCurrent
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-500/10'
                              : isPast
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-500'
                          }`}
                        >
                          <div className="text-[10px] font-mono text-slate-400 mb-1">0{idx + 1}</div>
                          <div className="text-xs font-semibold truncate">{step.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scheduled Tests / Interviews Callouts */}
                {trackedApp.tests && trackedApp.tests.length > 0 && (
                  <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                      <Clock className="w-4 h-4" />
                      <span>Entrance Test Details</span>
                    </div>
                    {trackedApp.tests.map((t: any) => (
                      <div key={t.id} className="text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-indigo-900/40">
                        <div><span className="text-slate-400">Date & Time:</span> {t.test_date} at {t.test_time || '10:00 AM'}</div>
                        <div><span className="text-slate-400">Venue:</span> {t.venue}</div>
                        <div><span className="text-slate-400">Status / Score:</span> {t.marks_obtained !== null ? `${t.marks_obtained}/${t.max_marks}` : t.test_status}</div>
                      </div>
                    ))}
                  </div>
                )}

                {trackedApp.interviews && trackedApp.interviews.length > 0 && (
                  <div className="p-4 rounded-xl bg-violet-950/40 border border-violet-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs">
                      <User className="w-4 h-4" />
                      <span>Interview Interaction Schedule</span>
                    </div>
                    {trackedApp.interviews.map((iv: any) => (
                      <div key={iv.id} className="text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-violet-900/40">
                        <div><span className="text-slate-400">Date:</span> {iv.interview_date} at {iv.interview_time || '11:00 AM'}</div>
                        <div><span className="text-slate-400">Interviewer:</span> {iv.interviewer_name}</div>
                        <div><span className="text-slate-400">Mode:</span> {iv.interview_mode} ({iv.status})</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Remarks & Timeline */}
                {trackedApp.remarks && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="font-semibold text-slate-300 block mb-1">Admissions Desk Notes:</span>
                    <p className="text-slate-400 leading-relaxed">{trackedApp.remarks}</p>
                  </div>
                )}

                {/* Activity Log */}
                {trackedApp.timeline && trackedApp.timeline.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Application History
                    </h5>
                    <div className="space-y-2">
                      {trackedApp.timeline.map((entry: any) => (
                        <div key={entry.id} className="flex items-start gap-3 text-xs p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200">{entry.action}</span>
                              <span className="text-[11px] text-slate-500 font-mono">{entry.created_at?.slice(0, 10)}</span>
                            </div>
                            {entry.remarks && <p className="text-slate-400 mt-0.5">{entry.remarks}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : submittedResult ? (
          /* ============================================================
             SUBMISSION SUCCESS CONFIRMATION VIEW
             ============================================================ */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 max-w-2xl mx-auto shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                Registration Acknowledgment
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Admission Application Submitted!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Thank you for applying. We have received your application for <span className="font-semibold text-white">{submittedResult.studentName}</span>.
              </p>
            </div>

            {/* Application Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs text-slate-400">Application Reference Number</span>
                <button
                  onClick={() => copyAppNo(submittedResult.applicationNumber)}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-2xl font-mono font-bold text-white tracking-wider">
                {submittedResult.applicationNumber}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Please save this reference number. You will receive an SMS and email notification with next steps, entrance test syllabus, and verification schedules.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  setTrackAppNo(submittedResult.applicationNumber);
                  setTrackContact(formData.parent_mobile || formData.parent_email);
                  setActiveTab('track');
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Track Status Now</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Application Slip</span>
              </button>
              <button
                onClick={() => {
                  setSubmittedResult(null);
                  setCurrentStep(1);
                  setFormData({
                    admission_type: 'NEW',
                    applying_class_id: classes[0]?.id || '',
                    first_name: '',
                    middle_name: '',
                    last_name: '',
                    date_of_birth: '',
                    gender: 'MALE',
                    blood_group: 'B+',
                    nationality: 'Indian',
                    category: 'General',
                    aadhaar_number: '',
                    religion: 'Hindu',
                    address: '',
                    city: '',
                    district: '',
                    state: '',
                    pin_code: '',
                    previous_school: '',
                    previous_class: '',
                    father_name: '',
                    mother_name: '',
                    guardian_name: '',
                    parent_mobile: '',
                    alternate_mobile: '',
                    parent_email: '',
                    emergency_contact: '',
                    remarks: ''
                  });
                  setDocuments([]);
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 font-semibold text-xs border border-slate-800 transition-colors"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================
             ONLINE ADMISSION FORM (Multi-step wizard)
             ============================================================ */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl space-y-8">
            {/* Step Header */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    Online Admission Application
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                      Academic Year 2026-27
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Please provide accurate information as per candidate birth certificate and official identity documents.
                  </p>
                </div>

                {/* Multi-School Selector (if more than 1 school) */}
                {schools.length > 1 && (
                  <div className="w-full sm:w-64">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target School Branch</label>
                    <select
                      value={selectedSchoolId}
                      onChange={e => setSelectedSchoolId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Step indicator breadcrumbs */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                {[
                  { step: 1, title: 'Academic Choice' },
                  { step: 2, title: 'Student Profile' },
                  { step: 3, title: 'Parents & Contact' },
                  { step: 4, title: 'Previous School' },
                  { step: 5, title: 'Documents & Submit' }
                ].map(item => {
                  const isCurrent = currentStep === item.step;
                  const isDone = currentStep > item.step;

                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => {
                        if (isDone) setCurrentStep(item.step);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : isDone
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-950 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent ? 'bg-white text-indigo-700' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isDone ? '✓' : item.step}
                      </span>
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {submitError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                <span>{submitError}</span>
              </div>
            )}

            {/* STEP 1: Academic Choice */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Academic Session <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedSessionId}
                      onChange={e => setSelectedSessionId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {sessions.map(s => (
                        <option key={s.id} value={s.id}>{s.name} {s.is_current ? '(Active)' : s.status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Applying Grade / Class <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formData.applying_class_id}
                      onChange={e => setFormData({ ...formData, applying_class_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.stream})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Admission Type <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formData.admission_type}
                      onChange={e => setFormData({ ...formData, admission_type: e.target.value as AdmissionType })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="NEW">New Admission</option>
                      <option value="TRANSFER">Transfer Admission</option>
                      <option value="READMISSION">Re-admission</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/30 text-xs text-indigo-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span>Admission Information & Criteria</span>
                  </div>
                  <p className="text-slate-400">
                    Application fee for {selectedSchool?.name || 'School'} is ₹{selectedSchool?.application_fee || 500}. Entrance test and student interaction slot details will be scheduled upon submission.
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.applying_class_id) {
                        alert('Please select the applying class');
                        return;
                      }
                      setCurrentStep(2);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <span>Next: Student Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Student Profile */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      First Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aarav"
                      value={formData.first_name}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={formData.middle_name}
                      onChange={e => setFormData({ ...formData, middle_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Last Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      value={formData.last_name}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Date of Birth <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Gender <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={e => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Blood Group
                    </label>
                    <select
                      value={formData.blood_group}
                      onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Aadhaar Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="xxxx xxxx xxxx"
                      value={formData.aadhaar_number}
                      onChange={e => setFormData({ ...formData, aadhaar_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.first_name || !formData.last_name || !formData.date_of_birth) {
                        alert('Please enter first name, last name, and date of birth.');
                        return;
                      }
                      setCurrentStep(3);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <span>Next: Parents & Contact</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Parents & Contact */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Father's Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sunil Sharma"
                      value={formData.father_name}
                      onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sunita Sharma"
                      value={formData.mother_name}
                      onChange={e => setFormData({ ...formData, mother_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Primary Contact Mobile <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98351 11001"
                      value={formData.parent_mobile}
                      onChange={e => setFormData({ ...formData, parent_mobile: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Parent Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="parent@example.com"
                      value={formData.parent_email}
                      onChange={e => setFormData({ ...formData, parent_email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Residential Street Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Flat/House No, Building, Road, Landmark"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      City <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Deoghar"
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      State <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jharkhand"
                      value={formData.state}
                      onChange={e => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      PIN Code <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 814112"
                      value={formData.pin_code}
                      onChange={e => setFormData({ ...formData, pin_code: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Alternate Mobile / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="Optional"
                      value={formData.alternate_mobile}
                      onChange={e => setFormData({ ...formData, alternate_mobile: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.parent_mobile || !formData.address || !formData.city || !formData.state || !formData.pin_code) {
                        alert('Please fill parent mobile and full address details.');
                        return;
                      }
                      setCurrentStep(4);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <span>Next: Previous School</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Previous School */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Previous School Attended (if any)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Modern Public School"
                      value={formData.previous_school}
                      onChange={e => setFormData({ ...formData, previous_school: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Previous Grade / Class Completed
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Class 5"
                      value={formData.previous_class}
                      onChange={e => setFormData({ ...formData, previous_class: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Emergency Contact Person / Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Uncle (+91 98350 00000)"
                      value={formData.emergency_contact}
                      onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Special Requirements or Medical Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Any allergies, language preferences, or specific notes for the admissions counselor..."
                      value={formData.remarks}
                      onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <span>Next: Documents & Submit</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Documents & Final Submission */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Upload Required Documents (Max 5MB each)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { type: 'Birth Certificate', desc: 'Municipal birth certificate or hospital registry copy' },
                      { type: 'Aadhaar Card', desc: 'UIDAI card or enrollment slip photocopy' },
                      { type: 'Previous Report Card', desc: 'Mark sheet from last attended school / preschool' },
                      { type: 'Applicant Photograph', desc: 'Recent passport-size color photograph' }
                    ].map(item => {
                      const existing = documents.find(d => d.document_type === item.type);

                      return (
                        <div key={item.type} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">{item.type}</span>
                            {existing ? (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                                Attached ({(existing.file_size / 1024).toFixed(0)} KB)
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">Optional now</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium cursor-pointer transition-colors mt-1">
                            <Upload className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{existing ? 'Change File' : 'Choose File'}</span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              onChange={e => handleFileUpload(item.type, e)}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Final Confirmation Review Box */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-slate-200">Summary Verification:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-400">
                    <div>Student: <span className="text-white font-medium">{formData.first_name} {formData.last_name}</span></div>
                    <div>Grade: <span className="text-white font-medium">{classes.find(c => c.id === formData.applying_class_id)?.name}</span></div>
                    <div>Contact: <span className="text-white font-medium">{formData.parent_mobile}</span></div>
                    <div>City: <span className="text-white font-medium">{formData.city}</span></div>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-900">
                    By submitting this application, you certify that all information submitted is accurate and understand that false statements may lead to cancellation of admission.
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitApplication}
                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-indigo-600/25 transition-all"
                  >
                    {submitting ? (
                      <span>Generating Application Number & Submitting...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Submit Online Application</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
        <p>© 2026 {selectedSchool ? selectedSchool.name : 'School ERP System'}. All Rights Reserved. Enterprise Admissions & Student Information System.</p>
      </footer>
    </div>
  );
};
