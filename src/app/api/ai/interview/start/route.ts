import { NextRequest, NextResponse } from 'next/server';
import { generateAICompletion, extractJsonFromText } from '@/lib/ai/provider';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetRole, experienceLevel = 'Entry-level', interviewType = 'technical', numQuestions = 5 } = body;

    if (!targetRole || typeof targetRole !== 'string') {
      return NextResponse.json({ error: 'Target role is required to start interview.' }, { status: 400 });
    }

    const systemPrompt = `You are an experienced technical interviewer and hiring manager conducting a mock interview for the role of ${targetRole} (${experienceLevel}).
Generate Question #1 to start the interview.
Make it relevant, realistic, and appropriate for ${interviewType} focus at this level.
CRITICAL SAFETY:
- Do not ask questions involving personal life, religion, family, politics, or protected characteristics.
- Return strictly valid JSON with keys: "question_text" and "category".`;

    const userPrompt = `Generate the opening interview question for a candidate applying for:
Role: ${targetRole}
Experience Level: ${experienceLevel}
Interview Type: ${interviewType}

Return JSON:
{
  "question_text": string,
  "category": string
}`;

    const rawAi = await generateAICompletion(userPrompt, {
      systemPrompt,
      temperature: 0.3,
      responseFormat: 'json',
    });

    const parsed = extractJsonFromText<{ question_text: string; category: string }>(rawAi);

    const questionText = parsed.question_text || `Can you explain your experience and key qualifications for the ${targetRole} role?`;
    const category = parsed.category || interviewType;

    let interviewId = crypto.randomUUID();
    let questionId = crypto.randomUUID();

    // Persist in Supabase if user is authenticated
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: intvRecord, error: intvErr } = await supabase
          .from('interviews')
          .insert({
            user_id: user.id,
            target_role: targetRole,
            experience_level: experienceLevel,
            interview_type: interviewType,
            num_questions: numQuestions,
            status: 'in_progress',
          })
          .select('id')
          .single();

        if (!intvErr && intvRecord) {
          interviewId = intvRecord.id;

          const { data: qRecord, error: qErr } = await supabase
            .from('interview_questions')
            .insert({
              interview_id: interviewId,
              user_id: user.id,
              question_number: 1,
              question_text: questionText,
              category,
            })
            .select('id')
            .single();

          if (!qErr && qRecord) {
            questionId = qRecord.id;
          }
        }
      }
    } catch (dbErr) {
      console.warn('Database persistence skipped for interview start:', dbErr);
    }

    return NextResponse.json({
      success: true,
      interviewId,
      question: {
        id: questionId,
        questionNumber: 1,
        questionText,
        category,
        totalQuestions: numQuestions,
      },
    });
  } catch (error: unknown) {
    console.error('Interview start error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize interview' },
      { status: 500 }
    );
  }
}
