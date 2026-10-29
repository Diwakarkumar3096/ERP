import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import type {
  PayrollDashboardStats,
  PayrollCycle,
  PayrollItem,
  PayHead,
  SalaryStructure,
  EmployeeSalaryAssignment,
  LeaveType,
  LeaveBalance,
  LeaveApplication,
  StaffLoan,
  EmployeeAppraisal,
  EmployeeLifecycleEvent,
  StatutoryRegisterRow
} from '../../types/erp.js';
import {
  Wallet,
  LayoutDashboard,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Printer,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  Award,
  HandCoins,
  ShieldCheck,
  ChevronRight,
  Calculator,
  RefreshCw,
  Eye,
  Check,
  FileCheck,
  Building2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

import { GeneratePayrollModal } from './GeneratePayrollModal.js';
import { PayslipModal } from './PayslipModal.js';
import { SalaryAssignmentModal } from './SalaryAssignmentModal.js';
import { ApplyLeaveModal } from './ApplyLeaveModal.js';
import { ReviewLeaveModal } from './ReviewLeaveModal.js';
import { SanctionLoanModal } from './SanctionLoanModal.js';
import { AppraisalModal } from './AppraisalModal.js';
import { LifecycleEventModal } from './LifecycleEventModal.js';

type PayrollSubTab =
  | 'overview'
  | 'cycles'
  | 'structures'
  | 'assignments'
  | 'leaves'
  | 'loans'
  | 'appraisals'
  | 'compliance';

export const PayrollManagementView: React.FC = () => {
  const { user, isSuperAdmin, activeSchool, hasPermission } = useAuth();
  const { addToast } = useToast();
  const schoolId = activeSchool?.id || user?.schoolId || 'sch_vvps';

  // Subtabs
  const [activeTab, setActiveTab] = useState<PayrollSubTab>('overview');

  // Dashboard Stats
  const [stats, setStats] = useState<PayrollDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Cycles
  const [cycles, setCycles] = useState<PayrollCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<PayrollCycle | null>(null);
  const [cycleItems, setCycleItems] = useState<PayrollItem[]>([]);
  const [loadingCycleDetails, setLoadingCycleDetails] = useState(false);

  // Compensation / Structures
  const [payHeads, setPayHeads] = useState<PayHead[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [assignments, setAssignments] = useState<EmployeeSalaryAssignment[]>([]);
  const [searchAssignment, setSearchAssignment] = useState('');

  // Leaves
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);

  // Loans
  const [loans, setLoans] = useState<StaffLoan[]>([]);

  // Appraisals & Lifecycle
  const [appraisals, setAppraisals] = useState<EmployeeAppraisal[]>([]);
  const [lifecycleEvents, setLifecycleEvents] = useState<EmployeeLifecycleEvent[]>([]);

  // Compliance
  const [complianceRows, setComplianceRows] = useState<StatutoryRegisterRow[]>([]);
  const [complianceCycleFilter, setComplianceCycleFilter] = useState('');

  // Modals state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [viewPayslipItemId, setViewPayslipItemId] = useState<string | null>(null);
  const [editAssignment, setEditAssignment] = useState<EmployeeSalaryAssignment | null>(null);
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [reviewingLeave, setReviewingLeave] = useState<LeaveApplication | null>(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [showLifecycleModal, setShowLifecycleModal] = useState(false);

  // Quick Employee List for dropdowns
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ id: string; name: string; empNo: string }>>([]);

  useEffect(() => {
    loadAllData();
  }, [schoolId]);

  const loadAllData = async () => {
    setLoadingStats(true);
    try {
      const [
        dashStats,
        cyclesRes,
        headsRes,
        structsRes,
        assignRes,
        lTypesRes,
        lAppsRes,
        lBalsRes,
        loansRes,
        apprRes,
        lifeRes
      ] = await Promise.all([
        api.payroll.getDashboardStats(schoolId),
        api.payroll.getCycles(schoolId),
        api.payroll.getPayHeads(schoolId),
        api.payroll.getStructures(schoolId),
        api.payroll.getAssignments({ schoolId }),
        api.payroll.getLeaveTypes(schoolId),
        api.payroll.getLeaveApplications({ schoolId }),
        api.payroll.getLeaveBalances({ schoolId }),
        api.payroll.getLoans(schoolId),
        api.payroll.getAppraisals(schoolId),
        api.payroll.getLifecycleEvents(schoolId)
      ]);

      setStats(dashStats);
      setCycles(cyclesRes.cycles || []);
      setPayHeads(headsRes.payHeads || []);
      setStructures(structsRes.structures || []);
      setAssignments(assignRes.assignments || []);
      setLeaveTypes(lTypesRes.leaveTypes || []);
      setLeaveApplications(lAppsRes.applications || []);
      setLeaveBalances(lBalsRes.balances || []);
      setLoans(loansRes.loans || []);
      setAppraisals(apprRes.appraisals || []);
      setLifecycleEvents(lifeRes.events || []);

      // Extract unique employee options
      if (assignRes.assignments) {
        setEmployeeOptions(
          assignRes.assignments.map((a) => ({
            id: a.employee_id,
            name: a.employee_name,
            empNo: a.employee_id_number
          }))
        );
      }

      // If cycles exist, load latest cycle details
      if (cyclesRes.cycles && cyclesRes.cycles.length > 0) {
        loadCycleDetails(cyclesRes.cycles[0].id);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load HR & Payroll information', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadCycleDetails = async (cId: string) => {
    setSelectedCycleId(cId);
    setLoadingCycleDetails(true);
    try {
      const res = await api.payroll.getCycleDetails(cId, schoolId);
      setSelectedCycle(res.cycle);
      setCycleItems(res.items || []);
    } catch (err: any) {
      addToast(err.message || 'Failed to load cycle records', 'error');
    } finally {
      setLoadingCycleDetails(false);
    }
  };

  const loadComplianceReport = async (cId?: string) => {
    try {
      const res = await api.payroll.getStatutoryReports({ schoolId, cycleId: cId || undefined });
      setComplianceRows(res.registers || []);
    } catch (err: any) {
      addToast(err.message || 'Failed to load statutory report', 'error');
    }
  };

  const handleApproveCycle = async (cId: string) => {
    try {
      const res = await api.payroll.approveCycle(cId, schoolId);
      addToast(res.message || 'Cycle approved successfully', 'success');
      loadAllData();
      loadCycleDetails(cId);
    } catch (err: any) {
      addToast(err.message || 'Approval failed', 'error');
    }
  };

  const handleDisburseCycle = async (cId: string) => {
    if (!window.confirm('Confirm disbursal of salaries? This will mark all payslips as PAID and automatically post the net amount to the School Operating Expenses ledger.')) {
      return;
    }
    try {
      const res = await api.payroll.disburseCycle(cId, {
        schoolId,
        paymentMode: 'BANK_TRANSFER',
        referenceNumber: `NEFT-BATCH-${Date.now()}`
      });
      addToast(res.message || 'Salaries disbursed and accounts ledger updated!', 'success');
      loadAllData();
      loadCycleDetails(cId);
    } catch (err: any) {
      addToast(err.message || 'Disbursal failed', 'error');
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    if (!searchAssignment.trim()) return true;
    const q = searchAssignment.toLowerCase();
    return (
      a.employee_name.toLowerCase().includes(q) ||
      a.employee_id_number.toLowerCase().includes(q) ||
      (a.department_name && a.department_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Module Title & High-Level Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">HR, Payroll & Staff Management</h1>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Phase 12</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional Human Resources, Salary Structures, Biometric Attendance Sync, Monthly Runs & Statutory Compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('payroll.generate') && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Run Monthly Payroll</span>
            </button>
          )}

          {hasPermission('leaves.apply') && (
            <button
              onClick={() => setShowApplyLeaveModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Apply Leave</span>
            </button>
          )}

          <button
            onClick={loadAllData}
            title="Refresh module data"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Segmented Subtab Navigation (Universal Frontend Design Constitution) */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto border border-slate-200/80">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('cycles')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'cycles'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Monthly Salary Runs</span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'assignments'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Compensation Profiles</span>
        </button>

        <button
          onClick={() => setActiveTab('structures')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'structures'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Salary Scales & Pay Heads</span>
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'leaves'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Leave Management</span>
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'loans'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HandCoins className="w-3.5 h-3.5" />
          <span>Staff Loans & Advances</span>
        </button>

        <button
          onClick={() => setActiveTab('appraisals')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'appraisals'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Appraisals & Service Book</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('compliance');
            loadComplianceReport();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'compliance'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Statutory Compliance</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. OVERVIEW & KPI DASHBOARD TAB                                */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">Staff Covered Under Payroll</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {stats?.assignedEmployees || 0}
                </span>
                <span className="text-xs text-slate-500">
                  of {stats?.totalEmployees || 0} active staff
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {stats && stats.totalEmployees > stats.assignedEmployees ? (
                  <span className="text-amber-700">
                    {stats.totalEmployees - stats.assignedEmployees} pending compensation setup
                  </span>
                ) : (
                  <span className="text-emerald-700">100% staff profiles configured</span>
                )}
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">Latest Monthly Salary Run</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                  {stats?.latestCycle ? `₹${parseFloat(String(stats.latestCycle.total_net_payable)).toLocaleString('en-IN')}` : '₹0'}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {stats?.latestCycle?.status || 'NO RUN'}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 truncate">
                {stats?.latestCycle?.title || 'No payroll cycle run yet'}
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">Pending Leave Requisitions</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {stats?.pendingLeavesCount || 0}
                </span>
                <span className="text-xs text-slate-500">applications</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                {stats?.pendingLeavesCount ? 'Requires Principal/HR approval' : 'All leave applications cleared'}
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">Active Staff Loans / Advances</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                  ₹{Number(stats?.totalLoanOutstanding || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500">{stats?.activeLoansCount || 0} active</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Auto-recovered through monthly EMI</p>
            </div>
          </div>

          {/* Department Distribution & Recent Cycles */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Breakdown */}
            <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Monthly Department Outlay</h3>
                <span className="text-xs text-slate-400">Payroll Budget</span>
              </div>
              <div className="space-y-3">
                {stats?.departmentSalaries && stats.departmentSalaries.length > 0 ? (
                  stats.departmentSalaries.map((dept, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800 block">{dept.department_name}</span>
                        <span className="text-[11px] text-slate-400">{dept.staff_count} staff members</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{Number(dept.total_gross).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No departmental salary data available</p>
                )}
              </div>
            </div>

            {/* Recent Cycles List */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Recent Monthly Cycles</h3>
                  <p className="text-xs text-slate-500">Audit trail of generated and disbursed salary cycles</p>
                </div>
                <button
                  onClick={() => setActiveTab('cycles')}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <span>View All Cycles</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Cycle Title</th>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Staff</th>
                      <th className="py-2.5 px-3 text-right">Net Payable</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {cycles.slice(0, 5).map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{c.title}</td>
                        <td className="py-2.5 px-3 text-slate-500">{c.month}/{c.year}</td>
                        <td className="py-2.5 px-3">{c.total_employees} staff</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          ₹{Number(c.total_net_payable).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[11px] font-semibold ${
                            c.status === 'DISBURSED' ? 'text-emerald-700' : (c.status === 'APPROVED' ? 'text-blue-700' : 'text-amber-700')
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setActiveTab('cycles');
                              loadCycleDetails(c.id);
                            }}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            Review Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MONTHLY PAYROLL RUNS & CYCLES TAB                          */}
      {/* ============================================================== */}
      {activeTab === 'cycles' && (
        <div className="space-y-6">
          {/* Top Cycle Summary Bar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Payroll Cycle</label>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedCycleId || ''}
                    onChange={(e) => loadCycleDetails(e.target.value)}
                    className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {cycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.status}) — ₹{Number(c.total_net_payable).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>

                  {selectedCycle && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">Status:</span>
                      <span className={`font-bold ${
                        selectedCycle.status === 'DISBURSED'
                          ? 'text-emerald-700'
                          : selectedCycle.status === 'APPROVED'
                          ? 'text-blue-700'
                          : 'text-amber-700'
                      }`}>
                        {selectedCycle.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedCycle && (
                <div className="flex items-center gap-2">
                  {selectedCycle.status === 'CALCULATED' && hasPermission('payroll.approve') && (
                    <button
                      onClick={() => handleApproveCycle(selectedCycle.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Cycle</span>
                    </button>
                  )}

                  {selectedCycle.status === 'APPROVED' && hasPermission('payroll.disburse') && (
                    <button
                      onClick={() => handleDisburseCycle(selectedCycle.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-xs"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Disburse Salaries & Post to Accounts</span>
                    </button>
                  )}

                  {selectedCycle.status === 'DISBURSED' && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Disbursed & Integrated with Accounts</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedCycle && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Total Staff:</span>
                  <span className="font-bold text-slate-900">{selectedCycle.total_employees} employees</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Gross Earnings:</span>
                  <span className="font-mono font-bold text-slate-900">₹{Number(selectedCycle.total_gross).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Deductions:</span>
                  <span className="font-mono font-bold text-rose-700">₹{Number(selectedCycle.total_deductions).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Net Salary Disbursed:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">₹{Number(selectedCycle.total_net_payable).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Itemized Employee Records */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Itemized Employee Payslip Register</h3>
                <p className="text-xs text-slate-500">Days worked, LOP deductions, statutory EPF, and net credits</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3 text-center">Days (P / LOP / Tot)</th>
                    <th className="py-3 px-3 text-right">Basic Pay</th>
                    <th className="py-3 px-3 text-right">Gross Pay</th>
                    <th className="py-3 px-3 text-right">EPF (12%)</th>
                    <th className="py-3 px-3 text-right">TDS / PT</th>
                    <th className="py-3 px-3 text-right">LOP / Loan</th>
                    <th className="py-3 px-3 text-right font-bold">Net Salary</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cycleItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block">{item.employee_name}</span>
                        <span className="text-[11px] font-mono text-slate-500">{item.employee_id_number}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{item.department_name || 'Academics'}</td>
                      <td className="py-3 px-3 text-center font-mono">
                        {item.present_days} / {item.lop_days} / {item.working_days}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">₹{Number(item.basic_pay).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium">₹{Number(item.total_earnings).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">₹{Number(item.pf_deduction).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        ₹{(Number(item.tds_deduction) + Number(item.pt_deduction)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        ₹{(Number(item.lop_deduction) + Number(item.loan_installment_deduction)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(item.net_pay).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[11px] font-semibold ${
                          item.payment_status === 'PAID' ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                          {item.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setViewPayslipItemId(item.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. STAFF COMPENSATION PROFILES TAB                             */}
      {/* ============================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchAssignment}
                  onChange={(e) => setSearchAssignment(e.target.value)}
                  placeholder="Search staff by name or employee ID..."
                  className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <span className="text-xs text-slate-500">
                Showing {filteredAssignments.length} staff salary profiles
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Designation & Dept</th>
                    <th className="py-3 px-4">Salary Grade</th>
                    <th className="py-3 px-4 text-right">Gross / Month</th>
                    <th className="py-3 px-4 text-right">Basic Pay</th>
                    <th className="py-3 px-4 text-right">Annual CTC</th>
                    <th className="py-3 px-4">Bank Details</th>
                    <th className="py-3 px-4">Statutory Identifiers</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAssignments.map((a) => (
                    <tr key={a.employee_id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{a.employee_name}</span>
                        <span className="text-[11px] font-mono text-slate-500">{a.employee_id_number}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 block">{a.designation_name || 'Staff'}</span>
                        <span className="text-[11px] text-slate-400">{a.department_name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{a.structure_name || 'Custom Scale'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(a.gross_monthly).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        ₹{Number(a.basic_pay).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-800 font-medium">
                        ₹{Number(a.ctc_annual).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 block">{a.bank_name || 'Not configured'}</span>
                        <span className="text-[11px] font-mono text-slate-500">{a.bank_account_number || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 text-[11px] font-mono text-slate-600">
                        PAN: {a.pan_number || 'N/A'}<br />
                        UAN: {a.pf_uan_number || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setEditAssignment(a)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SALARY SCALES & PAY HEADS TAB                               */}
      {/* ============================================================== */}
      {activeTab === 'structures' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Salary Grade Templates */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Salary Grade Scales</h3>
                <p className="text-xs text-slate-500">Pay bands configured for teaching and administrative cadres</p>
              </div>
            </div>

            <div className="space-y-3">
              {structures.map((s) => (
                <div key={s.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-xs">{s.name}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-mono text-slate-500">{s.code}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.description}</p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Assigned staff count: {s.assigned_staff_count || 0}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      ₹{Number(s.base_gross_monthly).toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pay Heads Master */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Pay Heads Master (Earnings & Deductions)</h3>
                <p className="text-xs text-slate-500">Institutional compensation elements & calculation formulas</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Head Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Calculation Rule</th>
                    <th className="py-2.5 px-3 text-right">Default Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payHeads.map((h) => (
                    <tr key={h.id}>
                      <td className="py-2 px-3 font-semibold text-slate-900">{h.name}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{h.code}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[11px] font-semibold ${
                          h.type === 'EARNING' ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {h.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                        {h.calculation_type}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {h.calculation_type.includes('PERCENT') ? `${h.default_value}%` : `₹${Number(h.default_value).toLocaleString('en-IN')}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. LEAVE MANAGEMENT TAB                                        */}
      {/* ============================================================== */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          {/* Leave Quota Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {leaveTypes.map((lt) => (
              <div key={lt.id} className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>{lt.code}</span>
                  <span className="text-[11px] text-slate-500">{lt.is_paid ? 'Paid' : 'Unpaid'}</span>
                </div>
                <span className="text-xl font-bold text-slate-800 font-mono block mt-1">{lt.annual_quota} days</span>
                <span className="text-[11px] text-slate-500 block truncate">{lt.name}</span>
              </div>
            ))}
          </div>

          {/* Applications List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Leave Applications & Approval Queue</h3>
                <p className="text-xs text-slate-500">Review faculty leave requisitions and synchronized attendance impact</p>
              </div>

              {hasPermission('leaves.apply') && (
                <button
                  onClick={() => setShowApplyLeaveModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Apply Leave</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4 text-center">Duration</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Substitute</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {leaveApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{app.employee_name}</span>
                        <span className="text-[11px] font-mono text-slate-500">{app.employee_id_number}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {app.leave_type_name} ({app.leave_type_code})
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {new Date(app.start_date).toLocaleDateString('en-IN')} - {new Date(app.end_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {app.total_days}d
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">{app.reason}</td>
                      <td className="py-3 px-4 text-slate-600">{app.substitute_name || 'None'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-semibold ${
                          app.status === 'APPROVED' ? 'text-emerald-700' : (app.status === 'REJECTED' ? 'text-rose-700' : 'text-amber-700')
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {app.status === 'PENDING' && hasPermission('leaves.manage') ? (
                          <button
                            onClick={() => setReviewingLeave(app)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                          >
                            Review & Decide
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Decision logged</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. STAFF LOANS & ADVANCES TAB                                  */}
      {/* ============================================================== */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Staff Advances & Institutional Loans</h3>
              <p className="text-xs text-slate-500">Interest-free emergency aid and salary advances with monthly payroll EMI recovery</p>
            </div>

            {hasPermission('loans.manage') && (
              <button
                onClick={() => setShowLoanModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Sanction Advance</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Advance Type</th>
                    <th className="py-3 px-4 text-right">Principal</th>
                    <th className="py-3 px-4 text-right">Monthly EMI</th>
                    <th className="py-3 px-4 text-right">Total Repaid</th>
                    <th className="py-3 px-4 text-right">Remaining Balance</th>
                    <th className="py-3 px-4">Disbursed Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loans.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{l.employee_name}</span>
                        <span className="text-[11px] font-mono text-slate-500">{l.employee_id_number}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{l.loan_type}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">₹{Number(l.principal_amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        ₹{Number(l.monthly_emi).toLocaleString('en-IN')}/mo
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">₹{Number(l.total_repaid).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(l.balance_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(l.disbursement_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-semibold ${
                          l.status === 'ACTIVE' ? 'text-blue-700' : 'text-emerald-700'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. APPRAISALS & HR SERVICE BOOK TAB                            */}
      {/* ============================================================== */}
      {activeTab === 'appraisals' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Faculty Appraisals & HR Service Book</h3>
              <p className="text-xs text-slate-500">Annual performance reviews, merit increments, promotions, and Full & Final settlements</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAppraisalModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-xs"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Conduct Appraisal</span>
              </button>
              <button
                onClick={() => setShowLifecycleModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Record HR Event</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appraisals list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">
                Performance Appraisals
              </h4>
              <div className="space-y-3">
                {appraisals.map((appr) => (
                  <div key={appr.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{appr.employee_name} ({appr.employee_id_number})</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        ★ {appr.rating} / 5.0
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{appr.review_period}</p>
                    <p className="text-slate-700 text-[11px]">
                      <strong>Action:</strong> {appr.recommended_action} {appr.increment_percentage ? `(+${appr.increment_percentage}%)` : ''}
                    </p>
                    {appr.strengths && (
                      <p className="text-[11px] text-slate-600 italic">"{appr.strengths}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Service Book Events */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">
                Service Book & Career Lifecycle Events
              </h4>
              <div className="space-y-3">
                {lifecycleEvents.map((evt) => (
                  <div key={evt.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{evt.title}</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(evt.event_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-600 block">
                      {evt.employee_name} ({evt.employee_id_number}) · {evt.event_type}
                    </span>
                    {evt.details && (
                      <p className="text-[11px] text-slate-500">{evt.details}</p>
                    )}
                    {evt.fnf_net_settlement && evt.fnf_net_settlement > 0 ? (
                      <p className="text-[11px] font-mono font-bold text-emerald-800">
                        Net F&F Settlement: ₹{Number(evt.fnf_net_settlement).toLocaleString('en-IN')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. STATUTORY COMPLIANCE REGISTERS (PF, ESI, PT, TDS)          */}
      {/* ============================================================== */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Statutory Compliance Registers</h3>
              <p className="text-xs text-slate-500">Government Provident Fund (EPF 12%), ESIC, Professional Tax & Tax Deducted at Source (TDS)</p>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Register</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">UAN / PAN</th>
                    <th className="py-3 px-3 text-right">Gross Pay</th>
                    <th className="py-3 px-3 text-right">Basic Pay</th>
                    <th className="py-3 px-3 text-right">Emp EPF (12%)</th>
                    <th className="py-3 px-3 text-right">Empr EPF (12%)</th>
                    <th className="py-3 px-3 text-right font-bold">Total PF</th>
                    <th className="py-3 px-3 text-right">ESIC</th>
                    <th className="py-3 px-3 text-right">Prof Tax (PT)</th>
                    <th className="py-3 px-3 text-right">TDS / IT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {complianceRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block">{row.employee_name}</span>
                        <span className="text-[11px] font-mono text-slate-500">{row.employee_id_number}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {row.pf_uan_number || 'N/A'}<br />
                        {row.pan_number || 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium">₹{Number(row.base_gross).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono">₹{Number(row.basic_pay).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">₹{Number(row.employee_pf).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">₹{Number(row.employer_epf).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                        ₹{Number(row.total_pf_contribution).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">₹{Number(row.employee_esic).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">₹{Number(row.pt_deduction).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">₹{Number(row.tds_deduction).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS SECTION                                                 */}
      {/* ============================================================== */}

      {showGenerateModal && (
        <GeneratePayrollModal
          schoolId={schoolId}
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => {
            setShowGenerateModal(false);
            loadAllData();
            setActiveTab('cycles');
          }}
        />
      )}

      {viewPayslipItemId && (
        <PayslipModal
          itemId={viewPayslipItemId}
          schoolId={schoolId}
          onClose={() => setViewPayslipItemId(null)}
        />
      )}

      {editAssignment && (
        <SalaryAssignmentModal
          assignment={editAssignment}
          structures={structures}
          schoolId={schoolId}
          onClose={() => setEditAssignment(null)}
          onSuccess={() => {
            setEditAssignment(null);
            loadAllData();
          }}
        />
      )}

      {showApplyLeaveModal && (
        <ApplyLeaveModal
          schoolId={schoolId}
          leaveTypes={leaveTypes}
          employees={employeeOptions}
          onClose={() => setShowApplyLeaveModal(false)}
          onSuccess={() => {
            setShowApplyLeaveModal(false);
            loadAllData();
          }}
        />
      )}

      {reviewingLeave && (
        <ReviewLeaveModal
          application={reviewingLeave}
          schoolId={schoolId}
          onClose={() => setReviewingLeave(null)}
          onSuccess={() => {
            setReviewingLeave(null);
            loadAllData();
          }}
        />
      )}

      {showLoanModal && (
        <SanctionLoanModal
          schoolId={schoolId}
          employees={employeeOptions}
          onClose={() => setShowLoanModal(false)}
          onSuccess={() => {
            setShowLoanModal(false);
            loadAllData();
          }}
        />
      )}

      {showAppraisalModal && (
        <AppraisalModal
          schoolId={schoolId}
          employees={employeeOptions}
          onClose={() => setShowAppraisalModal(false)}
          onSuccess={() => {
            setShowAppraisalModal(false);
            loadAllData();
          }}
        />
      )}

      {showLifecycleModal && (
        <LifecycleEventModal
          schoolId={schoolId}
          employees={employeeOptions}
          onClose={() => setShowLifecycleModal(false)}
          onSuccess={() => {
            setShowLifecycleModal(false);
            loadAllData();
          }}
        />
      )}
    </div>
  );
};
