-- AI Career Coach Database Schema & RLS Policies
-- Execute this script in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- 1. PROFILES TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    education TEXT,
    college TEXT,
    degree TEXT,
    graduation_year INTEGER,
    "current_role" TEXT,
    career_goal TEXT,
    years_of_experience NUMERIC(4, 1) DEFAULT 0,
    preferred_job_roles TEXT[] DEFAULT '{}',
    preferred_locations TEXT[] DEFAULT '{}',
    technical_skills TEXT[] DEFAULT '{}',
    soft_skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- 2. RESUMES TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    raw_text TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- 3. RESUME ANALYSES TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.resume_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    contact_info JSONB DEFAULT '{}'::jsonb,
    education_parsed JSONB DEFAULT '[]'::jsonb,
    work_experience_parsed JSONB DEFAULT '[]'::jsonb,
    projects_parsed JSONB DEFAULT '[]'::jsonb,
    technical_skills TEXT[] DEFAULT '{}',
    soft_skills TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    achievements TEXT[] DEFAULT '{}',
    missing_sections TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    weaknesses TEXT[] DEFAULT '{}',
    missing_info TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- 4. JOB DESCRIPTIONS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    raw_text TEXT NOT NULL,
    required_skills TEXT[] DEFAULT '{}',
    preferred_skills TEXT[] DEFAULT '{}',
    experience_requirements TEXT,
    education_requirements TEXT,
    responsibilities TEXT[] DEFAULT '{}',
    technologies TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- 5. JOB MATCHES TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_description_id UUID REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    matching_skills TEXT[] DEFAULT '{}',
    missing_skills TEXT[] DEFAULT '{}',
    partially_matching_skills TEXT[] DEFAULT '{}',
    relevant_experience TEXT,
    potential_gaps TEXT[] DEFAULT '{}',
    verdict TEXT,
    detailed_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- 6. SKILLS CATALOG TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('technical', 'soft', 'other')) DEFAULT 'technical',
    proficiency TEXT CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'not_assessed')) DEFAULT 'not_assessed',
    source TEXT CHECK (source IN ('resume', 'profile', 'manual', 'interview')) DEFAULT 'profile',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, name)
);

-- ==========================================================
-- 7. SKILL GAPS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.skill_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL,
    existing_skills TEXT[] DEFAULT '{}',
    required_skills TEXT[] DEFAULT '{}',
    missing_skills TEXT[] DEFAULT '{}',
    skill_priorities JSONB DEFAULT '[]'::jsonb, -- array of { skill: string, priority: 'high'|'medium'|'low', rationale: string }
    suggested_learning_sequence TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- 8. ROADMAPS & ROADMAP ITEMS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.roadmap_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_id UUID NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL DEFAULT 1,
    skill_topic TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    prerequisites TEXT[] DEFAULT '{}',
    learning_objective TEXT NOT NULL,
    recommended_resources JSONB DEFAULT '[]'::jsonb, -- array of { title: string, type: string, description: string, url?: string }
    practice_task TEXT NOT NULL,
    project_suggestion TEXT NOT NULL,
    estimated_learning_effort TEXT NOT NULL,
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- 9. INTERVIEWS & QUESTIONS & ANSWERS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL,
    experience_level TEXT NOT NULL,
    interview_type TEXT NOT NULL, -- e.g. 'technical', 'behavioral', 'system_design', 'mixed'
    num_questions INTEGER NOT NULL DEFAULT 5,
    status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    feedback_summary TEXT,
    strengths TEXT[] DEFAULT '{}',
    improvements TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.interview_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    technical_accuracy_score INTEGER CHECK (technical_accuracy_score >= 0 AND technical_accuracy_score <= 10),
    relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 10),
    completeness_score INTEGER CHECK (completeness_score >= 0 AND completeness_score <= 10),
    communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 10),
    problem_solving_score INTEGER CHECK (problem_solving_score >= 0 AND problem_solving_score <= 10),
    feedback TEXT,
    areas_for_improvement TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- 10. SAVED JOBS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    job_type TEXT,
    description_snippet TEXT,
    apply_url TEXT,
    salary TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- INDEXES FOR PERFORMANCE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_resumes_user ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user ON public.resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_resume ON public.resume_analyses(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_user ON public.job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_user ON public.job_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user ON public.skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_gaps_user ON public.skill_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON public.roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_roadmap ON public.roadmap_items(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_user ON public.roadmap_items(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview ON public.interview_questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_answers_interview ON public.interview_answers(interview_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON public.saved_jobs(user_id);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read and update only their own profile
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
CREATE POLICY "Users can select own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Resumes
DROP POLICY IF EXISTS "Users can select own resumes" ON public.resumes;
CREATE POLICY "Users can select own resumes" ON public.resumes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own resumes" ON public.resumes;
CREATE POLICY "Users can insert own resumes" ON public.resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own resumes" ON public.resumes;
CREATE POLICY "Users can update own resumes" ON public.resumes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own resumes" ON public.resumes;
CREATE POLICY "Users can delete own resumes" ON public.resumes FOR DELETE USING (auth.uid() = user_id);

-- Resume Analyses
DROP POLICY IF EXISTS "Users can select own analyses" ON public.resume_analyses;
CREATE POLICY "Users can select own analyses" ON public.resume_analyses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own analyses" ON public.resume_analyses;
CREATE POLICY "Users can insert own analyses" ON public.resume_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own analyses" ON public.resume_analyses;
CREATE POLICY "Users can delete own analyses" ON public.resume_analyses FOR DELETE USING (auth.uid() = user_id);

-- Job Descriptions
DROP POLICY IF EXISTS "Users can select own job descriptions" ON public.job_descriptions;
CREATE POLICY "Users can select own job descriptions" ON public.job_descriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own job descriptions" ON public.job_descriptions;
CREATE POLICY "Users can insert own job descriptions" ON public.job_descriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own job descriptions" ON public.job_descriptions;
CREATE POLICY "Users can delete own job descriptions" ON public.job_descriptions FOR DELETE USING (auth.uid() = user_id);

-- Job Matches
DROP POLICY IF EXISTS "Users can select own job matches" ON public.job_matches;
CREATE POLICY "Users can select own job matches" ON public.job_matches FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own job matches" ON public.job_matches;
CREATE POLICY "Users can insert own job matches" ON public.job_matches FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own job matches" ON public.job_matches;
CREATE POLICY "Users can delete own job matches" ON public.job_matches FOR DELETE USING (auth.uid() = user_id);

-- Skills
DROP POLICY IF EXISTS "Users can select own skills" ON public.skills;
CREATE POLICY "Users can select own skills" ON public.skills FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own skills" ON public.skills;
CREATE POLICY "Users can insert own skills" ON public.skills FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own skills" ON public.skills;
CREATE POLICY "Users can update own skills" ON public.skills FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own skills" ON public.skills;
CREATE POLICY "Users can delete own skills" ON public.skills FOR DELETE USING (auth.uid() = user_id);

-- Skill Gaps
DROP POLICY IF EXISTS "Users can select own skill gaps" ON public.skill_gaps;
CREATE POLICY "Users can select own skill gaps" ON public.skill_gaps FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own skill gaps" ON public.skill_gaps;
CREATE POLICY "Users can insert own skill gaps" ON public.skill_gaps FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own skill gaps" ON public.skill_gaps;
CREATE POLICY "Users can delete own skill gaps" ON public.skill_gaps FOR DELETE USING (auth.uid() = user_id);

-- Roadmaps
DROP POLICY IF EXISTS "Users can select own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can select own roadmaps" ON public.roadmaps FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can insert own roadmaps" ON public.roadmaps FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can delete own roadmaps" ON public.roadmaps FOR DELETE USING (auth.uid() = user_id);

-- Roadmap Items
DROP POLICY IF EXISTS "Users can select own roadmap items" ON public.roadmap_items;
CREATE POLICY "Users can select own roadmap items" ON public.roadmap_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own roadmap items" ON public.roadmap_items;
CREATE POLICY "Users can insert own roadmap items" ON public.roadmap_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own roadmap items" ON public.roadmap_items;
CREATE POLICY "Users can update own roadmap items" ON public.roadmap_items FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own roadmap items" ON public.roadmap_items;
CREATE POLICY "Users can delete own roadmap items" ON public.roadmap_items FOR DELETE USING (auth.uid() = user_id);

-- Interviews
DROP POLICY IF EXISTS "Users can select own interviews" ON public.interviews;
CREATE POLICY "Users can select own interviews" ON public.interviews FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own interviews" ON public.interviews;
CREATE POLICY "Users can insert own interviews" ON public.interviews FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own interviews" ON public.interviews;
CREATE POLICY "Users can update own interviews" ON public.interviews FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own interviews" ON public.interviews;
CREATE POLICY "Users can delete own interviews" ON public.interviews FOR DELETE USING (auth.uid() = user_id);

-- Interview Questions
DROP POLICY IF EXISTS "Users can select own interview questions" ON public.interview_questions;
CREATE POLICY "Users can select own interview questions" ON public.interview_questions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own interview questions" ON public.interview_questions;
CREATE POLICY "Users can insert own interview questions" ON public.interview_questions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Interview Answers
DROP POLICY IF EXISTS "Users can select own interview answers" ON public.interview_answers;
CREATE POLICY "Users can select own interview answers" ON public.interview_answers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own interview answers" ON public.interview_answers;
CREATE POLICY "Users can insert own interview answers" ON public.interview_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saved Jobs
DROP POLICY IF EXISTS "Users can select own saved jobs" ON public.saved_jobs;
CREATE POLICY "Users can select own saved jobs" ON public.saved_jobs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own saved jobs" ON public.saved_jobs;
CREATE POLICY "Users can insert own saved jobs" ON public.saved_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own saved jobs" ON public.saved_jobs;
CREATE POLICY "Users can delete own saved jobs" ON public.saved_jobs FOR DELETE USING (auth.uid() = user_id);

-- ==========================================================
-- AUTOMATIC PROFILE TRIGGER ON SIGNUP
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================================
-- STORAGE BUCKET & POLICIES FOR RESUMES
-- ==========================================================
-- Insert the 'resumes' storage bucket if not already present
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Authenticated users can upload and view resumes in their own folder (user_id/filename)
DROP POLICY IF EXISTS "Allow users to upload resumes to their folder" ON storage.objects;
CREATE POLICY "Allow users to upload resumes to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Allow users to view their own resumes" ON storage.objects;
CREATE POLICY "Allow users to view their own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Allow users to delete their own resumes" ON storage.objects;
CREATE POLICY "Allow users to delete their own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
