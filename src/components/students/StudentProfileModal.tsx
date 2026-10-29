import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import { Modal } from '../common/Modal.js';
import type { Student, StudentDocument } from '../../types/erp.js';
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Shield,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Heart,
  Plus,
  Trash2,
  ExternalLink,
  Award,
  IndianRupee
} from 'lucide-react';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  onStudentUpdated?: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  studentId,
  onStudentUpdated
}) => {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'parents' | 'documents' | 'idcard' | 'fees'>('overview');
  const [payableSummary, setPayableSummary] = useState<any>(null);
  const [loadingFees, setLoadingFees] = useState(false);

  // Document upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docType, setDocType] = useState('Birth Certificate');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docRemarks, setDocRemarks] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<StudentDocument | null>(null);

  // Document verification modal state
  const [verifyDocTarget, setVerifyDocTarget] = useState<StudentDocument | null>(null);
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (activeTab === 'fees' && studentId) {
      loadFeesSummary();
    }
  }, [activeTab, studentId]);

  const loadFeesSummary = async () => {
    if (!studentId) return;
    setLoadingFees(true);
    try {
      const data = await api.fees.getStudentPayableSummary(studentId);
      setPayableSummary(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingFees(false);
    }
  };

  const loadStudent = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await api.students.get(studentId);
      setStudent(res.student);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load student details.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && studentId) {
      setActiveTab('overview');
      loadStudent();
    } else {
      setStudent(null);
    }
  }, [isOpen, studentId]);

  if (!isOpen || !studentId) return null;

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocFile(e.target.files[0]);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !student) return;

    setUploadingDoc(true);
    try {
      // Read file as base64 data url
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result as string;
          await api.students.uploadDocument(student.id, {
            document_type: docType,
            file_name: docFile.name,
            file_size: docFile.size,
            mime_type: docFile.type,
            file_data: fileData,
            remarks: docRemarks
          });
          toast.success(`Uploaded ${docType} successfully.`);
          setShowUploadModal(false);
          setDocFile(null);
          setDocRemarks('');
          await loadStudent();
          onStudentUpdated?.();
        } catch (err: any) {
          toast.error(err.message || 'Failed to upload document.');
        } finally {
          setUploadingDoc(false);
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read file.');
        setUploadingDoc(false);
      };
      reader.readAsDataURL(docFile);
    } catch (err: any) {
      toast.error(err.message || 'Error uploading document.');
      setUploadingDoc(false);
    }
  };

  const handleVerifyDocument = async (status: 'Verified' | 'Rejected') => {
    if (!verifyDocTarget || !student) return;
    setVerifying(true);
    try {
      await api.students.verifyDocument(student.id, verifyDocTarget.id, status, verifyRemarks);
      toast.success(`Document marked as ${status}.`);
      setVerifyDocTarget(null);
      setVerifyRemarks('');
      await loadStudent();
      onStudentUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update document verification status.');
    } finally {
      setVerifying(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!student) return;
    if (!confirm(`Are you sure you want to delete ${docName}?`)) return;

    try {
      await api.students.deleteDocument(student.id, docId);
      toast.success('Document deleted successfully.');
      await loadStudent();
      onStudentUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document.');
    }
  };

  const printIdCard = () => {
    const printContent = document.getElementById('student-id-card-element');
    if (!printContent) return;

    const win = window.open('', '', 'width=800,height=600');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Student ID Card - ${student?.first_name} ${student?.last_name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f8fafc; }
            .card-wrapper { border: 2px solid #0f172a; border-radius: 12px; width: 340px; background: white; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; }
            .school-name { font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0; }
            .school-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
            .badge { display: inline-block; background: #0f172a; color: white; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 99px; margin-top: 4px; }
            .photo-box { width: 80px; height: 80px; margin: 0 auto 12px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 24px; color: #334155; }
            .student-name { text-align: center; font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 12px; }
            .field-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; }
            .label { font-weight: 600; color: #64748b; }
            .val { font-weight: 700; color: #0f172a; }
            .barcode-box { text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 12px; font-family: monospace; font-size: 12px; letter-spacing: 2px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="card-wrapper">
            <div class="header">
              <div class="school-name">${student?.school_name}</div>
              <div class="school-sub">Affiliated to CBSE · Academic Session ${student?.session_name}</div>
              <div class="badge">STUDENT IDENTITY CARD</div>
            </div>
            <div class="photo-box">
              ${student?.first_name[0]}${student?.last_name[0]}
            </div>
            <div class="student-name">${student?.first_name} ${student?.middle_name || ''} ${student?.last_name}</div>
            <div class="field-row"><span class="label">Admission No:</span><span class="val">${student?.admission_number}</span></div>
            <div class="field-row"><span class="label">Class & Sec:</span><span class="val">${student?.class_name} - ${student?.section_name}</span></div>
            <div class="field-row"><span class="label">Roll Number:</span><span class="val">${student?.roll_number || 'N/A'}</span></div>
            <div class="field-row"><span class="label">Date of Birth:</span><span class="val">${student?.date_of_birth}</span></div>
            <div class="field-row"><span class="label">Blood Group:</span><span class="val">${student?.blood_group || 'N/A'}</span></div>
            <div class="field-row"><span class="label">Emergency Mobile:</span><span class="val">${student?.primary_parent_mobile || student?.mobile_number || 'N/A'}</span></div>
            <div class="barcode-box">||| | ||||| |||| || ||| |<br/>${student?.admission_number}</div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Student Profile" maxWidth="4xl">
      {loading || !student ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-medium">Loading comprehensive student dossier...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-bold tracking-tight text-white shadow-inner">
                {student.profile_photo ? (
                  <img src={student.profile_photo} alt={student.first_name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  `${student.first_name[0]}${student.last_name[0]}`
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {student.first_name} {student.middle_name || ''} {student.last_name}
                  </h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    student.student_status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : student.student_status === 'TRANSFERRED'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : student.student_status === 'GRADUATED'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {student.student_status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 flex-wrap">
                  <span className="font-semibold text-slate-100">{student.class_name} · Section {student.section_name}</span>
                  <span>·</span>
                  <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-slate-200">
                    Roll: {student.roll_number || 'N/A'}
                  </span>
                  <span>·</span>
                  <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-slate-200">
                    Adm: {student.admission_number}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {student.school_name} · Session {student.session_name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={printIdCard}
                className="px-3 py-1.5 text-xs font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print ID Card</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 px-3 text-xs font-semibold transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Bio & Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('academic')}
              className={`pb-2.5 px-3 text-xs font-semibold transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'academic'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Academic & Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('parents')}
              className={`pb-2.5 px-3 text-xs font-semibold transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'parents'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Parents & Guardians ({student.parents?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`pb-2.5 px-3 text-xs font-semibold transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'documents'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents ({student.documents?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('idcard')}
              className={`pb-2.5 px-3 text-xs font-semibold transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'idcard'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>ID Card Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fees')}
              className={`pb-2.5 px-3 text-xs font-semibold transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'fees'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Fees & Ledger</span>
            </button>
          </div>

          {/* TAB 1: Bio & Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Demographics */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                    <span>Personal Demographics</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Full Name</span>
                      <span className="font-semibold text-slate-800">{student.first_name} {student.middle_name} {student.last_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Date of Birth</span>
                      <span className="font-semibold text-slate-800">{student.date_of_birth}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Gender</span>
                      <span className="font-semibold text-slate-800">{student.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Blood Group</span>
                      <span className="font-semibold text-slate-800">{student.blood_group || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Nationality</span>
                      <span className="font-semibold text-slate-800">{student.nationality}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Religion</span>
                      <span className="font-semibold text-slate-800">{student.religion || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Category</span>
                      <span className="font-semibold text-slate-800">{student.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Aadhaar / National ID</span>
                      <span className="font-mono font-semibold text-slate-800">{student.aadhaar_number || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Contact & Residential */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-600" />
                    <span>Contact & Residential Details</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Student Mobile</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {student.mobile_number || 'No student mobile registered'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Student Email</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {student.email || 'No email registered'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Residential Address</span>
                      <span className="font-semibold text-slate-800 leading-relaxed block mt-0.5">
                        {student.address || 'Address not registered'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[11px]">City / District</span>
                        <span className="font-semibold text-slate-800">{student.city || student.district || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">State</span>
                        <span className="font-semibold text-slate-800">{student.state || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">PIN Code</span>
                        <span className="font-semibold text-slate-800">{student.pin_code || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative Remarks */}
              {student.remarks && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg text-xs">
                  <span className="font-bold text-amber-900 block mb-1">Office Remarks / Special Notes:</span>
                  <p className="text-amber-800">{student.remarks}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Academic & Timeline */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Academic Session</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">{student.session_name}</span>
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">{student.school_code}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Class & Section</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">{student.class_name} - {student.section_name}</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Room: {(student as any).room_number || 'Main Building'}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Class Teacher</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">{(student as any).class_teacher_name || 'Designated Class Faculty'}</span>
                  <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Academic Mentor</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-600" />
                  <span>Admission & Enrollment Trail</span>
                </h4>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Admission Date</span>
                    <span className="font-semibold text-slate-800">{student.admission_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Previous School</span>
                    <span className="font-semibold text-slate-800">{student.previous_school || 'Direct Admission (First Schooling)'}</span>
                  </div>
                </div>

                {/* Enrollment Timeline */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Academic Year History
                  </h5>
                  <div className="space-y-3">
                    {student.enrollments && student.enrollments.length > 0 ? (
                      student.enrollments.map((enr, idx) => (
                        <div key={enr.id || idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                          <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5 shrink-0" />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{enr.class_name} - {enr.section_name} ({enr.session_name})</span>
                              <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                                {enr.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Enrolled on: {enr.enrollment_date} · Roll: {enr.roll_number || 'N/A'}
                            </div>
                            {enr.remarks && <div className="text-[11px] text-slate-600 italic mt-1">{enr.remarks}</div>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No historical session rollover recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Parents & Guardians */}
          {activeTab === 'parents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Authorized Guardians & Family Contacts
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Parents receive SMS notifications, fee updates, and parent portal access.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.parents && student.parents.length > 0 ? (
                  student.parents.map((parent) => (
                    <div
                      key={parent.id || parent.parent_id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-sm font-bold text-slate-900">{parent.parent_name}</span>
                            <span className="block text-[11px] font-semibold text-slate-500 mt-0.5">
                              {parent.relationship}
                            </span>
                          </div>
                          {parent.is_primary_guardian && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Primary Guardian
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-1.5 text-xs">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold">{parent.parent_mobile}</span>
                            {parent.parent_alternate_mobile && (
                              <span className="text-slate-400">/ {parent.parent_alternate_mobile}</span>
                            )}
                          </div>
                          {parent.parent_email && (
                            <div className="flex items-center gap-2 text-slate-700">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{parent.parent_email}</span>
                            </div>
                          )}
                          {parent.parent_occupation && (
                            <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                              <span className="text-slate-400 font-semibold">Occupation:</span>
                              <span>{parent.parent_occupation}</span>
                            </div>
                          )}
                          {parent.parent_address && (
                            <div className="flex items-start gap-2 text-slate-600 text-[11px] mt-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span>{parent.parent_address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>SMS Notifications Active</span>
                        </span>
                        <span className="text-slate-400">Portal Enabled</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No parents or guardians linked to this student yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Documents & Certificates */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Official Student Documents & Certificates
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Birth certificates, Aadhaar ID, marksheets, transfer certificates, and verification audit.
                  </p>
                </div>
                {hasPermission('documents.upload') && (
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                  </button>
                )}
              </div>

              {student.documents && student.documents.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {student.documents.map((doc) => (
                    <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 mt-0.5 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">{doc.document_type}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              doc.verification_status === 'Verified'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : doc.verification_status === 'Rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {doc.verification_status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {doc.file_name} · {(doc.file_size / 1024).toFixed(1)} KB
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Uploaded by {doc.uploaded_by} on {doc.upload_date.split('T')[0]}
                            {doc.verified_by && ` · Verified by ${doc.verified_by}`}
                          </div>
                          {doc.remarks && (
                            <p className="text-[11px] text-slate-600 italic mt-1 bg-slate-50 p-1.5 rounded">
                              Note: {doc.remarks}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Preview</span>
                        </button>

                        {hasPermission('documents.verify') && doc.verification_status !== 'Verified' && (
                          <button
                            type="button"
                            onClick={() => {
                              setVerifyDocTarget(doc);
                              setVerifyRemarks('');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verify</span>
                          </button>
                        )}

                        {hasPermission('documents.upload') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, doc.document_type)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No documents have been uploaded for this student yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ID Card Preview */}
          {activeTab === 'idcard' && (
            <div className="py-4 flex flex-col items-center justify-center">
              <div
                id="student-id-card-element"
                className="w-80 bg-white rounded-2xl border-2 border-slate-900 shadow-xl overflow-hidden p-5 flex flex-col"
              >
                <div className="text-center border-b-2 border-slate-100 pb-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mx-auto mb-1">
                    SE
                  </div>
                  <h3 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                    {student.school_name}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-medium">Affiliated to CBSE · Session {student.session_name}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[9px] font-bold tracking-wider uppercase">
                    Student Identity Card
                  </span>
                </div>

                <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-xl font-bold text-slate-700 mx-auto mb-3 shadow-inner overflow-hidden">
                  {student.profile_photo ? (
                    <img src={student.profile_photo} alt={student.first_name} className="w-full h-full object-cover" />
                  ) : (
                    `${student.first_name[0]}${student.last_name[0]}`
                  )}
                </div>

                <h4 className="text-center text-sm font-black text-slate-900 tracking-tight mb-2">
                  {student.first_name} {student.middle_name || ''} {student.last_name}
                </h4>

                <div className="space-y-1.5 text-[11px] border-t border-slate-100 pt-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Admission No:</span>
                    <span className="font-bold text-slate-900 font-mono">{student.admission_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Class & Sec:</span>
                    <span className="font-bold text-slate-900">{student.class_name} - {student.section_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Roll Number:</span>
                    <span className="font-bold text-slate-900">{student.roll_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Blood Group:</span>
                    <span className="font-bold text-slate-900">{student.blood_group || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Emergency Mobile:</span>
                    <span className="font-bold text-slate-900 font-mono">{student.primary_parent_mobile || student.mobile_number || 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center">
                  <div className="font-mono text-xs tracking-widest font-black text-slate-800">
                    ||| | ||||| |||| || ||| |
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {student.admission_number}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={printIdCard}
                className="mt-6 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Student Card</span>
              </button>
            </div>
          )}

          {/* TAB 6: Fees & Dues */}
          {activeTab === 'fees' && (
            <div className="space-y-5">
              {loadingFees ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading student fee ledger...</p>
                </div>
              ) : payableSummary ? (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Total Charges</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ₹{Number(payableSummary.totals?.totalCharges || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                      <span className="text-purple-700 block text-[11px]">Concessions / Aid</span>
                      <span className="font-mono font-bold text-purple-900 text-sm">
                        -₹{Number(payableSummary.totals?.totalConcessions || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block text-[11px]">Total Paid Amount</span>
                      <span className="font-mono font-bold text-emerald-900 text-sm">
                        ₹{Number(payableSummary.totals?.totalPaid || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                      <span className="text-rose-700 block text-[11px] font-bold">Outstanding Dues</span>
                      <span className="font-mono font-black text-rose-800 text-sm">
                        ₹{Number(payableSummary.totals?.totalOutstanding || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Plan Information */}
                  {payableSummary.assignment && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500">Active Fee Plan:</span>{' '}
                        <strong className="text-slate-900">{payableSummary.assignment.structure_name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Status:</span>{' '}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          payableSummary.assignment.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : payableSummary.assignment.status === 'PARTIALLY_PAID'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {payableSummary.assignment.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Unpaid Charges Table */}
                  {payableSummary.payableCharges && payableSummary.payableCharges.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                        Pending Installment Charges:
                      </h4>
                      <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold">
                              <th className="py-2 px-3">Installment</th>
                              <th className="py-2 px-3">Due Date</th>
                              <th className="py-2 px-3 text-right">Amount (₹)</th>
                              <th className="py-2 px-3 text-right">Balance Due (₹)</th>
                              <th className="py-2 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {payableSummary.payableCharges.map((ch: any) => (
                              <tr key={ch.id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-semibold text-slate-900">{ch.installment_name}</td>
                                <td className="py-2 px-3 text-slate-600">{ch.due_date}</td>
                                <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                                  ₹{Number(ch.amount).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                                  ₹{Number(ch.outstanding_amount).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    {ch.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Payment History Table */}
                  {payableSummary.paymentHistory && payableSummary.paymentHistory.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                        Payment History Vouchers:
                      </h4>
                      <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold">
                              <th className="py-2 px-3">Receipt No</th>
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3">Mode</th>
                              <th className="py-2 px-3 text-right">Amount (₹)</th>
                              <th className="py-2 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {payableSummary.paymentHistory.map((p: any) => (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-mono font-bold text-indigo-600">{p.receipt_number}</td>
                                <td className="py-2 px-3 text-slate-600">{p.payment_date?.split('T')[0]}</td>
                                <td className="py-2 px-3 text-slate-700 font-semibold">{p.payment_mode}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                  ₹{Number(p.amount).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No fee schedule or payments recorded for this student yet.
                </div>
              )}
            </div>
          )}
          <Modal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            title="Upload Student Document"
            description={`Attach certificates and ID papers for ${student.first_name} ${student.last_name}`}
            maxWidth="md"
          >
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Birth Certificate">Birth Certificate</option>
                  <option value="Aadhaar Card">Aadhaar Card / Government ID</option>
                  <option value="Transfer Certificate (TC)">Transfer Certificate (TC)</option>
                  <option value="Previous Marksheet">Previous School Marksheet</option>
                  <option value="Passport Photo">Passport Photo</option>
                  <option value="Caste Certificate">Caste / Category Certificate</option>
                  <option value="Medical Certificate">Medical / Fitness Certificate</option>
                  <option value="Address Proof">Address Proof / Utility Bill</option>
                  <option value="Other Document">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select File (Image or PDF) *
                </label>
                <input
                  type="file"
                  required
                  accept="image/*,.pdf,.svg"
                  onChange={handleFileUploadChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verification Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={docRemarks}
                  onChange={(e) => setDocRemarks(e.target.value)}
                  placeholder="e.g. Original shown and verified during admission"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc || !docFile}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors shadow-sm"
                >
                  {uploadingDoc ? 'Uploading...' : 'Save & Upload'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Modal: Document Preview */}
          {previewDoc && (
            <Modal
              isOpen={Boolean(previewDoc)}
              onClose={() => setPreviewDoc(null)}
              title={`${previewDoc.document_type} - Preview`}
              description={`File: ${previewDoc.file_name} (${(previewDoc.file_size / 1024).toFixed(1)} KB)`}
              maxWidth="2xl"
            >
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex items-center justify-center min-h-[300px] max-h-[500px] overflow-auto">
                  {previewDoc.file_data.startsWith('data:image/') || previewDoc.mime_type?.startsWith('image/') ? (
                    <img
                      src={previewDoc.file_data}
                      alt={previewDoc.document_type}
                      className="max-h-[460px] max-w-full object-contain rounded"
                    />
                  ) : previewDoc.file_data.startsWith('data:application/pdf') ? (
                    <iframe
                      src={previewDoc.file_data}
                      title="PDF Preview"
                      className="w-full h-[460px] rounded border border-slate-200"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">Official Document Record</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">{previewDoc.file_name}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Status: <strong className="text-slate-800">{previewDoc.verification_status}</strong></span>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="px-4 py-1.5 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Modal: Verify / Reject Document */}
          {verifyDocTarget && (
            <Modal
              isOpen={Boolean(verifyDocTarget)}
              onClose={() => setVerifyDocTarget(null)}
              title="Verify Student Document"
              description={`Update official verification status for ${verifyDocTarget.document_type}`}
              maxWidth="sm"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verification Comments / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={verifyRemarks}
                    onChange={(e) => setVerifyRemarks(e.target.value)}
                    placeholder="e.g. Checked against official government registry"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleVerifyDocument('Rejected')}
                    disabled={verifying}
                    className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors"
                  >
                    Reject Document
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyDocument('Verified')}
                    disabled={verifying}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    Approve & Verify
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}
    </Modal>
  );
};
