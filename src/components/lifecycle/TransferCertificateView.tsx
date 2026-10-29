import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import {
  FileCheck2,
  Search,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  Building2,
  Calendar,
  User,
  GraduationCap,
  ShieldCheck,
  Send,
  Printer,
  ChevronRight,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { PublicCertificateVerificationModal } from './PublicCertificateVerificationModal.js';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  student_status: string;
  date_of_birth?: string;
  admission_date?: string;
  class_name?: string;
  section_name?: string;
  gender?: string;
  nationality?: string;
  school_id: string;
}

export const TransferCertificateView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Clearance status check
  const [clearanceStatus, setClearanceStatus] = useState<{
    loaded: boolean;
    allCleared: boolean;
    pendingCount: number;
    duesTotal: number;
  }>({
    loaded: false,
    allCleared: true,
    pendingCount: 0,
    duesTotal: 0
  });

  // CBSE TC Form Fields
  const [formData, setFormData] = useState({
    fatherName: 'Mr. Rajesh Kumar',
    motherName: 'Mrs. Sunita Kumar',
    nationality: 'Indian',
    category: 'General',
    admissionDate: '2022-04-10',
    admissionClass: 'Class VI',
    dobFigures: '2011-08-15',
    dobWords: 'Fifteenth August Two Thousand Eleven',
    lastClassFigures: 'Class X',
    lastClassWords: 'Tenth Standard',
    boardExamResult: 'CBSE Secondary School Examination - PASSED',
    failedStatus: 'No',
    subjectsStudied: 'English, Mathematics, Science, Social Science, Hindi, Information Technology',
    promotionStatus: 'Eligible for Class XI (Higher Secondary)',
    duesPaidMonth: 'March 2026',
    workingDays: 218,
    presentDays: 202,
    conduct: 'Exemplary & Good',
    applicationDate: new Date().toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    leavingReason: 'Parent relocated to another city',
    remarks: 'Diligent student with active participation in inter-school science competitions'
  });

  const [generating, setGenerating] = useState(false);
  const [generatedTc, setGeneratedTc] = useState<{
    tcId: string;
    tcNumber: string;
    verificationCode: string;
  } | null>(null);

  // Conversion to alumni state
  const [convertingToAlumni, setConvertingToAlumni] = useState(false);
  const [alumniConverted, setAlumniConverted] = useState(false);

  // Public QR modal
  const [verifyToken, setVerifyToken] = useState<string | null>(null);

  useEffect(() => {
    fetchWithdrawnStudents();
  }, []);

  const fetchWithdrawnStudents = async () => {
    try {
      setLoadingStudents(true);
      // Fetch students with status WITHDRAWN or ACTIVE
      const res = await fetch('/api/students?limit=100');
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setGeneratedTc(null);
    setAlumniConverted(false);

    // Initialize fields from student profile
    setFormData((prev) => ({
      ...prev,
      admissionDate: student.admission_date || prev.admissionDate,
      dobFigures: student.date_of_birth || prev.dobFigures,
      lastClassFigures: student.class_name ? `Class ${student.class_name}` : prev.lastClassFigures,
      nationality: student.nationality || 'Indian'
    }));

    // Check clearances
    try {
      const res = await fetch(`/api/lifecycle/withdrawals?studentId=${student.id}`);
      const data = await res.json();
      if (res.ok && data.withdrawals?.length > 0) {
        const w = data.withdrawals[0];
        const clrRes = await fetch(`/api/lifecycle/withdrawals/${w.id}`);
        const clrData = await clrRes.json();
        if (clrRes.ok && clrData.clearances) {
          const pending = clrData.clearances.filter((c: any) => c.status === 'PENDING' && !c.is_override);
          const totalDues = clrData.clearances.reduce((acc: number, c: any) => acc + Number(c.dues_amount || 0), 0);
          setClearanceStatus({
            loaded: true,
            allCleared: pending.length === 0,
            pendingCount: pending.length,
            duesTotal: totalDues
          });
          return;
        }
      }
      setClearanceStatus({
        loaded: true,
        allCleared: true,
        pendingCount: 0,
        duesTotal: 0
      });
    } catch (err) {
      console.error('Error checking clearances:', err);
    }
  };

  const handleGenerateTC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setGenerating(true);
      const res = await fetch('/api/lifecycle/tc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          leavingReason: formData.leavingReason,
          conduct: formData.conduct,
          workingDays: formData.workingDays,
          presentDays: formData.presentDays,
          resultStatus: formData.boardExamResult,
          promotionStatus: formData.promotionStatus,
          customFields: formData
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate Transfer Certificate');

      setGeneratedTc({
        tcId: data.tcId,
        tcNumber: data.tcNumber,
        verificationCode: data.verificationCode
      });

      showToast(`Transfer Certificate #${data.tcNumber} issued successfully!`, 'success');

      // Trigger high-res official CBSE PDF download
      await downloadOfficialTcPDF(data.tcNumber, data.verificationCode);
    } catch (err: any) {
      showToast(err.message || 'Error generating TC', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleConvertToAlumni = async () => {
    if (!selectedStudent) return;
    try {
      setConvertingToAlumni(true);
      const res = await fetch('/api/lifecycle/alumni/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          currentOrganization: formData.promotionStatus || 'Higher Studies',
          notes: `TC Issued: ${generatedTc?.tcNumber || 'N/A'}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to convert to Alumni');

      showToast('Student transitioned to Alumni directory!', 'success');
      setAlumniConverted(true);
    } catch (err: any) {
      showToast(err.message || 'Error converting to Alumni', 'error');
    } finally {
      setConvertingToAlumni(false);
    }
  };

  const downloadOfficialTcPDF = async (tcNum: string, verifyCode: string) => {
    if (!selectedStudent) return;

    try {
      showToast('Generating official CBSE Transfer Certificate...', 'info');
      const verifyUrl = `${window.location.origin}/api/lifecycle/public/verify/${verifyCode}`;
      const qrData = await QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;

      // Outer & Inner Decorative Borders
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(1.2);
      doc.rect(7, 7, pageWidth - 14, pageHeight - 14);

      doc.setDrawColor(180, 83, 9);
      doc.setLineWidth(0.5);
      doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text('VIVEKANANDA VIDYA PEETH SENIOR SECONDARY SCHOOL', pageWidth / 2, 22, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('(Affiliated to Central Board of Secondary Education, New Delhi)', pageWidth / 2, 27, { align: 'center' });
      doc.text('CBSE Affiliation No.: 1030456 | School Code: 50421', pageWidth / 2, 31, { align: 'center' });
      doc.text('Sector 4, Institutional Area, Knowledge Park | Phone: +91 11 2654 8900', pageWidth / 2, 35, { align: 'center' });

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(15, 38, pageWidth - 15, 38);

      // Title Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(pageWidth / 2 - 45, 41, 90, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('TRANSFER CERTIFICATE', pageWidth / 2, 46.5, { align: 'center' });

      // TC Number & Admission Number bar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`TC No.: ${tcNum}`, 16, 56);
      doc.text(`Admission No.: ${selectedStudent.admission_number}`, pageWidth / 2, 56, { align: 'center' });
      doc.text(`Date of Issue: ${formData.issueDate}`, pageWidth - 16, 56, { align: 'right' });

      // 20 CBSE Formatted Items
      const items = [
        ['1. Name of Student', `${selectedStudent.first_name} ${selectedStudent.last_name}`.toUpperCase()],
        ["2. Father's / Guardian's Name", formData.fatherName],
        ["3. Mother's Name", formData.motherName],
        ['4. Nationality', formData.nationality],
        ['5. Whether student belongs to SC / ST / OBC / General', formData.category],
        ['6. Date of First Admission in School with Class', `${formData.admissionDate} in ${formData.admissionClass}`],
        ['7. Date of Birth according to Admission Register (in figures)', formData.dobFigures],
        ['   (in words)', formData.dobWords],
        ['8. Class in which student last studied (in figures & words)', `${formData.lastClassFigures} (${formData.lastClassWords})`],
        ['9. School / Board Annual Examination last taken with result', formData.boardExamResult],
        ['10. Whether failed, if so once / twice in same class', formData.failedStatus],
        ['11. Subjects Studied', formData.subjectsStudied],
        ['12. Whether qualified for promotion to higher class', formData.promotionStatus],
        ['13. Month up to which school dues paid', formData.duesPaidMonth],
        ['14. Total number of working days in academic session', `${formData.workingDays} Days`],
        ['15. Total number of working days student present', `${formData.presentDays} Days (${Math.round((formData.presentDays / formData.workingDays) * 100)}% Attendance)`],
        ['16. General Conduct', formData.conduct],
        ['17. Date of Application for Certificate', formData.applicationDate],
        ['18. Date of Issue of Certificate', formData.issueDate],
        ['19. Reasons for Leaving the School', formData.leavingReason],
        ['20. Any other remarks', formData.remarks]
      ];

      let yPos = 65;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      items.forEach(([label, value]) => {
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text(label, 16, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        const splitVal = doc.splitTextToSize(`:  ${value}`, 115);
        doc.text(splitVal, 82, yPos);

        yPos += Math.max(splitVal.length * 4.5, 6);
      });

      // Verification QR Code
      doc.addImage(qrData, 'PNG', 16, pageHeight - 48, 26, 26);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan QR to verify authenticity', 16, pageHeight - 19);
      doc.text(`Ref: ${verifyCode.slice(0, 12)}...`, 16, pageHeight - 16);

      // Signatures
      doc.line(75, pageHeight - 28, 120, pageHeight - 28);
      doc.text('Class Teacher Signature', 97.5, pageHeight - 24, { align: 'center' });

      doc.line(pageWidth - 65, pageHeight - 28, pageWidth - 16, pageHeight - 28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Dr. Rajesh Sharma', pageWidth - 40, pageHeight - 23, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Principal & Head of Institution', pageWidth - 40, pageHeight - 19, { align: 'center' });
      doc.text('(School Seal)', pageWidth - 40, pageHeight - 15, { align: 'center' });

      doc.save(`Transfer_Certificate_${selectedStudent.admission_number}.pdf`);
      showToast('Transfer Certificate downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('Error generating TC PDF:', err);
      showToast('Failed to generate PDF', 'error');
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      s.admission_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <FileCheck2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Exit Formalities</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Transfer Certificate (TC) & SLC Generator</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            CBSE / State-compliant 20-point certificate format with cryptographic verification & alumni transition.
          </p>
        </div>

        {generatedTc && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVerifyToken(generatedTc.verificationCode)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2 border border-slate-200 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verify TC #{generatedTc.tcNumber}</span>
            </button>
            <button
              type="button"
              onClick={() => downloadOfficialTcPDF(generatedTc.tcNumber, generatedTc.verificationCode)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Official PDF</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Selector & Clearance Inspector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Student for TC Issuance
            </h3>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or admission #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {loadingStudents ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading students...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No students found</div>
              ) : (
                filteredStudents.map((s) => {
                  const isSelected = selectedStudent?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      className={`p-3 text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {s.first_name} {s.last_name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            s.student_status === 'WITHDRAWN'
                              ? 'bg-amber-100 text-amber-800'
                              : s.student_status === 'TC_ISSUED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.student_status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                        <span>Adm: #{s.admission_number}</span>
                        <span>•</span>
                        <span>{s.class_name || 'Class'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Clearance Status Card */}
          {selectedStudent && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Departmental Clearance Status
              </h4>

              {clearanceStatus.allCleared ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All 6 departments cleared or authorized. Ready for TC.</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-800">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{clearanceStatus.pendingCount} Clearance(s) Pending</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Accounts/Dues balance: ₹{clearanceStatus.duesTotal}. You may still proceed with an administrative override.
                  </p>
                </div>
              )}

              {/* Alumni Conversion Button if TC Issued */}
              {(selectedStudent.student_status === 'TC_ISSUED' || generatedTc) && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleConvertToAlumni}
                    disabled={convertingToAlumni || alumniConverted || selectedStudent.student_status === 'ALUMNI'}
                    className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>
                      {alumniConverted || selectedStudent.student_status === 'ALUMNI'
                        ? 'Enrolled in Alumni Registry'
                        : convertingToAlumni
                        ? 'Converting...'
                        : 'Transfer to Alumni Directory'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: 20-Point CBSE TC Form */}
        <div className="lg:col-span-8">
          {selectedStudent ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    CBSE 20-Point Transfer Certificate Information
                  </h3>
                  <p className="text-xs text-slate-500">
                    Drafting official certificate for {selectedStudent.first_name} {selectedStudent.last_name} (#{selectedStudent.admission_number})
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[11px] font-bold">
                  CBSE / State Format
                </span>
              </div>

              <form onSubmit={handleGenerateTC} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Father's Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      2. Father's / Guardian's Name *
                    </label>
                    <input
                      type="text"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Mother's Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      3. Mother's Name *
                    </label>
                    <input
                      type="text"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Nationality & Category */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      4. Nationality
                    </label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      5. Caste / Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </select>
                  </div>

                  {/* Date of Birth Figures and Words */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      7a. Date of Birth (Figures)
                    </label>
                    <input
                      type="date"
                      value={formData.dobFigures}
                      onChange={(e) => setFormData({ ...formData, dobFigures: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      7b. Date of Birth (In Words)
                    </label>
                    <input
                      type="text"
                      value={formData.dobWords}
                      onChange={(e) => setFormData({ ...formData, dobWords: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Class Last Studied */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      8. Class Last Studied
                    </label>
                    <input
                      type="text"
                      value={formData.lastClassFigures}
                      onChange={(e) => setFormData({ ...formData, lastClassFigures: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      9. Examination Result
                    </label>
                    <input
                      type="text"
                      value={formData.boardExamResult}
                      onChange={(e) => setFormData({ ...formData, boardExamResult: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Subjects Studied */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    11. Subjects Studied *
                  </label>
                  <input
                    type="text"
                    value={formData.subjectsStudied}
                    onChange={(e) => setFormData({ ...formData, subjectsStudied: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      12. Qualified for Promotion
                    </label>
                    <input
                      type="text"
                      value={formData.promotionStatus}
                      onChange={(e) => setFormData({ ...formData, promotionStatus: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      13. Dues Paid Up To
                    </label>
                    <input
                      type="text"
                      value={formData.duesPaidMonth}
                      onChange={(e) => setFormData({ ...formData, duesPaidMonth: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      16. General Conduct
                    </label>
                    <input
                      type="text"
                      value={formData.conduct}
                      onChange={(e) => setFormData({ ...formData, conduct: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      14. Total Working Days
                    </label>
                    <input
                      type="number"
                      value={formData.workingDays}
                      onChange={(e) => setFormData({ ...formData, workingDays: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      15. Days Present
                    </label>
                    <input
                      type="number"
                      value={formData.presentDays}
                      onChange={(e) => setFormData({ ...formData, presentDays: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    19. Reason for Leaving School *
                  </label>
                  <input
                    type="text"
                    value={formData.leavingReason}
                    onChange={(e) => setFormData({ ...formData, leavingReason: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    20. Remarks
                  </label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{generating ? 'Issuing TC...' : 'Issue TC & Download Official PDF'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400">
              <FileCheck2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No student selected</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Please select a student from the left panel to inspect their departmental clearances and draft their CBSE Transfer Certificate.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Public QR Verifier Modal */}
      {verifyToken !== null && (
        <PublicCertificateVerificationModal
          initialCode={verifyToken}
          isOpen={true}
          onClose={() => setVerifyToken(null)}
        />
      )}
    </div>
  );
};
