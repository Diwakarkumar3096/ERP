import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, Search, ExternalLink, X, Building2, Calendar, User, FileText } from 'lucide-react';

interface PublicCertificateVerificationModalProps {
  initialCode?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface VerificationResult {
  found: boolean;
  status: 'VALID' | 'REVOKED' | 'NOT_FOUND' | string;
  message?: string;
  certificate?: {
    certificateNumber: string;
    certificateType: string;
    title: string;
    issueDate: string;
    schoolName: string;
    schoolCode: string;
    board?: string;
    affiliationNo?: string;
    studentName: string;
    admissionNumber: string;
    className?: string;
    sessionName?: string;
    signatoryTitle?: string;
  };
  verifiedAt?: string;
}

export const PublicCertificateVerificationModal: React.FC<PublicCertificateVerificationModalProps> = ({
  initialCode = '',
  isOpen,
  onClose
}) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      verifyCode(initialCode);
    } else {
      setResult(null);
      setError(null);
    }
  }, [initialCode, isOpen]);

  const verifyCode = async (tokenToVerify?: string) => {
    const targetCode = (tokenToVerify !== undefined ? tokenToVerify : code).trim();
    if (!targetCode) {
      setError('Please enter a valid certificate verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Intentionally public endpoint without Authorization header
      const res = await fetch(`/api/lifecycle/public/verify/${encodeURIComponent(targetCode)}`);
      const data = await res.json();
      if (!res.ok && res.status !== 404) {
        throw new Error(data.error || 'Verification query failed');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to verification server');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Public Certificate Verification</h3>
              <p className="text-xs text-slate-300">Cryptographically verifiable student credential registry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Search Input Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Certificate Verification Token / QR Code Hash
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. 7f9a12c4b8e390..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => verifyCode()}
                disabled={loading || !code.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {loading ? 'Checking...' : 'Verify Now'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Public verification exposes only un-sensitive academic facts. Private financial dues, parent contacts, and home addresses are never exposed.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div>
              {result.found && result.status === 'VALID' && result.certificate && (
                <div className="bg-emerald-50/60 border-2 border-emerald-500/40 rounded-xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white tracking-wide uppercase">
                        Authentic & Valid Document
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-1">
                        {result.certificate.title}
                      </h4>
                      <p className="text-xs text-slate-600 font-mono mt-0.5">
                        Ref: {result.certificate.certificateNumber}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-200/60 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Issuing Institution</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {result.certificate.schoolName}
                      </p>
                      {result.certificate.affiliationNo && (
                        <p className="text-[11px] text-slate-500 font-mono">Affil. No: {result.certificate.affiliationNo}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Date of Issue</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(result.certificate.issueDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Student Name (Masked)</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {result.certificate.studentName}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">Adm: {result.certificate.admissionNumber}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Academic Level</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        {result.certificate.className || 'General'}
                      </p>
                      {result.certificate.sessionName && (
                        <p className="text-[11px] text-slate-500">{result.certificate.sessionName}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-emerald-100/60 rounded-lg p-2.5 text-[11px] text-emerald-900 flex items-center justify-between">
                    <span>Authorized by: <strong>{result.certificate.signatoryTitle || 'Principal'}</strong></span>
                    <span className="text-[10px] text-emerald-700">Verified at {new Date(result.verifiedAt || '').toLocaleTimeString()}</span>
                  </div>
                </div>
              )}

              {result.found && result.status === 'REVOKED' && (
                <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white tracking-wide uppercase">
                        Certificate Revoked / Cancelled
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-1">
                        {result.certificate?.title || 'Certificate'}
                      </h4>
                      <p className="text-xs text-rose-700 font-mono">
                        Ref: {result.certificate?.certificateNumber}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 bg-white/70 p-3 rounded-lg border border-rose-200">
                    This certificate was officially <strong>REVOKED</strong> by school administration and is no longer valid for any administrative or academic purpose.
                  </p>
                </div>
              )}

              {!result.found && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Certificate Not Found</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    {result.message || 'No official document was found matching this code. Please inspect the original QR code or contact the school administration office directly.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
