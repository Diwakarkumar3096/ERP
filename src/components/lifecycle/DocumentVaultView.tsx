import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Upload,
  Download,
  Search,
  Filter,
  Check,
  X,
  FileText,
  Clock,
  ShieldCheck,
  Phone,
  RefreshCw
} from 'lucide-react';

interface DocumentVaultProps {
  schoolId?: string;
}

export const DocumentVaultView: React.FC<DocumentVaultProps> = ({
  schoolId
}) => {
  const [activeTab, setActiveTab] = useState<'archive' | 'missing'>('archive');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [documents, setDocuments] = useState<any[]>([]);
  const [missingList, setMissingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [docCategory, setDocCategory] = useState('IDENTITY');
  const [docType, setDocType] = useState('Birth Certificate');
  const [fileName, setFileName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);

  // Reject Modal State
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const sParam = schoolId ? `?schoolId=${schoolId}` : '';
      const [docRes, misRes] = await Promise.all([
        fetch(`/api/lifecycle/documents${sParam}`),
        fetch(`/api/lifecycle/documents/missing${sParam}`)
      ]);
      const docData = await docRes.json();
      const misData = await misRes.json();

      setDocuments(docData.documents || []);
      setMissingList(misData.missingDocuments || []);
    } catch (err) {
      console.error('[FETCH DOCUMENTS ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetch(`/api/students${schoolId ? `?schoolId=${schoolId}` : ''}`)
      .then((r) => r.json())
      .then((d) => setAllStudents(d.students || []))
      .catch((err) => console.error(err));
  }, [schoolId]);

  // Handle Verify Document
  const handleVerify = async (id: string) => {
    try {
      await fetch(`/api/lifecycle/documents/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VERIFIED' })
      });
      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Reject Document
  const handleConfirmReject = async () => {
    if (!rejectingDocId || !rejectionReason.trim()) return;
    try {
      await fetch(`/api/lifecycle/documents/${rejectingDocId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason })
      });
      setRejectingDocId(null);
      setRejectionReason('');
      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Upload
  const handleUploadDocument = async () => {
    if (!selectedStudent || !docType) return;
    setUploading(true);
    try {
      const res = await fetch('/api/lifecycle/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          documentCategory: docCategory,
          documentType: docType,
          fileName: fileName || `${selectedStudent.admission_number}_${docType.replace(/\s+/g, '_')}.pdf`,
          fileSize: 1048576,
          mimeType: 'application/pdf',
          fileData: 'data:application/pdf;base64,JVBERi0xLjQK...',
          expiryDate: expiryDate || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsUploadModalOpen(false);
      setSelectedStudent(null);
      setFileName('');
      fetchDocuments();
      alert('Document successfully uploaded to Digital Vault!');
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (categoryFilter !== 'ALL' && d.document_category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && d.verification_status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & VAULT ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-purple-600" />
              Digital Student Document Vault &amp; Verification
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure digital repository for student birth certificates, government IDs, previous TCs, and marksheets
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDocuments}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Tab Switcher & Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'archive'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Document Vault ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('missing')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'missing'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Missing Documents Monitor ({missingList.length})
            </button>
          </div>

          {activeTab === 'archive' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Categories</option>
                <option value="IDENTITY">Identity</option>
                <option value="ADMISSION">Admission</option>
                <option value="ACADEMIC">Academic</option>
                <option value="MEDICAL">Medical</option>
              </select>

              <span className="text-slate-500 font-medium ml-2">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Status</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          )}
        </div>

        {/* 2. VAULT REPOSITORY TABLE */}
        {activeTab === 'archive' ? (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Document Type</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Uploaded Date</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-400">
                      No documents match the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {doc.first_name} {doc.last_name}
                        <span className="block font-mono text-[10px] text-slate-400">{doc.admission_number} • Class {doc.class_name || ''}</span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {doc.document_type}
                        <span className="block font-mono text-[10px] text-slate-400 truncate max-w-[180px]">{doc.file_name}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {doc.document_category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">v{doc.version}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{new Date(doc.created_at).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.verification_status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700'
                            : doc.verification_status === 'REJECTED' ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {doc.verification_status}
                        </span>
                        {doc.rejection_reason && (
                          <span className="block text-[10px] text-rose-600 max-w-[140px] truncate mx-auto mt-0.5" title={doc.rejection_reason}>
                            {doc.rejection_reason}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {doc.verification_status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleVerify(doc.id)}
                                title="Approve & Verify"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingDocId(doc.id)}
                                title="Reject Document"
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => alert(`Simulating secure download for ${doc.file_name}`)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Download Document"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* 3. MISSING DOCUMENTS MONITOR TABLE */
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Missing Mandatory Documents</th>
                  <th className="py-2.5 px-3">Primary Guardian</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {missingList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-emerald-600 font-medium">
                      ✓ All enrolled students have full documentation verified!
                    </td>
                  </tr>
                ) : (
                  missingList.map((m) => (
                    <tr key={m.studentId} className="hover:bg-amber-50/20">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {m.studentName}
                        <span className="block font-mono text-[10px] text-slate-400">{m.admissionNumber}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{m.className}-{m.sectionName}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {m.missingDocuments.map((docName: string) => (
                            <span key={docName} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              {docName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-800 font-medium">{m.parentName}</span>
                        <span className="block font-mono text-[10px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {m.parentMobile}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudent({ id: m.studentId, admission_number: m.admissionNumber, first_name: m.studentName, last_name: '' });
                            setDocType(m.missingDocuments[0]);
                            setIsUploadModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          Upload Document
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectingDocId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Document Rejection Reason</h4>
            <p className="text-xs text-slate-500">Please provide a clear justification visible to the parent for replacement:</p>
            <textarea
              rows={3}
              placeholder="e.g. Image blurry, incomplete scan, missing seal..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-500"
            ></textarea>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Confirm Rejection
              </button>
              <button
                type="button"
                onClick={() => setRejectingDocId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Upload to Digital Document Vault</h4>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Student *</label>
                {!selectedStudent ? (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search active student by name or admission number..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                    />
                    {studentSearch && (
                      <div className="mt-1 border border-slate-200 rounded-lg max-h-36 overflow-y-auto bg-white shadow-md divide-y divide-slate-100">
                        {allStudents.filter((s) => `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 5).map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudent(s);
                              setStudentSearch('');
                            }}
                            className="w-full text-left p-2 hover:bg-slate-50 text-xs flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-900">{s.first_name} {s.last_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{s.admission_number}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{selectedStudent.admission_number}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-xs text-rose-600 font-semibold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Category</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="IDENTITY">Identity Documents</option>
                    <option value="ADMISSION">Admission Records</option>
                    <option value="ACADEMIC">Academic Marksheet</option>
                    <option value="MEDICAL">Medical Certificate</option>
                    <option value="SCHOOL">School Form</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Type *</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Birth Certificate">Birth Certificate</option>
                    <option value="Aadhaar Card Copy">Aadhaar Card</option>
                    <option value="Previous School TC">Previous School TC</option>
                    <option value="Migration Certificate">Migration Certificate</option>
                    <option value="Address Proof">Address Proof</option>
                    <option value="Caste Certificate">Caste/Category Certificate</option>
                    <option value="Medical Fitness Certificate">Medical Certificate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document File Name</label>
                <input
                  type="text"
                  placeholder="e.g. Birth_Certificate_Signed.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expiry Date (If Applicable)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleUploadDocument}
                disabled={uploading || !selectedStudent}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs"
              >
                {uploading ? 'Archiving...' : 'Upload Document'}
              </button>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
