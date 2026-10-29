import React, { useState } from 'react';
import { Sparkles, X, Check, Copy, AlertTriangle, BookOpen, Layers, Lightbulb, RefreshCw } from 'lucide-react';
import { useToast } from '../common/Toast.js';

interface AcademicAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
  initialSubject?: string;
  initialClass?: string;
  onApplyDraft?: (draft: any) => void;
}

export const AcademicAIAssistantModal: React.FC<AcademicAIAssistantModalProps> = ({
  isOpen,
  onClose,
  initialTopic = '',
  initialSubject = 'Mathematics',
  initialClass = 'Class 5',
  onApplyDraft
}) => {
  const { showToast } = useToast();

  const [topic, setTopic] = useState(initialTopic);
  const [subject, setSubject] = useState(initialSubject);
  const [className, setClassName] = useState(initialClass);
  const [taskType, setTaskType] = useState<'LESSON_PLAN' | 'ACTIVITIES' | 'WORKSHEET' | 'DIFFERENTIATION'>('LESSON_PLAN');
  const [learningOutcome, setLearningOutcome] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      showToast('Please enter an academic topic title', 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/academic/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType,
          className,
          subjectName: subject,
          topicTitle: topic,
          learningOutcome
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate assistance');

      setResult(data);
      showToast('AI draft generated successfully. Please review before classroom use.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error communicating with assistant', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.draft) return;
    navigator.clipboard.writeText(JSON.stringify(result.draft, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Draft copied to clipboard', 'info');
  };

  const handleApply = () => {
    if (result?.draft && onApplyDraft) {
      onApplyDraft(result.draft);
      showToast('AI draft populated into Lesson Planner', 'success');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-linear-to-r from-purple-50 via-indigo-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">AI Pedagogical Lesson Assistant</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                  NEP 2020 Aligned
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate 5E inquiry lesson steps, differentiated activities, and exit assessments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Input Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Class</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="Class 1">Class 1 (Primary)</option>
                <option value="Class 3">Class 3 (Primary)</option>
                <option value="Class 5">Class 5 (Junior)</option>
                <option value="Class 6">Class 6 (Middle)</option>
                <option value="Class 8">Class 8 (Middle)</option>
                <option value="Class 10">Class 10 (Secondary)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="General Science">General Science</option>
                <option value="Social Science">Social Science</option>
                <option value="English Core">English Core</option>
                <option value="Computer Science">Computer Science & IP</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Task Type</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="LESSON_PLAN">Complete 5E Lesson Plan</option>
                <option value="ACTIVITIES">Classroom Hands-on Activities</option>
                <option value="WORKSHEET">Worksheet & Practice Questions</option>
                <option value="DIFFERENTIATION">Remedial vs Advanced Tasks</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Topic Title *</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Multi-Digit Whole Numbers & International Place Value"
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Learning Outcome (Optional)</label>
            <input
              type="text"
              value={learningOutcome}
              onChange={(e) => setLearningOutcome(e.target.value)}
              placeholder="e.g. Student can represent and convert 7-digit numbers across Indian and International systems"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-5 py-2.5 bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Draft...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Pedagogical Draft</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Result */}
          {result && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              {/* Mandatory AI Safety & Review Disclaimer */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <span className="font-bold">AI-generated draft — review before use.</span>
                  <p className="mt-0.5 text-[11px] text-amber-700">
                    {result.disclaimer || 'Teachers must review, adapt, and customize this draft prior to classroom delivery and publication.'}
                  </p>
                </div>
              </div>

              {/* Draft Content Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-900">{result.draft?.title || topic}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    {onApplyDraft && (
                      <button
                        onClick={handleApply}
                        className="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all shadow-xs"
                      >
                        Populate in Planner
                      </button>
                    )}
                  </div>
                </div>

                {result.draft?.objectives && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learning Objectives</span>
                    <p className="text-xs text-slate-800 mt-0.5 bg-white p-2.5 rounded-xl border border-slate-200/60">
                      {result.draft.objectives}
                    </p>
                  </div>
                )}

                {result.draft?.pedagogicalSteps && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">5E Pedagogical Phases</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {Object.entries(result.draft.pedagogicalSteps).map(([key, val]: any) => (
                        <div key={key} className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                          <span className="text-[10px] font-bold uppercase text-purple-700">{key}:</span>
                          <p className="text-slate-700 mt-0.5">{String(val)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.draft?.differentiation && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-rose-50/60 border border-rose-200/60 p-2.5 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-rose-700">Remedial / Support Strategy</span>
                      <p className="text-slate-800 mt-0.5">{result.draft.differentiation.support}</p>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-200/60 p-2.5 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-emerald-700">Enrichment / Advanced Challenge</span>
                      <p className="text-slate-800 mt-0.5">{result.draft.differentiation.enrichment}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
