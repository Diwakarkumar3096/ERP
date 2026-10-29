import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import { jsPDF } from 'jspdf';
import {
  Award,
  Calendar,
  Clock,
  BookOpen,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
  Download,
  Search,
  Plus,
  ChevronRight,
  Filter,
  Users,
  TrendingUp,
  BarChart3,
  GraduationCap,
  Building2,
  Sparkles,
  X,
  Lock,
  Unlock,
  Layers,
  ShieldCheck,
  Check,
  FileText,
  Trash2
} from 'lucide-react';

interface ExamManagementViewProps {
  selectedSchoolId?: string;
}

export const ExamManagementView: React.FC<ExamManagementViewProps> = ({ selectedSchoolId }) => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();
  const activeSchoolId = selectedSchoolId || user?.schoolId || 'sch_vvps';

  // Navigation sub-tabs
  const [activeTab, setActiveTab] = useState<'exams' | 'marks' | 'results' | 'grading'>('exams');

  // Stats
  const [stats, setStats] = useState<any>({
    totalExams: 2,
    activeExams: 1,
    publishedExams: 1,
    totalSchedules: 5,
    evaluatedMarks: 25,
    totalResults: 5,
    passRate: 100,
    averagePercentage: 81.04
  });

  // Base Data
  const [examinations, setExaminations] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [gradingScales, setGradingScales] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected Exam for Details / Timetable
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);

  // Marks Entry state
  const [marksExamId, setMarksExamId] = useState<string>('');
  const [marksClassId, setMarksClassId] = useState<string>('');
  const [marksSubjectId, setMarksSubjectId] = useState<string>('');
  const [marksScheduleId, setMarksScheduleId] = useState<string>('');
  const [roster, setRoster] = useState<any[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<string>('DRAFT');
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // Results state
  const [resultsExamId, setResultsExamId] = useState<string>('');
  const [resultsClassId, setResultsClassId] = useState<string>('');
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [calculatingResults, setCalculatingResults] = useState(false);

  // Report Card Modal
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [reportCardData, setReportCardData] = useState<any>(null);
  const [loadingReportCard, setLoadingReportCard] = useState(false);

  // Create Exam Modal
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [newExamForm, setNewExamForm] = useState({
    name: '',
    code: '',
    sessionId: '',
    typeId: '',
    startDate: '',
    endDate: '',
    weightage: 100,
    isTermExam: true,
    description: '',
    classIds: [] as string[]
  });

  // Add Schedule Modal
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    classId: '',
    sectionId: '',
    subjectId: '',
    examDate: '',
    startTime: '09:00',
    endTime: '12:00',
    durationMinutes: 180,
    examMode: 'WRITTEN',
    roomVenue: 'Exam Hall A',
    invigilatorName: '',
    maxMarksTheory: 80,
    maxMarksPractical: 20,
    totalMaxMarks: 100,
    instructions: '15 minutes extra reading time before writing.'
  });

  // 1. Initial Load
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [statsRes, typesRes, scalesRes, examsRes, sessionsRes, classesRes, subjectsRes] = await Promise.all([
        api.exams.getStats(activeSchoolId).catch(() => ({ stats: null })),
        api.exams.getTypes(activeSchoolId).catch(() => ({ types: [] })),
        api.exams.getGradingScales(activeSchoolId).catch(() => ({ scales: [] })),
        api.exams.list({ schoolId: activeSchoolId }).catch(() => ({ examinations: [] })),
        api.sessions.list(activeSchoolId).catch(() => ({ sessions: [] })),
        api.classes.list(activeSchoolId).catch(() => ({ classes: [] })),
        api.employees.getSubjects(activeSchoolId).catch(() => ({ subjects: [] }))
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (typesRes?.types) setExamTypes(typesRes.types);
      if (scalesRes?.scales) setGradingScales(scalesRes.scales);
      if (sessionsRes?.sessions) setSessions(sessionsRes.sessions);
      if (classesRes?.classes) setClasses(classesRes.classes);
      if (subjectsRes?.subjects) setSubjects(subjectsRes.subjects);

      const examItems = examsRes?.examinations || [];
      setExaminations(examItems);

      if (examItems.length > 0) {
        const defaultExam = examItems[0];
        setSelectedExamId(defaultExam.id);
        setMarksExamId(defaultExam.id);
        setResultsExamId(defaultExam.id);
        loadExamDetails(defaultExam.id);
      }
    } catch (err: any) {
      console.error('Error loading examination data:', err);
      showToast('Failed to load examination records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [activeSchoolId]);

  // Load Exam Details & Schedules
  const loadExamDetails = async (examId: string) => {
    if (!examId) return;
    try {
      const [examRes, schedRes] = await Promise.all([
        api.exams.get(examId),
        api.exams.getSchedules(examId)
      ]);
      setSelectedExam(examRes.examination);
      setSchedules(schedRes.schedules || []);

      // If classes are available, set default class for marks entry
      if (classes.length > 0 && !marksClassId) {
        setMarksClassId(classes[0].id);
        setResultsClassId(classes[0].id);
      }
    } catch (err: any) {
      console.error('Error loading exam details:', err);
    }
  };

  const handleSelectExam = (examId: string) => {
    setSelectedExamId(examId);
    loadExamDetails(examId);
  };

  // Toggle Publish Timetable
  const handleTogglePublishTimetable = async () => {
    if (!selectedExam) return;
    const nextState = !selectedExam.timetable_published;
    try {
      await api.exams.togglePublishTimetable(selectedExam.id, nextState);
      setSelectedExam({ ...selectedExam, timetable_published: nextState });
      setExaminations(examinations.map(e => e.id === selectedExam.id ? { ...e, timetable_published: nextState } : e));
      showToast(nextState ? 'Timetable published to students and parents' : 'Timetable unpublished', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update timetable publication status', 'error');
    }
  };

  // Toggle Publish Results
  const handleTogglePublishResults = async () => {
    if (!selectedExam) return;
    const nextState = !selectedExam.results_published;
    try {
      await api.exams.togglePublishResults(selectedExam.id, nextState);
      setSelectedExam({ ...selectedExam, results_published: nextState });
      setExaminations(examinations.map(e => e.id === selectedExam.id ? { ...e, results_published: nextState } : e));
      showToast(nextState ? 'Official results published successfully' : 'Results withdrawn from student portal', 'success');
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to publish results', 'error');
    }
  };

  // 2. Marks Entry Loader
  const loadMarksRoster = async () => {
    if (!marksExamId || !marksClassId || !marksSubjectId) return;
    setLoadingMarks(true);
    try {
      const res = await api.exams.getMarksRoster(marksExamId, {
        classId: marksClassId,
        subjectId: marksSubjectId,
        scheduleId: marksScheduleId || undefined
      });
      setRoster(res.roster || []);
      setSubmissionStatus(res.submissionStatus || 'DRAFT');
    } catch (err: any) {
      console.error('Error loading marks roster:', err);
      showToast(err.message || 'Failed to load student roster', 'error');
    } finally {
      setLoadingMarks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'marks' && marksExamId && marksClassId && marksSubjectId) {
      loadMarksRoster();
    }
  }, [activeTab, marksExamId, marksClassId, marksSubjectId]);

  // Handle Marks Input Changes
  const handleMarkChange = (studentId: string, field: 'theoryMarks' | 'practicalMarks' | 'attendanceStatus' | 'remarks', value: any) => {
    setRoster(prev => prev.map(item => {
      if (item.studentId !== studentId) return item;
      const updated = { ...item, [field]: value };
      if (field === 'theoryMarks' || field === 'practicalMarks' || field === 'attendanceStatus') {
        const th = updated.attendanceStatus === 'ABSENT' ? 0 : Number(updated.theoryMarks || 0);
        const pr = updated.attendanceStatus === 'ABSENT' ? 0 : Number(updated.practicalMarks || 0);
        const tot = th + pr;
        updated.totalMarks = tot;
        const pct = updated.maxMarks > 0 ? (tot / updated.maxMarks) * 100 : 0;
        updated.grade = pct >= 91 ? 'A1' : pct >= 81 ? 'A2' : pct >= 71 ? 'B1' : pct >= 61 ? 'B2' : pct >= 51 ? 'C1' : pct >= 41 ? 'C2' : pct >= 33 ? 'D' : pct >= 21 ? 'E1' : 'E2';
        updated.isPassed = updated.attendanceStatus !== 'ABSENT' && tot >= 33;
      }
      return updated;
    }));
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    setRoster(prev => prev.map(item => ({ ...item, attendanceStatus: 'PRESENT' })));
    showToast('Marked all students as PRESENT', 'info');
  };

  // Save Marks
  const handleSaveMarks = async () => {
    if (!marksExamId || !marksClassId || !marksSubjectId) return;
    setSavingMarks(true);
    try {
      const sched = schedules.find(s => s.subject_id === marksSubjectId && s.class_id === marksClassId);
      const scheduleId = marksScheduleId || sched?.id || `sched_${marksSubjectId}`;

      await api.exams.saveMarks(marksExamId, {
        scheduleId,
        classId: marksClassId,
        subjectId: marksSubjectId,
        marks: roster
      });

      showToast('Student marks saved successfully', 'success');
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save marks', 'error');
    } finally {
      setSavingMarks(false);
    }
  };

  // Submit Marks for Review
  const handleSubmitMarks = async () => {
    if (!marksScheduleId && schedules.length > 0) {
      const sched = schedules.find(s => s.subject_id === marksSubjectId && s.class_id === marksClassId);
      if (sched) setMarksScheduleId(sched.id);
    }
    const schedId = marksScheduleId || schedules[0]?.id;
    if (!schedId) return;

    try {
      await api.exams.submitMarks(marksExamId, schedId);
      setSubmissionStatus('SUBMITTED');
      showToast('Marks submitted for Coordinator/Principal review', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit marks', 'error');
    }
  };

  // Approve Marks
  const handleApproveMarks = async () => {
    const schedId = marksScheduleId || schedules[0]?.id;
    if (!schedId) return;

    try {
      await api.exams.approveMarks(marksExamId, schedId, 'Verified against answer sheets.');
      setSubmissionStatus('APPROVED');
      setRoster(roster.map(r => ({ ...r, isLocked: true })));
      showToast('Marks approved and locked for result calculation', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to approve marks', 'error');
    }
  };

  // 3. Results Loader
  const loadResultsList = async () => {
    if (!resultsExamId) return;
    try {
      const res = await api.exams.getResults(resultsExamId, {
        classId: resultsClassId || undefined,
        search: searchStudent || undefined
      });
      setResultsList(res.results || []);
    } catch (err: any) {
      console.error('Error loading results list:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'results' && resultsExamId) {
      loadResultsList();
    }
  }, [activeTab, resultsExamId, resultsClassId, searchStudent]);

  // Calculate Results Engine
  const handleCalculateResults = async () => {
    if (!resultsExamId) return;
    setCalculatingResults(true);
    try {
      const res = await api.exams.calculateResults(resultsExamId, resultsClassId || undefined);
      showToast(res.message || 'Results calculated successfully!', 'success');
      loadResultsList();
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to calculate results', 'error');
    } finally {
      setCalculatingResults(false);
    }
  };

  // View Report Card
  const handleOpenReportCard = async (examId: string, studentId: string) => {
    setLoadingReportCard(true);
    setShowReportCardModal(true);
    try {
      const res = await api.exams.getReportCard(examId, studentId);
      setReportCardData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load report card', 'error');
      setShowReportCardModal(false);
    } finally {
      setLoadingReportCard(false);
    }
  };

  // Download Official PDF Report Card
  const handleDownloadReportCardPdf = () => {
    if (!reportCardData) return;
    const { school, exam, student, overallResult, subjects } = reportCardData;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Decorative border & header
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(1.2);
    doc.rect(8, 8, pageWidth - 16, 281);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, pageWidth - 20, 277);

    // School Header Box
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(10, 10, pageWidth - 20, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(school?.name || 'VIVEKANANDA VIDYA PEETH SENIOR SECONDARY SCHOOL', pageWidth / 2, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240);
    const subHeader = `${school?.affiliation_number ? `Affiliated to CBSE (Affiliation No: ${school.affiliation_number}) • ` : ''}${school?.address || 'Institutional Area, New Delhi - 110001'}`;
    doc.text(subHeader, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Contact: ${school?.contact_number || '+91 11 2345 6789'} | Email: ${school?.email || 'admin@vvps.edu.in'}`, pageWidth / 2, 34, { align: 'center' });

    // Certificate Title Banner
    doc.setFillColor(241, 245, 249);
    doc.rect(10, 42, pageWidth - 20, 14, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('OFFICIAL ACADEMIC PROGRESS REPORT CARD', pageWidth / 2, 51, { align: 'center' });

    // Exam & Session subline
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`${exam?.name || 'Half-Yearly Examination'} | Session: ${exam?.session_name || '2025-26'}`, pageWidth / 2, 62, { align: 'center' });

    // Student Particulars Table
    let y = 68;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, pageWidth - 28, 26, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    doc.text('Student Name:', 18, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student?.first_name || ''} ${student?.last_name || ''}`, 46, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Admission No:', 115, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student?.admission_number || 'N/A'}`, 145, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Class & Section:', 18, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student?.class_name || 'Class 1'} - ${student?.section_name || 'Section A'}`, 46, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.text('Roll Number:', 115, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student?.roll_number || '01'}`, 145, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.text('Parent/Guardian:', 18, y + 22);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student?.parent_name || 'Mr. Rajesh Kumar'}`, 46, y + 22);

    doc.setFont('helvetica', 'bold');
    doc.text('Date of Birth:', 115, y + 22);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-IN') : 'N/A'}`, 145, y + 22);

    // Subject Marks Breakdown Table
    y = 100;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('PART I: SCHOLASTIC PERFORMANCE', 14, y);

    y += 4;
    // Table Header
    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, y, pageWidth - 28, 8, 'S');

    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('Subject Name', 18, y + 5.5);
    doc.text('Max (Th+Pr)', 90, y + 5.5, { align: 'center' });
    doc.text('Theory', 118, y + 5.5, { align: 'center' });
    doc.text('Practical', 138, y + 5.5, { align: 'center' });
    doc.text('Total Obtained', 160, y + 5.5, { align: 'center' });
    doc.text('Grade', 184, y + 5.5, { align: 'center' });

    y += 8;
    doc.setFont('helvetica', 'normal');
    let totalMaxScore = 0;
    let totalObtScore = 0;

    subjects.forEach((sub: any, idx: number) => {
      const rowBg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(rowBg, rowBg, rowBg);
      doc.rect(14, y, pageWidth - 28, 7.5, 'F');
      doc.rect(14, y, pageWidth - 28, 7.5, 'S');

      doc.setTextColor(15, 23, 42);
      doc.text(`${sub.subject_name} (${sub.subject_code || 'GEN'})`, 18, y + 5);
      doc.text(`${sub.max_marks || 100}`, 90, y + 5, { align: 'center' });
      doc.text(`${sub.theory_marks || 0}`, 118, y + 5, { align: 'center' });
      doc.text(`${sub.practical_marks || 0}`, 138, y + 5, { align: 'center' });
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${sub.total_marks || 0}`, 160, y + 5, { align: 'center' });
      doc.text(`${sub.grade || 'A1'}`, 184, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');

      totalMaxScore += Number(sub.max_marks || 100);
      totalObtScore += Number(sub.total_marks || 0);
      y += 7.5;
    });

    // Grand Total Row
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.rect(14, y, pageWidth - 28, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('GRAND TOTAL', 18, y + 5.5);
    doc.text(`${overallResult?.total_max_marks || totalMaxScore}`, 90, y + 5.5, { align: 'center' });
    doc.text('-', 118, y + 5.5, { align: 'center' });
    doc.text('-', 138, y + 5.5, { align: 'center' });
    doc.text(`${overallResult?.total_marks_obtained || totalObtScore}`, 160, y + 5.5, { align: 'center' });
    doc.text(`${overallResult?.overall_grade || 'A1'}`, 184, y + 5.5, { align: 'center' });

    // Result Summary Box
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('PART II: FINAL EVALUATION SUMMARY', 14, y);

    y += 4;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, pageWidth - 28, 24, 'FD');
    doc.rect(14, y, pageWidth - 28, 24, 'S');

    doc.setFontSize(8.5);
    doc.text('Overall Percentage:', 18, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${overallResult?.overall_percentage || 0}%`, 56, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Overall Grade:', 80, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${overallResult?.overall_grade || 'A1'} (Scale: CBSE 9-Point)`, 110, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Class Rank:', 150, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rank ${overallResult?.class_rank || 1} of ${resultsList.length || 5}`, 172, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Grade Point Average:', 18, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(`${overallResult?.gpa || '9.0'} / 10.0`, 56, y + 15);

    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Ratio:', 80, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(`${overallResult?.attendance_percentage || 95}%`, 110, y + 15);

    doc.setFont('helvetica', 'bold');
    doc.text('Result Outcome:', 150, y + 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52); // green
    doc.text(`${overallResult?.result_status || 'PASSED'}`, 172, y + 15);
    doc.setTextColor(15, 23, 42);

    // Remarks Section
    y += 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Class Teacher Remarks:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`"${overallResult?.class_teacher_remarks || 'Excellent academic consistency, keen participation, and disciplined conduct.'}"`, 55, y);

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Principal Commendation:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`"${overallResult?.principal_remarks || 'Promoted with Honours. Keep shining and reaching greater heights!'}"`, 55, y);

    // Signatures Block
    y += 24;
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([1, 1], 0);

    // 3 Signatures
    doc.line(20, y + 10, 60, y + 10);
    doc.line(85, y + 10, 125, y + 10);
    doc.line(150, y + 10, 190, y + 10);

    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Class Teacher Signature', 40, y + 14, { align: 'center' });
    doc.text('Exam In-Charge / Seal', 105, y + 14, { align: 'center' });
    doc.text('Principal Signature & Stamp', 170, y + 14, { align: 'center' });

    // Footer note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('This is an official computer-generated student assessment card authenticated under the Institutional Examination Charter.', pageWidth / 2, 280, { align: 'center' });

    // Save PDF
    const filename = `Report_Card_${student?.admission_number || 'STU'}_${student?.first_name || 'Student'}.pdf`;
    doc.save(filename);
    showToast(`Downloaded ${filename}`, 'success');
  };

  // Create Examination Handler
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamForm.name || !newExamForm.code || !newExamForm.sessionId || !newExamForm.typeId || !newExamForm.startDate || !newExamForm.endDate) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      await api.exams.create({
        schoolId: activeSchoolId,
        sessionId: newExamForm.sessionId,
        typeId: newExamForm.typeId,
        name: newExamForm.name,
        code: newExamForm.code,
        description: newExamForm.description,
        startDate: newExamForm.startDate,
        endDate: newExamForm.endDate,
        weightage: newExamForm.weightage,
        isTermExam: newExamForm.isTermExam,
        classIds: newExamForm.classIds
      });

      showToast('Examination created successfully', 'success');
      setShowCreateExamModal(false);
      setNewExamForm({
        name: '',
        code: '',
        sessionId: sessions[0]?.id || '',
        typeId: examTypes[0]?.id || '',
        startDate: '',
        endDate: '',
        weightage: 100,
        isTermExam: true,
        description: '',
        classIds: []
      });
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create examination', 'error');
    }
  };

  // Add Schedule Handler
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !scheduleForm.classId || !scheduleForm.subjectId || !scheduleForm.examDate) {
      showToast('Class, Subject, and Exam Date are required', 'error');
      return;
    }

    try {
      await api.exams.addSchedule(selectedExamId, scheduleForm);
      showToast('Timetable schedule entry added', 'success');
      setShowAddScheduleModal(false);
      loadExamDetails(selectedExamId);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add schedule', 'error');
    }
  };

  // Delete Schedule Handler
  const handleDeleteSchedule = async (schedId: string) => {
    if (!confirm('Are you sure you want to remove this timetable entry?')) return;
    try {
      await api.exams.deleteSchedule(selectedExamId, schedId);
      showToast('Schedule removed', 'info');
      loadExamDetails(selectedExamId);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete schedule', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Phase 7 Complete
            </span>
            <span className="text-xs text-slate-500 font-mono">CBSE / State Board Compliance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Award className="w-6 h-6 text-indigo-600" />
            Examination & Result Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Conduct multi-term assessments, automate date sheet timetables, streamline teacher marks verification, and publish official CBSE report cards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewExamForm(prev => ({
                ...prev,
                sessionId: sessions[0]?.id || '',
                typeId: examTypes[0]?.id || ''
              }));
              setShowCreateExamModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Examination
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Examinations</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalExams || 0}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">{stats.activeExams || 0} active / scheduled cycles</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Scheduled Papers</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalSchedules || 0}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Subject date sheets configured</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Evaluated Marks</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.evaluatedMarks || 0}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">{stats.totalResults || 0} compiled student results</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Overall Pass Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.passRate || 100}%</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Avg Score: {stats.averagePercentage || 0}%</p>
        </div>
      </div>

      {/* 3. Sub-Tab Switcher */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition ${
            activeTab === 'exams'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Examinations & Timetable
        </button>

        <button
          onClick={() => setActiveTab('marks')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition ${
            activeTab === 'marks'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Marks Entry & Verification
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition ${
            activeTab === 'results'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Results & Report Cards
        </button>

        <button
          onClick={() => setActiveTab('grading')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition ${
            activeTab === 'grading'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Grading Scales & Assessment Types
        </button>
      </div>

      {/* 4. Tab 1: EXAMINATIONS & TIMETABLE */}
      {activeTab === 'exams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Exam list cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Exam Cycles</h2>
              <span className="text-xs text-slate-500 font-mono">{examinations.length} total</span>
            </div>

            <div className="space-y-3">
              {examinations.map((exam) => {
                const isSelected = exam.id === selectedExamId;
                return (
                  <div
                    key={exam.id}
                    onClick={() => handleSelectExam(exam.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {exam.code}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-900 mt-1">{exam.name}</h3>
                      </div>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        exam.status === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exam.status === 'SCHEDULED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {exam.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{exam.description || 'No description'}</p>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(exam.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(exam.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <span className="font-semibold text-indigo-600">{exam.schedule_count || 0} papers</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      {exam.timetable_published ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          <Check className="w-3 h-3" /> Timetable Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Timetable Draft
                        </span>
                      )}
                      {exam.results_published && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium">
                          <Award className="w-3 h-3" /> Results Live
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Exam Schedules & Details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedExam ? (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                {/* Details Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{selectedExam.name}</h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
                        {selectedExam.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Academic Session: <span className="font-medium text-slate-700">{selectedExam.session_name || '2025-26'}</span> • Weightage: <span className="font-medium text-slate-700">{selectedExam.weightage}%</span>
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleTogglePublishTimetable}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedExam.timetable_published
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {selectedExam.timetable_published ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {selectedExam.timetable_published ? 'Unpublish Timetable' : 'Publish Timetable'}
                    </button>

                    <button
                      onClick={handleTogglePublishResults}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedExam.results_published
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      {selectedExam.results_published ? 'Unpublish Results' : 'Publish Results'}
                    </button>

                    <button
                      onClick={() => {
                        setScheduleForm(prev => ({
                          ...prev,
                          classId: classes[0]?.id || '',
                          subjectId: subjects[0]?.id || ''
                        }));
                        setShowAddScheduleModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Schedule
                    </button>
                  </div>
                </div>

                {/* Schedules Table */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Exam Date Sheet (Timetable)</h3>
                    <span className="text-xs text-slate-500 font-mono">{schedules.length} Scheduled Papers</span>
                  </div>

                  {schedules.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-medium">No timetable schedules added yet</p>
                      <button
                        onClick={() => setShowAddScheduleModal(true)}
                        className="mt-3 text-xs text-indigo-600 hover:underline font-semibold"
                      >
                        + Add First Subject Schedule
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                            <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                            <th className="py-2.5 px-3 font-semibold">Subject</th>
                            <th className="py-2.5 px-3 font-semibold">Class</th>
                            <th className="py-2.5 px-3 font-semibold">Venue / Room</th>
                            <th className="py-2.5 px-3 font-semibold">Invigilator</th>
                            <th className="py-2.5 px-3 font-semibold text-center">Marks (Th + Pr)</th>
                            <th className="py-2.5 px-3 font-semibold">Status</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {schedules.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-800">
                                  {new Date(s.exam_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {s.start_time} - {s.end_time} ({s.duration_minutes}m)
                                </div>
                              </td>

                              <td className="py-3 px-3 font-medium text-slate-900">
                                <div>{s.subject_name}</div>
                                <span className="text-[10px] text-slate-500 font-mono">{s.subject_code || 'GEN'}</span>
                              </td>

                              <td className="py-3 px-3 text-slate-600">
                                {s.class_name} {s.section_name && `(${s.section_name})`}
                              </td>

                              <td className="py-3 px-3 text-slate-600">
                                {s.room_venue || 'Exam Hall A'}
                              </td>

                              <td className="py-3 px-3 text-slate-600">
                                {s.invigilator_name || 'Assigned Staff'}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span className="font-semibold text-slate-800">{s.total_max_marks}</span>
                                <span className="text-[10px] text-slate-400 block">({s.max_marks_theory} + {s.max_marks_practical})</span>
                              </td>

                              <td className="py-3 px-3">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  s.submission_status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : s.submission_status === 'SUBMITTED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {s.submission_status || 'DRAFT'}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setMarksExamId(selectedExam.id);
                                      setMarksClassId(s.class_id);
                                      setMarksSubjectId(s.subject_id);
                                      setMarksScheduleId(s.id);
                                      setActiveTab('marks');
                                    }}
                                    className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-semibold transition"
                                  >
                                    Enter Marks
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSchedule(s.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                                    title="Delete Schedule"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400">
                <Award className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">Select an examination cycle to inspect timetable & schedules</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab 2: MARKS ENTRY & VERIFICATION */}
      {activeTab === 'marks' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          {/* Filter selectors */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Examination</label>
              <select
                value={marksExamId}
                onChange={(e) => setMarksExamId(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {examinations.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Class</label>
              <select
                value={marksClassId}
                onChange={(e) => setMarksClassId(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Subject</label>
              <select
                value={marksSubjectId}
                onChange={(e) => setMarksSubjectId(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="">-- Choose Subject --</option>
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name} ({sub.code || 'GEN'})</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadMarksRoster}
                className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
              >
                Load Student Roster
              </button>
            </div>
          </div>

          {/* Marks Entry Spreadsheet Area */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  Marks Evaluation Sheet
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Workflow Status: <span className="font-semibold text-indigo-600">{submissionStatus}</span> • Component Max: Theory (80) + Practical (20) = 100
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 font-medium transition"
                >
                  Mark All Present
                </button>

                <button
                  onClick={handleSaveMarks}
                  disabled={savingMarks}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                >
                  {savingMarks ? 'Saving...' : 'Save Draft Marks'}
                </button>

                {submissionStatus === 'DRAFT' && (
                  <button
                    onClick={handleSubmitMarks}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                  >
                    Submit for Review
                  </button>
                )}

                {submissionStatus === 'SUBMITTED' && (
                  <button
                    onClick={handleApproveMarks}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                  >
                    Approve & Lock Marks
                  </button>
                )}
              </div>
            </div>

            {loadingMarks ? (
              <div className="py-16 text-center text-slate-400">Loading student roster...</div>
            ) : roster.length === 0 ? (
              <div className="py-16 text-center text-slate-400 border border-dashed rounded-xl">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Please choose examination, class, and subject above to load student roster</p>
              </div>
            ) : (
              <>
                {/* Mobile Marks Cards (shown on small screens) */}
                <div className="space-y-4 md:hidden pb-16">
                  {roster.map((stu) => (
                    <div
                      key={stu.studentId}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{stu.studentName}</div>
                          <div className="text-xs text-slate-500">
                            Roll: <span className="font-mono font-bold text-slate-700">{stu.rollNumber || '00'}</span> • Adm: <span className="font-mono">{stu.admissionNumber}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {stu.grade || '-'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            stu.isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {stu.isPassed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>

                      {/* Attendance Selector */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Attendance
                        </label>
                        <select
                          value={stu.attendanceStatus}
                          onChange={(e) => handleMarkChange(stu.studentId, 'attendanceStatus', e.target.value)}
                          disabled={stu.isLocked}
                          className="w-full min-h-[42px] text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                          <option value="MEDICAL">Medical Leave</option>
                        </select>
                      </div>

                      {/* Theory & Practical Marks */}
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            Theory (/80)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="80"
                            step="0.5"
                            value={stu.theoryMarks}
                            onChange={(e) => handleMarkChange(stu.studentId, 'theoryMarks', e.target.value)}
                            disabled={stu.isLocked || stu.attendanceStatus === 'ABSENT'}
                            className="w-full min-h-[42px] text-center text-sm font-bold py-2 px-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            Practical (/20)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            value={stu.practicalMarks}
                            onChange={(e) => handleMarkChange(stu.studentId, 'practicalMarks', e.target.value)}
                            disabled={stu.isLocked || stu.attendanceStatus === 'ABSENT'}
                            className="w-full min-h-[42px] text-center text-sm font-bold py-2 px-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
                          />
                        </div>
                        <div className="text-center p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg">
                          <div className="text-[10px] text-indigo-700 font-semibold uppercase">Total (/100)</div>
                          <div className="font-mono text-base font-black text-indigo-700">
                            {stu.totalMarks}
                          </div>
                        </div>
                      </div>

                      {/* Remarks */}
                      <div>
                        <input
                          type="text"
                          placeholder="Teacher remarks (optional)..."
                          value={stu.remarks || ''}
                          onChange={(e) => handleMarkChange(stu.studentId, 'remarks', e.target.value)}
                          disabled={stu.isLocked}
                          className="w-full min-h-[40px] text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white placeholder-slate-400"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Mobile Sticky Save Bar */}
                  <div className="fixed bottom-14 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg z-30 flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-700 truncate">
                      {roster.length} Students
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveMarks}
                        disabled={savingMarks}
                        className="min-h-[42px] px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
                      >
                        {savingMarks ? 'Saving...' : 'Save Draft'}
                      </button>
                      {submissionStatus === 'DRAFT' && (
                        <button
                          onClick={handleSubmitMarks}
                          className="min-h-[42px] px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Table (hidden on mobile) */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl hidden md:block">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                        <th className="py-3 px-3 font-semibold">Roll</th>
                        <th className="py-3 px-3 font-semibold">Adm No</th>
                        <th className="py-3 px-3 font-semibold">Student Name</th>
                        <th className="py-3 px-3 font-semibold">Attendance</th>
                        <th className="py-3 px-3 font-semibold text-center w-28">Theory (Max 80)</th>
                        <th className="py-3 px-3 font-semibold text-center w-28">Practical (Max 20)</th>
                        <th className="py-3 px-3 font-semibold text-center">Total (100)</th>
                        <th className="py-3 px-3 font-semibold text-center">Grade</th>
                        <th className="py-3 px-3 font-semibold text-center">Result</th>
                        <th className="py-3 px-3 font-semibold">Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roster.map((stu) => (
                        <tr key={stu.studentId} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                            {stu.rollNumber || '00'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {stu.admissionNumber}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {stu.studentName}
                          </td>

                          <td className="py-2.5 px-3">
                            <select
                              value={stu.attendanceStatus}
                              onChange={(e) => handleMarkChange(stu.studentId, 'attendanceStatus', e.target.value)}
                              disabled={stu.isLocked}
                              className="text-xs py-1 px-2 rounded border-slate-200 bg-white"
                            >
                              <option value="PRESENT">Present</option>
                              <option value="ABSENT">Absent</option>
                              <option value="MEDICAL">Medical</option>
                            </select>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="80"
                              step="0.5"
                              value={stu.theoryMarks}
                              onChange={(e) => handleMarkChange(stu.studentId, 'theoryMarks', e.target.value)}
                              disabled={stu.isLocked || stu.attendanceStatus === 'ABSENT'}
                              className="w-20 text-center text-xs py-1 px-1 rounded border-slate-200 bg-white font-semibold disabled:bg-slate-100"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              value={stu.practicalMarks}
                              onChange={(e) => handleMarkChange(stu.studentId, 'practicalMarks', e.target.value)}
                              disabled={stu.isLocked || stu.attendanceStatus === 'ABSENT'}
                              className="w-20 text-center text-xs py-1 px-1 rounded border-slate-200 bg-white font-semibold disabled:bg-slate-100"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-center font-bold text-indigo-600">
                            {stu.totalMarks}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span className="font-semibold text-slate-800 px-2 py-0.5 rounded bg-slate-100 font-mono">
                              {stu.grade || '-'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              stu.isPassed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {stu.isPassed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="Optional remark"
                              value={stu.remarks || ''}
                              onChange={(e) => handleMarkChange(stu.studentId, 'remarks', e.target.value)}
                              disabled={stu.isLocked}
                              className="w-full text-xs py-1 px-2 rounded border-slate-200 bg-white text-slate-700"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 6. Tab 3: RESULTS, MERIT RANKS & REPORT CARDS */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={resultsExamId}
                onChange={(e) => setResultsExamId(e.target.value)}
                className="text-xs rounded-lg border-slate-200 bg-white font-medium"
              >
                {examinations.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>

              <select
                value={resultsClassId}
                onChange={(e) => setResultsClassId(e.target.value)}
                className="text-xs rounded-lg border-slate-200 bg-white font-medium"
              >
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student or adm no..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="pl-8 text-xs rounded-lg border-slate-200 bg-white w-52"
                />
              </div>
            </div>

            <button
              onClick={handleCalculateResults}
              disabled={calculatingResults}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {calculatingResults ? 'Compiling Results...' : 'Calculate Results & Merit Ranks'}
            </button>
          </div>

          {/* Results Table */}
          {resultsList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-dashed rounded-xl">
              <Award className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No compiled student results found</p>
              <p className="text-[11px] text-slate-400 mt-1">Click "Calculate Results & Merit Ranks" above to run the auto-grading engine.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                    <th className="py-3 px-3 font-semibold text-center w-16">Rank</th>
                    <th className="py-3 px-3 font-semibold">Adm No</th>
                    <th className="py-3 px-3 font-semibold">Student Name</th>
                    <th className="py-3 px-3 font-semibold">Class</th>
                    <th className="py-3 px-3 font-semibold text-center">Marks Obtained</th>
                    <th className="py-3 px-3 font-semibold text-center">Percentage</th>
                    <th className="py-3 px-3 font-semibold text-center">Grade</th>
                    <th className="py-3 px-3 font-semibold text-center">GPA</th>
                    <th className="py-3 px-3 font-semibold text-center">Status</th>
                    <th className="py-3 px-3 font-semibold text-right">Report Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultsList.map((res) => {
                    const isTopper = res.class_rank === 1;
                    return (
                      <tr key={res.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 text-center">
                          {isTopper ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                              🥇1
                            </span>
                          ) : res.class_rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs">
                              🥈2
                            </span>
                          ) : res.class_rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs">
                              🥉3
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500 font-medium">#{res.class_rank}</span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-600">
                          {res.admission_number}
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {res.first_name} {res.last_name}
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          {res.class_name} {res.section_name && `(${res.section_name})`}
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {res.total_marks_obtained} <span className="text-[10px] text-slate-400 font-normal">/ {res.total_max_marks}</span>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-indigo-600">
                          {res.overall_percentage}%
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800 font-mono">
                            {res.overall_grade}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                          {res.gpa}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            res.result_status === 'PASSED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {res.result_status}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenReportCard(res.examination_id, res.student_id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View & Download
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. Tab 4: GRADING SCALES & TYPES */}
      {activeTab === 'grading' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grading Scales */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Grading Scales (CBSE Standard)</h3>
                <p className="text-xs text-slate-500">Tier definitions mapped to percentage boundaries & grade points</p>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium font-mono">
                9-Point System
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                    <th className="py-2.5 px-3 font-semibold">Grade</th>
                    <th className="py-2.5 px-3 font-semibold">Marks Range (%)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Grade Point</th>
                    <th className="py-2.5 px-3 font-semibold">Performance Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { gr: 'A1', range: '91% - 100%', gp: '10.0', desc: 'Outstanding Academic Merit' },
                    { gr: 'A2', range: '81% - 90%', gp: '9.0', desc: 'Excellent Conceptual Clarity' },
                    { gr: 'B1', range: '71% - 80%', gp: '8.0', desc: 'Very Good Performance' },
                    { gr: 'B2', range: '61% - 70%', gp: '7.0', desc: 'Good Analytical Standard' },
                    { gr: 'C1', range: '51% - 60%', gp: '6.0', desc: 'Above Average Understanding' },
                    { gr: 'C2', range: '41% - 50%', gp: '5.0', desc: 'Average Conceptual Baseline' },
                    { gr: 'D', range: '33% - 40%', gp: '4.0', desc: 'Marginal Pass Threshold' },
                    { gr: 'E1', range: '21% - 32%', gp: '0.0', desc: 'Needs Immediate Remedial Support' },
                    { gr: 'E2', range: '0% - 20%', gp: '0.0', desc: 'Unsatisfactory / Unsustained' }
                  ].map((tier) => (
                    <tr key={tier.gr} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">{tier.gr}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{tier.range}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{tier.gp}</td>
                      <td className="py-2.5 px-3 text-slate-600">{tier.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assessment Types */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configured Assessment Formats</h3>
              <p className="text-xs text-slate-500">Official evaluation types contributing to student cumulative GPA</p>
            </div>

            <div className="space-y-3">
              {examTypes.map((type) => (
                <div key={type.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">{type.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                        {type.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{type.description || 'Formative assessment cycle'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-600">{type.default_weightage}%</span>
                    <span className="text-[10px] text-slate-400 block">Weightage</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. REPORT CARD MODAL */}
      {showReportCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Official Academic Report Card Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadReportCardPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Official PDF
                </button>
                <button
                  onClick={() => setShowReportCardModal(false)}
                  className="p-1 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingReportCard || !reportCardData ? (
                <div className="py-20 text-center text-slate-400">Loading student assessment card...</div>
              ) : (
                <div className="border border-slate-300 rounded-xl p-6 bg-white space-y-6 text-slate-900">
                  {/* Institutional Banner */}
                  <div className="text-center pb-4 border-b border-slate-200">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                      {reportCardData.school?.name || 'Vivekananda Vidya Peeth'}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {reportCardData.school?.address || 'Institutional Area, New Delhi - 110001'}
                    </p>
                    <div className="mt-2 inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider">
                      Academic Progress Report • {reportCardData.exam?.name}
                    </div>
                  </div>

                  {/* Student Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Student Name</span>
                      <span className="font-bold text-slate-900">{reportCardData.student?.first_name} {reportCardData.student?.last_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admission Number</span>
                      <span className="font-mono font-medium text-slate-800">{reportCardData.student?.admission_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Class & Section</span>
                      <span className="font-semibold text-slate-800">{reportCardData.student?.class_name} ({reportCardData.student?.section_name})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Roll Number</span>
                      <span className="font-mono font-bold text-slate-900">{reportCardData.student?.roll_number}</span>
                    </div>
                  </div>

                  {/* Scholastic Marks Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Subject Evaluation</h4>
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2 px-3">Subject</th>
                          <th className="py-2 px-3 text-center">Max Marks</th>
                          <th className="py-2 px-3 text-center">Theory</th>
                          <th className="py-2 px-3 text-center">Practical</th>
                          <th className="py-2 px-3 text-center">Total Obtained</th>
                          <th className="py-2 px-3 text-center">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportCardData.subjects?.map((sub: any) => (
                          <tr key={sub.id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-semibold text-slate-800">{sub.subject_name}</td>
                            <td className="py-2 px-3 text-center text-slate-600">{sub.max_marks || 100}</td>
                            <td className="py-2 px-3 text-center text-slate-700">{sub.theory_marks}</td>
                            <td className="py-2 px-3 text-center text-slate-700">{sub.practical_marks}</td>
                            <td className="py-2 px-3 text-center font-bold text-indigo-600">{sub.total_marks}</td>
                            <td className="py-2 px-3 text-center font-bold font-mono text-slate-800">{sub.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Overall Result KPI */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] text-indigo-700 uppercase font-semibold">Aggregate Score</span>
                      <div className="text-base font-bold text-indigo-950 mt-0.5">
                        {reportCardData.overallResult?.total_marks_obtained} / {reportCardData.overallResult?.total_max_marks}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-700 uppercase font-semibold">Percentage</span>
                      <div className="text-base font-bold text-indigo-600 mt-0.5">
                        {reportCardData.overallResult?.overall_percentage}%
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-700 uppercase font-semibold">Class Rank</span>
                      <div className="text-base font-bold text-indigo-950 mt-0.5">
                        #{reportCardData.overallResult?.class_rank}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-700 uppercase font-semibold">Grade & Status</span>
                      <div className="text-base font-bold text-emerald-600 mt-0.5">
                        {reportCardData.overallResult?.overall_grade} ({reportCardData.overallResult?.result_status})
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2 text-xs">
                    <p><span className="font-bold text-slate-800">Class Teacher Remarks:</span> {reportCardData.overallResult?.class_teacher_remarks || 'Disciplined and attentive student.'}</p>
                    <p><span className="font-bold text-slate-800">Principal Commendation:</span> {reportCardData.overallResult?.principal_remarks || 'Promoted with Honours.'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. CREATE EXAM MODAL */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Create New Examination Cycle</h3>
              <button onClick={() => setShowCreateExamModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Examination Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Periodic Assessment 2 2025-26"
                  value={newExamForm.name}
                  onChange={(e) => setNewExamForm({ ...newExamForm, name: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PA-2-2025"
                    value={newExamForm.code}
                    onChange={(e) => setNewExamForm({ ...newExamForm, code: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Session *</label>
                  <select
                    value={newExamForm.sessionId}
                    onChange={(e) => setNewExamForm({ ...newExamForm, sessionId: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assessment Type *</label>
                  <select
                    value={newExamForm.typeId}
                    onChange={(e) => setNewExamForm({ ...newExamForm, typeId: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  >
                    {examTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Weightage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newExamForm.weightage}
                    onChange={(e) => setNewExamForm({ ...newExamForm, weightage: Number(e.target.value) })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newExamForm.startDate}
                    onChange={(e) => setNewExamForm({ ...newExamForm, startDate: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newExamForm.endDate}
                    onChange={(e) => setNewExamForm({ ...newExamForm, endDate: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Exam instructions or syllabus guidelines"
                  value={newExamForm.description}
                  onChange={(e) => setNewExamForm({ ...newExamForm, description: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExamModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  Create Examination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. ADD SCHEDULE MODAL */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Add Subject Exam Schedule</h3>
              <button onClick={() => setShowAddScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class *</label>
                  <select
                    value={scheduleForm.classId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, classId: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject *</label>
                  <select
                    value={scheduleForm.subjectId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.examDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, examDate: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Venue / Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Exam Hall A"
                    value={scheduleForm.roomVenue}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, roomVenue: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invigilator Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rakesh Sharma"
                    value={scheduleForm.invigilatorName}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, invigilatorName: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Theory</label>
                  <input
                    type="number"
                    value={scheduleForm.maxMarksTheory}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maxMarksTheory: Number(e.target.value) })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Practical</label>
                  <input
                    type="number"
                    value={scheduleForm.maxMarksPractical}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maxMarksPractical: Number(e.target.value) })}
                    className="w-full text-xs rounded-lg border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Max Marks</label>
                  <input
                    type="number"
                    value={scheduleForm.totalMaxMarks}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, totalMaxMarks: Number(e.target.value) })}
                    className="w-full text-xs rounded-lg border-slate-200 font-bold text-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  Add to Timetable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
