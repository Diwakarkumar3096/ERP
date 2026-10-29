import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import {
  Award,
  Search,
  Filter,
  Plus,
  FileText,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  QrCode,
  Ban,
  Printer,
  Sparkles
} from 'lucide-react';
import { PublicCertificateVerificationModal } from './PublicCertificateVerificationModal.js';

interface Certificate {
  id: string;
  certificate_number: string;
  verification_code: string;
  school_id: string;
  student_id: string;
  service_request_id?: string;
  certificate_type: string;
  title: string;
  issue_date: string;
  signatory_name: string;
  signatory_title: string;
  status: 'VALID' | 'REVOKED';
  revocation_reason?: string;
  revoked_by?: string;
  revoked_at?: string;
  custom_fields?: any;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  section_name?: string;
  school_name?: string;
  school_code?: string;
  session_name?: string;
}

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  section_name?: string;
  school_id: string;
}

export const CertificateManagementView: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Issue Certificate Modal state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [certType, setCertType] = useState('BONAFIDE');
  const [purpose, setPurpose] = useState('Passport Application / Verification');
  const [conduct, setConduct] = useState('Good & Exemplary');
  const [submitting, setSubmitting] = useState(false);

  // View Certificate Modal state
  const [viewingCert, setViewingCert] = useState<Certificate | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Revoke Modal state
  const [revokingCert, setRevokingCert] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Public QR Verifier Modal state
  const [verifyToken, setVerifyToken] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, [user]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/lifecycle/certificates');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch certificates');
      setCertificates(data.certificates || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading certificates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (query = '') => {
    try {
      const res = await fetch(`/api/students?status=ACTIVE&search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const handleOpenIssueModal = () => {
    setIsIssueModalOpen(true);
    setSelectedStudent(null);
    setStudentSearch('');
    setCertType('BONAFIDE');
    setPurpose('Passport Application / Verification');
    setConduct('Good & Exemplary');
    loadStudents();
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('Please select a student', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        studentId: selectedStudent.id,
        certificateType: certType,
        customFields: {
          purpose,
          conduct,
          academicStanding: 'Satisfactory',
          issuePlace: 'School Administrative Office'
        }
      };

      const res = await fetch('/api/lifecycle/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue certificate');

      showToast(`Certificate #${data.certificateNumber} generated successfully!`, 'success');
      setIsIssueModalOpen(false);
      await fetchCertificates();

      // Trigger automatic high-res PDF generation
      const fullRes = await fetch(`/api/lifecycle/certificates?studentId=${selectedStudent.id}`);
      const fullData = await fullRes.json();
      const created = fullData.certificates?.find((c: Certificate) => c.certificate_number === data.certificateNumber);
      if (created) {
        downloadCertificatePdf(created);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate certificate', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingCert) return;
    if (!revokeReason.trim()) {
      showToast('Revocation reason is required', 'error');
      return;
    }

    try {
      setRevoking(true);
      const res = await fetch(`/api/lifecycle/certificates/${revokingCert.id}/revoke`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke certificate');

      showToast('Certificate successfully revoked', 'success');
      setRevokingCert(null);
      setRevokeReason('');
      fetchCertificates();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke certificate', 'error');
    } finally {
      setRevoking(false);
    }
  };

  const openCertificateView = async (cert: Certificate) => {
    setViewingCert(cert);
    try {
      const verifyUrl = `${window.location.origin}/api/lifecycle/public/verify/${cert.verification_code}`;
      const url = await QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR preview:', err);
    }
  };

  const downloadCertificatePdf = async (cert: Certificate) => {
    try {
      showToast('Generating official PDF certificate...', 'info');
      const verifyUrl = `${window.location.origin}/api/lifecycle/public/verify/${cert.verification_code}`;
      const qrImage = await QRCode.toDataURL(verifyUrl, { width: 160, margin: 1 });

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 297;
      const pageHeight = 210;

      // Decorative Dual Borders (Navy and Gold)
      doc.setDrawColor(30, 41, 59); // Slate-800
      doc.setLineWidth(1.5);
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

      doc.setDrawColor(217, 119, 6); // Amber-600 gold accent
      doc.setLineWidth(0.6);
      doc.rect(11, 11, pageWidth - 22, pageHeight - 22);

      // School Letterhead Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // Slate-900
      const schoolTitle = (cert.school_name || 'VIVEKANANDA VIDYA PEETH').toUpperCase();
      doc.text(schoolTitle, pageWidth / 2, 28, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('Affiliated to CBSE, New Delhi | Affiliation No: 1030456 | School Code: 50421', pageWidth / 2, 35, { align: 'center' });
      doc.text('Sector 4, Institutional Area, Knowledge Park | Phone: +91 11 2654 8900 | info@schoolerp.edu', pageWidth / 2, 40, { align: 'center' });

      // Divider line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(20, 44, pageWidth - 20, 44);

      // Certificate Title Ribbon
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(pageWidth / 2 - 70, 48, 140, 11, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text((cert.title || 'BONAFIDE CERTIFICATE').toUpperCase(), pageWidth / 2, 55.5, { align: 'center' });

      // Certificate Meta (Number and Date)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`Certificate No: ${cert.certificate_number}`, 22, 67);
      doc.text(`Issue Date: ${new Date(cert.issue_date).toLocaleDateString(undefined, { dateStyle: 'long' })}`, pageWidth - 22, 67, { align: 'right' });

      // Body Paragraph
      doc.setFont('times', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);

      const fullName = `${cert.first_name} ${cert.last_name}`;
      const admNo = cert.admission_number || 'N/A';
      const className = cert.class_name || 'General';
      const secName = cert.section_name ? ` (Section ${cert.section_name})` : '';
      const session = cert.session_name || '2025-2026';
      const purposeText = cert.custom_fields?.purpose || 'General Academic Purposes';
      const conductText = cert.custom_fields?.conduct || 'Good';

      const line1 = `This is to certify that Master / Kum. ${fullName}, bearing Admission Number ${admNo}, is a bonafide student of this institution, currently enrolled in Class ${className}${secName} for the Academic Session ${session}.`;
      const line2 = `According to our school records, his / her date of birth is recorded and verified upon admission. His / her general conduct and progress in studies have been found ${conductText}.`;
      const line3 = `This certificate is issued on the specific request of the student / parent for the purpose of: "${purposeText}".`;

      const splitLine1 = doc.splitTextToSize(line1, pageWidth - 44);
      const splitLine2 = doc.splitTextToSize(line2, pageWidth - 44);
      const splitLine3 = doc.splitTextToSize(line3, pageWidth - 44);

      let currentY = 82;
      doc.text(splitLine1, 22, currentY);
      currentY += splitLine1.length * 7 + 4;
      doc.text(splitLine2, 22, currentY);
      currentY += splitLine2.length * 7 + 4;
      doc.text(splitLine3, 22, currentY);

      // Status watermark if revoked
      if (cert.status === 'REVOKED') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(45);
        doc.setTextColor(239, 68, 68);
        doc.text('REVOKED - INVALID', pageWidth / 2, 125, { align: 'center', angle: 20 });
      }

      // QR Code Box for Verification
      doc.addImage(qrImage, 'PNG', 24, pageHeight - 55, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan with any mobile camera', 24, pageHeight - 21);
      doc.text('to verify official authenticity', 24, pageHeight - 18);
      doc.setFont('courier', 'normal');
      doc.text(`Hash: ${cert.verification_code.slice(0, 16)}...`, 24, pageHeight - 15);

      // Signatures
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);

      // Prepared By
      doc.line(110, pageHeight - 30, 160, pageHeight - 30);
      doc.text('Prepared & Checked By', 135, pageHeight - 25, { align: 'center' });
      doc.setFontSize(8.5);
      doc.text('Office Superintendent', 135, pageHeight - 21, { align: 'center' });

      // Principal Signature
      doc.line(pageWidth - 75, pageHeight - 30, pageWidth - 25, pageHeight - 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(cert.signatory_name || 'Dr. Rajesh Sharma', pageWidth - 50, pageHeight - 25, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(cert.signatory_title || 'Principal & Head of Institution', pageWidth - 50, pageHeight - 21, { align: 'center' });

      // Save PDF
      doc.save(`${cert.certificate_number}_${cert.first_name}.pdf`);
      showToast('Certificate PDF downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      showToast('Failed to generate PDF certificate', 'error');
    }
  };

  const filteredCertificates = certificates.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      c.certificate_number.toLowerCase().includes(q) ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.admission_number?.toLowerCase().includes(q);

    const matchType = selectedType === 'ALL' || c.certificate_type === selectedType;
    const matchStatus = selectedStatus === 'ALL' || c.status === selectedStatus;

    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Award className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Credential Engine</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Certificate Registry & Issuance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Collision-safe unique numbering, CBSE/State formatting, cryptographic QR codes & instant PDF download.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setVerifyToken('')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2 transition-colors border border-slate-200"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Test Public QR Verifier</span>
          </button>

          <button
            type="button"
            onClick={handleOpenIssueModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Certificate</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student, admission #, cert #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Type:</span>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Types</option>
            <option value="BONAFIDE">Bonafide Certificate</option>
            <option value="CHARACTER">Character Certificate</option>
            <option value="STUDY">Study Certificate</option>
            <option value="FEE">Fee Clearance Certificate</option>
            <option value="TRANSFER_CERTIFICATE">Transfer Certificate</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="VALID">Valid</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Certificate Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Certificate #</th>
                <th className="py-3.5 px-4">Student Details</th>
                <th className="py-3.5 px-4">Certificate Type</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">QR Code</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading certificate registry...
                  </td>
                </tr>
              ) : filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No certificates found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {cert.certificate_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {cert.first_name} {cert.last_name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span>Adm: {cert.admission_number}</span>
                        <span>•</span>
                        <span>{cert.class_name || 'Class N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {cert.title || cert.certificate_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(cert.issue_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="py-3.5 px-4">
                      {cert.status === 'VALID' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200" title={cert.revocation_reason}>
                          <XCircle className="w-3 h-3 text-rose-500" />
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setVerifyToken(cert.verification_code)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        title="View Public Verification"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Verify</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openCertificateView(cert)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Preview Certificate"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadCertificatePdf(cert)}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Download Official PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {cert.status === 'VALID' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRevokingCert(cert);
                              setRevokeReason('');
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Revoke Certificate"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ISSUE CERTIFICATE MODAL */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Issue Official Student Certificate</h3>
                  <p className="text-xs text-slate-400">Generates unique number, QR code & downloadable PDF</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Student Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Student *
                </label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {selectedStudent.first_name} {selectedStudent.last_name}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Admission #{selectedStudent.admission_number} • {selectedStudent.class_name || 'Class N/A'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Type student name or admission number to search..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        loadStudents(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                    />
                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50">
                      {students.slice(0, 8).map((stu) => (
                        <div
                          key={stu.id}
                          onClick={() => setSelectedStudent(stu)}
                          className="p-2.5 text-xs hover:bg-indigo-50 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{stu.first_name} {stu.last_name}</span>
                            <span className="text-slate-400 ml-2 font-mono text-[11px]">#{stu.admission_number}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">{stu.class_name || 'Class'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Certificate Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Certificate Template *
                  </label>
                  <select
                    value={certType}
                    onChange={(e) => setCertType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="BONAFIDE">Bonafide Certificate</option>
                    <option value="CHARACTER">Character & Conduct Certificate</option>
                    <option value="STUDY">Study & Enrollment Certificate</option>
                    <option value="FEE">Fee Clearance Certificate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    General Conduct / Standing
                  </label>
                  <input
                    type="text"
                    value={conduct}
                    onChange={(e) => setConduct(e.target.value)}
                    placeholder="e.g. Good & Exemplary"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Purpose / Stated Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose / Intended Use *
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Passport Application / Visa / Bank Account Opening"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  The certificate will be assigned an immutable registry number and cryptographic hash. A high-resolution PDF will download immediately upon issuance.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedStudent}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Generating...' : 'Issue & Download PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW CERTIFICATE MODAL */}
      {viewingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base">{viewingCert.title}</h3>
                  <p className="text-xs text-slate-400 font-mono">#{viewingCert.certificate_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadCertificatePdf(viewingCert)}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCert(null)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto bg-slate-50 flex justify-center">
              {/* Paper Certificate Layout */}
              <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-md border-4 border-slate-800 relative space-y-6">
                <div className="border border-amber-600 p-6 rounded-lg space-y-4">
                  {/* Header */}
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide">
                      {viewingCert.school_name || 'VIVEKANANDA VIDYA PEETH'}
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Affiliated to CBSE, New Delhi | Affiliation No: 1030456
                    </p>
                    <div className="h-0.5 w-32 bg-amber-600 mx-auto mt-2"></div>
                  </div>

                  {/* Title */}
                  <div className="text-center pt-2">
                    <span className="inline-block px-4 py-1 rounded bg-slate-100 font-bold text-indigo-800 text-sm tracking-wider uppercase">
                      {viewingCert.title}
                    </span>
                  </div>

                  {/* Ref & Date */}
                  <div className="flex justify-between text-xs text-slate-600 font-semibold pt-1">
                    <span>No: <strong className="font-mono text-slate-900">{viewingCert.certificate_number}</strong></span>
                    <span>Date: <strong className="text-slate-900">{new Date(viewingCert.issue_date).toLocaleDateString()}</strong></span>
                  </div>

                  {/* Certificate Body */}
                  <div className="text-xs text-slate-800 leading-relaxed space-y-3 pt-2 font-serif">
                    <p>
                      This is to certify that <strong>{viewingCert.first_name} {viewingCert.last_name}</strong>,
                      bearing Admission Number <strong>#{viewingCert.admission_number}</strong>, is a bonafide student
                      of this institution studying in <strong>{viewingCert.class_name || 'Class'}</strong>
                      {viewingCert.section_name && ` (Section ${viewingCert.section_name})`} for the academic year {viewingCert.session_name || '2025-2026'}.
                    </p>
                    <p>
                      His / Her general conduct and character during his / her tenure at the school has been recorded as <strong>{viewingCert.custom_fields?.conduct || 'Good'}</strong>.
                    </p>
                    <p>
                      This certificate is issued for the intended purpose of: <em>"{viewingCert.custom_fields?.purpose || 'General Records'}"</em>.
                    </p>
                  </div>

                  {/* Footer QR & Signatures */}
                  <div className="pt-6 flex items-end justify-between border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      {qrDataUrl && (
                        <img src={qrDataUrl} alt="Verification QR" className="w-16 h-16 border p-0.5 bg-white rounded" />
                      )}
                      <div className="text-[10px] text-slate-500">
                        <p className="font-bold text-slate-700">Scan to Verify Authenticity</p>
                        <p className="font-mono">Code: {viewingCert.verification_code.slice(0, 10)}...</p>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="w-32 border-b border-slate-400 mb-1"></div>
                      <p className="text-xs font-bold text-slate-900">{viewingCert.signatory_name || 'Dr. Rajesh Sharma'}</p>
                      <p className="text-[10px] text-slate-500">{viewingCert.signatory_title || 'Principal'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE CERTIFICATE MODAL */}
      {revokingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Ban className="w-5 h-5" />
                <h3 className="font-bold text-base">Revoke Certificate</h3>
              </div>
              <button
                type="button"
                onClick={() => setRevokingCert(null)}
                className="text-rose-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRevokeSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-600">
                  You are about to formally revoke certificate <strong>{revokingCert.certificate_number}</strong> issued to <strong>{revokingCert.first_name} {revokingCert.last_name}</strong>.
                </p>
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  Once revoked, any public QR scans will instantly show this certificate as invalid and cancelled.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Revocation Reason *
                </label>
                <textarea
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Discovered clerical error in spelling of student name / Issued in error / Replaced by new revision"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRevokingCert(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revoking || !revokeReason.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {revoking ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
