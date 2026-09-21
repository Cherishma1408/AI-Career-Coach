export interface Profile {
  id: string;
  full_name: string | null;
  education: string | null;
  college: string | null;
  degree: string | null;
  graduation_year: number | null;
  current_role: string | null;
  career_goal: string | null;
  years_of_experience: number;
  preferred_job_roles: string[];
  preferred_locations: string[];
  technical_skills: string[];
  soft_skills: string[];
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  location?: string;
}

export interface ParsedEducation {
  institution: string;
  degree: string;
  year?: string;
  gpa?: string;
}

export interface ParsedExperience {
  company: string;
  role: string;
  duration?: string;
  highlights: string[];
}

export interface ParsedProject {
  title: string;
  technologies: string[];
  description: string;
}

export interface ResumeAnalysis {
  id: string;
  user_id: string;
  resume_id: string;
  overall_score: number;
  contact_info: ContactInfo;
  education_parsed: ParsedEducation[];
  work_experience_parsed: ParsedExperience[];
  projects_parsed: ParsedProject[];
  technical_skills: string[];
  soft_skills: string[];
  certifications: string[];
  achievements: string[];
  missing_sections: string[];
  strengths: string[];
  weaknesses: string[];
  missing_info: string[];
  recommendations: string[];
  created_at: string;
}

export interface JobDescription {
  id: string;
  user_id: string;
  title: string;
  company: string | null;
  location: string | null;
  raw_text: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_requirements: string | null;
  education_requirements: string | null;
  responsibilities: string[];
  technologies: string[];
  keywords: string[];
  created_at: string;
}

export interface JobMatch {
  id: string;
  user_id: string;
  job_description_id: string;
  resume_id: string | null;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  partially_matching_skills: string[];
  relevant_experience: string | null;
  potential_gaps: string[];
  verdict: string | null;
  detailed_feedback: string | null;
  created_at: string;
}

export interface SkillItem {
  id: string;
  user_id: string;
  name: string;
  category: 'technical' | 'soft' | 'other';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'not_assessed';
  source: 'resume' | 'profile' | 'manual' | 'interview';
  created_at: string;
}

export interface SkillPriorityItem {
  skill: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

export interface SkillGap {
  id: string;
  user_id: string;
  target_role: string;
  existing_skills: string[];
  required_skills: string[];
  missing_skills: string[];
  skill_priorities: SkillPriorityItem[];
  suggested_learning_sequence: string[];
  created_at: string;
}

export interface RoadmapResource {
  title: string;
  type: string;
  description: string;
  url?: string;
}

export interface Roadmap {
  id: string;
  user_id: string;
  title: string;
  target_role: string;
  created_at: string;
  items?: RoadmapItem[];
}

export interface RoadmapItem {
  id: string;
  roadmap_id: string;
  user_id: string;
  step_number: number;
  skill_topic: string;
  priority: 'high' | 'medium' | 'low';
  prerequisites: string[];
  learning_objective: string;
  recommended_resources: RoadmapResource[];
  practice_task: string;
  project_suggestion: string;
  estimated_learning_effort: string;
  status: 'not_started' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: string;
  user_id: string;
  target_role: string;
  experience_level: string;
  interview_type: string;
  num_questions: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  overall_score: number | null;
  feedback_summary: string | null;
  strengths: string[];
  improvements: string[];
  created_at: string;
  completed_at: string | null;
}

export interface InterviewQuestion {
  id: string;
  interview_id: string;
  user_id: string;
  question_number: number;
  question_text: string;
  category: string;
  created_at: string;
}

export interface InterviewAnswer {
  id: string;
  interview_id: string;
  question_id: string;
  user_id: string;
  answer_text: string;
  technical_accuracy_score: number;
  relevance_score: number;
  completeness_score: number;
  communication_score: number;
  problem_solving_score: number;
  feedback: string;
  areas_for_improvement: string[];
  created_at: string;
}

export interface SavedJob {
  id: string;
  user_id: string;
  job_title: string;
  company: string;
  location: string | null;
  job_type: string | null;
  description_snippet: string | null;
  apply_url: string | null;
  salary: string | null;
  source: string | null;
  created_at: string;
}

export interface JobSearchResult {
  id: string;
  title: string;
  company: string;
  location: string;
  type?: string;
  url: string;
  description: string;
  salary?: string;
  posted_at?: string;
  tags?: string[];
  source?: string;
}

export interface WorldJobPortalLink {
  id: string;
  name: string;
  url: string;
  description: string;
  tag: string;
}

