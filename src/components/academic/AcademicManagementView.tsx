import React, { useState } from 'react';
import {
  Compass,
  BookOpen,
  Layers,
  Award,
  Calendar,
  FileText,
  GraduationCap,
  AlertTriangle,
  Sparkles,
  LayoutDashboard,
  CheckCircle2
} from 'lucide-react';
import { AcademicTab } from './AcademicCommon';
import { AcademicDashboardView } from './AcademicDashboardView';
import { CurriculumManagementView } from './CurriculumManagementView';
import { UnitsTopicsView } from './UnitsTopicsView';
import { LearningOutcomesView } from './LearningOutcomesView';
import { LessonPlannerView } from './LessonPlannerView';
import { SyllabusProgressView } from './SyllabusProgressView';
import { AcademicResourcesView } from './AcademicResourcesView';
import { FormativeAssessmentsView } from './FormativeAssessmentsView';
import { RemedialEnrichmentView } from './RemedialEnrichmentView';
import { AcademicInterventionsView } from './AcademicInterventionsView';
import { AcademicAIAssistantModal } from './AcademicAIAssistantModal';

export const AcademicManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AcademicTab>('dashboard');
  const [showAIModal, setShowAIModal] = useState(false);

  const tabs: { id: AcademicTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { id: 'curriculum', label: 'Curriculum Frameworks', icon: BookOpen },
    { id: 'units_topics', label: 'Units & Topics', icon: Layers },
    { id: 'learning_outcomes', label: 'Learning Outcomes', icon: Award },
    { id: 'lesson_planner', label: '5E Lesson Plans', icon: Calendar },
    { id: 'syllabus_progress', label: 'Syllabus Matrix', icon: Compass },
    { id: 'resources', label: 'LMS Resources', icon: FileText },
    { id: 'formative_assessments', label: 'Formative Tests', icon: CheckCircle2 },
    { id: 'remedial_enrichment', label: 'Remedial & Enrichment', icon: GraduationCap },
    { id: 'interventions', label: 'Interventions & Alerts', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Top Tab Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowAIModal(true)}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-transform active:scale-95 ml-2"
        >
          <Sparkles className="w-3.5 h-3.5 fill-current text-slate-950" />
          AI Pedagogical Assistant
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'dashboard' && (
          <AcademicDashboardView
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenAIAssistant={() => setShowAIModal(true)}
          />
        )}

        {activeTab === 'curriculum' && (
          <CurriculumManagementView
            onNavigateToUnits={() => setActiveTab('units_topics')}
          />
        )}

        {activeTab === 'units_topics' && (
          <UnitsTopicsView onOpenAIAssistant={() => setShowAIModal(true)} />
        )}

        {activeTab === 'learning_outcomes' && <LearningOutcomesView />}

        {activeTab === 'lesson_planner' && (
          <LessonPlannerView onOpenAIAssistant={() => setShowAIModal(true)} />
        )}

        {activeTab === 'syllabus_progress' && <SyllabusProgressView />}

        {activeTab === 'resources' && (
          <AcademicResourcesView onOpenAIAssistant={() => setShowAIModal(true)} />
        )}

        {activeTab === 'formative_assessments' && <FormativeAssessmentsView />}

        {activeTab === 'remedial_enrichment' && (
          <RemedialEnrichmentView onOpenAIAssistant={() => setShowAIModal(true)} />
        )}

        {activeTab === 'interventions' && <AcademicInterventionsView />}
      </div>

      {/* AI Assistant Modal */}
      {showAIModal && (
        <AcademicAIAssistantModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
        />
      )}
    </div>
  );
};
