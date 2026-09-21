import { NextRequest, NextResponse } from 'next/server';
import { generateAICompletion, extractJsonFromText } from '@/lib/ai/provider';
import { getResumeAnalysisPrompt, ResumeAnalysisSchema } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeText, resumeId } = body;

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Insufficient resume content provided for analysis.' },
        { status: 400 }
      );
    }

    const { systemPrompt, userPrompt } = getResumeAnalysisPrompt(resumeText);
    const rawAiResponse = await generateAICompletion(userPrompt, {
      systemPrompt,
      temperature: 0.2,
      responseFormat: 'json',
    });

    const parsedJson = extractJsonFromText(rawAiResponse);
    const validationResult = ResumeAnalysisSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error('Validation failed for resume analysis:', validationResult.error);
      return NextResponse.json(
        {
          error: 'AI response did not conform to the expected format. Please try again.',
          details: validationResult.error.issues,
        },
        { status: 502 }
      );
    }

    const analysis = validationResult.data;

    // Attempt to persist in Supabase if user is logged in
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { error: insertError } = await supabase.from('resume_analyses').insert({
          user_id: user.id,
          resume_id: resumeId || null,
          overall_score: analysis.overall_score,
          contact_info: analysis.contact_info,
          education_parsed: analysis.education_parsed,
          work_experience_parsed: analysis.work_experience_parsed,
          projects_parsed: analysis.projects_parsed,
          technical_skills: analysis.technical_skills,
          soft_skills: analysis.soft_skills,
          certifications: analysis.certifications,
          achievements: analysis.achievements,
          missing_sections: analysis.missing_sections,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          missing_info: analysis.missing_info,
          recommendations: analysis.recommendations,
        });

        if (insertError) {
          console.warn('Could not save resume analysis to database:', insertError.message);
        }
      }
    } catch (dbErr) {
      console.warn('Database persistence skipped:', dbErr);
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: unknown) {
    console.error('Resume analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze resume' },
      { status: 500 }
    );
  }
}
