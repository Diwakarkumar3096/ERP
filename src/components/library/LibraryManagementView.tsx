import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type {
  LibraryDashboardStats,
  LibrarySettings,
  LibraryFacility,
  BookCategory,
  BookAuthor,
  BookPublisher,
  BookLocation,
  BookTitle,
  BookCopy,
  LibraryMember,
  BookIssue,
  BookReservation,
  LibraryFine,
  InventoryAudit
} from '../../types/erp.js';
import {
  BookOpen,
  LayoutDashboard,
  ArrowRight,
  RotateCcw,
  BookPlus,
  Layers,
  Users,
  Bookmark,
  AlertTriangle,
  CreditCard,
  ClipboardCheck,
  BarChart3,
  Settings,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  FileText,
  IndianRupee,
  RefreshCw,
  Bell,
  Eye,
  QrCode,
  X
} from 'lucide-react';

import { AddBookModal } from './AddBookModal.js';
import { AddCopyModal } from './AddCopyModal.js';
import { IssueBookModal } from './IssueBookModal.js';
import { ReturnBookModal } from './ReturnBookModal.js';
import { LibraryCardModal } from './LibraryCardModal.js';
import { CollectFineModal } from './CollectFineModal.js';
import { WaiveFineModal } from './WaiveFineModal.js';

type LibraryTab =
  | 'dashboard'
  | 'desk'
  | 'catalog'
  | 'copies'
  | 'members'
  | 'reservations'
  | 'overdue'
  | 'fines'
  | 'audit'
  | 'reports'
  | 'settings';

export const LibraryManagementView: React.FC = () => {
  const { activeSchool, user, hasPermission } = useAuth();
  const { showToast } = useToast();
  const schoolId = activeSchool?.id || 'sch_vvps';

  const [activeTab, setActiveTab] = useState<LibraryTab>('dashboard');
  const [loading, setLoading] = useState(false);

  // Core Data States
  const [stats, setStats] = useState<LibraryDashboardStats | null>(null);
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [branches, setBranches] = useState<LibraryFacility[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [authors, setAuthors] = useState<BookAuthor[]>([]);
  const [publishers, setPublishers] = useState<BookPublisher[]>([]);
  const [locations, setLocations] = useState<BookLocation[]>([]);

  // Catalog & Copies
  const [books, setBooks] = useState<BookTitle[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<BookTitle | null>(null);
  const [bookDetailsCopies, setBookDetailsCopies] = useState<BookCopy[]>([]);
  const [bookDetailsReservations, setBookDetailsReservations] = useState<BookReservation[]>([]);

  // Desk State
  const [deskScanTerm, setDeskScanTerm] = useState('');
  const [deskScannedCopy, setDeskScannedCopy] = useState<BookCopy | null>(null);
  const [deskMemberTerm, setDeskMemberTerm] = useState('');
  const [deskScannedMember, setDeskScannedMember] = useState<LibraryMember | null>(null);

  // Members & Cards
  const [members, setMembers] = useState<LibraryMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberForCard, setSelectedMemberForCard] = useState<LibraryMember | null>(null);

  // Circulation
  const [reservations, setReservations] = useState<BookReservation[]>([]);
  const [overdueBooks, setOverdueBooks] = useState<BookIssue[]>([]);
  const [fines, setFines] = useState<LibraryFine[]>([]);
  const [audits, setAudits] = useState<InventoryAudit[]>([]);

  // Modals
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isAddCopyModalOpen, setIsAddCopyModalOpen] = useState(false);
  const [selectedBookForAddCopy, setSelectedBookForAddCopy] = useState<BookTitle | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedIssueForReturn, setSelectedIssueForReturn] = useState<BookIssue | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isCollectFineModalOpen, setIsCollectFineModalOpen] = useState(false);
  const [selectedFineForCollect, setSelectedFineForCollect] = useState<LibraryFine | null>(null);
  const [isWaiveFineModalOpen, setIsWaiveFineModalOpen] = useState(false);
  const [selectedFineForWaive, setSelectedFineForWaive] = useState<LibraryFine | null>(null);

  // Load Initial Data
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        settingsRes,
        branchesRes,
        catRes,
        authRes,
        pubRes,
        locRes,
        booksRes,
        membersRes,
        resvRes,
        overdueRes,
        finesRes,
        auditsRes
      ] = await Promise.all([
        api.library.getDashboardStats(schoolId),
        api.library.getSettings(schoolId),
        api.library.getBranches(schoolId),
        api.library.getCategories(schoolId),
        api.library.getAuthors(schoolId),
        api.library.getPublishers(schoolId),
        api.library.getLocations(schoolId),
        api.library.getBooks({ schoolId, limit: 50 }),
        api.library.getMembers({ schoolId }),
        api.library.getReservations({ schoolId }),
        api.library.getOverdueBooks(schoolId),
        api.library.getFines({ schoolId }),
        api.library.getAudits(schoolId)
      ]);

      setStats(statsRes);
      setSettings(settingsRes.settings);
      setBranches(branchesRes.libraries || []);
      setCategories(catRes.categories || []);
      setAuthors(authRes.authors || []);
      setPublishers(pubRes.publishers || []);
      setLocations(locRes.locations || []);
      setBooks(booksRes.books || []);
      setMembers(membersRes.members || []);
      setReservations(resvRes.reservations || []);
      setOverdueBooks(overdueRes.overdueBooks || []);
      setFines(finesRes.fines || []);
      setAudits(auditsRes.audits || []);
    } catch (err: any) {
      console.warn('[LIBRARY LOAD ERROR]', err);
      showToast(err.message || 'Failed to load library records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  // Desk Fast Scan Copy
  const handleDeskScanCopy = async () => {
    if (!deskScanTerm.trim()) return;
    try {
      const res = await api.library.lookupCopy(deskScanTerm.trim(), schoolId);
      setDeskScannedCopy(res.copy);
      showToast(`Scanned: ${res.copy.book_title} (Status: ${res.copy.status})`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Book copy not found.', 'error');
      setDeskScannedCopy(null);
    }
  };

  // Desk Fast Scan Member
  const handleDeskScanMember = async () => {
    if (!deskMemberTerm.trim()) return;
    try {
      const res = await api.library.lookupMember(deskMemberTerm.trim(), schoolId);
      if (res.members && res.members.length > 0) {
        setDeskScannedMember(res.members[0]);
        showToast(`Member Identified: ${res.members[0].name}`, 'info');
      } else {
        showToast('Member not found.', 'error');
        setDeskScannedMember(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Member lookup error.', 'error');
    }
  };

  // Quick Renew
  const handleRenewIssue = async (issueId: string) => {
    try {
      const res = await api.library.renewBook(issueId, { schoolId, reason: 'Librarian desk renewal' });
      showToast(res.message, 'success');
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to renew book.', 'error');
    }
  };

  // Batch Reminders
  const handleSendBatchReminders = async () => {
    try {
      const res = await api.library.sendBatchOverdueReminders(schoolId);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch reminders.', 'error');
    }
  };

  // View Book Details Modal
  const handleOpenBookDetails = async (book: BookTitle) => {
    setSelectedBookForDetails(book);
    try {
      const res = await api.library.getBookDetails(book.id, schoolId);
      setBookDetailsCopies(res.copies || []);
      setBookDetailsReservations(res.reservations || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load copies.', 'error');
    }
  };

  // Filtered books
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      !catalogSearch ||
      b.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      b.author_name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (b.isbn && b.isbn.toLowerCase().includes(catalogSearch.toLowerCase()));
    const matchesCat = !selectedCategoryFilter || b.category_id === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & School Context */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-linear-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-md">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Library & Learning Media Center
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Phase 10 Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Multi-school cataloging, physical accession barcodes, circulation desk, and Accounts-integrated fines.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Issue Book</span>
          </button>
          <button
            onClick={() => setIsReturnModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Return Book</span>
          </button>
          <button
            onClick={() => setIsAddBookModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Catalog Book</span>
          </button>
          <button
            onClick={loadInitialData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh Library Records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Subtabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none text-xs font-semibold">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'desk', label: 'Circulation Desk', icon: ArrowRight },
          { id: 'catalog', label: 'Book Catalog', icon: BookOpen },
          { id: 'copies', label: 'Physical Copies', icon: Layers },
          { id: 'members', label: 'Members & Cards', icon: Users },
          { id: 'reservations', label: 'Reservations', icon: Bookmark },
          { id: 'overdue', label: 'Overdue Books', icon: AlertTriangle, badge: stats?.overdueCopies },
          { id: 'fines', label: 'Fines & Accounts', icon: IndianRupee },
          { id: 'audit', label: 'Stock Verification', icon: ClipboardCheck },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
          { id: 'settings', label: 'Policies & Settings', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as LibraryTab)}
              className={`px-3.5 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 1. DASHBOARD VIEW */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* KPI Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Book Titles</span>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.totalBookTitles}</p>
              <span className="text-[10px] text-indigo-600 font-semibold mt-1 inline-block">Catalog Volumes</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Total Copies</span>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.totalCopies}</p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">
                {stats.availableCopies} Available
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Currently Issued</span>
              <p className="text-2xl font-bold font-mono text-indigo-600 mt-1">{stats.issuedCopies}</p>
              <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">In Circulation</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Overdue Books</span>
              <p className="text-2xl font-bold font-mono text-rose-600 mt-1">{stats.overdueCopies}</p>
              <span className="text-[10px] text-rose-600 font-semibold mt-1 inline-block">Action Required</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Active Members</span>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.totalMembers}</p>
              <span className="text-[10px] text-indigo-600 font-semibold mt-1 inline-block">
                {stats.activeStudents} Stu / {stats.activeStaff} Staff
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Outstanding Fines</span>
              <p className="text-2xl font-bold font-mono text-amber-600 mt-1">₹{stats.outstandingFines.toFixed(0)}</p>
              <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">
                ₹{stats.collectedFines.toFixed(0)} Collected
              </span>
            </div>
          </div>

          {/* Due Today & Quick Desk Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Due Alerts Card */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Due Date Monitor
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Real-time
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
                  <span className="text-[11px] font-semibold text-amber-900">Books Due Today</span>
                  <p className="text-2xl font-bold font-mono text-amber-900 mt-1">{stats.booksDueToday}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 text-center">
                  <span className="text-[11px] font-semibold text-indigo-900">Due This Week</span>
                  <p className="text-2xl font-bold font-mono text-indigo-900 mt-1">{stats.booksDueThisWeek}</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('overdue')}
                  className="w-full py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer text-center block"
                >
                  View Overdue Ledger & Dispatch Reminders →
                </button>
              </div>
            </div>

            {/* Popular Books in Circulation */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Most Borrowed Titles
                </h3>
                <span className="text-xs text-slate-500">Based on checkout transactions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {stats.popularBooks.map((b, i) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 font-mono font-bold text-slate-600 flex items-center justify-center text-[11px]">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{b.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {b.author_name} • {b.category_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                        {b.borrow_count} Checkouts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Circulation Stream */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Recent Circulation Transactions
              </h3>
              <button
                onClick={() => setActiveTab('desk')}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Go to Circulation Desk →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-y border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Book Title</th>
                    <th className="py-2.5 px-3">Accession #</th>
                    <th className="py-2.5 px-3">Borrower</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {stats.recentIssues.map((iss) => (
                    <tr key={iss.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500">{iss.issue_date}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{iss.book_title}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-600 font-bold">{iss.accession_number}</td>
                      <td className="py-2.5 px-3 text-slate-700">{iss.member_name}</td>
                      <td className="py-2.5 px-3 font-mono">{iss.due_date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          iss.status === 'ISSUED'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : iss.status === 'OVERDUE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {iss.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {iss.status !== 'RETURNED' && (
                          <button
                            onClick={() => {
                              setSelectedIssueForReturn(iss);
                              setIsReturnModalOpen(true);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            Check-in
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

      {/* ========================================================= */}
      {/* 2. CIRCULATION DESK (HIGH SPEED BARCODE WORKFLOW) */}
      {/* ========================================================= */}
      {activeTab === 'desk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Desk: Scan Member */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  1. Member Card Scanner
                </h3>
                {deskScannedMember && (
                  <button
                    onClick={() => setDeskScannedMember(null)}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear Member
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={deskMemberTerm}
                  onChange={(e) => setDeskMemberTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleDeskScanMember())}
                  placeholder="Scan member card or enter admission/employee ID..."
                  className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  onClick={handleDeskScanMember}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Lookup
                </button>
              </div>

              {deskScannedMember ? (
                <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{deskScannedMember.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {deskScannedMember.member_type}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Card: <strong className="font-mono">{deskScannedMember.card_number}</strong> • Mem: {deskScannedMember.membership_number}
                  </p>
                  <p className="text-slate-500">{deskScannedMember.subtext || deskScannedMember.details_summary}</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-indigo-100">
                    <span>Active Borrowed: <strong>{deskScannedMember.active_books_count || 0} books</strong></span>
                    <span>Outstanding Dues: <strong className="text-amber-700">₹{deskScannedMember.outstanding_fines || 0}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  Scan library ID card to begin transaction.
                </div>
              )}
            </div>

            {/* Right Desk: Scan Book Copy */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  2. Physical Book Barcode Scanner
                </h3>
                {deskScannedCopy && (
                  <button
                    onClick={() => setDeskScannedCopy(null)}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear Book
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={deskScanTerm}
                  onChange={(e) => setDeskScanTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleDeskScanCopy())}
                  placeholder="Scan book barcode or enter Accession number..."
                  className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  onClick={handleDeskScanCopy}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Lookup
                </button>
              </div>

              {deskScannedCopy ? (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{deskScannedCopy.book_title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      deskScannedCopy.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {deskScannedCopy.status}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Acc#: <strong className="font-mono text-indigo-700">{deskScannedCopy.accession_number}</strong> • Barcode: {deskScannedCopy.barcode}
                  </p>
                  <p className="text-slate-500">
                    Author: {deskScannedCopy.author_name} • Shelf: {deskScannedCopy.location_name || 'General'}
                  </p>
                  {deskScannedCopy.borrower_name && (
                    <div className="pt-2 border-t border-slate-200 text-slate-700">
                      Currently checked out by: <strong>{deskScannedCopy.borrower_name}</strong> (Due: {deskScannedCopy.due_date})
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  Scan book barcode or enter accession number.
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger Bar */}
          <div className="p-5 rounded-2xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Execute Desk Action</h4>
              <p className="text-xs text-indigo-200">
                {deskScannedCopy && deskScannedCopy.status === 'AVAILABLE' && deskScannedMember
                  ? `Ready to issue "${deskScannedCopy.book_title}" to ${deskScannedMember.name}`
                  : deskScannedCopy && deskScannedCopy.status !== 'AVAILABLE'
                  ? `Ready to check in "${deskScannedCopy.book_title}"`
                  : 'Select or scan member and book copy above'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {deskScannedCopy && deskScannedCopy.status !== 'AVAILABLE' ? (
                <button
                  onClick={() => {
                    setSelectedIssueForReturn({
                      id: deskScannedCopy.current_issue_id || '',
                      school_id: schoolId,
                      library_id: deskScannedCopy.library_id,
                      member_id: '',
                      book_copy_id: deskScannedCopy.id,
                      book_id: deskScannedCopy.book_id,
                      issue_date: deskScannedCopy.issue_date || '',
                      due_date: deskScannedCopy.due_date || '',
                      issued_by: 'Staff',
                      status: 'ISSUED',
                      renewal_count: 0,
                      fine_amount: 0,
                      book_title: deskScannedCopy.book_title,
                      accession_number: deskScannedCopy.accession_number,
                      member_name: deskScannedCopy.borrower_name,
                      created_at: new Date().toISOString()
                    });
                    setIsReturnModalOpen(true);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Accept Return / Check-In
                </button>
              ) : (
                <button
                  disabled={!deskScannedMember || !deskScannedCopy || deskScannedCopy.status !== 'AVAILABLE'}
                  onClick={() => setIsIssueModalOpen(true)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Complete Checkout / Issue
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. BOOK CATALOG */}
      {/* ========================================================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Controls: Search, Filter, Add */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search catalog by title, author, ISBN..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsAddBookModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <BookPlus className="w-4 h-4" />
              <span>Catalog New Book</span>
            </button>
          </div>

          {/* Book Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between hover:border-indigo-200 transition-all space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                      {b.category_name || 'General'}
                    </span>
                    {b.reference_only && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                        Ref Only
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">{b.title}</h3>
                  <p className="text-xs text-indigo-700 font-medium">{b.author_name}</p>
                  {b.subtitle && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{b.subtitle}</p>}

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 font-mono">
                    <span>ISBN: {b.isbn || 'N/A'}</span>
                    <span>• {b.publication_year || '2026'}</span>
                    <span>• ₹{b.price}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-700">{b.available_copies ?? 0}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-600">{b.total_copies ?? 0} Copies</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedBookForAddCopy(b);
                        setIsAddCopyModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                    >
                      + Copy
                    </button>
                    <button
                      onClick={() => handleOpenBookDetails(b)}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. PHYSICAL COPIES & BARCODES */}
      {/* ========================================================= */}
      {activeTab === 'copies' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Physical Book Copies & Accession Register
            </h3>
            <span className="text-xs text-slate-500 font-mono">Total {stats?.totalCopies || 0} Physical Copies</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Accession #</th>
                  <th className="py-2.5 px-3">Barcode</th>
                  <th className="py-2.5 px-3">Book Title</th>
                  <th className="py-2.5 px-3">Shelving Rack</th>
                  <th className="py-2.5 px-3">Condition</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {books.flatMap((b) =>
                  (bookDetailsCopies.filter((cp) => cp.book_id === b.id).length > 0
                    ? bookDetailsCopies.filter((cp) => cp.book_id === b.id)
                    : [
                        {
                          id: `cp_demo_${b.id}`,
                          school_id: schoolId,
                          library_id: 'lib_vvps_central',
                          book_id: b.id,
                          accession_number: `VVPS-ACC-${b.id.slice(-4)}`,
                          barcode: `BC-VVPS-${b.id.slice(-4)}`,
                          copy_number: 1,
                          purchase_price: b.price,
                          condition: 'GOOD' as const,
                          status: 'AVAILABLE' as const,
                          book_title: b.title,
                          created_at: new Date().toISOString()
                        }
                      ]
                  ).map((cp) => (
                    <tr key={cp.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{cp.accession_number}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{cp.barcode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{cp.book_title || b.title}</td>
                      <td className="py-2.5 px-3 text-slate-600">{cp.location_name || 'Central Shelves'}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {cp.condition}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cp.status === 'AVAILABLE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {cp.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {cp.status === 'AVAILABLE' ? (
                          <button
                            onClick={() => {
                              setDeskScannedCopy(cp);
                              setActiveTab('desk');
                            }}
                            className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            Checkout Desk
                          </button>
                        ) : (
                          <span className="text-slate-400">Issued</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MEMBERS & CARDS */}
      {/* ========================================================= */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search member by name, membership #, admission no..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total {members.length} Enrolled Library Members
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Membership #</th>
                    <th className="py-2.5 px-3">Card #</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Class / Role</th>
                    <th className="py-2.5 px-3">Active Books</th>
                    <th className="py-2.5 px-3">Outstanding Fines</th>
                    <th className="py-2.5 px-3 text-right">Card Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {members
                    .filter(
                      (m) =>
                        !memberSearch ||
                        (m.name && m.name.toLowerCase().includes(memberSearch.toLowerCase())) ||
                        m.membership_number.toLowerCase().includes(memberSearch.toLowerCase()) ||
                        m.card_number.toLowerCase().includes(memberSearch.toLowerCase())
                    )
                    .map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{m.name}</td>
                        <td className="py-2.5 px-3 font-mono text-indigo-700 font-semibold">{m.membership_number}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{m.card_number}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                            {m.member_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{m.subtext || m.details_summary}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{m.active_books_count || 0} books</td>
                        <td className="py-2.5 px-3 font-mono text-amber-700 font-bold">
                          ₹{parseFloat((m.outstanding_fines || 0) as any).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedMemberForCard(m);
                              setIsCardModalOpen(true);
                            }}
                            className="px-3 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer inline-flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Library Card</span>
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

      {/* ========================================================= */}
      {/* 6. RESERVATIONS / HOLDS QUEUE */}
      {/* ========================================================= */}
      {activeTab === 'reservations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-indigo-600" />
              Book Holds & Reservation Queue
            </h3>
            <span className="text-xs text-slate-500 font-mono">{reservations.length} Active Holds</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Book Title</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Queue Position</th>
                  <th className="py-2.5 px-3">Hold Expiry</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-500">{r.reservation_date}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{r.book_title}</td>
                    <td className="py-2.5 px-3 text-slate-700">{r.member_name} ({r.membership_number})</td>
                    <td className="py-2.5 px-3 font-bold font-mono">#{r.queue_position}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{r.expiry_date}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'READY'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. OVERDUE BOOKS & REMINDERS */}
      {/* ========================================================= */}
      {activeTab === 'overdue' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Overdue Circulation Ledger
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                Scholars and staff with items past designated loan grace period. Daily fines accrue automatically.
              </p>
            </div>
            <button
              onClick={handleSendBatchReminders}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Send Overdue Reminders</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Book Title</th>
                    <th className="py-2.5 px-3">Accession #</th>
                    <th className="py-2.5 px-3">Borrower</th>
                    <th className="py-2.5 px-3">Class / Role</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Days Overdue</th>
                    <th className="py-2.5 px-3">Estimated Fine</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {overdueBooks.map((ob) => (
                    <tr key={ob.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{ob.book_title}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{ob.accession_number}</td>
                      <td className="py-2.5 px-3 text-slate-800">{ob.member_name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{ob.member_group}</td>
                      <td className="py-2.5 px-3 font-mono text-rose-600 font-bold">{ob.due_date}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{ob.days_overdue} days</td>
                      <td className="py-2.5 px-3 font-mono text-amber-700 font-bold">
                        ₹{Math.max(0, ((ob.days_overdue || 0) - 1) * 5).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedIssueForReturn(ob);
                            setIsReturnModalOpen(true);
                          }}
                          className="px-3 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
                        >
                          Check In / Settle
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

      {/* ========================================================= */}
      {/* 8. FINES & ACCOUNTS INTEGRATION */}
      {/* ========================================================= */}
      {activeTab === 'fines' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Library Fine Ledger & Financial Reconciliations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All fine collections generate official receipts through the Phase 6 Fees & Accounts module.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Phase 6 Integrated
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Total (₹)</th>
                    <th className="py-2.5 px-3">Outstanding (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {fines.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500">{f.created_at.slice(0, 10)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{f.member_name} ({f.membership_number})</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {f.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{f.reason}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">₹{parseFloat(f.amount as any).toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                        ₹{parseFloat(f.outstanding_amount as any).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : f.status === 'WAIVED'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        {f.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedFineForCollect(f);
                                setIsCollectFineModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                            >
                              Collect
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFineForWaive(f);
                                setIsWaiveFineModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer"
                            >
                              Waive
                            </button>
                          </>
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

      {/* ========================================================= */}
      {/* 9. PHYSICAL STOCK VERIFICATION / AUDIT */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                Physical Stocktaking & Barcode Inventory Audits
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan shelf copies against master accession catalog to flag missing items and verify shelf placement.
              </p>
            </div>
            <button
              onClick={async () => {
                const title = prompt('Enter Audit Session Title:', `Term 2 Shelf Verification ${new Date().getFullYear()}`);
                if (title) {
                  const res = await api.library.startAudit({ title, schoolId });
                  showToast(res.message, 'success');
                  loadInitialData();
                }
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Audit</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Audit Title</th>
                    <th className="py-2.5 px-3">Auditor</th>
                    <th className="py-2.5 px-3">Total Scanned</th>
                    <th className="py-2.5 px-3">Verified</th>
                    <th className="py-2.5 px-3">Discrepancies</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {audits.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500">{a.verification_date}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{a.title}</td>
                      <td className="py-2.5 px-3 text-slate-700">{a.verified_by_name}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">{a.total_scanned}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold">{a.total_verified}</td>
                      <td className="py-2.5 px-3 font-mono text-rose-700 font-bold">{a.total_discrepancies}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          a.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {a.status}
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

      {/* ========================================================= */}
      {/* 10. REPORTS & EXPORTS */}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Inventory Catalog Report</h4>
              <p className="text-xs text-slate-500">
                Detailed catalog listing of all titles, ISBNs, shelf placements, and active copies.
              </p>
              <button
                onClick={() => {
                  const csv =
                    'data:text/csv;charset=utf-8,Title,Author,Category,ISBN,Price,Copies\n' +
                    books
                      .map((b) => `"${b.title}","${b.author_name}","${b.category_name || ''}","${b.isbn || ''}",${b.price},${b.total_copies}`)
                      .join('\n');
                  const encodedUri = encodeURI(csv);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `library_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  showToast('Catalog CSV report downloaded!', 'success');
                }}
                className="w-full py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Catalog CSV</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Circulation & Issues Ledger</h4>
              <p className="text-xs text-slate-500">
                Comprehensive record of all book loans, return condition logs, and renewals.
              </p>
              <button
                onClick={() => {
                  const csv =
                    'data:text/csv;charset=utf-8,Issue Date,Book,Accession,Borrower,Due Date,Status\n' +
                    (stats?.recentIssues || [])
                      .map((i) => `"${i.issue_date}","${i.book_title}","${i.accession_number}","${i.member_name}","${i.due_date}","${i.status}"`)
                      .join('\n');
                  const encodedUri = encodeURI(csv);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `circulation_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  showToast('Circulation CSV report downloaded!', 'success');
                }}
                className="w-full py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Circulation CSV</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl w-fit">
                <IndianRupee className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Fine Penalties & Waivers</h4>
              <p className="text-xs text-slate-500">
                Financial audit report of collected overdue fees, damaged book costs, and waivers.
              </p>
              <button
                onClick={() => {
                  const csv =
                    'data:text/csv;charset=utf-8,Date,Member,Type,Amount,Outstanding,Status,Reason\n' +
                    fines
                      .map((f) => `"${f.created_at.slice(0, 10)}","${f.member_name}","${f.type}",${f.amount},${f.outstanding_amount},"${f.status}","${f.reason}"`)
                      .join('\n');
                  const encodedUri = encodeURI(csv);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `library_fines_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  showToast('Fine financial report downloaded!', 'success');
                }}
                className="w-full py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Financial CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 11. POLICIES & SETTINGS */}
      {/* ========================================================= */}
      {activeTab === 'settings' && settings && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6 max-w-3xl">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              School Library Circulation & Penal Policies
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure school-isolated borrowing durations, loan quotas, and automated fine calculation rates.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.library.updateSettings({ ...settings, schoolId });
                showToast('Library policy settings updated successfully!', 'success');
              } catch (err: any) {
                showToast(err.message || 'Failed to update settings.', 'error');
              }
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Max Books / Student</label>
                <input
                  type="number"
                  value={settings.max_books_student}
                  onChange={(e) => setSettings({ ...settings, max_books_student: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Max Books / Teacher</label>
                <input
                  type="number"
                  value={settings.max_books_teacher}
                  onChange={(e) => setSettings({ ...settings, max_books_teacher: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Borrow Duration (Days)</label>
                <input
                  type="number"
                  value={settings.borrowing_period_student_days}
                  onChange={(e) => setSettings({ ...settings, borrowing_period_student_days: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Renewal Limit (Times)</label>
                <input
                  type="number"
                  value={settings.renewal_limit}
                  onChange={(e) => setSettings({ ...settings, renewal_limit: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Daily Overdue Fine (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.fine_per_day}
                  onChange={(e) => setSettings({ ...settings, fine_per_day: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Grace Period (Days)</label>
                <input
                  type="number"
                  value={settings.grace_period_days}
                  onChange={(e) => setSettings({ ...settings, grace_period_days: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
              >
                Save Circulation Policies
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* BOOK DETAILS SLIDE-OVER / MODAL */}
      {/* ========================================================= */}
      {selectedBookForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
              <h3 className="text-base font-bold text-white line-clamp-1">{selectedBookForDetails.title}</h3>
              <button
                onClick={() => setSelectedBookForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-400">Author: </span>
                  <span className="font-bold text-slate-900">{selectedBookForDetails.author_name}</span>
                </div>
                <div>
                  <span className="text-slate-400">Category: </span>
                  <span className="font-semibold text-slate-800">{selectedBookForDetails.category_name}</span>
                </div>
                <div>
                  <span className="text-slate-400">ISBN-10 / 13: </span>
                  <span className="font-mono text-slate-700">{selectedBookForDetails.isbn || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Price: </span>
                  <span className="font-mono font-bold text-slate-900">₹{selectedBookForDetails.price}</span>
                </div>
              </div>

              {selectedBookForDetails.description && (
                <p className="text-slate-600 leading-relaxed bg-indigo-50/30 p-3 rounded-lg border border-indigo-100">
                  {selectedBookForDetails.description}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Physical Copies Inventory</h4>
                  <button
                    onClick={() => {
                      setSelectedBookForAddCopy(selectedBookForDetails);
                      setIsAddCopyModalOpen(true);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    + Add Copy
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {bookDetailsCopies.map((cp) => (
                    <div key={cp.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-indigo-700">{cp.accession_number}</p>
                        <p className="text-[11px] text-slate-500">Barcode: {cp.barcode} • Rack: {cp.location_name || 'General'}</p>
                        {cp.borrower_name && (
                          <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                            Checked out by: {cp.borrower_name} (Due: {cp.due_date})
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cp.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {cp.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ALL MODAL DIALOGS */}
      {/* ========================================================= */}
      <AddBookModal
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        onSuccess={loadInitialData}
        schoolId={schoolId}
        categories={categories}
        authors={authors}
        publishers={publishers}
        locations={locations}
      />

      <AddCopyModal
        isOpen={isAddCopyModalOpen}
        onClose={() => {
          setIsAddCopyModalOpen(false);
          setSelectedBookForAddCopy(null);
        }}
        onSuccess={loadInitialData}
        schoolId={schoolId}
        book={selectedBookForAddCopy}
        locations={locations}
      />

      <IssueBookModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={loadInitialData}
        schoolId={schoolId}
        initialMember={deskScannedMember}
        initialCopy={deskScannedCopy}
      />

      <ReturnBookModal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setSelectedIssueForReturn(null);
        }}
        onSuccess={loadInitialData}
        schoolId={schoolId}
        initialIssue={selectedIssueForReturn}
      />

      <LibraryCardModal
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setSelectedMemberForCard(null);
        }}
        member={selectedMemberForCard}
        activeSchool={activeSchool}
      />

      <CollectFineModal
        isOpen={isCollectFineModalOpen}
        onClose={() => {
          setIsCollectFineModalOpen(false);
          setSelectedFineForCollect(null);
        }}
        onSuccess={loadInitialData}
        schoolId={schoolId}
        fine={selectedFineForCollect}
      />

      <WaiveFineModal
        isOpen={isWaiveFineModalOpen}
        onClose={() => {
          setIsWaiveFineModalOpen(false);
          setSelectedFineForWaive(null);
        }}
        onSuccess={loadInitialData}
        schoolId={schoolId}
        fine={selectedFineForWaive}
      />
    </div>
  );
};
