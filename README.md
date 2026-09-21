# AI Career Coach 🎯

> **Next-Generation Autonomous AI Career Accelerator & Interview Intelligence Platform**

AI Career Coach is an enterprise-grade, full-stack career development platform engineered to empower modern job seekers and engineering candidates. Combining real-time ATS resume diagnostic engines, automated skill gap mapping, tailored milestone-driven learning roadmaps, interactive voice-enabled AI mock interviews, and live worldwide job discovery into a unified, privacy-first web application.

---

## 🌟 Core Platform Pillars

### 1. ATS Resume Intelligence & Parsing
- **In-Depth ATS Scoring**: Evaluates candidate resumes against real industry grading criteria across structure, impact metrics, keyword density, and technical competencies.
- **Actionable Gap Remediation**: Provides section-by-section breakdown of strengths, weaknesses, and concrete bullet-point revisions.
- **Server-Side Extraction**: Robust server-side PDF parsing and secure cloud document storage with strict user isolation.

### 2. Market-Aligned Skill Gap Diagnostics
- **Target Role Profiling**: Evaluates current technical and leadership proficiencies against contemporary hiring benchmarks.
- **Prioritized Gap Matrix**: Classifies skill discrepancies into High, Medium, and Low priorities with clear rationale and sequenced learning paths.

### 3. Dynamic Learning Roadmaps
- **Milestone-Driven Curricula**: Automatically generates sequenced, topic-by-topic study roadmaps with estimated effort and verified resources.
- **Interactive Progress Tracking**: Allows candidates to update status (`not_started`, `in_progress`, `completed`) with live persistence.

### 4. Interactive Live AI Mock Interview Simulator
- **Live Camera & Audio Conference Interface**: Realistic interview room equipped with real-time speech synthesis and audio waveform visualization.
- **Multi-Track Formats**: Specialized simulations across *Technical Fundamentals & Architecture*, *Behavioral (STAR Method)*, and *System Design*.
- **5-Dimensional Performance Matrix**: Every response is objectively evaluated on **Technical Accuracy**, **Relevance**, **Completeness**, **Communication**, and **Problem Solving**, complete with actionable post-session coaching notes.

### 5. Live Global Job Discovery
- **Zero Mock Guarantee**: Real-time aggregation of verified live career opportunities across international tech hubs.
- **1-Click Portal Routing & Bookmarking**: Direct routing to verified employer application systems with personal job bookmarking.

---

## 🎨 Design Philosophy & Aesthetics

The platform features a dual-aesthetic architecture engineered for modern web luxury:

- **Hero Landing Experience**: High-performance, full-bleed dark video background with retro dot-matrix display typography, staggered entrance animations, and interactive feature switching.
- **Application Workspaces**: Editorial Warm Earth design system featuring soft warm ivory canvases (`#f7f5f2`), crisp white card architecture with sand borders (`#e2ded7`), elegant `Playfair Display` serif headlines, and warm terracotta action accents (`#ca9881`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack, Server Actions & Route Handlers) |
| **Frontend Core** | React 19, TypeScript (Strict Typing) |
| **Styling & Design** | Tailwind CSS, Lucide React, Custom Editorial UI Component Kit |
| **Database & Security** | PostgreSQL with Row Level Security (RLS) & Automated Triggers |
| **Authentication** | Multi-Provider Auth (OAuth Google & Email/Password Session Tokens) |
| **Cloud Storage** | Private User-Encrypted Bucket Storage |
| **AI & Intelligence Engine** | Google Gemini API (`@google/genai`) with structured JSON schema validation |
| **Document Processing** | Server-side PDF Binary Extraction (`pdf-parse`) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.18.0` or higher
- **npm** or **pnpm**
- A cloud or local PostgreSQL database instance with Auth & Storage support
- Google Gemini API key (or OpenAI compatible endpoint)

### 1. Repository Setup

```bash
git clone https://github.com/Cherishma1408/AI-Career-Coach.git
cd AI-Career-Coach
npm install
```

### 2. Environment Configuration

Create your local environment file:

```bash
cp .env.example .env.local
```

Configure your environment keys in `.env.local`:

```env
# Database & Backend API Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-database-endpoint.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-client-api-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider Credentials (Server-Side Execution Only)
GEMINI_API_KEY=your-gemini-api-key

# Optional: Alternative OpenAI / OpenRouter Endpoints
OPENAI_API_KEY=
OPENAI_BASE_URL=
AI_MODEL=

# Optional: External Job Providers
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
RAPIDAPI_KEY=
```

### 3. Database Initialization

1. Open your PostgreSQL SQL console.
2. Execute the database initialization script located at [`supabase/schema.sql`](supabase/schema.sql).
3. The script automatically sets up:
   - Complete application tables (`profiles`, `resumes`, `resume_analyses`, `job_descriptions`, `job_matches`, `skills`, `skill_gaps`, `roadmaps`, `roadmap_items`, `interviews`, `interview_questions`, `interview_answers`, `saved_jobs`).
   - High-performance query indexes across all primary candidate keys.
   - Strict Row Level Security (RLS) policies enforcing multi-tenant isolation.
   - Document storage buckets with authenticated folder isolation.
   - Automatic user profile provisioning triggers on candidate registration.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Compilation

```bash
npm run build
npm run start
```

---

## 📂 Architecture & Routing Overview

```
├── public/
│   ├── assets/              # Brand emblems, vector icons, and static assets
│   └── fonts/               # Retro display and typography files
├── src/
│   ├── app/
│   │   ├── page.tsx         # Full-bleed video landing page & dynamic switcher
│   │   ├── layout.tsx       # Root layout, Google Font bindings & global styling
│   │   ├── globals.css      # Theme design tokens & custom CSS variables
│   │   ├── dashboard/       # Central intelligence & career telemetry dashboard
│   │   ├── resume-analyzer/ # PDF resume parser & ATS scoring pipeline
│   │   ├── job-analyzer/    # Job requirement compatibility evaluator
│   │   ├── skill-gap/       # Competency matrix & prioritized gap engine
│   │   ├── roadmap/         # Milestone-based interactive learning roadmap
│   │   ├── mock-interview/  # Camera & voice real-time AI interview simulator
│   │   ├── interview-history/# Post-session scoring & historical telemetry
│   │   ├── job-search/      # Live global job discovery feed & bookmarking
│   │   ├── profile/         # Candidate credentials, targets, and skills catalog
│   │   ├── settings/        # Security preferences & system diagnostics
│   │   ├── login/           # Authentication portal
│   │   ├── signup/          # Registration portal
│   │   └── api/             # Secure server-side AI evaluation route handlers
│   ├── components/
│   │   ├── layout/          # Application shell, navigation bar, and sidebar
│   │   └── ui/              # Editorial Warm Earth component design system
│   ├── lib/
│   │   ├── ai/              # Prompt engineering, schemas, and Gemini integration
│   │   └── pdf/             # Server-side resume parsing utilities
│   └── types/               # Type definitions & data interfaces
└── supabase/
    └── schema.sql           # Complete relational database DDL & RLS policies
```

---

## 🔐 Security, Privacy & Data Isolation

- **Multi-Tenant Row Level Security**: Access control policies guarantee that authenticated candidates can strictly access only their personal resumes, roadmaps, and interview telemetry.
- **Zero Client Exposure**: All AI model queries and administrative operations are executed exclusively through protected server route handlers. API keys are never bundled into client scripts.
- **File Validation & Sandboxing**: Resume uploads are strictly constrained to PDF files under 5MB and stored in private user-scoped directories.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
