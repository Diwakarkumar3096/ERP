import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import type {
  School,
  AcademicSession,
  ClassItem,
  SectionItem,
  FeeCategory,
  FeeStructure,
  StudentFeeAssignment,
  FeePayment,
  FeeConcession,
  SchoolExpense,
  ExpenseCategory,
  FeeReminder,
  FeeDashboardStats,
  OfficialReceiptPayload
} from '../../types/erp.js';
import {
  CreditCard,
  IndianRupee,
  Layers,
  Users,
  Award,
  Receipt,
  TrendingDown,
  Bell,
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Printer,
  Calendar,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ShieldCheck,
  FileText,
  DollarSign,
  ChevronDown,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';

import { FeeReceiptModal } from './FeeReceiptModal.js';
import { StudentLedgerModal } from './StudentLedgerModal.js';
import { CollectPaymentModal } from './CollectPaymentModal.js';
import { FeeStructureModal } from './FeeStructureModal.js';
import { ConcessionModal } from './ConcessionModal.js';
import { ReversalModal } from './ReversalModal.js';
import { FeeExpenseModal } from './FeeExpenseModal.js';
import { FeeReminderModal } from './FeeReminderModal.js';
import { FeeCategoryModal } from './FeeCategoryModal.js';
import { ClassFeeAssignModal } from './ClassFeeAssignModal.js';

type FeeTab =
  | 'overview'
  | 'collect'
  | 'structures'
  | 'assignments'
  | 'concessions'
  | 'transactions'
  | 'expenses'
  | 'reminders'
  | 'reports';

/**
 * Validation & Normalization Layer for Fee Assignments
 * Ensures incoming data from backend services, hooks, or component props
 * is always validated and returned as a guaranteed pure Array<StudentFeeAssignment>.
 * Prevents "TypeError: assignments.filter is not a function" runtime exceptions.
 */
export function normalizeFeeAssignments(raw: unknown): StudentFeeAssignment[] {
  if (raw === null || raw === undefined) {
    return [];
  }

  // 1. Direct array validation
  if (Array.isArray(raw)) {
    return raw.filter((item): item is StudentFeeAssignment => Boolean(item && typeof item === 'object'));
  }

  // 2. Object envelope validation (e.g., { assignments: [...] }, { data: [...] }, { rows: [...] }, etc.)
  if (typeof raw === 'object') {
    const envelope = raw as Record<string, unknown>;

    if (Array.isArray(envelope.assignments)) {
      return envelope.assignments.filter((item): item is StudentFeeAssignment => Boolean(item && typeof item === 'object'));
    }
    if (Array.isArray(envelope.data)) {
      return envelope.data.filter((item): item is StudentFeeAssignment => Boolean(item && typeof item === 'object'));
    }
    if (Array.isArray(envelope.rows)) {
      return envelope.rows.filter((item): item is StudentFeeAssignment => Boolean(item && typeof item === 'object'));
    }
    if (Array.isArray(envelope.result)) {
      return envelope.result.filter((item): item is StudentFeeAssignment => Boolean(item && typeof item === 'object'));
    }
    if (Array.isArray(envelope.items)) {
      return envelope.items.filter((item): item is StudentFeeAssignment => Boolean(item && typeof item === 'object'));
    }

    // 3. Single assignment entity passed directly
    if (
      typeof envelope.id === 'string' &&
      (typeof envelope.student_id === 'string' || typeof envelope.total_charges !== 'undefined' || typeof envelope.student_name === 'string')
    ) {
      return [envelope as unknown as StudentFeeAssignment];
    }
  }

  // Fallback for non-array / primitive / unexpected payloads
  return [];
}

export const normalizeAssignments = normalizeFeeAssignments;

export interface FeesManagementViewProps {
  /**
   * Optional incoming fee assignments passed from parent component, custom hook, or test harness.
   * Will be safely validated and normalized into an array.
   */
  assignments?: unknown;
  initialTab?: FeeTab;
  schoolId?: string;
  sessionId?: string;
}

export const FeesManagementView: React.FC<FeesManagementViewProps> = ({
  assignments: propAssignments,
  initialTab = 'overview',
  schoolId: propSchoolId,
  sessionId: propSessionId
}) => {
  const { user, hasPermission } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<FeeTab>(initialTab || 'overview');

  // Multi-school scope
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(propSchoolId || 'sch_vvps');
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(propSessionId || 'sess_vvps_2526');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

  // Core Data States with initial normalization
  const [stats, setStats] = useState<FeeDashboardStats | null>(null);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [assignments, setAssignments] = useState<StudentFeeAssignment[]>(() =>
    normalizeFeeAssignments(propAssignments)
  );
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [concessions, setConcessions] = useState<FeeConcession[]>([]);
  const [expenses, setExpenses] = useState<SchoolExpense[]>([]);
  const [reminders, setReminders] = useState<FeeReminder[]>([]);
  const [loading, setLoading] = useState(false);

  // Synchronize and re-normalize whenever incoming prop assignments change
  useEffect(() => {
    if (propAssignments !== undefined) {
      setAssignments(normalizeFeeAssignments(propAssignments));
    }
  }, [propAssignments]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [targetReceiptNumber, setTargetReceiptNumber] = useState<string | null>(null);
  const [initialReceiptPayload, setInitialReceiptPayload] = useState<OfficialReceiptPayload | null>(null);

  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [targetStudentIdForLedger, setTargetStudentIdForLedger] = useState<string | null>(null);

  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [targetStudentIdForCollect, setTargetStudentIdForCollect] = useState<string | null>(null);

  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [classAssignModalOpen, setClassAssignModalOpen] = useState(false);

  const [concessionModalOpen, setConcessionModalOpen] = useState(false);
  const [targetAssignmentForConcession, setTargetAssignmentForConcession] = useState<StudentFeeAssignment | null>(null);

  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [targetPaymentForReversal, setTargetPaymentForReversal] = useState<FeePayment | null>(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [targetAssignmentForReminder, setTargetAssignmentForReminder] = useState<StudentFeeAssignment | null>(null);

  // Review Concession State
  const [reviewingConcession, setReviewingConcession] = useState<FeeConcession | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  // Download Report Dropdown State
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Generate Fee Audit PDF Report
  const handleExportPdfReport = () => {
    try {
      const doc = new jsPDF();
      const schoolObj = schools.find((s) => s.id === selectedSchoolId);
      const sessionObj = sessions.find((s) => s.id === selectedSessionId);
      const schoolName = schoolObj?.name || 'School ERP System';
      const sessionName = sessionObj?.name || 'Current Session';

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(schoolName.toUpperCase(), 14, 16);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Official Fee Collection & Financial Audit Report • Academic Session ${sessionName}`, 14, 24);
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')} • Auditor: ${user?.firstName} ${user?.lastName} (${user?.roleDisplayName})`, 14, 32);

      // Section 1: Executive Financial Metrics
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('1. EXECUTIVE FINANCIAL SUMMARY', 14, 52);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 55, 196, 55);

      const totalRevenue = Number(stats?.summary?.totalDemand || 0);
      const totalCollected = Number(stats?.summary?.totalCollected || 0);
      const totalConcessions = Number(stats?.summary?.totalConcessions || 0);
      const totalOutstanding = Number(stats?.summary?.totalDues || 0);
      const collectionRate = totalRevenue > 0 ? ((totalCollected / totalRevenue) * 100).toFixed(1) : '0.0';

      const metrics = [
        ['Total Fees Assessed', `INR ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Collections (Realized)', `INR ${totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Scholarships & Concessions Granted', `INR ${totalConcessions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Net Outstanding Balances (Dues)', `INR ${totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Overall Collection Efficiency Rate', `${collectionRate}%`],
      ];

      let yPos = 63;
      doc.setFontSize(10);
      metrics.forEach(([label, value], idx) => {
        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
        doc.rect(14, yPos - 5, 182, 8, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(label, 18, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(value, 192, yPos, { align: 'right' });
        yPos += 8;
      });

      // Section 2: Daily Collections Snapshot
      yPos += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("2. TODAY'S CASHIER COUNTER AUDIT", 14, yPos);
      doc.line(14, yPos + 3, 196, yPos + 3);

      yPos += 11;
      const todayTotal = Number(stats?.todayCollection?.total || 0);
      const todayCount = Number(stats?.todayCollection?.transactionCount || 0);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Collections Realized Today:`, 18, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text(`INR ${todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${todayCount} Transactions)`, 192, yPos, { align: 'right' });

      // Section 3: Recent Transaction Samples (Last 10)
      yPos += 16;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("3. RECENT RECEIPTS AUDIT REGISTER (SAMPLE)", 14, yPos);
      doc.line(14, yPos + 3, 196, yPos + 3);

      yPos += 10;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, yPos - 5, 182, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('RECEIPT NO', 16, yPos);
      doc.text('STUDENT', 55, yPos);
      doc.text('MODE', 105, yPos);
      doc.text('DATE', 135, yPos);
      doc.text('AMOUNT (INR)', 192, yPos, { align: 'right' });

      yPos += 6;
      const samplePayments = payments.slice(0, 10);
      if (samplePayments.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('No transaction receipts available for the selected session.', 16, yPos + 3);
        yPos += 8;
      } else {
        samplePayments.forEach((p, idx) => {
          doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
          doc.rect(14, yPos - 4, 182, 6, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          doc.text(p.receipt_number || 'N/A', 16, yPos);
          doc.text((p.student_name || 'Student').substring(0, 24), 55, yPos);
          doc.text(p.payment_mode || 'CASH', 105, yPos);
          doc.text(new Date(p.payment_date || Date.now()).toLocaleDateString('en-IN'), 135, yPos);
          doc.setFont('helvetica', 'bold');
          doc.text(Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 192, yPos, { align: 'right' });
          yPos += 6;
        });
      }

      // Auditor Signature Block
      yPos = Math.max(yPos + 18, 250);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, yPos, 70, yPos);
      doc.line(140, yPos, 196, yPos);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Cashier / Accounts Officer Signature', 14, yPos + 4);
      doc.text('Principal / Auditor Stamp & Verification', 140, yPos + 4);

      // Save PDF
      doc.save(`Fee_Collection_Audit_Summary_${schoolObj?.code || 'SCH'}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Fee Audit PDF Report downloaded successfully');
    } catch (err: any) {
      toast.error('Failed to generate PDF report: ' + err.message);
    }
  };

  // 1. Initial Load of Master Entities
  useEffect(() => {
    loadMasterEntities();
  }, []);

  const loadMasterEntities = async () => {
    try {
      const [schRes, sessRes] = await Promise.all([api.schools.list(), api.sessions.list()]);
      const schs = schRes.schools || [];
      const sess = sessRes.sessions || [];
      setSchools(schs);

      const defaultSchool = user?.schoolId || schs[0]?.id || 'sch_vvps';
      setSelectedSchoolId(defaultSchool);

      const defaultSess = sess.find((s: AcademicSession) => s.school_id === defaultSchool && s.is_current) || sess[0];
      if (defaultSess) setSelectedSessionId(defaultSess.id);
      setSessions(sess);

      // Load classes
      const clsRes = await api.classes.list(defaultSchool);
      setClasses(clsRes.classes || []);

      // Load Categories
      const [cats, expCats] = await Promise.all([
        api.fees.getCategories(defaultSchool),
        api.fees.getExpenseCategories(defaultSchool)
      ]);
      setCategories(Array.isArray(cats) ? cats : (cats as any)?.categories || []);
      setExpenseCategories(Array.isArray(expCats) ? expCats : (expCats as any)?.categories || []);
    } catch (err: any) {
      toast.error('Failed to initialize school entities');
    }
  };

  // 2. Fetch Tab Specific Data
  useEffect(() => {
    if (selectedSchoolId) {
      loadTabData();
    }
  }, [activeTab, selectedSchoolId, selectedSessionId, selectedClassId, statusFilter]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const data = await api.fees.getDashboardStats(selectedSchoolId);
        setStats(data);
      } else if (activeTab === 'collect' || activeTab === 'assignments') {
        if (propAssignments === undefined) {
          const rawData = await api.fees.getAssignments({
            schoolId: selectedSchoolId,
            sessionId: selectedSessionId,
            classId: selectedClassId !== 'all' ? selectedClassId : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined
          });
          const safeData = normalizeFeeAssignments(rawData);
          setAssignments(safeData);
        } else {
          setAssignments(normalizeFeeAssignments(propAssignments));
        }
      } else if (activeTab === 'structures') {
        const data = await api.fees.getStructures(selectedSchoolId, selectedSessionId);
        const safeData = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.structures)
            ? (data as any).structures
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];
        setStructures(safeData);
      } else if (activeTab === 'transactions') {
        const data = await api.fees.getPayments({
          schoolId: selectedSchoolId,
          sessionId: selectedSessionId
        });
        const safeData = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.payments)
            ? (data as any).payments
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];
        setPayments(safeData);
      } else if (activeTab === 'concessions') {
        const data = await api.fees.getConcessions({
          schoolId: selectedSchoolId,
          sessionId: selectedSessionId
        });
        const safeData = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.concessions)
            ? (data as any).concessions
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];
        setConcessions(safeData);
      } else if (activeTab === 'expenses') {
        const data = await api.fees.getExpenses({
          schoolId: selectedSchoolId
        });
        const safeData = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.expenses)
            ? (data as any).expenses
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];
        setExpenses(safeData);
      } else if (activeTab === 'reminders') {
        const data = await api.fees.getReminders({
          schoolId: selectedSchoolId,
          sessionId: selectedSessionId
        });
        const safeData = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.reminders)
            ? (data as any).reminders
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];
        setReminders(safeData);
        // Also ensure assignments are loaded for quick dues lookup
        const assignData = await api.fees.getAssignments({
          schoolId: selectedSchoolId,
          sessionId: selectedSessionId,
          status: 'OVERDUE'
        });
        const safeAssign = normalizeFeeAssignments(assignData);
        setAssignments(safeAssign);
      } else if (activeTab === 'reports') {
        const data = await api.fees.getDashboardStats(selectedSchoolId);
        setStats(data);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load data for tab');
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolChange = async (schId: string) => {
    setSelectedSchoolId(schId);
    try {
      const clsRes = await api.classes.list(schId);
      setClasses(clsRes.classes || []);
      setSelectedClassId('all');

      const [cats, expCats] = await Promise.all([
        api.fees.getCategories(schId),
        api.fees.getExpenseCategories(schId)
      ]);
      setCategories(Array.isArray(cats) ? cats : (cats as any)?.categories || []);
      setExpenseCategories(Array.isArray(expCats) ? expCats : (expCats as any)?.categories || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Handlers for Concession Approval
  const handleReviewConcessionSubmit = async (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewingConcession) return;
    if (status === 'REJECTED' && !reviewRemarks.trim()) {
      toast.error('Please provide rejection remarks');
      return;
    }
    setProcessingReview(true);
    try {
      await api.fees.reviewConcession(reviewingConcession.id, {
        status,
        remarks: reviewRemarks.trim() || 'Approved by Principal per school merit regulations'
      });
      toast.success(`Concession ${status.toLowerCase()} successfully!`);
      setReviewingConcession(null);
      setReviewRemarks('');
      loadTabData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update concession status');
    } finally {
      setProcessingReview(false);
    }
  };

  // Open receipt handler
  const handleOpenReceipt = (receiptNumber: string) => {
    setTargetReceiptNumber(receiptNumber);
    setInitialReceiptPayload(null);
    setReceiptModalOpen(true);
  };

  // Open student ledger handler
  const handleOpenLedger = (studentId: string) => {
    setTargetStudentIdForLedger(studentId);
    setLedgerModalOpen(true);
  };

  // Defensive array safeguards ensuring predictable array types across all renders
  const safeAssignments = useMemo<StudentFeeAssignment[]>(() => {
    const source = propAssignments !== undefined ? propAssignments : assignments;
    return normalizeFeeAssignments(source);
  }, [propAssignments, assignments]);

  const safePayments = useMemo<FeePayment[]>(() => {
    return Array.isArray(payments) ? payments : [];
  }, [payments]);

  const safeStructures = useMemo<FeeStructure[]>(() => {
    return Array.isArray(structures) ? structures : [];
  }, [structures]);

  const safeConcessions = useMemo<FeeConcession[]>(() => {
    return Array.isArray(concessions) ? concessions : [];
  }, [concessions]);

  const safeExpenses = useMemo<SchoolExpense[]>(() => {
    return Array.isArray(expenses) ? expenses : [];
  }, [expenses]);

  const safeReminders = useMemo<FeeReminder[]>(() => {
    return Array.isArray(reminders) ? reminders : [];
  }, [reminders]);

  const safeCategories = useMemo<FeeCategory[]>(() => {
    return Array.isArray(categories) ? categories : [];
  }, [categories]);

  const safeExpenseCategories = useMemo<ExpenseCategory[]>(() => {
    return Array.isArray(expenseCategories) ? expenseCategories : [];
  }, [expenseCategories]);

  // Filtered Assignments (safe to execute .filter on guaranteed array)
  const filteredAssignments = useMemo(() => {
    return safeAssignments.filter((a) => {
      if (!a || typeof a !== 'object') return false;
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      const matchesSearch =
        (typeof a.student_name === 'string' && a.student_name.toLowerCase().includes(term)) ||
        (typeof a.admission_number === 'string' && a.admission_number.toLowerCase().includes(term)) ||
        (typeof a.class_name === 'string' && a.class_name.toLowerCase().includes(term)) ||
        (typeof a.parent_name === 'string' && a.parent_name.toLowerCase().includes(term));
      return matchesSearch;
    });
  }, [safeAssignments, searchTerm]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return safePayments.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.admission_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.payment_mode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.transaction_reference?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [safePayments, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Multi-School Selector Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Phase 6 Production Ready
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 bg-slate-800 rounded-full">
                Multi-School Fiscal Ledger
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <IndianRupee className="w-6 h-6 text-emerald-400" />
              Fees & Accounts Management
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Fee structures, student assignments, cashier collections, money receipts, concessions, and student ledgers
            </p>
          </div>

          {/* School & Session Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400 ml-2" />
              <select
                value={selectedSchoolId}
                onChange={(e) => handleSchoolChange(e.target.value)}
                disabled={user?.roleName !== 'super_admin'}
                className="bg-transparent text-white text-xs font-semibold focus:outline-hidden pr-2 cursor-pointer"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400 ml-2" />
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold focus:outline-hidden pr-2 cursor-pointer"
              >
                {sessions
                  .filter((s) => s.school_id === selectedSchoolId)
                  .map((sess) => (
                    <option key={sess.id} value={sess.id} className="bg-slate-900 text-white">
                      Session {sess.name} {sess.is_current ? '(Current)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            {hasPermission('fees.collect') && (
              <button
                onClick={() => {
                  setTargetStudentIdForCollect(null);
                  setCollectModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                Collect Fee
              </button>
            )}

            {/* Download Report Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Report</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDownloadMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDownloadMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      Audit & Finance Exports
                    </div>
                    <button
                      onClick={() => {
                        setShowDownloadMenu(false);
                        handleExportPdfReport();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Fee Audit Summary (PDF)</div>
                        <div className="text-[10px] text-slate-400">Auditor signed revenue report</div>
                      </div>
                    </button>
                    <a
                      href={api.fees.exportCollectionCsvUrl(selectedSchoolId)}
                      download
                      onClick={() => setShowDownloadMenu(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Fee Collections (CSV)</div>
                        <div className="text-[10px] text-slate-400">Complete itemized receipts</div>
                      </div>
                    </a>
                    <a
                      href={api.fees.exportDuesCsvUrl(selectedSchoolId)}
                      download
                      onClick={() => setShowDownloadMenu(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <TrendingDown className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Outstanding Dues (CSV)</div>
                        <div className="text-[10px] text-slate-400">Student overdue balances</div>
                      </div>
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation Strip */}
        <div className="flex items-center gap-1 mt-6 pt-4 border-t border-slate-800 overflow-x-auto no-scrollbar text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('collect')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'collect'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Fee Collection Desk
          </button>

          <button
            onClick={() => setActiveTab('structures')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'structures'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Fee Plans & Categories
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'assignments'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Student Fee Roster
          </button>

          <button
            onClick={() => setActiveTab('concessions')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'concessions'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Scholarships & Concessions
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'transactions'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Receipts & Transactions
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'expenses'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Operating Expenses
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'reminders'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Dues & Notices
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Financial Reports
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. DASHBOARD & OVERVIEW TAB */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Financial KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Demand</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                ₹{Number(stats?.summary?.totalDemand || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400">Total session billing</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Collected Fees</span>
              <div className="text-xl font-black text-emerald-800 font-mono mt-1">
                ₹{Number(stats?.summary?.totalCollected || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Realized revenue</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Outstanding Dues</span>
              <div className="text-xl font-black text-rose-800 font-mono mt-1">
                ₹{Number(stats?.summary?.totalDues || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-rose-600 font-medium">Pending student balances</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs bg-purple-50/20">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Concessions / Aid</span>
              <div className="text-xl font-black text-purple-800 font-mono mt-1">
                ₹{Number(stats?.summary?.totalConcessions || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-purple-600 font-medium">Scholarships sanctioned</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Operating Expenses</span>
              <div className="text-xl font-black text-amber-900 font-mono mt-1">
                ₹{Number(stats?.summary?.totalExpenses || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-amber-600 font-medium">Booked campus costs</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs bg-indigo-50/20">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Net Cash Surplus</span>
              <div
                className={`text-xl font-black font-mono mt-1 ${
                  (stats?.summary?.netCashFlow || 0) >= 0 ? 'text-indigo-900' : 'text-rose-700'
                }`}
              >
                ₹{Number(stats?.summary?.netCashFlow || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-indigo-600 font-medium">Collections minus expenses</span>
            </div>
          </div>

          {/* Overdue Alert Banner */}
          {stats && stats.overdue?.count > 0 && (
            <div className="bg-gradient-to-r from-rose-900 to-rose-800 text-white p-4 rounded-xl shadow-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-700/50 rounded-lg text-rose-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Overdue Fee Attention Required</h4>
                  <p className="text-xs text-rose-200">
                    <span className="font-bold">{stats.overdue.count} student installments</span> have crossed due dates representing{' '}
                    <span className="font-mono font-bold text-white">
                      ₹{Number(stats.overdue.amount).toLocaleString('en-IN')}
                    </span>{' '}
                    in uncollected school fees.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('reminders')}
                className="px-3.5 py-1.5 text-xs font-bold bg-white text-rose-900 hover:bg-rose-100 rounded-lg transition-colors whitespace-nowrap shadow-xs"
              >
                View Overdue Register
              </button>
            </div>
          )}

          {/* Today's Collection & Payment Mode Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Today's Collection Register
              </h3>
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl mb-4 text-center">
                <span className="text-xs font-medium text-emerald-700">Total Money Collected Today</span>
                <div className="text-2xl font-black text-emerald-900 font-mono mt-1">
                  ₹{Number(stats?.todayCollection?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {stats?.todayCollection?.transactionCount || 0} Successful Transactions
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Breakdown by Payment Mode:</h4>
                <div className="space-y-2">
                  {stats?.todayCollection?.byMode && stats.todayCollection.byMode.length > 0 ? (
                    stats.todayCollection.byMode.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="font-semibold text-slate-700">{m.payment_mode}</span>
                        <div className="text-right font-mono">
                          <span className="font-bold text-slate-900">
                            ₹{Number(m.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1.5">({m.count} txns)</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-4 italic">
                      No counter transactions recorded today yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Payments Feed */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  Recent Transaction Vouchers
                </h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  View All Receipts →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                      stats.recentTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                            {tx.receipt_number}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{tx.student_name}</div>
                            <div className="text-slate-400 text-[10px]">
                              {tx.class_name} • Adm: {tx.admission_number}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {tx.payment_date?.split('T')[0]} {tx.payment_time ? `• ${tx.payment_time}` : ''}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {tx.payment_mode}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.status === 'SUCCESS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : tx.status === 'REVERSED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleOpenReceipt(tx.receipt_number)}
                              className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                            >
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. COLLECT FEES DESK TAB */}
      {/* ============================================================== */}
      {activeTab === 'collect' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="max-w-2xl mx-auto text-center py-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Fee Counter Collection Terminal</h2>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Search student by Admission Number, Roll Number, Name, Class, or Parent Mobile to collect fees, print vouchers, and verify bank payments.
              </p>
              <button
                onClick={() => {
                  setTargetStudentIdForCollect(null);
                  setCollectModalOpen(true);
                }}
                className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Launch Quick Collection Counter
              </button>
            </div>
          </div>

          {/* Quick Roster of Students with Active Fee Plans */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="font-bold text-sm text-slate-800">Assigned Students Fee Status</h3>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by student, admission no, parent..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Cards (shown on small screens) */}
            <div className="space-y-3 md:hidden">
              {filteredAssignments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No fee records found matching your search.
                </div>
              ) : (
                filteredAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{a.student_name}</div>
                        <div className="text-slate-500 text-xs">
                          {a.class_name} {a.section_name ? `(${a.section_name})` : ''} • Adm: <span className="font-mono font-medium">{a.admission_number}</span>
                        </div>
                        {a.parent_mobile && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Parent: {a.parent_name || 'Guardian'} ({a.parent_mobile})
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          a.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.status === 'PARTIALLY_PAID'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-white rounded-lg border border-slate-200/80 text-center">
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Total</div>
                        <div className="font-mono text-xs font-bold text-slate-800">
                          ₹{Number(a.total_charges).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-600 font-semibold uppercase">Paid</div>
                        <div className="font-mono text-xs font-bold text-emerald-700">
                          ₹{Number(a.paid_amount).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-rose-600 font-semibold uppercase">Due</div>
                        <div className="font-mono text-xs font-black text-rose-700">
                          ₹{Number(a.outstanding_balance).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          setTargetStudentIdForCollect(a.student_id);
                          setCollectModalOpen(true);
                        }}
                        className="w-full min-h-[44px] px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Collect Fee
                      </button>
                      <button
                        onClick={() => handleOpenLedger(a.student_id)}
                        className="w-full min-h-[44px] px-3 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 active:scale-[0.98] text-indigo-700 border border-indigo-200 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View Ledger
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table (hidden on mobile) */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Class & Section</th>
                    <th className="py-2.5 px-3">Parent Contact</th>
                    <th className="py-2.5 px-3 text-right">Total Charges</th>
                    <th className="py-2.5 px-3 text-right">Paid Amount</th>
                    <th className="py-2.5 px-3 text-right">Balance Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{a.student_name}</div>
                        <div className="text-slate-400 text-[10px] font-mono">Adm: {a.admission_number}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {a.class_name} {a.section_name ? `(${a.section_name})` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div>{a.parent_name || 'Guardian'}</div>
                        <div className="text-[10px] text-slate-400">{a.parent_mobile}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        ₹{Number(a.total_charges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        ₹{Number(a.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700">
                        ₹{Number(a.outstanding_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.status === 'PARTIALLY_PAID'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setTargetStudentIdForCollect(a.student_id);
                            setCollectModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                        >
                          Collect
                        </button>
                        <button
                          onClick={() => handleOpenLedger(a.student_id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded transition-colors"
                        >
                          Ledger
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
      {/* 3. FEE PLANS & CATEGORIES TAB */}
      {/* ============================================================== */}
      {activeTab === 'structures' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="font-bold text-base text-slate-900">Configured Fee Plans</h2>
              <p className="text-xs text-slate-500">
                School-wide fee schedules, frequencies, and fee head items
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCategoryModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-300"
              >
                + Fee Category
              </button>
              <button
                onClick={() => {
                  setEditingStructure(null);
                  setStructureModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Fee Plan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {safeStructures.map((st) => (
              <div
                key={st.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                      {st.code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {st.frequency}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{st.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{st.description || 'Standard academic plan'}</p>

                  {/* Components */}
                  <div className="border-t border-slate-100 pt-3 mb-3">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Fee Heads ({st.items?.length || 0}):
                    </div>
                    <div className="space-y-1">
                      {st.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-600">
                          <span>{it.category_name || it.category_id}</span>
                          <span className="font-mono font-semibold text-slate-900">
                            ₹{Number(it.amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {st.is_locked ? (
                      <span className="text-amber-700 font-semibold flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" /> Locked (Active Ledgers)
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold text-[11px]">Configurable</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditingStructure(st);
                      setStructureModalOpen(true);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Edit Plan →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. STUDENT FEE ROSTER / ASSIGNMENTS TAB */}
      {/* ============================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-base text-slate-900">Student Fee Assignments</h2>
              <p className="text-xs text-slate-500">Manage plan allocations and individual ledger balances</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setClassAssignModalOpen(true)}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                Bulk Assign to Class
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  <option value="all">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  <option value="all">All Statuses</option>
                  <option value="PAID">PAID</option>
                  <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter student or admission no..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Fee Plan</th>
                    <th className="py-2.5 px-3 text-right">Net Payable</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Outstanding</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{a.student_name}</div>
                        <div className="text-slate-400 text-[10px] font-mono">Adm: {a.admission_number}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {a.class_name} {a.section_name ? `(${a.section_name})` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{a.structure_name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        ₹{Number(a.net_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        ₹{Number(a.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700">
                        ₹{Number(a.outstanding_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.status === 'PARTIALLY_PAID'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setTargetAssignmentForConcession(a);
                            setConcessionModalOpen(true);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100"
                        >
                          Concession
                        </button>
                        <button
                          onClick={() => handleOpenLedger(a.student_id)}
                          className="px-2 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100"
                        >
                          Ledger
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
      {/* 5. SCHOLARSHIPS & CONCESSIONS TAB */}
      {/* ============================================================== */}
      {activeTab === 'concessions' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-slate-900">Sanctioned Scholarships & Fee Adjustments</h2>
              <p className="text-xs text-slate-500">
                Merit scholarships, sibling discounts, and authorized financial aid ledger adjustments
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Concession Category</th>
                    <th className="py-2.5 px-3">Type & Value</th>
                    <th className="py-2.5 px-3 text-right">Adjustment (₹)</th>
                    <th className="py-2.5 px-3">Justification Reason</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeConcessions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{c.student_name}</div>
                        <div className="text-slate-400 text-[10px] font-mono">Adm: {c.admission_number}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-purple-700">{c.concession_type}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {c.discount_type === 'FIXED' ? `₹${c.discount_value}` : `${c.discount_value}%`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-900">
                        ₹{Number(c.calculated_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={c.reason}>
                        {c.reason}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {c.status === 'PENDING' && hasPermission('fees.concession.approve') ? (
                          <button
                            onClick={() => setReviewingConcession(c)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                          >
                            Review & Approve
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {c.approved_by_name ? `By: ${c.approved_by_name}` : 'Completed'}
                          </span>
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
      {/* 6. RECEIPTS & TRANSACTIONS TAB */}
      {/* ============================================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-base text-slate-900">Fee Payment Transaction Ledger</h2>
              <p className="text-xs text-slate-500">Official cash and digital collection vouchers with reprint audit</p>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search receipt no, student..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 w-64"
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Receipt No</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Mode & Ref</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3">Cashier</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                        {p.receipt_number}
                        {(p.reprint_count || 0) > 0 && (
                          <span className="block text-[9px] text-amber-700 font-sans font-bold">
                            Reprinted x{p.reprint_count}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{p.student_name}</div>
                        <div className="text-slate-400 text-[10px] font-mono">Adm: {p.admission_number}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {p.payment_date?.split('T')[0]} {p.payment_time ? `• ${p.payment_time}` : ''}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{p.payment_mode}</div>
                        <div className="text-slate-400 text-[10px] font-mono truncate max-w-xs">
                          {p.transaction_reference || p.cheque_number || '—'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">{p.collected_by_name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'REVERSED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenReceipt(p.receipt_number)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded transition-colors"
                        >
                          View Voucher
                        </button>
                        {p.status === 'SUCCESS' && hasPermission('fees.reversal.manage') && (
                          <button
                            onClick={() => {
                              setTargetPaymentForReversal(p);
                              setReversalModalOpen(true);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded transition-colors"
                            title="Reverse transaction"
                          >
                            Reverse
                          </button>
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
      {/* 7. OPERATING EXPENSES TAB */}
      {/* ============================================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-slate-900">School Operating Expenses Register</h2>
              <p className="text-xs text-slate-500">
                Book campus overheads, maintenance, laboratory supplies, and athletic inventory
              </p>
            </div>
            <button
              onClick={() => setExpenseModalOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Book Operating Expense
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Payee / Vendor</th>
                    <th className="py-2.5 px-3">Invoice / Ref No</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3">Booked By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{exp.expense_date}</td>
                      <td className="py-2.5 px-3 font-semibold text-rose-700">{exp.category_name}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{exp.payee_vendor}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{exp.reference_no || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={exp.description}>
                        {exp.description}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-800">
                        ₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{exp.created_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. DUES & REMINDERS TAB */}
      {/* ============================================================== */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-slate-900">Fee Due Notices & Parent Communication</h2>
              <p className="text-xs text-slate-500">
                Log telephonic reminders, printed notices, and parent payment commitments
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overdue Students Seeking Followup */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Students with Pending Balances
              </h3>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {safeAssignments
                  .filter((a) => (Number(a.outstanding_balance) || 0) > 0)
                  .map((a) => (
                    <div key={a.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900">{a.student_name}</div>
                        <div className="text-slate-500 text-[11px]">
                          {a.class_name} • Parent: <span className="font-semibold">{a.parent_name}</span> ({a.parent_mobile})
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-rose-700">
                          ₹{Number(a.outstanding_balance).toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => {
                            setTargetAssignmentForReminder(a);
                            setReminderModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition-colors"
                        >
                          Log Notice
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Previously Logged Reminders Feed */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                Recorded Reminder History
              </h3>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {safeReminders.map((r) => (
                  <div key={r.id} className="p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{r.student_name}</span>
                      <span className="text-[10px] text-slate-400">{r.created_at?.split('T')[0]}</span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Channel: <span className="font-semibold text-slate-800">{r.channel}</span> • Target Due Date:{' '}
                      <span className="font-semibold text-indigo-700">{r.target_due_date || 'Pending'}</span>
                    </div>
                    <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 italic">
                      "{r.message_text}"
                    </p>
                    <div className="text-[10px] text-slate-400">Logged by: {r.created_by_name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. FINANCIAL REPORTS TAB */}
      {/* ============================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-base text-slate-900">School Financial Reports & Exports</h2>
              <p className="text-xs text-slate-500">
                Official accounts export for auditor verification, bank reconciliation, and board submissions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={api.fees.exportCollectionCsvUrl(selectedSchoolId)}
                download
                className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Collection CSV
              </a>
              <a
                href={api.fees.exportDuesCsvUrl(selectedSchoolId)}
                download
                className="px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Outstanding Dues CSV
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-800">Daily Cashier Collection Tallies</h3>
              <p className="text-xs text-slate-500">
                Summary of cash counter, bank transfers, and UPI reconciliations collected today.
              </p>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Money Collected:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(stats?.todayCollection?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Transactions Count:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {stats?.todayCollection?.transactionCount || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-800">Fiscal Performance Summary</h3>
              <p className="text-xs text-slate-500">
                Academic session revenue realization, outstanding collection efficiency, and expense overheads.
              </p>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Collection Efficiency:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {stats?.summary?.totalDemand
                      ? `${Math.round(((stats.summary.totalCollected || 0) / stats.summary.totalDemand) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Uncollected Deficit:</span>
                  <span className="font-mono font-bold text-rose-700">
                    ₹{Number(stats?.summary?.totalDues || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REVIEW CONCESSION MODAL */}
      {/* ============================================================== */}
      {reviewingConcession && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-purple-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Review Concession Request</h3>
                  <p className="text-xs text-purple-300">Authorized Principal Evaluation</p>
                </div>
              </div>
              <button
                onClick={() => setReviewingConcession(null)}
                className="p-1.5 text-purple-300 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-1">
                <div className="font-bold text-purple-900">
                  Student: {reviewingConcession.student_name} ({reviewingConcession.admission_number})
                </div>
                <div className="text-purple-700">
                  Type: <span className="font-semibold">{reviewingConcession.concession_type}</span> • Value:{' '}
                  <span className="font-mono font-bold">
                    {reviewingConcession.discount_type === 'FIXED'
                      ? `₹${reviewingConcession.discount_value}`
                      : `${reviewingConcession.discount_value}%`}
                  </span>
                </div>
                <div className="text-purple-900 font-black">
                  Calculated Adjustment: ₹{Number(reviewingConcession.calculated_amount).toLocaleString('en-IN')}
                </div>
                <div className="text-slate-600 italic pt-1">"{reviewingConcession.reason}"</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Principal / Reviewer Remarks
                </label>
                <textarea
                  rows={2}
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="e.g. Verified Science Olympiad Merit Certificate. 100% approved per CBSE merit rule."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={processingReview}
                  onClick={() => handleReviewConcessionSubmit('REJECTED')}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  disabled={processingReview}
                  onClick={() => handleReviewConcessionSubmit('APPROVED')}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Post to Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals Mounting */}
      <FeeReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receiptNumber={targetReceiptNumber}
        initialPayload={initialReceiptPayload}
        onReceiptUpdated={loadTabData}
      />

      <StudentLedgerModal
        isOpen={ledgerModalOpen}
        onClose={() => setLedgerModalOpen(false)}
        studentId={targetStudentIdForLedger}
        onViewReceipt={(rcpt) => {
          setLedgerModalOpen(false);
          handleOpenReceipt(rcpt);
        }}
      />

      <CollectPaymentModal
        isOpen={collectModalOpen}
        onClose={() => setCollectModalOpen(false)}
        studentId={targetStudentIdForCollect}
        schoolId={selectedSchoolId}
        onPaymentSuccess={(rcpt) => {
          setInitialReceiptPayload(rcpt);
          setTargetReceiptNumber(rcpt.receiptNumber);
          setReceiptModalOpen(true);
          loadTabData();
        }}
      />

      <FeeStructureModal
        isOpen={structureModalOpen}
        onClose={() => setStructureModalOpen(false)}
        structure={editingStructure}
        schools={schools}
        sessions={sessions}
        classes={classes}
        categories={safeCategories}
        onSaved={loadTabData}
      />

      <FeeCategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        schools={schools}
        currentSchoolId={selectedSchoolId}
        onSaved={async () => {
          const cats = await api.fees.getCategories(selectedSchoolId);
          setCategories(Array.isArray(cats) ? cats : (cats as any)?.categories || []);
        }}
      />

      <ClassFeeAssignModal
        isOpen={classAssignModalOpen}
        onClose={() => setClassAssignModalOpen(false)}
        schools={schools}
        sessions={sessions}
        classes={classes}
        structures={safeStructures}
        currentSchoolId={selectedSchoolId}
        currentSessionId={selectedSessionId}
        onAssigned={loadTabData}
      />

      <ConcessionModal
        isOpen={concessionModalOpen}
        onClose={() => setConcessionModalOpen(false)}
        assignment={targetAssignmentForConcession}
        onSuccess={loadTabData}
      />

      <ReversalModal
        isOpen={reversalModalOpen}
        onClose={() => setReversalModalOpen(false)}
        payment={targetPaymentForReversal}
        onSuccess={loadTabData}
      />

      <FeeExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        schools={schools}
        categories={safeExpenseCategories}
        currentSchoolId={selectedSchoolId}
        onSaved={loadTabData}
      />

      <FeeReminderModal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        assignment={targetAssignmentForReminder}
        onSuccess={loadTabData}
      />
    </div>
  );
};
