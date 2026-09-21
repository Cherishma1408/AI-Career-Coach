import { NextRequest, NextResponse } from 'next/server';
import { generateAICompletion, extractJsonFromText } from '@/lib/ai/provider';
import { getSkillGapPrompt, SkillGapSchema } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetRole, userSkills = [], resumeText } = body;

    if (!targetRole || typeof targetRole !== 'string' || targetRole.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please provide a valid target job role.' },
        { status: 400 }
      );
    }

    const { systemPrompt, userPrompt } = getSkillGapPrompt(
      targetRole.trim(),
      Array.isArray(userSkills) ? userSkills : [],
      resumeText
    );

    const rawAiResponse = await generateAICompletion(userPrompt, {
      systemPrompt,
      temperature: 0.2,
      responseFormat: 'json',
    });

    const parsedJson = extractJsonFromText(rawAiResponse);
    const validationResult = SkillGapSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error('Skill gap validation failed:', validationResult.error);
      return NextResponse.json(
        {
          error: 'AI response did not conform to expected skill gap structure.',
          details: validationResult.error.issues,
        },
        { status: 502 }
      );
    }

    const gapData = validationResult.data;

    // Persist to Supabase if authenticated
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('skill_gaps').insert({
          user_id: user.id,
          target_role: gapData.target_role,
          existing_skills: gapData.existing_skills,
          required_skills: gapData.required_skills,
          missing_skills: gapData.missing_skills,
          skill_priorities: gapData.skill_priorities,
          suggested_learning_sequence: gapData.suggested_learning_sequence,
        });
      }
    } catch (dbErr) {
      console.warn('Database persistence skipped for skill gaps:', dbErr);
    }

    return NextResponse.json({
      success: true,
      data: gapData,
    });
  } catch (error: unknown) {
    console.error('Skill gap analyzer error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze skill gaps' },
      { status: 500 }
    );
  }
}
