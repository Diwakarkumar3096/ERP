import React, { useState } from 'react';
import {
  GitCommit,
  ArrowUpRight,
  UserMinus,
  FolderLock,
  FileCheck2,
  Award,
  Scroll,
  GraduationCap,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { LifecycleTabButton } from './LifecycleCommon.js';
import { LifecycleDashboardView } from './LifecycleDashboardView.js';
import { PromotionManagementView } from './PromotionManagementView.js';
import { WithdrawalAndClearanceView } from './WithdrawalAndClearanceView.js';
import { DocumentVaultView } from './DocumentVaultView.js';
import { ServiceRequestsView } from './ServiceRequestsView.js';
import { CertificateManagementView } from './CertificateManagementView.js';
import { TransferCertificateView } from './TransferCertificateView.js';
import { AlumniDirectoryView } from './AlumniDirectoryView.js';
import { PublicCertificateVerificationModal } from './PublicCertificateVerificationModal.js';

export type LifecycleSubTab =
  | 'dashboard'
  | 'promotions'
  | 'withdrawals'
  | 'documents'
  | 'service_requests'
  | 'certificates'
  | 'tc'
  | 'alumni';

export const StudentLifecycleView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LifecycleSubTab>('dashboard');
  const [isPublicVerifyOpen, setIsPublicVerifyOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-sm shadow-sm">
                <GitCommit className="w-4 h-4" />
              </span>
              <span>Student Lifecycle, Document Vault & Certificates</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Phase 18: Holistic lifecycle progression from admission to alumni, clearance workflows & CBSE-compliant TC engine.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsPublicVerifyOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors border border-slate-200"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Public Certificate Verifier</span>
          </button>
        </div>

        {/* Tab Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <LifecycleTabButton
            id="dashboard"
            label="Lifecycle Hub"
            icon={<LayoutDashboard className="w-4 h-4" />}
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <LifecycleTabButton
            id="promotions"
            label="Promotions & Transfers"
            icon={<ArrowUpRight className="w-4 h-4" />}
            active={activeTab === 'promotions'}
            onClick={() => setActiveTab('promotions')}
          />
          <LifecycleTabButton
            id="withdrawals"
            label="Withdrawal & Clearances"
            icon={<UserMinus className="w-4 h-4" />}
            active={activeTab === 'withdrawals'}
            onClick={() => setActiveTab('withdrawals')}
          />
          <LifecycleTabButton
            id="documents"
            label="Document Vault"
            icon={<FolderLock className="w-4 h-4" />}
            active={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
          />
          <LifecycleTabButton
            id="service_requests"
            label="Service Requests"
            icon={<FileCheck2 className="w-4 h-4" />}
            active={activeTab === 'service_requests'}
            onClick={() => setActiveTab('service_requests')}
          />
          <LifecycleTabButton
            id="certificates"
            label="Certificate Registry"
            icon={<Award className="w-4 h-4" />}
            active={activeTab === 'certificates'}
            onClick={() => setActiveTab('certificates')}
          />
          <LifecycleTabButton
            id="tc"
            label="Transfer Certificate (TC)"
            icon={<Scroll className="w-4 h-4" />}
            active={activeTab === 'tc'}
            onClick={() => setActiveTab('tc')}
          />
          <LifecycleTabButton
            id="alumni"
            label="Alumni Directory"
            icon={<GraduationCap className="w-4 h-4" />}
            active={activeTab === 'alumni'}
            onClick={() => setActiveTab('alumni')}
          />
        </div>
      </div>

      {/* Render Active Sub-View */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && (
          <LifecycleDashboardView onNavigateSubTab={(tab) => setActiveTab(tab as LifecycleSubTab)} />
        )}
        {activeTab === 'promotions' && <PromotionManagementView />}
        {activeTab === 'withdrawals' && <WithdrawalAndClearanceView />}
        {activeTab === 'documents' && <DocumentVaultView />}
        {activeTab === 'service_requests' && <ServiceRequestsView />}
        {activeTab === 'certificates' && <CertificateManagementView />}
        {activeTab === 'tc' && <TransferCertificateView />}
        {activeTab === 'alumni' && <AlumniDirectoryView />}
      </div>

      {/* Public QR Code Verifier Modal */}
      <PublicCertificateVerificationModal
        isOpen={isPublicVerifyOpen}
        onClose={() => setIsPublicVerifyOpen(false)}
      />
    </div>
  );
};
