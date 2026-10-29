import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { Employee, EmployeeDocument } from '../../types/erp.js';
import {
  X,
  Building2,
  Briefcase,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  KeyRound,
  FileText,
  BookOpen,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Lock,
  History,
  UserCheck
} from 'lucide-react';

interface EmployeeProfileModalProps {
  employeeId: string;
  onClose: () => void;
  onRefresh: () => void;
}

type TabType =
  | 'overview'
  | 'history'
  | 'qualifications'
  | 'experience'
  | 'teaching'
  | 'documents'
  | 'account'
  | 'attendance'
  | 'leave'
  | 'payroll';

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employeeId,
  onClose,
  onRefresh
}) => {
  const { hasPermission } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Document Upload
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [docType, setDocType] = useState('Educational Certificate');
  const [docName, setDocName] = useState('');
  const [docRemarks, setDocRemarks] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);

  // Add Qualification
  const [showAddQual, setShowAddQual] = useState(false);
  const [newDegree, setNewDegree] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [newInst, setNewInst] = useState('');
  const [newBoard, setNewBoard] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newGrade, setNewGrade] = useState('');

  // Add Experience
  const [showAddExp, setShowAddExp] = useState(false);
  const [newOrg, setNewOrg] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newMonths, setNewMonths] = useState('');
  const [newResp, setNewResp] = useState('');

  // ERP User Account creation/reset
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('Staff@123');
  const [newRoleId, setNewRoleId] = useState('role_teacher');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetPwdText, setResetPwdText] = useState('Staff@123');

  const [savingAction, setSavingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchProfile = () => {
    setLoading(true);
    api.employees.get(employeeId)
      .then((res) => {
        setEmployee(res.employee);
      })
      .catch((err) => {
        setActionError(err?.message || 'Failed to load employee details');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, [employeeId]);

  const handleVerifyDocument = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      setSavingAction(true);
      await api.employees.verifyDocument(employeeId, docId, status, `Reviewed and marked ${status} by administrator`);
      fetchProfile();
      onRefresh();
      setActionMessage(`Document ${status.toLowerCase()} successfully`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionError(err?.message || 'Verification update failed');
    } finally {
      setSavingAction(false);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    try {
      setUploadingDoc(true);
      const sampleSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%23f8fafc" stroke="%23cbd5e1"/><text x="200" y="85" font-family="sans-serif" font-size="15" font-weight="bold" fill="%230f172a" text-anchor="middle">${encodeURIComponent(docType)}</text><text x="200" y="115" font-family="sans-serif" font-size="12" fill="%2364748b" text-anchor="middle">${encodeURIComponent(docName)}</text></svg>`;

      await api.employees.uploadDocument(employeeId, {
        document_type: docType,
        file_name: docName.endsWith('.svg') ? docName : `${docName}.svg`,
        file_size: 18400,
        file_data: sampleSvg,
        mime_type: 'image/svg+xml',
        remarks: docRemarks
      });

      setShowUploadDoc(false);
      setDocName('');
      setDocRemarks('');
      fetchProfile();
      onRefresh();
    } catch (err: any) {
      setActionError(err?.message || 'Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleAddQualification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDegree.trim()) return;

    try {
      setSavingAction(true);
      await api.employees.addQualification(employeeId, {
        qualification: newDegree,
        specialization: newSpec,
        institution: newInst,
        university_board: newBoard,
        passing_year: newYear ? parseInt(newYear, 10) : null,
        percentage_grade: newGrade
      });
      setShowAddQual(false);
      setNewDegree('');
      setNewSpec('');
      setNewInst('');
      setNewBoard('');
      setNewYear('');
      setNewGrade('');
      fetchProfile();
      onRefresh();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to add qualification');
    } finally {
      setSavingAction(false);
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrg.trim() || !newDesig.trim()) return;

    try {
      setSavingAction(true);
      await api.employees.addExperience(employeeId, {
        organization: newOrg,
        designation: newDesig,
        start_date: newStart || null,
        end_date: newEnd || null,
        total_experience_months: newMonths ? parseInt(newMonths, 10) : null,
        responsibilities: newResp
      });
      setShowAddExp(false);
      setNewOrg('');
      setNewDesig('');
      setNewStart('');
      setNewEnd('');
      setNewMonths('');
      setNewResp('');
      fetchProfile();
      onRefresh();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to add work experience');
    } finally {
      setSavingAction(false);
    }
  };

  const handleCreateUserAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingAction(true);
      await api.employees.createUserAccount(employeeId, {
        username: newUsername || employee?.email || `emp.${employee?.first_name.toLowerCase()}`,
        password: newPassword,
        role_id: newRoleId
      });
      setShowCreateAccount(false);
      fetchProfile();
      onRefresh();
      setActionMessage('ERP login account successfully provisioned');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to create user account');
    } finally {
      setSavingAction(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingAction(true);
      await api.employees.resetPassword(employeeId, resetPwdText);
      setShowResetPwd(false);
      setActionMessage('Password reset successfully');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionError(err?.message || 'Password reset failed');
    } finally {
      setSavingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold mx-auto animate-spin">
            E
          </div>
          <p className="text-xs font-semibold text-slate-700">Loading Employee Dossier...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'ACTIVE':
        return <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Active Service</span>;
      case 'ON_PROBATION':
        return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">On Probation</span>;
      case 'ON_LEAVE':
        return <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">On Leave</span>;
      case 'RESIGNED':
      case 'TERMINATED':
      case 'RETIRED':
      case 'INACTIVE':
        return <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">{st}</span>;
      default:
        return <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{st}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header Profile Hero */}
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {employee.profile_photo ? (
              <img
                src={employee.profile_photo}
                alt={employee.first_name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/20 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/40 border border-white/20 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                {employee.first_name[0]}{employee.last_name[0]}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight truncate">
                  {employee.first_name} {employee.middle_name} {employee.last_name}
                </h2>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/15 text-indigo-200 border border-white/10">
                  {employee.employee_id_number}
                </span>
                {getStatusBadge(employee.employment_status)}
                <span className="text-xs text-slate-300 font-medium px-2 py-0.5 rounded bg-white/10">
                  {employee.employee_type}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-300" />
                  {employee.designation_name || 'Designation Unassigned'}
                </span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-300" />
                  {employee.department_name || 'Department Unassigned'}
                </span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                  Joined {new Date(employee.date_of_joining).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span>{employee.school_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-slate-50/80 overflow-x-auto shrink-0 py-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'history', label: 'Service History' },
            { id: 'qualifications', label: `Qualifications (${employee.qualifications?.length || 0})` },
            { id: 'experience', label: `Experience (${employee.experience?.length || 0})` },
            ...(employee.employee_type === 'Teaching' ? [{ id: 'teaching', label: 'Subjects & Classes' }] : []),
            { id: 'documents', label: `Dossier (${employee.documents?.length || 0})` },
            { id: 'account', label: 'ERP Account' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'leave', label: 'Leave' },
            { id: 'payroll', label: 'Payroll' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action notifications */}
        {actionMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
        {actionError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Demographic Profile</h4>
                  <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Gender</span>
                      <span className="font-semibold text-slate-800">{employee.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Date of Birth</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(employee.date_of_birth).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Blood Group</span>
                      <span className="font-semibold text-slate-800">{employee.blood_group || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Experience</span>
                      <span className="font-semibold text-slate-800">{employee.experience_years || 0} years</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Contact & Communication</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{employee.mobile_number}</span>
                      {employee.alternate_mobile && <span className="text-slate-400 font-mono">/ {employee.alternate_mobile}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{employee.email || 'No personal email'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-semibold text-indigo-950">{employee.official_email || 'No official email configured'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 pt-1 border-t border-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>{employee.address ? `${employee.address}, ${employee.city}, ${employee.state} - ${employee.pin_code}` : 'No address specified'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Emergency Contact Person</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-slate-900">{employee.emergency_contact_name || 'Not on file'}</div>
                    <div className="text-slate-600 font-mono">{employee.emergency_contact_number || 'No number'}</div>
                    <div className="text-[11px] text-slate-500">Relationship: {employee.emergency_contact_relationship || 'N/A'}</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Administrative Remarks</h4>
                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    {employee.remarks || 'No specific administrative remarks.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERVICE HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-600" />
                  Chronological Employment History
                </span>
                <span className="text-[11px] text-slate-500">Audit-backed event logs</span>
              </div>

              {(!employee.history || employee.history.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No previous employment history events recorded.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {employee.history.map((h) => (
                    <div key={h.id} className="relative group">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white bg-indigo-600 ring-2 ring-indigo-200" />
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 font-mono">{h.event_type}</span>
                          <span className="text-slate-500 text-[11px]">
                            {new Date(h.effective_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">{h.remarks}</p>
                        <div className="text-[10px] text-slate-400 pt-1">
                          Action authorized by: <span className="font-semibold text-slate-600">{h.changed_by_name || 'System Admin'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUALIFICATIONS */}
          {activeTab === 'qualifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Academic Qualifications & Degrees
                </span>
                {hasPermission('employees.edit') && (
                  <button
                    type="button"
                    onClick={() => setShowAddQual(!showAddQual)}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Qualification</span>
                  </button>
                )}
              </div>

              {showAddQual && (
                <form onSubmit={handleAddQualification} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-900">Add Academic Credential</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      required
                      value={newDegree}
                      onChange={(e) => setNewDegree(e.target.value)}
                      placeholder="Degree / Qualification (e.g. M.Sc, B.Ed)"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      value={newSpec}
                      onChange={(e) => setNewSpec(e.target.value)}
                      placeholder="Specialization / Subject"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      value={newInst}
                      onChange={(e) => setNewInst(e.target.value)}
                      placeholder="College / Institution"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={newBoard}
                      onChange={(e) => setNewBoard(e.target.value)}
                      placeholder="Board / University"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="number"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      placeholder="Passing Year"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      value={newGrade}
                      onChange={(e) => setNewGrade(e.target.value)}
                      placeholder="Grade / Percentage"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddQual(false)}
                      className="px-3 py-1.5 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingAction}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      Save Qualification
                    </button>
                  </div>
                </form>
              )}

              {(!employee.qualifications || employee.qualifications.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No qualification records added.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {employee.qualifications.map((q) => (
                    <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{q.qualification}</span>
                        {q.passing_year && (
                          <span className="font-mono text-[11px] text-slate-500">{q.passing_year}</span>
                        )}
                      </div>
                      {q.specialization && <div className="text-xs text-indigo-700 font-medium">{q.specialization}</div>}
                      <div className="text-[11px] text-slate-600">
                        {q.institution} {q.university_board ? `· ${q.university_board}` : ''}
                      </div>
                      {q.percentage_grade && (
                        <div className="text-[10px] text-slate-500 font-semibold pt-1">Result: {q.percentage_grade}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EXPERIENCE */}
          {activeTab === 'experience' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Prior Work Experience History
                </span>
                {hasPermission('employees.edit') && (
                  <button
                    type="button"
                    onClick={() => setShowAddExp(!showAddExp)}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Experience</span>
                  </button>
                )}
              </div>

              {showAddExp && (
                <form onSubmit={handleAddExperience} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-900">Add Employment Experience</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      value={newOrg}
                      onChange={(e) => setNewOrg(e.target.value)}
                      placeholder="School / Organization Name"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      required
                      value={newDesig}
                      onChange={(e) => setNewDesig(e.target.value)}
                      placeholder="Designation / Post Held"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="date"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      placeholder="Start Date"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="date"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      placeholder="End Date"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="number"
                      value={newMonths}
                      onChange={(e) => setNewMonths(e.target.value)}
                      placeholder="Total Duration (Months)"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={newResp}
                    onChange={(e) => setNewResp(e.target.value)}
                    placeholder="Key responsibilities and achievements..."
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddExp(false)}
                      className="px-3 py-1.5 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingAction}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      Save Experience
                    </button>
                  </div>
                </form>
              )}

              {(!employee.experience || employee.experience.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No prior employment experience records.
                </div>
              ) : (
                <div className="space-y-3">
                  {employee.experience.map((exp) => (
                    <div key={exp.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{exp.designation}</span>
                        <span className="text-[11px] font-mono text-slate-500">{exp.total_experience_months ? `${exp.total_experience_months} months` : ''}</span>
                      </div>
                      <div className="text-xs text-indigo-700 font-medium">{exp.organization}</div>
                      {exp.responsibilities && (
                        <p className="text-[11px] text-slate-600 pt-1 leading-relaxed">{exp.responsibilities}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TEACHING ASSIGNMENTS */}
          {activeTab === 'teaching' && (
            <div className="space-y-6">
              {/* Class Teacher in-charge */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" />
                    Class Teacher / In-Charge Roles
                  </span>
                </div>
                {(!employee.class_teacher_assignments || employee.class_teacher_assignments.length === 0) ? (
                  <div className="p-4 text-xs text-slate-500 bg-slate-50 rounded-xl mt-3">
                    Not currently designated as Class Teacher for any section.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {employee.class_teacher_assignments.map((cta) => (
                      <div key={cta.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-950">{cta.class_name} · Section {cta.section_name}</span>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900">
                            Class In-Charge
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-800">{cta.session_name} Session</div>
                        {cta.remarks && <p className="text-[10px] text-amber-700 italic pt-1">{cta.remarks}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject assignments */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    Curriculum Subjects & Class Teaching Workload
                  </span>
                </div>
                {(!employee.subject_assignments || employee.subject_assignments.length === 0) ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl mt-3">
                    No curriculum subjects currently assigned.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {employee.subject_assignments.map((tsa) => (
                      <div key={tsa.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{tsa.subject_name} ({tsa.subject_code})</span>
                          <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {tsa.is_primary_teacher ? 'Primary' : 'Assistant'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 font-medium">
                          {tsa.class_name} {tsa.section_name ? `· Section ${tsa.section_name}` : '· All Sections'}
                        </div>
                        <div className="text-[10px] text-slate-400">{tsa.session_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS & DOSSIER */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Staff Certificates & Official Dossier
                </span>
                {hasPermission('employees.documents.upload') && (
                  <button
                    type="button"
                    onClick={() => setShowUploadDoc(!showUploadDoc)}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                  </button>
                )}
              </div>

              {showUploadDoc && (
                <form onSubmit={handleUploadDoc} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-900">Upload Staff Certificate or Document</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="Educational Certificate">Educational Certificate</option>
                      <option value="Degree Certificate">Degree Certificate</option>
                      <option value="Appointment Letter">Appointment Letter</option>
                      <option value="Joining Letter">Joining Letter</option>
                      <option value="Identity Proof">Identity Proof</option>
                      <option value="Address Proof">Address Proof</option>
                      <option value="Experience Certificate">Experience Certificate</option>
                      <option value="Contract">Contract</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="File title (e.g. Master_Degree.svg)"
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={docRemarks}
                    onChange={(e) => setDocRemarks(e.target.value)}
                    placeholder="Verification remarks or issue authority..."
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUploadDoc(false)}
                      className="px-3 py-1.5 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploadingDoc}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                    </button>
                  </div>
                </form>
              )}

              {(!employee.documents || employee.documents.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No official certificates or dossier files attached.
                </div>
              ) : (
                <div className="space-y-3">
                  {employee.documents.map((doc) => (
                    <div key={doc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{doc.file_name}</div>
                          <div className="text-[11px] text-slate-500">
                            {doc.document_type} · {(doc.file_size / 1024).toFixed(1)} KB
                          </div>
                          {doc.remarks && <div className="text-[10px] text-slate-400 mt-0.5">{doc.remarks}</div>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          doc.verification_status === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.verification_status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {doc.verification_status}
                        </span>

                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Preview
                        </button>

                        {hasPermission('employees.documents.verify') && doc.verification_status !== 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => handleVerifyDocument(doc.id, 'VERIFIED')}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                          >
                            Verify
                          </button>
                        )}
                        {hasPermission('employees.documents.verify') && doc.verification_status !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => handleVerifyDocument(doc.id, 'REJECTED')}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: ERP USER ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  ERP Portal Login Credentials & Role
                </span>
              </div>

              {employee.user_id ? (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500">Active Login Account</div>
                      <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">{employee.user_username}</div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      Login Enabled
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[11px]">System Role</span>
                      <span className="font-semibold text-slate-900">{employee.user_role || 'Staff Role'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Campus Access</span>
                      <span className="font-semibold text-slate-900">{employee.school_name}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowResetPwd(!showResetPwd)}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 shadow-sm"
                    >
                      Reset Password
                    </button>
                  </div>

                  {showResetPwd && (
                    <form onSubmit={handleResetPassword} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 mt-2">
                      <label className="block text-[11px] font-semibold text-slate-700">New Temporary Password</label>
                      <input
                        type="text"
                        required
                        value={resetPwdText}
                        onChange={(e) => setResetPwdText(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg"
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowResetPwd(false)} className="text-xs text-slate-500">Cancel</button>
                        <button type="submit" disabled={savingAction} className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded">
                          Save Password
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl space-y-3 bg-slate-50">
                  <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-900">No ERP Login Provisioned</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    This staff member does not currently have access to the School ERP Teacher / Staff Portal.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateAccount(true)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                  >
                    Create ERP Login Account
                  </button>

                  {showCreateAccount && (
                    <form onSubmit={handleCreateUserAccount} className="max-w-md mx-auto p-4 bg-white border border-slate-200 rounded-xl text-left space-y-3 mt-4">
                      <div className="text-xs font-bold text-slate-900">Provision User Account</div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Username</label>
                        <input
                          type="text"
                          required
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder={employee.email || `emp.${employee.first_name.toLowerCase()}`}
                          className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Temporary Password</label>
                        <input
                          type="text"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Role</label>
                        <select
                          value={newRoleId}
                          onChange={(e) => setNewRoleId(e.target.value)}
                          className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg"
                        >
                          <option value="role_teacher">Teacher / Faculty</option>
                          <option value="role_principal">Principal</option>
                          <option value="role_accountant">Accountant</option>
                          <option value="role_school_admin">School Admin</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowCreateAccount(false)} className="text-xs text-slate-500">Cancel</button>
                        <button type="submit" disabled={savingAction} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg">
                          Confirm & Enable Login
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 8, 9, 10: ATTENDANCE, LEAVE, PAYROLL PLACEHOLDERS */}
          {['attendance', 'leave', 'payroll'].includes(activeTab) && (
            <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 space-y-3">
              <Clock className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                {activeTab === 'attendance' ? 'Staff Attendance Register' : activeTab === 'leave' ? 'Leave Management & Quota' : 'Payroll & Salary Management'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                This module will become available in a future phase ({activeTab === 'payroll' ? 'Phase 7' : 'Phase 5'}). Relational foundations for employee ID, school scoping, and service records are fully active.
              </p>
            </div>
          )}
        </div>

        {/* Document Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{previewDoc.file_name}</h4>
                  <p className="text-[11px] text-slate-500">{previewDoc.document_type}</p>
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 bg-slate-100 flex items-center justify-center min-h-[220px]">
                {previewDoc.file_data?.startsWith('data:image') ? (
                  <img src={previewDoc.file_data} alt={previewDoc.file_name} className="max-w-full max-h-64 rounded shadow-sm" />
                ) : (
                  <div className="p-6 bg-white rounded-xl shadow-sm text-center space-y-2">
                    <FileText className="w-8 h-8 text-indigo-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">{previewDoc.file_name}</p>
                    <p className="text-[11px] text-slate-500">Official encrypted document record</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            Employee DB ID: {employee.id}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
