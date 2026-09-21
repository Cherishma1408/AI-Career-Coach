'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Roadmap, RoadmapItem } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Milestone,
  CheckCircle2,
  Clock,
  PlayCircle,
  ExternalLink,
  BookOpen,
  Code,
  FolderGit2,
  Calendar,
} from 'lucide-react';

export default function RoadmapPage() {
  const [loading, setLoading] = useState(true);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadRoadmaps() {
      let loadedRoadmaps: Roadmap[] = [];
      let loadedItems: RoadmapItem[] = [];

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: rmList } = await supabase
            .from('roadmaps')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (rmList && rmList.length > 0) {
            loadedRoadmaps = rmList;
            const current = rmList[0];

            const { data: itemsData } = await supabase
              .from('roadmap_items')
              .select('*')
              .eq('roadmap_id', current.id)
              .order('step_number', { ascending: true });

            if (itemsData && itemsData.length > 0) {
              loadedItems = itemsData;
            }
          }
        }
      } catch (err) {
        console.warn('Could not load roadmaps from Supabase:', err);
      }

      // If Supabase returned nothing or table is not yet migrated, load from local storage
      if (loadedRoadmaps.length === 0) {
        try {
          const cached = JSON.parse(localStorage.getItem('user_roadmaps') || '[]');
          if (cached && cached.length > 0) {
            loadedRoadmaps = cached;
            const activeId = localStorage.getItem('active_roadmap_id') || cached[0].id;
            const active = cached.find((r: any) => r.id === activeId) || cached[0];
            loadedItems = active.items || [];
          }
        } catch (localErr) {
          console.warn('Could not read cached roadmaps:', localErr);
        }
      }

      if (loadedRoadmaps.length > 0) {
        setRoadmaps(loadedRoadmaps);
        const activeId = localStorage.getItem('active_roadmap_id') || loadedRoadmaps[0].id;
        const current = loadedRoadmaps.find((r) => r.id === activeId) || loadedRoadmaps[0];
        setActiveRoadmap(current);
        setItems(loadedItems.length > 0 ? loadedItems : (current as any).items || []);
      }

      setLoading(false);
    }

    loadRoadmaps();
  }, []);

  const handleSelectRoadmap = async (roadmap: Roadmap) => {
    setActiveRoadmap(roadmap);
    localStorage.setItem('active_roadmap_id', roadmap.id);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: itemsData } = await supabase
        .from('roadmap_items')
        .select('*')
        .eq('roadmap_id', roadmap.id)
        .order('step_number', { ascending: true });

      if (itemsData && itemsData.length > 0) {
        setItems(itemsData);
      } else if ((roadmap as any).items?.length > 0) {
        setItems((roadmap as any).items);
      }
    } catch {
      if ((roadmap as any).items?.length > 0) {
        setItems((roadmap as any).items);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => {
    setUpdatingItemId(itemId);

    // Optimistically update state
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status: newStatus } : it))
    );
    setMessage(`Status updated to ${newStatus.replace('_', ' ')}.`);
    setTimeout(() => setMessage(null), 3000);

    // Update in local storage
    try {
      const cached = JSON.parse(localStorage.getItem('user_roadmaps') || '[]');
      const updated = cached.map((rm: any) => {
        if (rm.id === activeRoadmap?.id && rm.items) {
          return {
            ...rm,
            items: rm.items.map((it: any) => (it.id === itemId ? { ...it, status: newStatus } : it)),
          };
        }
        return rm;
      });
      localStorage.setItem('user_roadmaps', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not update localStorage item status:', e);
    }

    // Try updating Supabase
    try {
      const supabase = createClient();
      await supabase
        .from('roadmap_items')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
    } catch (err) {
      console.warn('Supabase status update skipped:', err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const inProgressCount = items.filter((i) => i.status === 'in_progress').length;
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e2ded7]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#262a2a] font-serif flex items-center gap-2">
              <Milestone className="h-6 w-6 text-[#ca9881]" />
              Personalized Learning Roadmap
            </h1>
            <p className="text-sm text-[#5c6463] mt-1">
              Curated progression to bridge your real skill gaps with actionable tasks and portfolio projects.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/skill-gap">
              <Button variant="outline" size="sm">
                Generate New Roadmap
              </Button>
            </Link>
          </div>
        </div>

        {message && (
          <Alert variant="success">
            {message}
          </Alert>
        )}

        {/* Empty State */}
        {!loading && (!activeRoadmap || items.length === 0) && (
          <EmptyState
            icon={Milestone}
            title="No learning roadmaps on file"
            description="Run a skill gap analysis for your desired tech role to generate a personalized step-by-step curriculum."
            actionLabel="Discover Skill Gaps"
            actionHref="/skill-gap"
          />
        )}

        {/* Roadmap Display */}
        {activeRoadmap && items.length > 0 && (
          <div className="space-y-6">
            {/* Top Stats Card */}
            <Card className="bg-gradient-to-r from-[#262a2a] to-[#374241] text-white border-none shadow-md rounded-2xl">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#ca9881]">
                      Target Role: {activeRoadmap.target_role}
                    </span>
                    <h2 className="text-xl font-extrabold font-serif mt-1">{activeRoadmap.title}</h2>
                  </div>

                  {roadmaps.length > 1 && (
                    <select
                      className="text-xs bg-stone-800 text-white border border-stone-700 rounded-full px-3 py-1.5"
                      value={activeRoadmap.id}
                      onChange={(e) => {
                        const r = roadmaps.find((x) => x.id === e.target.value);
                        if (r) handleSelectRoadmap(r);
                      }}
                    >
                      {roadmaps.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-stone-700/60">
                  <div className="flex justify-between text-xs mb-2 font-medium">
                    <span>Overall Completion</span>
                    <span>
                      {completedCount} of {items.length} Steps Completed ({progressPct}%)
                    </span>
                  </div>
                  <Progress
                    value={completedCount}
                    max={items.length}
                    className="bg-stone-800 h-2.5"
                    indicatorClassName="bg-[#ca9881]"
                  />
                  <div className="flex gap-4 mt-3 text-xs text-stone-300">
                    <span>✅ Completed: {completedCount}</span>
                    <span>⏳ In Progress: {inProgressCount}</span>
                    <span>⏸️ Not Started: {items.length - completedCount - inProgressCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step-by-Step Items */}
            <div className="space-y-4">
              {items.map((item) => {
                const isCompleted = item.status === 'completed';
                const isInProgress = item.status === 'in_progress';

                return (
                  <Card
                    key={item.id}
                    className={`transition-all border-[#e2ded7] bg-white ${
                      isCompleted
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : isInProgress
                        ? 'border-[#ca9881] bg-[#f5ece7]/25 shadow-xs'
                        : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : isInProgress
                                ? 'bg-[#ca9881] text-white'
                                : 'bg-[#eae5df] text-[#262a2a]'
                            }`}
                          >
                            {item.step_number}
                          </span>
                          <CardTitle className="text-base font-bold font-serif text-[#262a2a]">
                            {item.skill_topic}
                          </CardTitle>
                          <Badge
                            variant={
                              item.priority === 'high'
                                ? 'destructive'
                                : item.priority === 'medium'
                                ? 'warning'
                                : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {item.priority} priority
                          </Badge>
                        </div>

                        {/* Interactive Status Switcher */}
                        <div className="flex items-center gap-1 bg-[#eae5df] p-1 rounded-full self-start sm:self-auto">
                          <button
                            onClick={() => handleStatusChange(item.id, 'not_started')}
                            disabled={updatingItemId === item.id}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${
                              item.status === 'not_started'
                                ? 'bg-white text-[#262a2a] shadow-xs font-semibold'
                                : 'text-[#5c6463] hover:text-[#262a2a]'
                            }`}
                          >
                            Not Started
                          </button>
                          <button
                            onClick={() => handleStatusChange(item.id, 'in_progress')}
                            disabled={updatingItemId === item.id}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${
                              item.status === 'in_progress'
                                ? 'bg-[#ca9881] text-white shadow-xs font-semibold'
                                : 'text-[#5c6463] hover:text-[#262a2a]'
                            }`}
                          >
                            In Progress
                          </button>
                          <button
                            onClick={() => handleStatusChange(item.id, 'completed')}
                            disabled={updatingItemId === item.id}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${
                              item.status === 'completed'
                                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                : 'text-[#5c6463] hover:text-[#262a2a]'
                            }`}
                          >
                            Completed
                          </button>
                        </div>
                      </div>

                      <CardDescription className="text-xs pt-1 text-[#5c6463]">
                        Effort: {item.estimated_learning_effort}
                        {item.prerequisites?.length > 0 && ` • Prerequisites: ${item.prerequisites.join(', ')}`}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 text-xs">
                      {/* Learning Objective */}
                      <div className="p-3.5 rounded-xl bg-[#f7f5f2] border border-[#e2ded7]">
                        <span className="font-semibold text-[#5c6463] block mb-1">
                          LEARNING OBJECTIVE
                        </span>
                        <p className="text-[#262a2a] leading-relaxed">
                          {item.learning_objective}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Practice Task */}
                        <div className="p-3.5 rounded-xl border border-[#e2ded7] bg-white space-y-1">
                          <span className="font-semibold text-[#262a2a] flex items-center gap-1.5">
                            <Code className="h-3.5 w-3.5 text-[#ca9881]" />
                            Hands-On Practice Task
                          </span>
                          <p className="text-[#5c6463]">{item.practice_task}</p>
                        </div>

                        {/* Project Suggestion */}
                        <div className="p-3.5 rounded-xl border border-[#e2ded7] bg-white space-y-1">
                          <span className="font-semibold text-[#262a2a] flex items-center gap-1.5">
                            <FolderGit2 className="h-3.5 w-3.5 text-emerald-600" />
                            Portfolio Project Suggestion
                          </span>
                          <p className="text-[#5c6463]">{item.project_suggestion}</p>
                        </div>
                      </div>

                      {/* Verified Resources */}
                      {item.recommended_resources?.length > 0 && (
                        <div className="pt-2">
                          <span className="font-semibold text-[#5c6463] block mb-2 font-serif">
                            VERIFIED LEARNING TOPICS & RESOURCES
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.recommended_resources.map((res, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-2.5 rounded-xl border border-[#e2ded7] bg-[#f7f5f2] flex items-start gap-2"
                              >
                                <BookOpen className="h-4 w-4 text-[#ca9881] shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-semibold text-[#262a2a]">
                                    {res.title}
                                  </div>
                                  <p className="text-[11px] text-[#5c6463] mt-0.5">{res.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
