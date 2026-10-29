import React, { useState, useEffect } from 'react';
import {
  ApprovalRequest,
  ApprovalDelegation,
  SafetyLevel,
  ApprovalStatus
} from './WorkflowCommon';

export const ApprovalCenterView: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [delegations, setDelegations] = useState<ApprovalDelegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [safetyFilter, setSafetyFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Decision Modal State
  const [activeRequest, setActiveRequest] = useState<ApprovalRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT' | 'CHANGES_REQUESTED'>('APPROVE');
  const [decisionComments, setDecisionComments] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Delegation Modal State
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [delegateUserId, setDelegateUserId] = useState('');
  const [delegateUserName, setDelegateUserName] = useState('');
  const [delegateModule, setDelegateModule] = useState('ALL');
  const [delegateStartDate, setDelegateStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [delegateEndDate, setDelegateEndDate] = useState('');
  const [delegateReason, setDelegateReason] = useState('');

  // Bulk Approve Modal/Feedback
  const [bulkFeedback, setBulkFeedback] = useState<any>(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      let url = `/api/workflow/approvals?status=${statusFilter}`;
      if (safetyFilter !== 'ALL') url += `&safety_level=${safetyFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setApprovals(data.approvals || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDelegations = async () => {
    try {
      const res = await fetch('/api/workflow/delegations');
      const data = await res.json();
      if (data.success) {
        setDelegations(data.delegations || []);
      }
    } catch (err) {
      console.error('Failed to fetch delegations:', err);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter, safetyFilter]);

  useEffect(() => {
    fetchDelegations();
  }, []);

  const handleOpenDecisionModal = (req: ApprovalRequest, action: 'APPROVE' | 'REJECT' | 'CHANGES_REQUESTED') => {
    setActiveRequest(req);
    setDecisionAction(action);
    setDecisionComments('');
    setDecisionError(null);
  };

  const handleSubmitDecision = async () => {
    if (!activeRequest) return;

    if ((decisionAction === 'REJECT' || decisionAction === 'CHANGES_REQUESTED') && !decisionComments.trim()) {
      setDecisionError('Mandatory justification comments are required for rejection or change requests.');
      return;
    }

    try {
      setSubmittingDecision(true);
      setDecisionError(null);

      const res = await fetch(`/api/workflow/approvals/${activeRequest.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: decisionAction,
          comments: decisionComments
        })
      });

      const data = await res.json();
      if (data.success) {
        setActiveRequest(null);
        fetchApprovals();
      } else {
        setDecisionError(data.error || 'Failed to submit decision.');
      }
    } catch (err: any) {
      setDecisionError(err.message || 'Network error');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;

    try {
      setLoading(true);
      const res = await fetch('/api/workflow/approvals/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_ids: selectedIds,
          comments: 'Batch approved via Smart Approval Center'
        })
      });
      const data = await res.json();
      if (data.success) {
        setBulkFeedback(data);
        setSelectedIds([]);
        fetchApprovals();
      }
    } catch (err: any) {
      console.error('Bulk approval failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateUserId || !delegateEndDate) return;

    try {
      const res = await fetch('/api/workflow/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegate_user_id: delegateUserId,
          delegate_user_name: delegateUserName || 'Designated Approver',
          scope_module: delegateModule,
          start_date: delegateStartDate,
          end_date: delegateEndDate,
          reason: delegateReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowDelegationModal(false);
        fetchDelegations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeDelegation = async (id: string) => {
    try {
      await fetch(`/api/workflow/delegations/${id}/revoke`, { method: 'PUT' });
      fetchDelegations();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === approvals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(approvals.map((a) => a.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Delegation Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Centralized Approval Center</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              Multi-Level Governance
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Hierarchical sequential & parallel approval matrices with Level 3 Restricted safeguards for financial concessions and withdrawals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDelegationModal(true)}
            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Manage Delegations ({delegations.filter(d => d.is_active).length})
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkApprove}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Bulk Approve Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Bulk Feedback Banner if Level 3 blocked */}
      {bulkFeedback && (
        <div className={`p-4 rounded-xl text-xs ${
          bulkFeedback.blocked_count > 0 ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center justify-between font-bold text-sm">
            <span>
              {bulkFeedback.approved_count} item(s) approved successfully.
              {bulkFeedback.blocked_count > 0 && ` ${bulkFeedback.blocked_count} Level 3 restricted item(s) protected.`}
            </span>
            <button onClick={() => setBulkFeedback(null)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          {bulkFeedback.blocked_items?.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="font-semibold text-amber-800">Protected Level 3 Operations (Individual Review Required):</p>
              {bulkFeedback.blocked_items.map((b: any, idx: number) => (
                <div key={idx} className="text-amber-800">• {b.title}: {b.reason}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'PENDING', label: 'Pending Action' },
            { id: 'IN_REVIEW', label: 'In Multi-Level Review' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'CHANGES_REQUESTED', label: 'Changes Requested' },
            { id: 'ALL', label: 'All Requests' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Safety Level & Search */}
        <div className="flex items-center gap-2">
          <select
            value={safetyFilter}
            onChange={(e) => setSafetyFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Safety Levels</option>
            <option value="LEVEL_1_AUTOMATIC">Level 1 - Standard</option>
            <option value="LEVEL_2_CONFIRMED">Level 2 - Confirmed</option>
            <option value="LEVEL_3_RESTRICTED">Level 3 - Restricted (High Impact)</option>
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Search title, student ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchApprovals()}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Select All Row */}
      {approvals.length > 0 && statusFilter === 'PENDING' && (
        <div className="flex items-center justify-between px-2 text-xs text-gray-500">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.length === approvals.length && approvals.length > 0}
              onChange={toggleSelectAll}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Select all {approvals.length} requests for bulk processing</span>
          </label>
          <span>{selectedIds.length} selected</span>
        </div>
      )}

      {/* Approvals List */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading approval center records...
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 text-sm">No Approvals Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            All requests in this view have been resolved. Check other tabs or submit workflow triggers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((req) => {
            const isSelected = selectedIds.includes(req.id);
            const isRestricted = req.safety_level === 'LEVEL_3_RESTRICTED';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border transition shadow-sm p-5 ${
                  isSelected ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Side: Checkbox, Details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {statusFilter === 'PENDING' && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(req.id)}
                        className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider ${
                          isRestricted
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : req.safety_level === 'LEVEL_2_CONFIRMED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {req.safety_level.replace('_', ' ')}
                        </span>

                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          req.priority === 'CRITICAL'
                            ? 'bg-red-600 text-white'
                            : req.priority === 'HIGH'
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {req.priority}
                        </span>

                        <span className="text-xs font-semibold text-gray-500">
                          {req.request_type} • ID: {req.entity_id}
                        </span>

                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          req.status === 'CHANGES_REQUESTED' ? 'bg-purple-100 text-purple-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900">{req.title}</h3>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{req.description}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <div>
                          <span className="font-medium text-gray-700">Requester: </span>
                          {req.requester_name}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Flow: </span>
                          {req.approval_flow} ({req.current_level}/{req.total_levels} stages)
                        </div>
                        {req.sla_deadline && (
                          <div className={new Date(req.sla_deadline) < new Date() && req.status === 'PENDING' ? 'text-red-600 font-bold' : ''}>
                            <span className="font-medium text-gray-700">SLA Due: </span>
                            {new Date(req.sla_deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>

                      {/* Multi-Level Stepper */}
                      {req.steps && req.steps.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <div className="text-xs font-bold text-gray-500 mb-2">Approval Hierarchy Progress:</div>
                          <div className="flex flex-wrap items-center gap-2">
                            {req.steps.map((st, i) => (
                              <React.Fragment key={st.id || i}>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                  st.status === 'APPROVED'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : st.status === 'REJECTED'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : st.status === 'CHANGES_REQUESTED'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : req.current_level === st.step_order
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-100'
                                    : 'bg-gray-50 text-gray-500 border-gray-200'
                                }`}>
                                  <span className="font-bold">L{st.step_order}:</span>
                                  <span>{st.step_name}</span>
                                  <span className="text-[10px] font-semibold opacity-75">({st.approver_role})</span>
                                  {st.status === 'APPROVED' && <span className="text-emerald-600 font-bold">✓</span>}
                                </div>
                                {i < req.steps!.length - 1 && (
                                  <span className="text-gray-300 font-bold">→</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Action Buttons */}
                  {(req.status === 'PENDING' || req.status === 'IN_REVIEW') && (
                    <div className="flex lg:flex-col items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenDecisionModal(req, 'APPROVE')}
                        className="w-full px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm flex items-center justify-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={() => handleOpenDecisionModal(req, 'REJECT')}
                        className="w-full px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleOpenDecisionModal(req, 'CHANGES_REQUESTED')}
                        className="w-full px-3 py-1.5 text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition"
                      >
                        Changes...
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Modal */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className={`p-4 border-b text-white font-bold text-sm flex items-center justify-between ${
              decisionAction === 'APPROVE' ? 'bg-emerald-600' :
              decisionAction === 'REJECT' ? 'bg-red-600' : 'bg-indigo-600'
            }`}>
              <div className="flex items-center gap-2">
                <span>Confirm {decisionAction.replace('_', ' ')}:</span>
                <span className="font-normal opacity-90 truncate max-w-xs">{activeRequest.title}</span>
              </div>
              <button onClick={() => setActiveRequest(null)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Level 3 Safety Notice */}
              {activeRequest.safety_level === 'LEVEL_3_RESTRICTED' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-800">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Safety Level 3: Mandatory Human Authorization Gate
                  </div>
                  <p>
                    This action impacts financial concessions, ledger accounts, student withdrawal, or official certificates. Your decision, identity, and comments will be permanently recorded in the immutable audit log.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {decisionAction === 'APPROVE' ? 'Approval Comments (Optional):' : 'Mandatory Reason / Justification:'}
                </label>
                <textarea
                  rows={3}
                  value={decisionComments}
                  onChange={(e) => setDecisionComments(e.target.value)}
                  placeholder={
                    decisionAction === 'APPROVE'
                      ? 'Add any conditions, verification references, or notes...'
                      : 'State clear reason for rejection or details of requested changes...'
                  }
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {decisionError && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {decisionError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitDecision}
                  disabled={submittingDecision}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition shadow-sm ${
                    decisionAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    decisionAction === 'REJECT' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  } disabled:opacity-50`}
                >
                  {submittingDecision ? 'Processing...' : `Submit ${decisionAction.replace('_', ' ')}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delegation Manager Modal */}
      {showDelegationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-900 text-white font-bold text-sm flex items-center justify-between">
              <span>Approval Authority Delegation</span>
              <button onClick={() => setShowDelegationModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Delegate your approval authority during leave or travel. All decisions made by delegates will reference this authorization.
              </p>

              {/* Active Delegations Table */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Active Delegations</h4>
                {delegations.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 italic">No delegations configured.</p>
                ) : (
                  <div className="space-y-2">
                    {delegations.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                        <div>
                          <div className="font-semibold text-gray-800">
                            Delegate: {d.delegate_user_name} ({d.scope_module})
                          </div>
                          <div className="text-gray-500 text-[10px]">
                            Valid: {d.start_date} to {d.end_date} • {d.reason}
                          </div>
                        </div>
                        {d.is_active ? (
                          <button
                            onClick={() => handleRevokeDelegation(d.id)}
                            className="px-2 py-1 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400">Revoked</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Delegation Form */}
              <form onSubmit={handleCreateDelegation} className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Add New Delegation</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Delegate User ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. usr_teacher_vvps"
                      value={delegateUserId}
                      onChange={(e) => setDelegateUserId(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Delegate Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Anand Kumar Jha"
                      value={delegateUserName}
                      onChange={(e) => setDelegateUserName(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Module Scope</label>
                    <select
                      value={delegateModule}
                      onChange={(e) => setDelegateModule(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-200 rounded-lg"
                    >
                      <option value="ALL">All Modules</option>
                      <option value="ACADEMIC">Academic Only</option>
                      <option value="FEES">Fees Only</option>
                      <option value="HR">HR & Leave Only</option>
                      <option value="INVENTORY">Inventory & PO Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={delegateStartDate}
                      onChange={(e) => setDelegateStartDate(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={delegateEndDate}
                      onChange={(e) => setDelegateEndDate(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Reason for Delegation</label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Leave / Out of office"
                    value={delegateReason}
                    onChange={(e) => setDelegateReason(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDelegationModal(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                  >
                    Activate Delegation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
