import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import {
  MessageSquare,
  Send,
  Megaphone,
  FileText,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Layers,
  Search,
  Plus,
  X,
  ChevronRight,
  Paperclip,
  ShieldAlert,
  Vote,
  MessageCircle,
  Inbox,
  Calendar,
  Building2,
  Sparkles,
  Filter,
  Check,
  Download,
  AlertCircle,
  TrendingUp,
  Tag
} from 'lucide-react';

interface CommunicationManagementViewProps {
  selectedSchoolId?: string;
}

export const CommunicationManagementView: React.FC<CommunicationManagementViewProps> = ({ selectedSchoolId }) => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();
  const activeSchoolId = selectedSchoolId || user?.schoolId || 'sch_vvps';

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'announcements' | 'circulars' | 'conversations' | 'polls' | 'feedback' | 'templates'>('dashboard');

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Base Data
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  // Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annFilterAudience, setAnnFilterAudience] = useState<string>('ALL');
  const [showCreateAnnModal, setShowCreateAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({
    title: '',
    description: '',
    audienceType: 'ALL',
    targetClassId: '',
    priority: 'NORMAL',
    requiresAcknowledgement: false,
    isEmergency: false,
    expiryDate: ''
  });

  // Circulars & Notices State
  const [circulars, setCirculars] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [noticeCategory, setNoticeCategory] = useState<string>('');
  const [showCreateCircularModal, setShowCreateCircularModal] = useState(false);
  const [circularForm, setCircularForm] = useState({
    circularNumber: '',
    title: '',
    content: '',
    issuedBy: user?.roleDisplayName || 'Office of Principal',
    department: 'Administration',
    targetAudience: 'ALL',
    requiresAcknowledgement: false,
    expiryDate: ''
  });
  const [showCreateNoticeModal, setShowCreateNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    category: 'SCHOOL',
    title: '',
    content: '',
    targetAudience: 'ALL',
    priority: 'NORMAL',
    isPinned: false
  });

  // Conversations State
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showStartConvModal, setShowStartConvModal] = useState(false);
  const [newConvForm, setNewConvForm] = useState({
    subject: '',
    type: 'PARENT_TEACHER',
    initialMessage: '',
    studentId: '',
    recipientUserId: ''
  });

  // Polls State
  const [polls, setPolls] = useState<any[]>([]);
  const [votingPollId, setVotingPollId] = useState<string>('');

  // Feedback & Grievances State
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [grievancesList, setGrievancesList] = useState<any[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    category: 'ACADEMICS',
    subject: '',
    message: '',
    priority: 'NORMAL'
  });
  const [showGrievanceModal, setShowGrievanceModal] = useState(false);
  const [grievanceForm, setGrievanceForm] = useState({
    assignedDepartment: 'Transport & Fleet',
    subject: '',
    description: '',
    priority: 'HIGH'
  });

  // Templates & Scheduled State
  const [templates, setTemplates] = useState<any[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);

  // 1. Initial Load
  const loadData = async () => {
    setLoadingDashboard(true);
    try {
      const [dashRes, classesRes, sessRes] = await Promise.all([
        api.communication.getDashboard(activeSchoolId).catch(() => ({ metrics: null, recentAnnouncements: [], recentConversations: [] })),
        api.classes.list(activeSchoolId).catch(() => ({ classes: [] })),
        api.sessions.list(activeSchoolId).catch(() => ({ sessions: [] }))
      ]);

      if (dashRes) setDashboardData(dashRes);
      if (classesRes?.classes) setClasses(classesRes.classes);
      if (sessRes?.sessions) setSessions(sessRes.sessions);
    } catch (err) {
      console.error('Error loading communication data:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSchoolId]);

  // Tab switch loader
  useEffect(() => {
    if (activeTab === 'announcements') loadAnnouncements();
    if (activeTab === 'circulars') {
      loadCirculars();
      loadNotices();
    }
    if (activeTab === 'conversations') loadConversations();
    if (activeTab === 'polls') loadPolls();
    if (activeTab === 'feedback') {
      loadFeedback();
      loadGrievances();
    }
    if (activeTab === 'templates') {
      loadTemplates();
      loadScheduled();
    }
  }, [activeTab, activeSchoolId, annFilterAudience, noticeCategory]);

  const loadAnnouncements = async () => {
    try {
      const res = await api.communication.getAnnouncements({
        schoolId: activeSchoolId,
        audience: annFilterAudience !== 'ALL' ? annFilterAudience : undefined
      });
      setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCirculars = async () => {
    try {
      const res = await api.communication.getCirculars(activeSchoolId);
      setCirculars(res.circulars || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadNotices = async () => {
    try {
      const res = await api.communication.getNotices({
        schoolId: activeSchoolId,
        category: noticeCategory || undefined
      });
      setNotices(res.notices || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await api.communication.getConversations(activeSchoolId);
      const convs = res.conversations || [];
      setConversations(convs);
      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
        loadMessages(convs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await api.communication.getMessages(convId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPolls = async () => {
    try {
      const res = await api.communication.getPolls(activeSchoolId);
      setPolls(res.polls || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFeedback = async () => {
    try {
      const res = await api.communication.getFeedback(activeSchoolId);
      setFeedbackList(res.feedback || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadGrievances = async () => {
    try {
      const res = await api.communication.getGrievances(activeSchoolId);
      setGrievancesList(res.grievances || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await api.communication.getTemplates(activeSchoolId);
      setTemplates(res.templates || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadScheduled = async () => {
    try {
      const res = await api.communication.getScheduledMessages(activeSchoolId);
      setScheduledMessages(res.scheduledMessages || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Actions
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title || !annForm.description) {
      showToast('Title and description are required', 'error');
      return;
    }

    try {
      await api.communication.createAnnouncement({
        schoolId: activeSchoolId,
        sessionId: sessions[0]?.id,
        title: annForm.title,
        description: annForm.description,
        audienceType: annForm.audienceType,
        targetClassId: annForm.targetClassId || undefined,
        priority: annForm.priority,
        requiresAcknowledgement: annForm.requiresAcknowledgement,
        isEmergency: annForm.isEmergency,
        expiryDate: annForm.expiryDate || undefined
      });

      showToast(annForm.isEmergency ? 'Emergency broadcast dispatched across campus' : 'Announcement published', 'success');
      setShowCreateAnnModal(false);
      setAnnForm({
        title: '',
        description: '',
        audienceType: 'ALL',
        targetClassId: '',
        priority: 'NORMAL',
        requiresAcknowledgement: false,
        isEmergency: false,
        expiryDate: ''
      });
      loadAnnouncements();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to publish announcement', 'error');
    }
  };

  const handleCreateCircular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circularForm.circularNumber || !circularForm.title || !circularForm.content) {
      showToast('Circular number, title, and content are required', 'error');
      return;
    }

    try {
      await api.communication.createCircular({
        schoolId: activeSchoolId,
        sessionId: sessions[0]?.id,
        circularNumber: circularForm.circularNumber,
        title: circularForm.title,
        content: circularForm.content,
        issuedBy: circularForm.issuedBy,
        department: circularForm.department,
        targetAudience: circularForm.targetAudience,
        requiresAcknowledgement: circularForm.requiresAcknowledgement,
        expiryDate: circularForm.expiryDate || undefined
      });

      showToast('Circular issued successfully', 'success');
      setShowCreateCircularModal(false);
      setCircularForm({
        circularNumber: '',
        title: '',
        content: '',
        issuedBy: user?.roleDisplayName || 'Office of Principal',
        department: 'Administration',
        targetAudience: 'ALL',
        requiresAcknowledgement: false,
        expiryDate: ''
      });
      loadCirculars();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to issue circular', 'error');
    }
  };

  const handleAcknowledgeCircular = async (circularId: string) => {
    try {
      await api.communication.acknowledgeCircular(circularId, 'Acknowledged by user');
      showToast('Acknowledgement recorded', 'success');
      loadCirculars();
    } catch (err: any) {
      showToast(err.message || 'Failed to record acknowledgement', 'error');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversationId) return;

    setSendingMessage(true);
    try {
      await api.communication.sendMessage(activeConversationId, {
        message: messageInput.trim()
      });
      setMessageInput('');
      loadMessages(activeConversationId);
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    setVotingPollId(pollId);
    try {
      await api.communication.votePoll(pollId, optionId);
      showToast('Vote submitted successfully', 'success');
      loadPolls();
    } catch (err: any) {
      showToast(err.message || 'Failed to record vote', 'error');
    } finally {
      setVotingPollId('');
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.subject || !feedbackForm.message) {
      showToast('Subject and message are required', 'error');
      return;
    }

    try {
      await api.communication.submitFeedback({
        schoolId: activeSchoolId,
        category: feedbackForm.category,
        subject: feedbackForm.subject,
        message: feedbackForm.message,
        priority: feedbackForm.priority
      });
      showToast('Feedback submitted to administration', 'success');
      setShowFeedbackModal(false);
      setFeedbackForm({ category: 'ACADEMICS', subject: '', message: '', priority: 'NORMAL' });
      loadFeedback();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit feedback', 'error');
    }
  };

  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievanceForm.subject || !grievanceForm.description) {
      showToast('Subject and description are required', 'error');
      return;
    }

    try {
      const res = await api.communication.submitGrievance({
        schoolId: activeSchoolId,
        assignedDepartment: grievanceForm.assignedDepartment,
        subject: grievanceForm.subject,
        description: grievanceForm.description,
        priority: grievanceForm.priority
      });
      showToast(`Grievance ticket ${res.ticketNumber} registered`, 'success');
      setShowGrievanceModal(false);
      setGrievanceForm({ assignedDepartment: 'Transport & Fleet', subject: '', description: '', priority: 'HIGH' });
      loadGrievances();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit grievance', 'error');
    }
  };

  const metrics = dashboardData?.metrics || {};

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Phase 14 Active
            </span>
            <span className="text-xs text-slate-500 font-mono">Central Communication & Parent Engagement</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Communication, Notifications & Engagement
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Secure multi-channel messaging between Parents, Teachers, Students & Administrators with official circulars, digital notice boards, and in-app alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setAnnForm(prev => ({ ...prev, isEmergency: false }));
              setShowCreateAnnModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>

          <button
            onClick={() => {
              const prefix = 'VVPS/CIR/2026/';
              const num = String(Math.floor(100 + Math.random() * 900));
              setCircularForm(prev => ({ ...prev, circularNumber: `${prefix}${num}` }));
              setShowCreateCircularModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Issue Circular
          </button>

          <button
            onClick={() => {
              setAnnForm(prev => ({ ...prev, isEmergency: true, priority: 'EMERGENCY' }));
              setShowCreateAnnModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition shadow-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            Emergency Broadcast
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Announcements</span>
            <Megaphone className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.activeAnnouncements || 4}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Active school broadcasts</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Official Circulars</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.activeCirculars || 3}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">With parent acknowledgements</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Conversations</span>
            <MessageCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.activeConversations || 3}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">{metrics.messagesToday || 7} messages today</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">In-App Alerts</span>
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.unreadNotifications || 4}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Unread notifications queued</p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto space-x-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition ${
            activeTab === 'dashboard'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Dashboard & Overview
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition ${
            activeTab === 'announcements'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Announcements
        </button>

        <button
          onClick={() => setActiveTab('circulars')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition ${
            activeTab === 'circulars'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Circulars & Notice Board
        </button>

        <button
          onClick={() => setActiveTab('conversations')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition ${
            activeTab === 'conversations'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Parent-Teacher Messaging
        </button>

        <button
          onClick={() => setActiveTab('polls')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition ${
            activeTab === 'polls'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Vote className="w-4 h-4" />
          Polls & Surveys
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition ${
            activeTab === 'feedback'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Feedback & Grievances
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition ${
            activeTab === 'templates'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Templates & Schedules
        </button>
      </div>

      {/* 4. Tab 1: DASHBOARD & RECENT ACTIVITIES */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recent Announcements */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-indigo-600" />
                  Live Campus Announcements
                </h3>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {dashboardData?.recentAnnouncements?.map((ann: any) => (
                  <div
                    key={ann.id}
                    className={`p-4 rounded-xl border transition ${
                      ann.is_emergency
                        ? 'border-rose-300 bg-rose-50/60'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {ann.is_emergency && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                            EMERGENCY
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-semibold">
                          {ann.audience_type}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{ann.title}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {new Date(ann.publish_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {ann.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>By: <span className="font-medium text-slate-700">{ann.author_name}</span></span>
                      {ann.requires_acknowledgement && (
                        <span className="text-indigo-600 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Requires Parent Sign-off
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-3">
                Emergency & Rapid Communication Protocols
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setAnnForm({
                      title: 'School Closure / Severe Weather Notice',
                      description: 'Due to severe weather alerts, all classes are suspended today. Online self-study links are updated in the classroom module.',
                      audienceType: 'ALL',
                      targetClassId: '',
                      priority: 'EMERGENCY',
                      requiresAcknowledgement: true,
                      isEmergency: true,
                      expiryDate: ''
                    });
                    setShowCreateAnnModal(true);
                  }}
                  className="p-3 bg-white rounded-lg border border-indigo-200 hover:border-indigo-400 text-left transition shadow-xs"
                >
                  <span className="block font-semibold text-xs text-slate-900">Weather Alert</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Campus weather closure</span>
                </button>

                <button
                  onClick={() => {
                    setAnnForm({
                      title: 'Immediate Bus Delay Broadcast',
                      description: 'Bus routes are delayed by 25-30 minutes due to city road diversions. Live GPS tracking is operational.',
                      audienceType: 'PARENTS',
                      targetClassId: '',
                      priority: 'URGENT',
                      requiresAcknowledgement: false,
                      isEmergency: false,
                      expiryDate: ''
                    });
                    setShowCreateAnnModal(true);
                  }}
                  className="p-3 bg-white rounded-lg border border-indigo-200 hover:border-indigo-400 text-left transition shadow-xs"
                >
                  <span className="block font-semibold text-xs text-slate-900">Transport Delay</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Broadcast to bus parents</span>
                </button>

                <button
                  onClick={() => {
                    setShowStartConvModal(true);
                  }}
                  className="p-3 bg-white rounded-lg border border-indigo-200 hover:border-indigo-400 text-left transition shadow-xs"
                >
                  <span className="block font-semibold text-xs text-slate-900">Parent Message</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">One-on-one student update</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Message Threads & Delivery Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  Recent Conversations
                </h3>
                <button
                  onClick={() => setActiveTab('conversations')}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Open Inbox
                </button>
              </div>

              <div className="space-y-3">
                {dashboardData?.recentConversations?.map((conv: any) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setActiveTab('conversations');
                      loadMessages(conv.id);
                    }}
                    className="p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 truncate max-w-[190px]">
                        {conv.subject}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {conv.total_messages} msgs
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">
                      "{conv.last_message || 'Thread initiated'}"
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{conv.type}</span>
                      <span className="text-indigo-600 font-semibold">Reply &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Stats Box */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Notification Channel Health
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">In-App Notification Feed</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">ACTIVE (100%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Email SMTP Delivery Service</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">Configured</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">SMS Gateway Interface</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">Standby Interface</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Push Notification Service</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">Web Worker Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: ANNOUNCEMENTS MANAGEMENT */}
      {activeTab === 'announcements' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">Filter Audience:</span>
              </div>
              {['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS', 'STAFF'].map((aud) => (
                <button
                  key={aud}
                  onClick={() => setAnnFilterAudience(aud)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    annFilterAudience === aud
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {aud}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setAnnForm(prev => ({ ...prev, isEmergency: false }));
                setShowCreateAnnModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Publish New Announcement
            </button>
          </div>

          <div className="space-y-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`p-5 rounded-xl border transition ${
                  ann.is_emergency
                    ? 'border-rose-400 bg-rose-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {ann.is_emergency ? (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                        EMERGENCY BROADCAST
                      </span>
                    ) : (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        ann.priority === 'IMPORTANT' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {ann.priority}
                      </span>
                    )}

                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      Audience: {ann.audience_type}
                    </span>

                    <span className="text-sm font-bold text-slate-900">{ann.title}</span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    Published: {new Date(ann.publish_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">
                  {ann.description}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span>Issued By: <span className="font-semibold text-slate-800">{ann.author_name}</span></span>
                    {ann.requires_acknowledgement && (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Acknowledgements: {ann.acknowledgement_count || 0}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">Status: {ann.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Tab 3: FORMAL CIRCULARS & NOTICE BOARD */}
      {activeTab === 'circulars' && (
        <div className="space-y-6">
          {/* Circulars Section */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Official School Circulars Register
                </h3>
                <p className="text-xs text-slate-500">Formal institutional decrees, policies, and statutory compliance orders</p>
              </div>

              <button
                onClick={() => {
                  const prefix = 'VVPS/CIR/2026/';
                  const num = String(Math.floor(100 + Math.random() * 900));
                  setCircularForm(prev => ({ ...prev, circularNumber: `${prefix}${num}` }));
                  setShowCreateCircularModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Issue Circular
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                    <th className="py-3 px-3 font-semibold">Circular No</th>
                    <th className="py-3 px-3 font-semibold">Date</th>
                    <th className="py-3 px-3 font-semibold">Title & Content</th>
                    <th className="py-3 px-3 font-semibold">Issued By</th>
                    <th className="py-3 px-3 font-semibold">Audience</th>
                    <th className="py-3 px-3 font-semibold text-center">Ack Required</th>
                    <th className="py-3 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {circulars.map((circ) => (
                    <tr key={circ.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono font-semibold text-indigo-700">
                        {circ.circular_number}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {new Date(circ.publish_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{circ.title}</div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{circ.content}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <div>{circ.issued_by}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{circ.department}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold font-mono text-[10px]">
                          {circ.target_audience}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {circ.requires_acknowledgement ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            Yes ({circ.acknowledgement_count || 0})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {circ.requires_acknowledgement && !circ.user_has_acknowledged ? (
                          <button
                            onClick={() => handleAcknowledgeCircular(circ.id)}
                            className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition"
                          >
                            Acknowledge
                          </button>
                        ) : circ.user_has_acknowledged ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <Check className="w-3.5 h-3.5" /> Acknowledged
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Notice</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Digital Notice Board */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  Digital Notice Board
                </h3>
                <p className="text-xs text-slate-500">Targeted category notices across School, Hostel, Transport, and Exams</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={noticeCategory}
                  onChange={(e) => setNoticeCategory(e.target.value)}
                  className="text-xs rounded-lg border-slate-200 bg-white"
                >
                  <option value="">All Notice Categories</option>
                  <option value="EXAMINATION">Examinations</option>
                  <option value="FEE">Fee Accounts</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="HOSTEL">Hostel</option>
                  <option value="HOLIDAY">Holidays</option>
                </select>

                <button
                  onClick={() => setShowCreateNoticeModal(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Post Notice
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notices.map((n) => (
                <div key={n.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 font-mono">
                      {n.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(n.posted_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{n.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">{n.content}</p>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>By: {n.posted_by_name}</span>
                    <span className="font-medium text-slate-600">{n.target_audience}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab 4: PARENT-TEACHER & INTERNAL MESSAGING */}
      {activeTab === 'conversations' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-3 min-h-[550px]">
          {/* Thread List Sidebar */}
          <div className="border-r border-slate-200 p-4 space-y-3 bg-slate-50/40">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Direct Threads</h3>
              <button
                onClick={() => setShowStartConvModal(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5" />
                New Thread
              </button>
            </div>

            <div className="space-y-2">
              {conversations.map((c) => {
                const isSelected = c.id === activeConversationId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveConversationId(c.id);
                      loadMessages(c.id);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                        {c.type}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[9px]">
                          {c.unread_count} new
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-xs text-slate-900 mt-1 line-clamp-1">{c.subject}</div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
                      {c.last_message || 'Active thread'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Conversation Chat Window */}
          <div className="lg:col-span-2 flex flex-col h-[550px]">
            {activeConversationId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">
                      {conversations.find(c => c.id === activeConversationId)?.subject || 'Conversation'}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Authorized Parent-Teacher Communication Window • End-to-End Logged
                    </span>
                  </div>
                </div>

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                  {messages.map((m) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                          <span className="font-semibold text-slate-700">{m.sender_name}</span>
                          <span className="px-1 py-0.2 rounded bg-slate-100 font-mono">{m.sender_role}</span>
                          <span>• {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div
                          className={`max-w-md px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : 'bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200/60'
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type secure reply message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 text-xs rounded-lg border-slate-200 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Select a conversation thread to view and reply</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. Tab 5: POLLS & SURVEYS */}
      {activeTab === 'polls' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Vote className="w-4 h-4 text-indigo-600" />
                Campus Polls & Parent Opinion Surveys
              </h3>
              <p className="text-xs text-slate-500">Collect structured feedback on school scheduling, events, and co-curricular programs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {polls.map((poll) => {
              const totalVotes = poll.options?.reduce((sum: number, o: any) => sum + Number(o.votes_count || 0), 0) || 0;
              return (
                <div key={poll.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                      {poll.audience_type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Ends: {new Date(poll.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900">{poll.question}</h4>

                  <div className="space-y-2">
                    {poll.options?.map((opt: any) => {
                      const votePct = totalVotes > 0 ? ((Number(opt.votes_count || 0) / totalVotes) * 100).toFixed(1) : 0;
                      const isVoted = poll.user_voted_option_id === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleVotePoll(poll.id, opt.id)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                            isVoted
                              ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-500/20'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-800 flex items-center gap-2">
                              {isVoted && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                              {opt.option_text}
                            </span>
                            <span className="font-mono text-slate-500">{opt.votes_count} votes ({votePct}%)</span>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${votePct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span>Total Participants: <span className="font-bold text-slate-700">{totalVotes}</span></span>
                    <span>Created by: {poll.created_by_name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. Tab 6: FEEDBACK & GRIEVANCES */}
      {activeTab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feedback Submissions */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Campus Feedback Box</h3>
                <p className="text-xs text-slate-500">Constructive feedback from parents & teachers</p>
              </div>

              <button
                onClick={() => setShowFeedbackModal(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
              >
                + Submit Feedback
              </button>
            </div>

            <div className="space-y-3">
              {feedbackList.map((fb) => (
                <div key={fb.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{fb.subject}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      fb.status === 'RESOLVED' || fb.status === 'CLOSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {fb.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{fb.message}</p>
                  {fb.resolution_notes && (
                    <div className="p-2 rounded bg-emerald-50 text-emerald-900 text-[10px] font-medium mt-1">
                      Resolution: {fb.resolution_notes}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>By: {fb.submitted_by_name} ({fb.category})</span>
                    <span>{new Date(fb.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confidential Grievances */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confidential Grievance Portal</h3>
                <p className="text-xs text-slate-500">Formally tracked tickets with departmental assignment</p>
              </div>

              <button
                onClick={() => setShowGrievanceModal(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
              >
                + Register Ticket
              </button>
            </div>

            <div className="space-y-3">
              {grievancesList.map((grv) => (
                <div key={grv.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                        {grv.ticket_number}
                      </span>
                      <span className="font-bold text-slate-900">{grv.subject}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {grv.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{grv.description}</p>
                  {grv.resolution && (
                    <div className="p-2 rounded bg-indigo-50 text-indigo-900 text-[10px] font-medium mt-1">
                      Action Taken: {grv.resolution}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Dept: {grv.assigned_department}</span>
                    <span>Officer: {grv.assigned_officer_name || 'Assigned'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 10. Tab 7: TEMPLATES & SCHEDULES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Templates */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Standard Notification Templates</h3>
              <p className="text-xs text-slate-500">Automated event triggers with safe variable substitution</p>
            </div>

            <div className="space-y-3">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{tmpl.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                      {tmpl.code}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700">Subject: {tmpl.subject_template}</div>
                  <p className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200/60">
                    {tmpl.body_template}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduled Messages */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Scheduled Message Queue</h3>
              <p className="text-xs text-slate-500">Queued date/time broadcasts scheduled for future delivery</p>
            </div>

            <div className="space-y-3">
              {scheduledMessages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No future messages currently queued.
                </div>
              ) : (
                scheduledMessages.map((sm) => (
                  <div key={sm.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{sm.subject}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px]">
                        {sm.status}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{sm.message}</p>
                    <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                      <span>Audience: {sm.audience_type}</span>
                      <span>Scheduled for: {new Date(sm.scheduled_for).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 11. CREATE ANNOUNCEMENT MODAL */}
      {showCreateAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className={`font-bold text-sm flex items-center gap-2 ${annForm.isEmergency ? 'text-rose-600' : 'text-slate-900'}`}>
                {annForm.isEmergency ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <Megaphone className="w-4 h-4 text-indigo-600" />}
                {annForm.isEmergency ? 'Confirm Emergency Broadcast' : 'Create New School Announcement'}
              </h3>
              <button onClick={() => setShowCreateAnnModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Exhibition Registration or Weather Advisory"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide comprehensive details of the announcement..."
                  value={annForm.description}
                  onChange={(e) => setAnnForm({ ...annForm, description: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={annForm.audienceType}
                    onChange={(e) => setAnnForm({ ...annForm, audienceType: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  >
                    <option value="ALL">Entire Campus (All)</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="PARENTS">Parents Only</option>
                    <option value="TEACHERS">Teachers Only</option>
                    <option value="STAFF">All Staff Members</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={annForm.priority}
                    onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ackCheck"
                  checked={annForm.requiresAcknowledgement}
                  onChange={(e) => setAnnForm({ ...annForm, requiresAcknowledgement: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="ackCheck" className="text-xs text-slate-700 font-medium">
                  Require parent/user digital acknowledgement
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAnnModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg text-white font-semibold shadow-sm ${
                    annForm.isEmergency ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {annForm.isEmergency ? 'Dispatch Emergency Alert' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. ISSUE CIRCULAR MODAL */}
      {showCreateCircularModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Issue Official Institutional Circular
              </h3>
              <button onClick={() => setShowCreateCircularModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCircular} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Circular Number *</label>
                  <input
                    type="text"
                    required
                    value={circularForm.circularNumber}
                    onChange={(e) => setCircularForm({ ...circularForm, circularNumber: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={circularForm.department}
                    onChange={(e) => setCircularForm({ ...circularForm, department: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CBSE Mandatory Attendance Compliance"
                  value={circularForm.title}
                  onChange={(e) => setCircularForm({ ...circularForm, title: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Circular Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Official circular text..."
                  value={circularForm.content}
                  onChange={(e) => setCircularForm({ ...circularForm, content: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issued By *</label>
                  <input
                    type="text"
                    required
                    value={circularForm.issuedBy}
                    onChange={(e) => setCircularForm({ ...circularForm, issuedBy: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={circularForm.targetAudience}
                    onChange={(e) => setCircularForm({ ...circularForm, targetAudience: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  >
                    <option value="ALL">Entire Campus</option>
                    <option value="PARENTS">Parents</option>
                    <option value="STUDENTS">Students</option>
                    <option value="STAFF">Staff & Teachers</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="circAckCheck"
                  checked={circularForm.requiresAcknowledgement}
                  onChange={(e) => setCircularForm({ ...circularForm, requiresAcknowledgement: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="circAckCheck" className="text-xs text-slate-700 font-medium">
                  Require digital parent sign-off / acknowledgement
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCircularModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  Issue Circular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. POST NOTICE MODAL */}
      {showCreateNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Post Notice to Digital Board</h3>
              <button onClick={() => setShowCreateNoticeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api.communication.createNotice({
                    schoolId: activeSchoolId,
                    ...noticeForm
                  });
                  showToast('Notice posted', 'success');
                  setShowCreateNoticeModal(false);
                  setNoticeForm({ category: 'SCHOOL', title: '', content: '', targetAudience: 'ALL', priority: 'NORMAL', isPinned: false });
                  loadNotices();
                } catch (err: any) {
                  showToast(err.message || 'Failed to post notice', 'error');
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notice Category *</label>
                  <select
                    value={noticeForm.category}
                    onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  >
                    <option value="SCHOOL">General School</option>
                    <option value="EXAMINATION">Examinations</option>
                    <option value="FEE">Fee Accounts</option>
                    <option value="TRANSPORT">Transport & Bus</option>
                    <option value="HOSTEL">Hostel / Residence</option>
                    <option value="HOLIDAY">Holidays</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Audience</label>
                  <select
                    value={noticeForm.targetAudience}
                    onChange={(e) => setNoticeForm({ ...noticeForm, targetAudience: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  >
                    <option value="ALL">Entire Campus</option>
                    <option value="PARENTS">Parents Only</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="TEACHERS">Teachers Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Headline *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwal Break Dates or Library Night Hours"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Details *</label>
                <textarea
                  rows={3}
                  required
                  value={noticeForm.content}
                  onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateNoticeModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 shadow-sm"
                >
                  Post Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 14. START CONVERSATION MODAL */}
      {showStartConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Initiate Secure Conversation</h3>
              <button onClick={() => setShowStartConvModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await api.communication.createConversation({
                    schoolId: activeSchoolId,
                    ...newConvForm
                  });
                  showToast('Conversation created', 'success');
                  setShowStartConvModal(false);
                  setNewConvForm({ subject: '', type: 'PARENT_TEACHER', initialMessage: '', studentId: '', recipientUserId: '' });
                  loadConversations();
                  if (res.conversationId) {
                    setActiveConversationId(res.conversationId);
                    loadMessages(res.conversationId);
                  }
                } catch (err: any) {
                  showToast(err.message || 'Failed to create conversation', 'error');
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Olympiad Mentorship for Aarav"
                  value={newConvForm.subject}
                  onChange={(e) => setNewConvForm({ ...newConvForm, subject: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Conversation Category</label>
                <select
                  value={newConvForm.type}
                  onChange={(e) => setNewConvForm({ ...newConvForm, type: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                >
                  <option value="PARENT_TEACHER">Parent & Teacher Academic Dialogue</option>
                  <option value="STAFF_ADMIN">Staff & Administration Memo</option>
                  <option value="PRINCIPAL_TEACHER">Principal & Department Head</option>
                  <option value="GENERAL">General Operational Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type initial message to begin the thread..."
                  value={newConvForm.initialMessage}
                  onChange={(e) => setNewConvForm({ ...newConvForm, initialMessage: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStartConvModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  Start Conversation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 15. SUBMIT FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Submit Campus Feedback</h3>
              <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={feedbackForm.category}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                >
                  <option value="ACADEMICS">Academics & Pedagogy</option>
                  <option value="INFRASTRUCTURE">Campus Infrastructure & Safety</option>
                  <option value="TRANSPORT">Transport & Routes</option>
                  <option value="FOOD_CANTEEN">Food & Canteen</option>
                  <option value="ADMINISTRATION">Administrative Services</option>
                  <option value="GENERAL">General Suggestions</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Additional Water Station in Primary Wing"
                  value={feedbackForm.subject}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, subject: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your constructive suggestions..."
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 16. SUBMIT GRIEVANCE MODAL */}
      {showGrievanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Register Confidential Grievance Ticket
              </h3>
              <button onClick={() => setShowGrievanceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGrievance} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Department</label>
                <select
                  value={grievanceForm.assignedDepartment}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, assignedDepartment: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                >
                  <option value="Transport & Fleet">Transport & Fleet</option>
                  <option value="Accounts & Fees">Accounts & Fees</option>
                  <option value="Academic Council">Academic Council</option>
                  <option value="Discipline & Security">Discipline & Security</option>
                  <option value="Hostel & Residence">Hostel & Residence</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Repeated bus delay at Sector 21 stop"
                  value={grievanceForm.subject}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, subject: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide complete facts, dates, vehicle numbers, or references..."
                  value={grievanceForm.description}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, description: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGrievanceModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-sm"
                >
                  Register Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
