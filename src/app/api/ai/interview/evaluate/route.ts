import { NextRequest, NextResponse } from 'next/server';
import { generateAICompletion, extractJsonFromText } from '@/lib/ai/provider';
import { InterviewEvaluateSchema } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      interviewId,
      questionId,
      targetRole,
      experienceLevel,
      interviewType,
      currentQuestionNumber,
      totalQuestions,
      questionText,
      answerText,
      previousQAs = [],
    } = body;

    if (!answerText || typeof answerText !== 'string' || answerText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please submit an answer to receive feedback and proceed.' },
        { status: 400 }
      );
    }

    const isLastQuestion = currentQuestionNumber >= totalQuestions;

    const systemPrompt = `You are an expert mock interview evaluator and coach for the role of ${targetRole} (${experienceLevel}).
CRITICAL EVALUATION & SAFETY RULES:
1. Objectively evaluate the candidate's answer strictly based on:
   - Technical accuracy (0-10)
   - Relevance (0-10)
   - Completeness (0-10)
   - Communication (0-10)
   - Problem-solving (0-10)
2. NEVER judge personality, intelligence, mental health, accent, grammar, or sensitive personal attributes. Focus on content and clarity.
3. Provide actionable, supportive, constructive feedback and specific areas for improvement.
4. If is_finished is false, generate the next logical interview question (Question #${currentQuestionNumber + 1}) considering the candidate's previous responses.
5. If is_finished is true, provide final_summary with overall_score (0-100), key strengths, improvements, and summary feedback.
6. Return strictly valid JSON adhering to the schema.`;

    const userPrompt = `ROLE: ${targetRole} (${experienceLevel})
INTERVIEW TYPE: ${interviewType}
QUESTION #${currentQuestionNumber} OF ${totalQuestions}:
"${questionText}"

CANDIDATE'S ACTUAL ANSWER:
"${answerText}"

PREVIOUS Q&A CONTEXT:
${JSON.stringify(previousQAs.slice(-2))}

IS THIS THE LAST QUESTION? ${isLastQuestion ? 'YES' : 'NO'}

Evaluate the answer and return JSON:
{
  "technical_accuracy_score": number (0-10),
  "relevance_score": number (0-10),
  "completeness_score": number (0-10),
  "communication_score": number (0-10),
  "problem_solving_score": number (0-10),
  "feedback": string,
  "areas_for_improvement": [string],
  "is_finished": ${isLastQuestion ? 'true' : 'false'},
  ${
    !isLastQuestion
      ? `"next_question": string,
  "next_category": string,
  "final_summary": null`
      : `"next_question": null,
  "next_category": null,
  "final_summary": {
    "overall_score": number (0-100),
    "feedback_summary": string,
    "strengths": [string],
    "improvements": [string]
  }`
  }
}`;

    const rawAi = await generateAICompletion(userPrompt, {
      systemPrompt,
      temperature: 0.2,
      responseFormat: 'json',
    });

    const parsedJson = extractJsonFromText(rawAi);
    const validationResult = InterviewEvaluateSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error('Evaluation parsing failure:', validationResult.error);
      return NextResponse.json(
        {
          error: 'AI response did not conform to evaluation structure.',
          details: validationResult.error.issues,
        },
        { status: 502 }
      );
    }

    const evalData = validationResult.data;

    let nextQuestionRecord: { id: string; questionNumber: number; questionText: string; category: string } | null = null;

    // Persist in Supabase if authenticated
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user && interviewId) {
        // 1. Insert answer
        await supabase.from('interview_answers').insert({
          interview_id: interviewId,
          question_id: questionId || null,
          user_id: user.id,
          answer_text: answerText,
          technical_accuracy_score: evalData.technical_accuracy_score,
          relevance_score: evalData.relevance_score,
          completeness_score: evalData.completeness_score,
          communication_score: evalData.communication_score,
          problem_solving_score: evalData.problem_solving_score,
          feedback: evalData.feedback,
          areas_for_improvement: evalData.areas_for_improvement,
        });

        // 2. If finished, update interview record
        if (evalData.is_finished && evalData.final_summary) {
          await supabase
            .from('interviews')
            .update({
              status: 'completed',
              overall_score: evalData.final_summary.overall_score,
              feedback_summary: evalData.final_summary.feedback_summary,
              strengths: evalData.final_summary.strengths,
              improvements: evalData.final_summary.improvements,
              completed_at: new Date().toISOString(),
            })
            .eq('id', interviewId)
            .eq('user_id', user.id);
        } else if (evalData.next_question) {
          // Insert next question
          const { data: nqData } = await supabase
            .from('interview_questions')
            .insert({
              interview_id: interviewId,
              user_id: user.id,
              question_number: currentQuestionNumber + 1,
              question_text: evalData.next_question,
              category: evalData.next_category || interviewType,
            })
            .select('id')
            .single();

          if (nqData) {
            nextQuestionRecord = {
              id: nqData.id,
              questionNumber: currentQuestionNumber + 1,
              questionText: evalData.next_question,
              category: evalData.next_category || interviewType,
            };
          }
        }
      }
    } catch (dbErr) {
      console.warn('Database persistence skipped for interview evaluation:', dbErr);
    }

    if (!nextQuestionRecord && evalData.next_question) {
      nextQuestionRecord = {
        id: crypto.randomUUID(),
        questionNumber: currentQuestionNumber + 1,
        questionText: evalData.next_question,
        category: evalData.next_category || interviewType,
      };
    }

    return NextResponse.json({
      success: true,
      evaluation: {
        technical_accuracy_score: evalData.technical_accuracy_score,
        relevance_score: evalData.relevance_score,
        completeness_score: evalData.completeness_score,
        communication_score: evalData.communication_score,
        problem_solving_score: evalData.problem_solving_score,
        feedback: evalData.feedback,
        areas_for_improvement: evalData.areas_for_improvement,
      },
      isFinished: evalData.is_finished,
      nextQuestion: nextQuestionRecord,
      finalSummary: evalData.final_summary,
    });
  } catch (error: unknown) {
    console.error('Interview evaluation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to evaluate interview response' },
      { status: 500 }
    );
  }
}
