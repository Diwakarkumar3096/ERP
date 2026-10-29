import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  RefreshCw,
  Send,
  Award,
  ArrowRight
} from 'lucide-react';

interface ServiceRequestsProps {
  schoolId?: string;
  onGenerateFromRequest?: (reqItem: any) => void;
}

export const ServiceRequestsView: React.FC<ServiceRequestsProps> = ({
  schoolId,
  onGenerateFromRequest
}) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Request Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [requestType, setRequestType] = useState('BONAFIDE');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status Modal
  const [selectedReqForReview, setSelectedReqForReview] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const sParam = schoolId ? `?schoolId=${schoolId}` : '';
      const res = await fetch(`/api/lifecycle/service-requests${sParam}`);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('[FETCH SERVICE REQUESTS ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetch(`/api/students${schoolId ? `?schoolId=${schoolId}` : ''}`)
      .then((r) => r.json())
      .then((d) => setAllStudents(d.students || []))
      .catch((err) => console.error(err));
  }, [schoolId]);

  // Submit Request
  const handleSubmitRequest = async () => {
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/lifecycle/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          requestType,
          purpose,
          notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Service Request ${data.requestNumber} registered successfully!`);
      setIsNewModalOpen(false);
      setSelectedStudent(null);
      setPurpose('');
      setNotes('');
      fetchRequests();
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (id: string, status: string, rejReason?: string) => {
    try {
      await fetch(`/api/lifecycle/service-requests/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason: rejReason })
      });
      setSelectedReqForReview(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & NEW REQUEST ACTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Online Student Service &amp; Certificate Request Intake Center
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Service requests submitted by parents, students, and administration for Bonafide, Character, and Leaving certificates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchRequests}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Submit Service Request
            </button>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Req Number</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Certificate Type</th>
                <th className="py-2.5 px-3">Purpose</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    No active service requests recorded. Click &quot;Submit Service Request&quot; to file an application.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-800">{r.request_number}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {r.first_name} {r.last_name}
                      <span className="block font-mono text-[10px] text-slate-400">{r.admission_number}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{r.class_name}-{r.section_name}</td>
                    <td className="py-2.5 px-3 font-medium text-indigo-700">{r.request_type.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate">{r.purpose || 'General Academic Verification'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === 'ISSUED' ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'APPROVED' ? 'bg-blue-100 text-blue-800'
                          : r.status === 'REJECTED' ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {r.status === 'SUBMITTED' && (
                          <button
                            type="button"
                            onClick={() => setSelectedReqForReview(r)}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            Review
                          </button>
                        )}
                        {r.status === 'APPROVED' && onGenerateFromRequest && (
                          <button
                            type="button"
                            onClick={() => onGenerateFromRequest(r)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                          >
                            <Award className="w-3 h-3" />
                            Generate
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

      {/* REVIEW REQUEST MODAL */}
      {selectedReqForReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Review Student Service Request</h4>
              <button
                type="button"
                onClick={() => setSelectedReqForReview(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="text-slate-500 text-[11px]">Request Ref: <strong className="text-slate-800 font-mono">{selectedReqForReview.request_number}</strong></p>
                <p className="font-bold text-slate-900 text-sm">{selectedReqForReview.first_name} {selectedReqForReview.last_name}</p>
                <p className="text-slate-600">Type: <strong>{selectedReqForReview.request_type}</strong></p>
                <p className="text-slate-600">Purpose: {selectedReqForReview.purpose || 'Institutional Verification'}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rejection Remarks (Required if rejecting)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Incomplete details, outstanding dues..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                ></textarea>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedReqForReview.id, 'APPROVED')}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
              >
                Approve Request
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedReqForReview.id, 'REJECTED', rejectionReason)}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW REQUEST MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Submit Student Service Request</h4>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
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
                      placeholder="Search active student..."
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
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Requested Service / Certificate *</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-white"
                >
                  <option value="BONAFIDE">Bonafide Certificate</option>
                  <option value="CHARACTER">Character &amp; Conduct Certificate</option>
                  <option value="STUDY">Study &amp; Course Enrollment Certificate</option>
                  <option value="FEE">Fee Clearance Certificate</option>
                  <option value="TRANSFER_CERTIFICATE">Transfer Certificate (TC)</option>
                  <option value="SCHOOL_LEAVING_CERTIFICATE">School Leaving Certificate</option>
                  <option value="DUPLICATE_TC">Duplicate Transfer Certificate</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purpose / Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Passport application, higher education admission..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions or required attachments..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                ></textarea>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={submitting || !selectedStudent || !purpose.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
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
