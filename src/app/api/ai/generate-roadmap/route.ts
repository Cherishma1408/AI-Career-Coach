import { NextRequest, NextResponse } from 'next/server';
import { generateAICompletion, extractJsonFromText } from '@/lib/ai/provider';
import { getRoadmapPrompt, RoadmapSchema } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetRole, missingSkills = [], skillPriorities = [] } = body;

    if (!targetRole || typeof targetRole !== 'string') {
      return NextResponse.json(
        { error: 'Please specify a target role for the roadmap.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(missingSkills) || missingSkills.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one skill or topic to focus the roadmap on.' },
        { status: 400 }
      );
    }

    const { systemPrompt, userPrompt } = getRoadmapPrompt(
      targetRole.trim(),
      missingSkills,
      skillPriorities
    );

    const rawAiResponse = await generateAICompletion(userPrompt, {
      systemPrompt,
      temperature: 0.2,
      responseFormat: 'json',
    });

    const parsedJson = extractJsonFromText(rawAiResponse);
    const validationResult = RoadmapSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error('Roadmap validation failed:', validationResult.error);
      return NextResponse.json(
        {
          error: 'AI response did not conform to expected roadmap structure.',
          details: validationResult.error.issues,
        },
        { status: 502 }
      );
    }

    const roadmapData = validationResult.data;

    // Persist to Supabase if authenticated
    let savedRoadmapId: string | undefined;
    let savedItems = roadmapData.items.map((it) => ({
      ...it,
      id: crypto.randomUUID(),
      status: 'not_started' as const,
    }));

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: rmRecord, error: rmErr } = await supabase
          .from('roadmaps')
          .insert({
            user_id: user.id,
            title: roadmapData.title,
            target_role: roadmapData.target_role,
          })
          .select('id')
          .single();

        if (!rmErr && rmRecord) {
          savedRoadmapId = rmRecord.id;

          const itemsToInsert = roadmapData.items.map((item, idx) => ({
            roadmap_id: rmRecord.id,
            user_id: user.id,
            step_number: item.step_number || idx + 1,
            skill_topic: item.skill_topic,
            priority: item.priority,
            prerequisites: item.prerequisites,
            learning_objective: item.learning_objective,
            recommended_resources: item.recommended_resources,
            practice_task: item.practice_task,
            project_suggestion: item.project_suggestion,
            estimated_learning_effort: item.estimated_learning_effort,
            status: 'not_started',
          }));

          const { data: insertedItems, error: itemsErr } = await supabase
            .from('roadmap_items')
            .insert(itemsToInsert)
            .select();

          if (!itemsErr && insertedItems) {
            savedItems = insertedItems;
          }
        }
      }
    } catch (dbErr) {
      console.warn('Database persistence skipped for roadmap:', dbErr);
    }

    return NextResponse.json({
      success: true,
      roadmap: {
        id: savedRoadmapId || crypto.randomUUID(),
        title: roadmapData.title,
        target_role: roadmapData.target_role,
        items: savedItems,
      },
    });
  } catch (error: unknown) {
    console.error('Roadmap generator error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate learning roadmap' },
      { status: 500 }
    );
  }
}
