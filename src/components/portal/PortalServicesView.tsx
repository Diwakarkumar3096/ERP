import React, { useState, useEffect } from 'react';
import { ChildStudent } from './PortalCommon.js';
import { useToast } from '../common/Toast.js';
import {
  FileCheck2,
  FileText,
  Clock,
  IndianRupee,
  Plus,
  X,
  Send,
  Download,
  CheckCircle,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Building2,
  Sparkles
} from 'lucide-react';
import { PublicCertificateVerificationModal } from '../lifecycle/PublicCertificateVerificationModal.js';

interface PortalServicesViewProps {
  child: ChildStudent;
}

export const PortalServicesView: React.FC<PortalServicesViewProps> = ({ child }) => {
  const { showToast } = useToast();

  const [services, setServices] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Request modal state
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [purpose, setPurpose] = useState('Passport Application / Verification');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Public QR Verifier Modal
  const [verifyToken, setVerifyToken] = useState<string | null>(null);

  useEffect(() => {
    fetchServicesAndRequests();
  }, [child.id]);

  const fetchServicesAndRequests = async () => {
    try {
      setLoading(true);
      const [srvRes, reqRes] = await Promise.all([
        fetch(`/api/portal/services?schoolId=${child.school_id}`),
        fetch(`/api/portal/child-dashboard/${child.id}`)
      ]);

      const srvData = await srvRes.json();
      const reqData = await reqRes.json();

      setServices(srvData.services || []);
      setRequests(reqData.serviceRequests || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading services catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRequestModal = (service: any) => {
    setSelectedService(service);
    setPurpose(
      service.code === 'BONAFIDE'
        ? 'Passport Application / Verification'
        : service.code === 'CHARACTER'
        ? 'Higher Education / College Admissions'
        : service.code === 'ID_CARD_REISSUE'
        ? 'Physical wear and tear / lost smart identity card'
        : 'Official records submission'
    );
    setNotes('');
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/portal/services/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: child.id,
          serviceCode: selectedService.code,
          purpose: purpose.trim(),
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit service request');

      showToast(`Request #${data.requestNumber} submitted successfully!`, 'success');
      setSelectedService(null);
      fetchServicesAndRequests();
    } catch (err: any) {
      showToast(err.message || 'Submission error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <FileCheck2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Digital Services</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Online School Services & Certificates</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent institutional SLA tracking, collision-safe request numbering, and verifiable digital certificates.
          </p>
        </div>

        <div className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl self-start sm:self-auto">
          Active Student: {child.first_name} {child.last_name} (#{child.admission_number})
        </div>
      </div>

      {/* Services Catalog Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-900">Available Online School Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading catalog...</div>
          ) : services.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              No services currently enabled by school administration.
            </div>
          ) : (
            services.map((srv) => (
              <div
                key={srv.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {srv.category}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-800">
                      {Number(srv.fee_amount) > 0 ? `₹${Number(srv.fee_amount).toFixed(2)}` : 'FREE'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{srv.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{srv.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>SLA: {srv.sla_days || 2} Days</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenRequestModal(srv)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  >
                    Request Now
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Submitted Requests Tracking */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Your Submitted Service Requests</h3>
            <p className="text-[11px] text-slate-500">Track progress through institutional approval workflows</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{requests.length} Requests</span>
        </div>

        {requests.length === 0 ? (
          <p className="text-xs text-slate-400 p-8 text-center bg-slate-50 rounded-xl">
            You have not submitted any service requests yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => (
              <div key={req.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{req.request_type}</span>
                    <span className="font-mono text-slate-500 font-semibold text-[11px]">#{req.request_number}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Submitted: {new Date(req.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Fee: {Number(req.fee_amount) > 0 ? `₹${Number(req.fee_amount)}` : 'Nil'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      req.status === 'COMPLETED' || req.status === 'ISSUED' || req.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : req.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {req.status}
                  </span>

                  {req.verification_code && (
                    <button
                      type="button"
                      onClick={() => setVerifyToken(req.verification_code)}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Verify Certificate</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REQUEST MODAL */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Request {selectedService.title}</h3>
                <p className="text-xs text-slate-400">Standard SLA: {selectedService.sla_days} working days</p>
              </div>
              <button type="button" onClick={() => setSelectedService(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                <div>
                  <strong>Student:</strong> {child.first_name} {child.last_name} (#{child.admission_number})
                </div>
                <div className="font-bold font-mono">
                  {Number(selectedService.fee_amount) > 0 ? `Fee: ₹${selectedService.fee_amount}` : 'Fee: Nil'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose / Intended Application *
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Instructions / Remarks
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific instructions or urgent timeline notes..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
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
