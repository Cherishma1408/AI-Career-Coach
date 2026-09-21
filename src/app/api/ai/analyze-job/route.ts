import { NextRequest, NextResponse } from 'next/server';
import { generateAICompletion, extractJsonFromText } from '@/lib/ai/provider';
import { getJobMatchPrompt, JobAnalysisAndMatchSchema } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobText, profileContext, resumeContext } = body;

    if (!jobText || typeof jobText !== 'string' || jobText.trim().length < 40) {
      return NextResponse.json(
        { error: 'Please provide a valid job description (at least 40 characters).' },
        { status: 400 }
      );
    }

    const { systemPrompt, userPrompt } = getJobMatchPrompt(
      jobText,
      profileContext || 'No additional candidate profile provided.',
      resumeContext
    );

    const rawAiResponse = await generateAICompletion(userPrompt, {
      systemPrompt,
      temperature: 0.2,
      responseFormat: 'json',
    });

    const parsedJson = extractJsonFromText(rawAiResponse);
    const validationResult = JobAnalysisAndMatchSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error('Job match validation failed:', validationResult.error);
      return NextResponse.json(
        {
          error: 'AI response did not conform to expected job analysis structure.',
          details: validationResult.error.issues,
        },
        { status: 502 }
      );
    }

    const { job_extraction, match } = validationResult.data;

    // Persist to Supabase if authenticated
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 1. Insert into job_descriptions
        const { data: jobData, error: jobErr } = await supabase
          .from('job_descriptions')
          .insert({
            user_id: user.id,
            title: job_extraction.title,
            company: job_extraction.company || null,
            location: job_extraction.location || null,
            raw_text: jobText,
            required_skills: job_extraction.required_skills,
            preferred_skills: job_extraction.preferred_skills,
            experience_requirements: job_extraction.experience_requirements || null,
            education_requirements: job_extraction.education_requirements || null,
            responsibilities: job_extraction.responsibilities,
            technologies: job_extraction.technologies,
            keywords: job_extraction.keywords,
          })
          .select('id')
          .single();

        if (!jobErr && jobData) {
          // 2. Insert into job_matches
          await supabase.from('job_matches').insert({
            user_id: user.id,
            job_description_id: jobData.id,
            match_score: match.match_score,
            matching_skills: match.matching_skills,
            missing_skills: match.missing_skills,
            partially_matching_skills: match.partially_matching_skills,
            relevant_experience: match.relevant_experience,
            potential_gaps: match.potential_gaps,
            verdict: match.verdict,
            detailed_feedback: match.detailed_feedback,
          });
        }
      }
    } catch (dbErr) {
      console.warn('Database persistence skipped for job analysis:', dbErr);
    }

    return NextResponse.json({
      success: true,
      job: job_extraction,
      match,
    });
  } catch (error: unknown) {
    console.error('Job analyzer error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze job description' },
      { status: 500 }
    );
  }
}
