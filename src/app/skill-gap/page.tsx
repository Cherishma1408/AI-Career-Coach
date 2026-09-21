'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Profile, Resume, SkillGap, SkillItem } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { parseApiResponse } from '@/lib/utils';
import {
  Compass,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Milestone,
  ArrowRight,
  Target,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function SkillGapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') || '';

  const [targetRole, setTargetRole] = useState(initialRole);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userSkills, setUserSkills] = useState<SkillItem[]>([]);
  const [latestResume, setLatestResume] = useState<Resume | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gapResult, setGapResult] = useState<SkillGap | null>(null);

  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // 1. Profile
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (prof) {
            setProfile(prof);
            if (!initialRole && prof.career_goal) {
              setTargetRole(prof.career_goal);
            }
          }

          // 2. Skills
          const { data: skillsData } = await supabase
            .from('skills')
            .select('*')
            .eq('user_id', user.id);
          if (skillsData) setUserSkills(skillsData);

          // 3. Latest Resume
          const { data: resData } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (resData) setLatestResume(resData);

          // 4. Check for existing skill gap record
          const { data: existingGap } = await supabase
            .from('skill_gaps')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingGap && !initialRole) {
            setTargetRole(existingGap.target_role);
            setGapResult(existingGap);
          }
        }
      } catch (err) {
        console.error('Error loading data for skill gap:', err);
      }
    }

    loadUserData();
  }, [initialRole]);

  const handleAnalyzeGaps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      setError('Please provide a target job role.');
      return;
    }

    setError(null);
    setAnalyzing(true);

    try {
      // Collect all known skills
      const allKnownSkills = Array.from(
        new Set([
          ...(profile?.technical_skills || []),
          ...(profile?.soft_skills || []),
          ...userSkills.map((s) => s.name),
        ])
      );

      const res = await fetch('/api/ai/skill-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: targetRole.trim(),
          userSkills: allKnownSkills,
          resumeText: latestResume?.raw_text || undefined,
        }),
      });

      const gapResultRes = await parseApiResponse<any>(res);
      if (!gapResultRes.ok) {
        throw new Error(gapResultRes.error || 'Failed to analyze skill gaps');
      }

      setGapResult(gapResultRes.data.data);
    } catch (err: unknown) {
      console.error('Skill gap error:', err);
      setError(err instanceof Error ? err.message : 'Skill gap analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!gapResult || gapResult.missing_skills.length === 0) return;

    setGeneratingRoadmap(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: gapResult.target_role,
          missingSkills: gapResult.missing_skills,
          skillPriorities: gapResult.skill_priorities,
        }),
      });

      const roadmapResult = await parseApiResponse<any>(res);
      if (!roadmapResult.ok) {
        throw new Error(roadmapResult.error || 'Failed to generate learning roadmap');
      }

      // Persist to local storage so roadmap is immediately available even if DB tables are pending
      if (roadmapResult.data?.roadmap) {
        try {
          const newRoadmap = roadmapResult.data.roadmap;
          const currentCached = JSON.parse(localStorage.getItem('user_roadmaps') || '[]');
          const updated = [newRoadmap, ...currentCached.filter((r: any) => r.id !== newRoadmap.id)];
          localStorage.setItem('user_roadmaps', JSON.stringify(updated));
          localStorage.setItem('active_roadmap_id', newRoadmap.id);
        } catch (e) {
          console.warn('Could not cache roadmap locally:', e);
        }
      }

      router.push('/roadmap');
    } catch (err: unknown) {
      console.error('Roadmap generation error:', err);
      setError(err instanceof Error ? err.message : 'Roadmap generation failed.');
      setGeneratingRoadmap(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e2ded7]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#262a2a] font-serif flex items-center gap-2">
            <Compass className="h-6 w-6 text-[#ca9881]" />
            Skill Gap Analysis
          </h1>
          <p className="text-sm text-[#5c6463] mt-1">
            Compare your actual recorded skills against industry role expectations to discover precise blockers and priorities.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" title="Skill Gap Notice">
          {error}
        </Alert>
      )}

      {/* Input Target Role Card */}
      <Card className="border-[#e2ded7] bg-white">
        <CardHeader>
          <CardTitle className="text-base font-serif">Specify Target Career Role</CardTitle>
          <CardDescription className="text-[#5c6463]">
            We cross-examine your authenticated profile against industry competency models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyzeGaps} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Target className="absolute left-3 top-3 h-4 w-4 text-[#5c6463]" />
              <Input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Full Stack Engineer, Cloud Architect, Data Scientist"
                className="pl-9"
                disabled={analyzing}
              />
            </div>
            <Button type="submit" isLoading={analyzing}>
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze Skill Gaps
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {gapResult && (
        <div className="space-y-6">
          {/* Top Action Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#ca9881] to-[#b98871] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-xl font-bold font-serif">
                Skill Gap Audit: {gapResult.target_role}
              </h3>
              <p className="text-sm text-[#f5ece7] mt-1">
                Identified {gapResult.missing_skills.length} missing competency areas to master for this role.
              </p>
            </div>

            <Button
              variant="secondary"
              size="lg"
              isLoading={generatingRoadmap}
              onClick={handleGenerateRoadmap}
              className="bg-white text-[#262a2a] hover:bg-[#f7f5f2] font-semibold shrink-0"
            >
              <Milestone className="h-4 w-4 mr-2 text-[#ca9881]" />
              Generate Learning Roadmap <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Grid Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Existing vs Required */}
            <Card className="border-[#e2ded7] bg-white">
              <CardHeader>
                <CardTitle className="text-base font-serif">Competency Overview</CardTitle>
                <CardDescription className="text-[#5c6463]">Verified profile competencies vs target expectations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Verified Existing */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Verified Candidate Skills ({gapResult.existing_skills.length})
                  </h4>
                  {gapResult.existing_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {gapResult.existing_skills.map((skill, idx) => (
                        <Badge key={idx} variant="success">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#5c6463] italic">No existing matching skills found in your profile.</p>
                  )}
                </div>

                {/* Missing Skills */}
                <div className="pt-2 border-t border-[#e2ded7]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2.5 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />
                    Missing Skills to Acquire ({gapResult.missing_skills.length})
                  </h4>
                  {gapResult.missing_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {gapResult.missing_skills.map((skill, idx) => (
                        <Badge key={idx} variant="destructive">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 font-medium">All core competencies are documented!</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Suggested Learning Sequence */}
            <Card className="border-[#e2ded7] bg-white">
              <CardHeader>
                <CardTitle className="text-base font-serif">Recommended Learning Sequence</CardTitle>
                <CardDescription className="text-[#5c6463]">Logical progression from foundational to advanced concepts</CardDescription>
              </CardHeader>
              <CardContent>
                {gapResult.suggested_learning_sequence.length > 0 ? (
                  <ol className="relative border-l border-[#ca9881]/40 ml-3 space-y-4 text-xs">
                    {gapResult.suggested_learning_sequence.map((step, idx) => (
                      <li key={idx} className="mb-4 ml-4">
                        <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-[#ca9881]" />
                        <div className="font-semibold text-sm text-[#262a2a] font-serif">
                          Phase {idx + 1}: {step}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-[#5c6463]">No learning sequence generated.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Prioritized Gaps Table / Matrix */}
          <Card className="border-[#e2ded7] bg-white">
            <CardHeader>
              <CardTitle className="text-base font-serif">Skill Priority Matrix & Rationales</CardTitle>
              <CardDescription className="text-[#5c6463]">Why each skill matters and how urgently it impacts hiring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gapResult.skill_priorities.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-[#e2ded7] bg-[#f7f5f2] gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#262a2a]">
                          {item.skill}
                        </span>
                        <Badge
                          variant={
                            item.priority === 'high'
                              ? 'destructive'
                              : item.priority === 'medium'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {item.priority.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                      <p className="text-xs text-[#5c6463]">
                        {item.rationale}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!gapResult && (
        <EmptyState
          icon={Compass}
          title="Identify your skill gaps"
          description="Enter any target role above to evaluate your verified skills against industry standards."
        />
      )}
    </div>
  );
}

export default function SkillGapPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading skill gap analysis...</div>}>
        <SkillGapContent />
      </Suspense>
    </AppShell>
  );
}
