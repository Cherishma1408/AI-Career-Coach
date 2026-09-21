import { z } from 'zod';

// ==========================================================
// 1. RESUME ANALYSIS SCHEMAS & PROMPTS
// ==========================================================
export const ResumeAnalysisSchema = z.object({
  overall_score: z.number().min(0).max(100),
  contact_info: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    location: z.string().optional(),
  }),
  education_parsed: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      year: z.string().optional(),
      gpa: z.string().optional(),
    })
  ).default([]),
  work_experience_parsed: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      duration: z.string().optional(),
      highlights: z.array(z.string()).default([]),
    })
  ).default([]),
  projects_parsed: z.array(
    z.object({
      title: z.string(),
      technologies: z.array(z.string()).default([]),
      description: z.string(),
    })
  ).default([]),
  technical_skills: z.array(z.string()).default([]),
  soft_skills: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  missing_sections: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  missing_info: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

export type ValidatedResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>;

export function getResumeAnalysisPrompt(rawResumeText: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert AI Career Coach and Resume Analyst.
Analyze the user's resume objectively based ONLY on the provided text.
CRITICAL SAFETY & ACCURACY RULES:
1. NEVER invent or hallucinate information that does not exist in the resume text.
2. If contact info, dates, degree, or skills are missing, clearly list them in "missing_sections" or "missing_info".
3. Calculate an overall_score between 0 and 100 based strictly on:
   - Completeness of key sections (Contact, Summary, Education, Experience/Projects, Skills)
   - Action-driven bullet points with quantifiable impact (e.g. metrics, percentages, numbers)
   - Clarity, technical depth, and industry relevance
4. Clearly separate factually extracted resume data from your recommendations.
5. Return strictly valid JSON adhering to the specified schema.`;

  const userPrompt = `Analyze the following raw resume text extracted from a real candidate PDF:

--- BEGIN RESUME TEXT ---
${rawResumeText}
--- END RESUME TEXT ---

Respond with a JSON object matching this schema:
{
  "overall_score": number (0-100),
  "contact_info": {
    "name": string or "",
    "email": string or "",
    "phone": string or "",
    "linkedin": string or "",
    "github": string or "",
    "location": string or ""
  },
  "education_parsed": [
    { "institution": string, "degree": string, "year": string, "gpa": string }
  ],
  "work_experience_parsed": [
    { "company": string, "role": string, "duration": string, "highlights": [string] }
  ],
  "projects_parsed": [
    { "title": string, "technologies": [string], "description": string }
  ],
  "technical_skills": [string],
  "soft_skills": [string],
  "certifications": [string],
  "achievements": [string],
  "missing_sections": [string],
  "strengths": [string],
  "weaknesses": [string],
  "missing_info": [string],
  "recommendations": [string]
}`;

  return { systemPrompt, userPrompt };
}

// ==========================================================
// 2. JOB ANALYSIS & MATCHING SCHEMAS & PROMPTS
// ==========================================================
export const JobAnalysisAndMatchSchema = z.object({
  job_extraction: z.object({
    title: z.string(),
    company: z.string().optional(),
    location: z.string().optional(),
    required_skills: z.array(z.string()).default([]),
    preferred_skills: z.array(z.string()).default([]),
    experience_requirements: z.string().optional(),
    education_requirements: z.string().optional(),
    responsibilities: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
  }),
  match: z.object({
    match_score: z.number().min(0).max(100),
    matching_skills: z.array(z.string()).default([]),
    missing_skills: z.array(z.string()).default([]),
    partially_matching_skills: z.array(z.string()).default([]),
    relevant_experience: z.string().default(''),
    potential_gaps: z.array(z.string()).default([]),
    verdict: z.string(),
    detailed_feedback: z.string(),
  }),
});

export type ValidatedJobAnalysisAndMatch = z.infer<typeof JobAnalysisAndMatchSchema>;

export function getJobMatchPrompt(jobText: string, profileContext: string, resumeContext?: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert AI Career Match Evaluator.
Your goal is to parse an authentic job description, extract its requirements, and compare it against the user's actual profile and resume.
CRITICAL RULES:
1. Do NOT claim the user is qualified for a job unless the evidence in their profile/resume supports that conclusion.
2. If skills or years of experience are missing, explicitly mark them as missing or gaps.
3. Calculate an honest match_score (0-100) reflecting real overlap.
4. Output strictly valid JSON.`;

  const userPrompt = `JOB DESCRIPTION:
---
${jobText}
---

CANDIDATE PROFILE:
---
${profileContext}
---
${resumeContext ? `\nCANDIDATE RESUME SUMMARY:\n---\n${resumeContext}\n---` : ''}

Extract the job requirements and compare with the candidate. Return JSON in this exact structure:
{
  "job_extraction": {
    "title": string,
    "company": string,
    "location": string,
    "required_skills": [string],
    "preferred_skills": [string],
    "experience_requirements": string,
    "education_requirements": string,
    "responsibilities": [string],
    "technologies": [string],
    "keywords": [string]
  },
  "match": {
    "match_score": number (0-100),
    "matching_skills": [string],
    "missing_skills": [string],
    "partially_matching_skills": [string],
    "relevant_experience": string,
    "potential_gaps": [string],
    "verdict": string (e.g. "Competitive Match", "Skill Growth Needed", "Significant Gap"),
    "detailed_feedback": string
  }
}`;

  return { systemPrompt, userPrompt };
}

// ==========================================================
// 3. SKILL GAP ANALYSIS SCHEMAS & PROMPTS
// ==========================================================
export const SkillGapSchema = z.object({
  target_role: z.string(),
  existing_skills: z.array(z.string()).default([]),
  required_skills: z.array(z.string()).default([]),
  missing_skills: z.array(z.string()).default([]),
  skill_priorities: z.array(
    z.object({
      skill: z.string(),
      priority: z.enum(['high', 'medium', 'low']),
      rationale: z.string(),
    })
  ).default([]),
  suggested_learning_sequence: z.array(z.string()).default([]),
});

export type ValidatedSkillGap = z.infer<typeof SkillGapSchema>;

export function getSkillGapPrompt(targetRole: string, userSkills: string[], resumeText?: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an AI Career Strategist.
Analyze the user's real skills against the expectations of the target role.
Identify real skill gaps, assign priorities (high/medium/low), and provide a logical step-by-step learning sequence.
Do not assume mastery of skills not documented in user profile or resume.
Return strictly valid JSON.`;

  const userPrompt = `TARGET ROLE: ${targetRole}

KNOWN USER SKILLS:
${userSkills.length > 0 ? userSkills.join(', ') : 'None specified yet'}

${resumeText ? `RESUME CONTEXT:\n${resumeText.slice(0, 1500)}` : ''}

Identify:
1. Skills the user already has that match the role
2. Skills required by the industry for this role
3. Missing skills
4. Priority of each missing skill (high: core blocker; medium: competitive advantage; low: nice-to-have)
5. Logical sequence to learn them (e.g. foundations first)

Return JSON:
{
  "target_role": "${targetRole}",
  "existing_skills": [string],
  "required_skills": [string],
  "missing_skills": [string],
  "skill_priorities": [
    { "skill": string, "priority": "high" | "medium" | "low", "rationale": string }
  ],
  "suggested_learning_sequence": [string]
}`;

  return { systemPrompt, userPrompt };
}

// ==========================================================
// 4. LEARNING ROADMAP SCHEMAS & PROMPTS
// ==========================================================
export const RoadmapItemSchema = z.object({
  step_number: z.number(),
  skill_topic: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  prerequisites: z.array(z.string()).default([]),
  learning_objective: z.string(),
  recommended_resources: z.array(
    z.object({
      title: z.string(),
      type: z.string(),
      description: z.string(),
      url: z.string().optional(),
    })
  ).default([]),
  practice_task: z.string(),
  project_suggestion: z.string(),
  estimated_learning_effort: z.string(),
});

export const RoadmapSchema = z.object({
  title: z.string(),
  target_role: z.string(),
  items: z.array(RoadmapItemSchema),
});

export type ValidatedRoadmap = z.infer<typeof RoadmapSchema>;

export function getRoadmapPrompt(targetRole: string, missingSkills: string[], skillPriorities: unknown[]): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an AI Technical Curriculum Designer.
Create a structured, realistic, and actionable learning roadmap for the candidate.
CRITICAL RULES:
1. Do not invent fake external URLs or courses. Only recommend well-known verified platforms (e.g. Official Documentation, MDN, standard Open Source tutorials) or describe the concepts/topics directly.
2. Each step must have a concrete practice task and portfolio project suggestion.
3. Steps should build on top of each other logically.
4. Output strictly valid JSON.`;

  const userPrompt = `TARGET ROLE: ${targetRole}
SKILL GAPS TO ADDRESS: ${missingSkills.join(', ')}
PRIORITY CONTEXT: ${JSON.stringify(skillPriorities)}

Generate a multi-step roadmap (between 4 and 8 steps). Return JSON:
{
  "title": "Mastery Roadmap: ${targetRole}",
  "target_role": "${targetRole}",
  "items": [
    {
      "step_number": 1,
      "skill_topic": string,
      "priority": "high" | "medium" | "low",
      "prerequisites": [string],
      "learning_objective": string,
      "recommended_resources": [
        { "title": string, "type": "Documentation" | "Tutorial" | "Book" | "Hands-on Lab", "description": string, "url": string }
      ],
      "practice_task": string,
      "project_suggestion": string,
      "estimated_learning_effort": string (e.g. "2 weeks, 8-10 hrs/wk")
    }
  ]
}`;

  return { systemPrompt, userPrompt };
}

// ==========================================================
// 5. MOCK INTERVIEW SCHEMAS & PROMPTS
// ==========================================================
export const InterviewStartSchema = z.object({
  first_question: z.string(),
  category: z.string(),
});

export const InterviewEvaluateSchema = z.object({
  technical_accuracy_score: z.number().min(0).max(10),
  relevance_score: z.number().min(0).max(10),
  completeness_score: z.number().min(0).max(10),
  communication_score: z.number().min(0).max(10),
  problem_solving_score: z.number().min(0).max(10),
  feedback: z.string(),
  areas_for_improvement: z.array(z.string()).default([]),
  next_question: z.string().optional().nullable(),
  next_category: z.string().optional().nullable(),
  is_finished: z.boolean(),
  final_summary: z.object({
    overall_score: z.number().min(0).max(100),
    feedback_summary: z.string(),
    strengths: z.array(z.string()),
    improvements: z.array(z.string()),
  }).optional().nullable(),
});

export type ValidatedInterviewEvaluate = z.infer<typeof InterviewEvaluateSchema>;
