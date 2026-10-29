import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Users,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';

interface PromotionManagementProps {
  schoolId?: string;
}

export const PromotionManagementView: React.FC<PromotionManagementProps> = ({
  schoolId
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'promotion' | 'section_transfer'>('promotion');

  // Classes & Sessions
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Promotion Form State
  const [fromSessionId, setFromSessionId] = useState('');
  const [fromClassId, setFromClassId] = useState('');
  const [fromSectionId, setFromSectionId] = useState('');
  const [toSessionId, setToSessionId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [toSectionId, setToSectionId] = useState('');

  // Preview Data
  const [previewStudents, setPreviewStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentDecisions, setStudentDecisions] = useState<Record<string, string>>({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executingPromotion, setExecutingPromotion] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<any | null>(null);

  // Section Transfer Form State
  const [stStudentSearch, setStStudentSearch] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedStStudent, setSelectedStStudent] = useState<any | null>(null);
  const [stToSectionId, setStToSectionId] = useState('');
  const [stReason, setStReason] = useState('Administrative rebalancing');
  const [stEffectiveDate, setStEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferringSection, setTransferringSection] = useState(false);

  // Fetch initial classes, sections, sessions
  useEffect(() => {
    const sParam = schoolId ? `?schoolId=${schoolId}` : '';
    Promise.all([
      fetch(`/api/classes${sParam}`).then((r) => r.json()),
      fetch(`/api/sessions${sParam}`).then((r) => r.json()),
      fetch(`/api/sections${sParam}`).then((r) => r.json()),
      fetch(`/api/students${sParam}`).then((r) => r.json())
    ])
      .then(([clsData, sesData, secData, stuData]) => {
        setClasses(clsData.classes || []);
        setSessions(sesData.sessions || []);
        setSections(secData.sections || []);
        setAllStudents(stuData.students || []);

        if (sesData.sessions?.length > 0) {
          const curr = sesData.sessions.find((s: any) => s.is_current) || sesData.sessions[0];
          setFromSessionId(curr.id);
          const next = sesData.sessions.find((s: any) => s.status === 'upcoming') || curr;
          setToSessionId(next.id);
        }
        if (clsData.classes?.length > 0) {
          setFromClassId(clsData.classes[0].id);
          if (clsData.classes.length > 1) {
            setToClassId(clsData.classes[1].id);
          }
        }
      })
      .catch((err) => console.error('[FETCH PROMOTION DATA ERROR]', err));
  }, [schoolId]);

  // Update target sections when target class changes
  const targetSections = sections.filter((s) => s.class_id === toClassId);
  const sourceSections = sections.filter((s) => s.class_id === fromClassId);

  useEffect(() => {
    if (targetSections.length > 0 && !toSectionId) {
      setToSectionId(targetSections[0].id);
    }
  }, [toClassId, sections]);

  // Fetch Promotion Preview
  const handlePreviewPromotion = async () => {
    if (!fromClassId) return;
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/lifecycle/promotion/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromClassId,
          fromSectionId: fromSectionId || undefined,
          toClassId,
          toSectionId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPreviewStudents(data.students || []);
      setPreviewSummary(data.summary || null);

      // Default select all eligible students
      const eligibleIds = (data.students || []).filter((s: any) => s.eligible).map((s: any) => s.id);
      setSelectedStudentIds(eligibleIds);

      // Default decisions
      const decisions: Record<string, string> = {};
      (data.students || []).forEach((s: any) => {
        decisions[s.id] = s.proposedDecision;
      });
      setStudentDecisions(decisions);
    } catch (err: any) {
      alert(`Error loading promotion preview: ${err.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Toggle Selection
  const toggleStudentSelection = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedStudentIds.length === previewStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(previewStudents.map((s) => s.id));
    }
  };

  // Execute Promotion
  const handleExecutePromotion = async () => {
    if (selectedStudentIds.length === 0) {
      alert('Please select at least one student to promote.');
      return;
    }

    if (!confirm(`Are you sure you want to finalize promotion for ${selectedStudentIds.length} students into the proposed class? This will create official enrollment records.`)) {
      return;
    }

    setExecutingPromotion(true);
    try {
      const promotionPayload = selectedStudentIds.map((id) => {
        const stu = previewStudents.find((s) => s.id === id);
        return {
          studentId: id,
          decision: studentDecisions[id] || 'PROMOTED',
          examScore: stu?.examScore || 75.0,
          remarks: 'Annual Class Progression'
        };
      });

      const res = await fetch('/api/lifecycle/promotion/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          fromSessionId,
          toSessionId,
          fromClassId,
          toClassId,
          toSectionId,
          promotions: promotionPayload
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Success: ${data.processedCount} students promoted successfully!`);
      setPreviewStudents([]);
      setPreviewSummary(null);
      setSelectedStudentIds([]);
    } catch (err: any) {
      alert(`Promotion execution failed: ${err.message}`);
    } finally {
      setExecutingPromotion(false);
    }
  };

  // Execute Section Transfer
  const handleExecuteSectionTransfer = async () => {
    if (!selectedStStudent || !stToSectionId) {
      alert('Please select student and destination section.');
      return;
    }

    setTransferringSection(true);
    try {
      const res = await fetch('/api/lifecycle/section-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStStudent.id,
          toSectionId: stToSectionId,
          reason: stReason,
          effectiveDate: stEffectiveDate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Student section transferred successfully!');
      setSelectedStStudent(null);
      setStStudentSearch('');
    } catch (err: any) {
      alert(`Section transfer failed: ${err.message}`);
    } finally {
      setTransferringSection(false);
    }
  };

  const filteredSearchStudents = allStudents.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(stStudentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sub Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('promotion')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeSubTab === 'promotion'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Academic Promotion (Bulk / Individual)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('section_transfer')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeSubTab === 'section_transfer'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Section Transfer
        </button>
      </div>

      {activeSubTab === 'promotion' ? (
        <div className="space-y-6">
          {/* 1. PROMOTION CONFIGURATION MATRIX */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Annual Academic Progression &amp; Promotion Setup
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure current cohort and proposed destination grade for bulk promotion verification
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              {/* Source Grade */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Source Cohort (Current)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Session</label>
                    <select
                      value={fromSessionId}
                      onChange={(e) => setFromSessionId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} {s.is_current ? '(Current)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Class *</label>
                    <select
                      value={fromClassId}
                      onChange={(e) => setFromClassId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Section</label>
                    <select
                      value={fromSectionId}
                      onChange={(e) => setFromSectionId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">All Sections</option>
                      {sourceSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Destination Grade */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Proposed Target Cohort (New)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">New Session *</label>
                    <select
                      value={toSessionId}
                      onChange={(e) => setToSessionId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Target Class *</label>
                    <select
                      value={toClassId}
                      onChange={(e) => setToClassId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Target Section *</label>
                    <select
                      value={toSectionId}
                      onChange={(e) => setToSectionId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      {targetSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handlePreviewPromotion}
                disabled={loadingPreview}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {loadingPreview ? 'Verifying Results...' : 'Generate Promotion Preview'}
              </button>
            </div>
          </div>

          {/* 2. PROMOTION PREVIEW TABLE */}
          {previewStudents.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Promotion Eligibility Preview ({previewStudents.length} Students)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {previewSummary?.eligibleCount ?? 0} Eligible for Promotion • {previewSummary?.retainedCount ?? 0} Requiring Review
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {selectedStudentIds.length === previewStudents.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    type="button"
                    onClick={handleExecutePromotion}
                    disabled={executingPromotion || selectedStudentIds.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {executingPromotion ? 'Processing...' : `Confirm & Promote (${selectedStudentIds.length})`}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-8">
                        <button type="button" onClick={selectAll} className="text-slate-500">
                          {selectedStudentIds.length === previewStudents.length ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Admission No</th>
                      <th className="py-2.5 px-3">Current Section</th>
                      <th className="py-2.5 px-3 text-right">Exam Score</th>
                      <th className="py-2.5 px-3">Standing</th>
                      <th className="py-2.5 px-3">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewStudents.map((stu) => {
                      const isSelected = selectedStudentIds.includes(stu.id);
                      return (
                        <tr key={stu.id} className={`hover:bg-slate-50/50 ${!stu.eligible ? 'bg-amber-50/30' : ''}`}>
                          <td className="py-2.5 px-3">
                            <button type="button" onClick={() => toggleStudentSelection(stu.id)}>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{stu.studentName}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{stu.admissionNumber}</td>
                          <td className="py-2.5 px-3 text-slate-600">{stu.currentClass}-{stu.currentSection}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{stu.examScore}%</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              stu.eligible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {stu.examResult}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={studentDecisions[stu.id] || 'PROMOTED'}
                              onChange={(e) => setStudentDecisions({ ...studentDecisions, [stu.id]: e.target.value })}
                              className="text-xs bg-white border border-slate-200 rounded px-2 py-1 focus:outline-indigo-500 font-medium"
                            >
                              <option value="PROMOTED">Promote to Next Grade</option>
                              <option value="RETAINED">Retain in Current Grade</option>
                              <option value="CONDITIONAL">Conditional Promotion</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SECTION TRANSFER VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 max-w-xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Individual Section Transfer
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Reallocate a student to an alternate section within the same grade with full audit tracking
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Search &amp; Select Student *</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type student name or admission number..."
                  value={stStudentSearch}
                  onChange={(e) => setStStudentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                />
              </div>

              {stStudentSearch && !selectedStStudent && (
                <div className="mt-1 border border-slate-200 rounded-lg max-h-36 overflow-y-auto bg-white shadow-md divide-y divide-slate-100">
                  {filteredSearchStudents.slice(0, 5).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStStudent(s);
                        setStStudentSearch('');
                      }}
                      className="w-full text-left p-2 hover:bg-slate-50 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{s.first_name} {s.last_name}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{s.admission_number}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">Class {s.class_name || ''}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedStStudent && (
                <div className="mt-2 p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{selectedStStudent.first_name} {selectedStStudent.last_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{selectedStStudent.admission_number} • Currently Section {selectedStStudent.section_name || 'A'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStStudent(null)}
                    className="text-xs text-rose-600 font-semibold hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {selectedStStudent && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Destination Section *</label>
                  <select
                    value={stToSectionId}
                    onChange={(e) => setStToSectionId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-white"
                  >
                    <option value="">Select Target Section</option>
                    {sections.filter((sec) => sec.class_id === selectedStStudent.class_id).map((sec) => (
                      <option key={sec.id} value={sec.id}>Section {sec.name} ({sec.room_number || 'Room TBD'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={stEffectiveDate}
                    onChange={(e) => setStEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Transfer</label>
                  <input
                    type="text"
                    value={stReason}
                    onChange={(e) => setStReason(e.target.value)}
                    placeholder="e.g. Disciplinary separation, student capacity rebalance"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleExecuteSectionTransfer}
                    disabled={transferringSection || !stToSectionId}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                  >
                    {transferringSection ? 'Transferring...' : 'Execute Section Transfer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
