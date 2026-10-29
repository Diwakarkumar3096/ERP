import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AIInsightsProps {
  kpis: any;
  schoolComparison: any[];
  schoolId?: string;
}

export const AIInsightsCard: React.FC<AIInsightsProps> = ({
  kpis,
  schoolComparison,
  schoolId
}) => {
  const [insights, setInsights] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mis/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, kpis, schoolComparison })
      });
      const data = await res.json();
      setInsights(data);
    } catch (err) {
      console.error('[AI INSIGHTS ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (kpis && Object.keys(kpis).length > 0) {
      generateInsights();
    }
  }, [schoolId]);

  return (
    <div className="bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-800/40 shadow-lg p-5 space-y-4 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-white">AI-Powered Executive MIS Intelligence</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified ERP Data
              </span>
            </div>
            <p className="text-[11px] text-indigo-200/70">
              {insights?.modelUsed ? `Grounded synthesis via ${insights.modelUsed}` : 'Automated multi-variable diagnostic briefing'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generateInsights}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-100 bg-white/10 hover:bg-white/15 rounded-xl transition-colors border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh AI Briefing'}
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-indigo-900/50">
          {/* Executive Summary Narrative */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs leading-relaxed text-indigo-100">
            {loading ? (
              <div className="flex items-center gap-2 text-indigo-300">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                Evaluating cross-campus trends and synthesizing executive digest...
              </div>
            ) : (
              <p>{insights?.summary || 'Executive metrics across campuses indicate healthy operational indicators.'}</p>
            )}
          </div>

          {/* Tri-Column Insights Grid */}
          {!loading && insights && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Positive Highlights */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Institutional Strengths
                </div>
                <ul className="space-y-1.5 text-[11px] text-emerald-100/90 list-disc list-inside">
                  {(insights.positiveHighlights || []).map((h: string, idx: number) => (
                    <li key={idx} className="leading-snug">{h}</li>
                  ))}
                </ul>
              </div>

              {/* Red Flags & Vulnerabilities */}
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px] uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Key Risks &amp; Vulnerabilities
                </div>
                <ul className="space-y-1.5 text-[11px] text-rose-100/90 list-disc list-inside">
                  {(insights.redFlags || []).map((rf: string, idx: number) => (
                    <li key={idx} className="leading-snug">{rf}</li>
                  ))}
                </ul>
              </div>

              {/* Actionable Recommendations */}
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Recommended Action Steps
                </div>
                <ul className="space-y-1.5 text-[11px] text-amber-100/90 list-disc list-inside">
                  {(insights.recommendations || []).map((rec: string, idx: number) => (
                    <li key={idx} className="leading-snug">{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
