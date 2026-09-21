# AI Career Coach 🚀

A production-ready full-stack web application designed for students and job seekers. It features genuine resume analysis, job description matching, skill gap discovery, personalized learning roadmaps, interactive AI mock interviews, and live job searches.

---

## Zero-Mock Data Architecture

Every piece of user-specific information in **AI Career Coach** originates from:
1. **Authenticated User Database Records** (Supabase PostgreSQL with Row Level Security)
2. **User-Uploaded Files** (Supabase Storage bucket `resumes`)
3. **Real External API Responses** (Live Job Boards via Arbeitnow, Adzuna, or JSearch)
4. **AI-Generated Evaluations** (Strict JSON schemas validated with Zod based directly on user input)

Proper empty states, skeletons, and configuration notices are displayed whenever data has not yet been provided by the user.

---

## Tech Stack

- **Framework**: Next.js (App Router, Server Components & Route Handlers)
- **Language**: TypeScript with strict typing
- **Styling**: Tailwind CSS & shadcn/ui design patterns
- **Database & Auth**: Supabase (PostgreSQL, Auth, and Storage)
- **PDF Extraction**: Server-side `pdf-parse`
- **AI Engine**: Google Gemini API (`@google/genai`) or OpenAI/Compatible API
- **Icons**: Lucide React

---

## Getting Started

### 1. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your configuration keys in `.env.local`:

```env
# Supabase (Get from https://supabase.com/dashboard/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider (Server-Side)
GEMINI_API_KEY=your-gemini-api-key

# Optional: OpenAI or compatible endpoint
OPENAI_API_KEY=
OPENAI_BASE_URL=
AI_MODEL=

# Optional: Enterprise Job Providers
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
RAPIDAPI_KEY=
```

### 2. Set Up Supabase Database & Storage

1. Open your Supabase Project Dashboard.
2. Go to the **SQL Editor**.
3. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql) and execute it.
4. This will automatically create:
   - 13 PostgreSQL tables (`profiles`, `resumes`, `resume_analyses`, `job_descriptions`, `job_matches`, `skills`, `skill_gaps`, `roadmaps`, `roadmap_items`, `interviews`, `interview_questions`, `interview_answers`, `saved_jobs`).
   - Indexes and Row Level Security (RLS) policies for complete data isolation.
   - The `resumes` storage bucket with private folder policies (`auth.uid()`).
   - Automatic profile generation trigger on new user sign-ups.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 4. Production Build

```bash
npm run build
npm start
```

---

## Application Structure & Pages

1. **Landing Page (`/`)**: Value proposition, zero-mock transparency promise, feature showcases, and calls-to-action.
2. **Authentication (`/login`, `/signup`, `/forgot-password`)**: Real Supabase Auth flows with email/password, session tokens, and route protection.
3. **Dashboard (`/dashboard`)**: Consolidated view of verified user data — resume score, target goal, detected skills, roadmap progress, recent interviews, and saved jobs with empty states.
4. **Career Profile (`/profile`)**: Education, graduation year, university, experience, target roles, locations, technical and soft skill tags.
5. **Resume Analyzer (`/resume-analyzer`)**: PDF resume drag-and-drop uploader. Extracts text server-side, saves original document in Supabase Storage, calculates honest resume score, identifies detected skills, strengths, weaknesses, and recommendations.
6. **Job Analyzer (`/job-analyzer`)**: Paste real job descriptions. Extracts required/preferred skills, experience, and responsibilities, computing a transparent compatibility match score against your profile.
7. **Live Job Search (`/job-search`)**: Queries live verified job feeds (filtered by title, location, remote). Save jobs to your bookmarked collection.
8. **Skill Gap Analysis (`/skill-gap`)**: Compares your verified competencies against industry role standards, classifying gaps into High/Medium/Low priorities with logical learning sequencing.
9. **Personalized Learning Roadmap (`/roadmap`)**: Interactive multi-step roadmap generated from genuine skill gaps. Update step statuses (`not_started`, `in_progress`, `completed`) persisted directly to Supabase.
10. **AI Mock Interview Room (`/mock-interview`)**: Real conversational interview simulation. Evaluates every answer objectively across 5 dimensions: Technical Accuracy, Relevance, Completeness, Communication, and Problem Solving.
11. **Interview Performance History (`/interview-history`)**: Review past completed mock interviews, scores, and coaching recommendations.
12. **Settings & Diagnostics (`/settings`)**: Account credentials, password change, and live service health diagnostics.

---

## Security & Privacy

- **Row Level Security (RLS)**: Enforced on every table so users can only view and modify their own records.
- **Secure Server-Side AI**: LLM API keys and Supabase Service Role keys are strictly executed on server-side API routes and never exposed to the client.
- **File Validation**: Restricts resume uploads strictly to PDFs under 5MB.
