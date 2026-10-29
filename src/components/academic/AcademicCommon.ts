export type AcademicTab =
  | 'dashboard'
  | 'curriculum'
  | 'units_topics'
  | 'learning_outcomes'
  | 'lesson_planner'
  | 'syllabus_progress'
  | 'resources'
  | 'formative_assessments'
  | 'remedial_enrichment'
  | 'interventions';

export interface CurriculumFramework {
  id: string;
  school_id: string;
  session_id: string;
  name: string;
  code: string;
  board: string;
  description?: string;
  applicable_classes?: string;
  applicable_subjects?: string;
  version: number;
  status: string;
  effective_from: string;
  effective_to: string;
  created_by_name?: string;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  session_name?: string;
  mapped_subjects_count?: number;
  total_versions?: number;
}

export interface CurriculumSubjectMap {
  id: string;
  curriculum_id: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  term_id?: string;
  term_name?: string;
  coordinator_name?: string;
  lead_teacher_name?: string;
  weekly_periods: number;
  planned_lessons: number;
  planned_teaching_hours: number;
  units_count?: number;
}

export interface CurriculumUnit {
  id: string;
  subject_map_id: string;
  class_name?: string;
  subject_name?: string;
  unit_number: number;
  title: string;
  description?: string;
  weightage_marks: number;
  planned_periods: number;
  chapters_count?: number;
}

export interface CurriculumChapter {
  id: string;
  unit_id: string;
  chapter_number: number;
  title: string;
  description?: string;
  estimated_teaching_hours: number;
}

export interface CurriculumTopic {
  id: string;
  chapter_id: string;
  chapter_title?: string;
  chapter_number?: number;
  unit_title?: string;
  unit_number?: number;
  class_name?: string;
  subject_name?: string;
  topic_code?: string;
  title: string;
  description?: string;
  learning_objectives?: string;
  competencies?: string;
  estimated_periods: number;
  difficulty_level: 'EASY' | 'MEDIUM' | 'HARD';
  recommended_activities?: string;
  recommended_resources?: string;
  prerequisites?: string;
  status: string;
}

export interface LearningOutcome {
  id: string;
  class_id: string;
  class_name?: string;
  subject_id: string;
  subject_name?: string;
  code: string;
  title: string;
  description?: string;
  competency_category: string;
  expected_level: string;
  mapped_topics_count?: number;
}

export interface AcademicLessonPlan {
  id: string;
  class_id: string;
  class_name?: string;
  section_id?: string;
  section_name?: string;
  subject_id: string;
  subject_name?: string;
  topic_id?: string;
  topic_name?: string;
  teacher_name: string;
  lesson_title: string;
  plan_date: string;
  period_number?: string;
  duration_minutes: number;
  learning_objectives: string;
  learning_outcomes?: string;
  teaching_methodology: string;
  pedagogical_steps?: string;
  differentiation_strategy?: string;
  required_resources?: string;
  classroom_activities?: string;
  homework_summary?: string;
  formative_assessment_summary?: string;
  teacher_reflection_notes?: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED' | 'CANCELLED';
  completed_at?: string;
  delay_reason?: string;
}

export interface SyllabusProgressTopic {
  id: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  topic_id: string;
  topic_title: string;
  topic_code?: string;
  unit_title?: string;
  unit_number?: number;
  chapter_title?: string;
  chapter_number?: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_completion_date?: string;
  teaching_hours_delivered: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REVISION' | 'DEFERRED';
  completion_percentage: number;
  teacher_notes?: string;
  deferral_reason?: string;
}

export interface AcademicResource {
  id: string;
  title: string;
  resource_type: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  class_name?: string;
  subject_name?: string;
  topic_name?: string;
  visibility: string;
  uploaded_by_name?: string;
  downloads_count: number;
  created_at: string;
}

export interface FormativeAssessment {
  id: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  topic_title?: string;
  learning_outcome_code?: string;
  title: string;
  assessment_type: string;
  conducted_date: string;
  max_score: number;
  conducted_by_name?: string;
  assessed_students_count?: number;
  average_score?: number;
}

export interface RemedialSupportPlan {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  subject_name: string;
  topic_title?: string;
  assigned_teacher_name?: string;
  support_reason: string;
  intervention_plan: string;
  start_date: string;
  review_date: string;
  target_outcome?: string;
  sessions_conducted: number;
  status: 'PLANNED' | 'ACTIVE' | 'UNDER_REVIEW' | 'COMPLETED' | 'CLOSED';
  outcome_remarks?: string;
}

export interface EnrichmentLearningPlan {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  subject_name: string;
  assigned_mentor_name?: string;
  program_type: string;
  title: string;
  activity_description: string;
  start_date: string;
  target_completion_date?: string;
  status: string;
  progress_notes?: string;
}
