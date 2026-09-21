'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Profile, Resume, ResumeAnalysis, SkillGap, Roadmap, Interview, SavedJob } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import {
  FileText,
  Target,
  Compass,
  Milestone,
  MessageSquare,
  Briefcase,
  Upload,
  ArrowRight,
  TrendingUp,
  Award,
} from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestResume, setLatestResume] = useState<Resume | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<ResumeAnalysis | null>(null);
  const [latestGap, setLatestGap] = useState<SkillGap | null>(null);
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // 1. Fetch profile
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (profData) setProfile(profData);

        // 2. Fetch latest resume & analysis
        const { data: resumeData } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (resumeData) {
          setLatestResume(resumeData);
          const { data: anaData } = await supabase
            .from('resume_analyses')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (anaData) setLatestAnalysis(anaData);
        }

        // 3. Fetch latest skill gap
        const { data: gapData } = await supabase
          .from('skill_gaps')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (gapData) setLatestGap(gapData);

        // 4. Fetch latest roadmap with items
        const { data: rmData } = await supabase
          .from('roadmaps')
          .select('*, items:roadmap_items(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (rmData) setActiveRoadmap(rmData);

        // 5. Fetch interviews
        const { data: intvData } = await supabase
          .from('interviews')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (intvData) setInterviews(intvData);

        // 6. Fetch saved jobs
        const { data: jobData } = await supabase
          .from('saved_jobs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (jobData) setSavedJobs(jobData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Compute actual roadmap stats
  const totalRoadmapSteps = activeRoadmap?.items?.length || 0;
  const completedRoadmapSteps = activeRoadmap?.items?.filter((i) => i.status === 'completed').length || 0;
  const roadmapProgressPct = totalRoadmapSteps > 0 ? Math.round((completedRoadmapSteps / totalRoadmapSteps) * 100) : 0;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e2ded7]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#262a2a] font-serif">
              Career Dashboard
            </h1>
            <p className="text-sm text-[#5c6463] mt-1">
              {profile?.full_name ? `Welcome back, ${profile.full_name}.` : 'Your personalized career development hub.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/resume-analyzer">
              <Button size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Analyze Resume
              </Button>
            </Link>
            <Link href="/mock-interview">
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Practice Interview
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Metric Cards - Real Data Only */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Resume Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#5c6463]">
                Resume Status
              </CardTitle>
              <FileText className="h-4 w-4 text-[#ca9881]" />
            </CardHeader>
            <CardContent>
              {latestResume ? (
                <div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold text-[#262a2a]">
                      {latestAnalysis ? `${latestAnalysis.overall_score}/100` : 'Analyzed'}
                    </div>
                    <Badge variant={latestAnalysis && latestAnalysis.overall_score >= 70 ? 'success' : 'warning'}>
                      Active File
                    </Badge>
                  </div>
                  <p className="text-xs text-[#5c6463] mt-1 truncate">{latestResume.file_name}</p>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-medium text-[#5c6463]">No resume uploaded</div>
                  <Link href="/resume-analyzer" className="text-xs text-[#ca9881] hover:underline inline-flex items-center mt-1">
                    Upload your PDF resume <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Career Target Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#5c6463]">
                Target Role
              </CardTitle>
              <Target className="h-4 w-4 text-[#ca9881]" />
            </CardHeader>
            <CardContent>
              {profile?.career_goal ? (
                <div>
                  <div className="text-xl font-bold text-[#262a2a] truncate">{profile.career_goal}</div>
                  <p className="text-xs text-[#5c6463] mt-1">
                    {profile.years_of_experience > 0 ? `${profile.years_of_experience} yrs experience` : 'Entry level candidate'}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-medium text-[#5c6463]">Goal not defined</div>
                  <Link href="/profile" className="text-xs text-[#ca9881] hover:underline inline-flex items-center mt-1">
                    Set your career goal in Profile <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mock Interview Progress */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#5c6463]">
                Interviews Completed
              </CardTitle>
              <Award className="h-4 w-4 text-[#ca9881]" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold text-[#262a2a]">{interviews.length}</div>
                {interviews.length > 0 && (
                  <Badge variant="default">{interviews.filter(i => i.status === 'completed').length} scored</Badge>
                )}
              </div>
              <p className="text-xs text-[#5c6463] mt-1">
                {interviews.length > 0 ? 'Recorded interview sessions' : 'No interview sessions yet'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Sections: Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Resume Strengths & Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-[#ca9881]" />
                Latest Resume Insights
              </CardTitle>
              <CardDescription>
                Analysis extracted from your real uploaded document
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestAnalysis ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5c6463] mb-2">
                      Key Strengths
                    </h4>
                    {latestAnalysis.strengths.length > 0 ? (
                      <ul className="space-y-1.5 text-sm">
                        {latestAnalysis.strengths.slice(0, 3).map((st, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-600">✓</span>
                            <span className="text-[#262a2a]">{st}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#5c6463]">No specific strengths recorded.</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#e2ded7]">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5c6463] mb-2">
                      Recommended Action Items
                    </h4>
                    {latestAnalysis.recommendations.length > 0 ? (
                      <ul className="space-y-1.5 text-sm">
                        {latestAnalysis.recommendations.slice(0, 3).map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#ca9881]">→</span>
                            <span className="text-[#5c6463]">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#5c6463]">No recommendations available.</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Link href="/resume-analyzer">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        View Full Resume Breakdown
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No resume uploaded yet"
                  description="Upload your real PDF resume to receive a quantified assessment, skill audit, and recommendations."
                  actionLabel="Upload Resume"
                  actionHref="/resume-analyzer"
                />
              )}
            </CardContent>
          </Card>

          {/* Section 2: Learning Roadmap Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Milestone className="h-4 w-4 text-[#ca9881]" />
                Active Learning Roadmap
              </CardTitle>
              <CardDescription>
                {activeRoadmap ? activeRoadmap.title : 'Structured progression for your skill gaps'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeRoadmap && totalRoadmapSteps > 0 ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-medium text-[#5c6463]">
                      <span>Progress</span>
                      <span>{completedRoadmapSteps} of {totalRoadmapSteps} Steps Completed ({roadmapProgressPct}%)</span>
                    </div>
                    <Progress value={completedRoadmapSteps} max={totalRoadmapSteps} />
                  </div>

                  <div className="space-y-2 pt-2">
                    {activeRoadmap.items?.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-[#f7f5f2] text-sm border border-[#e2ded7]"
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold mr-2 text-[#5c6463]">#{item.step_number}</span>
                          <span className="font-medium text-[#262a2a]">{item.skill_topic}</span>
                        </div>
                        <Badge
                          variant={
                            item.status === 'completed'
                              ? 'success'
                              : item.status === 'in_progress'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Link href="/roadmap">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        Open Full Roadmap
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Milestone}
                  title="No learning roadmap generated"
                  description="Run a skill gap analysis on your target career role to create a personalized step-by-step roadmap."
                  actionLabel="Analyze Skill Gaps"
                  actionHref="/skill-gap"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Two Columns: Skill Gaps & Recent Interviews */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skill Gaps Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Compass className="h-4 w-4 text-[#ca9881]" />
                Identified Skill Gaps
              </CardTitle>
              <CardDescription>
                {latestGap ? `Target role: ${latestGap.target_role}` : 'Industry skill comparison'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestGap && latestGap.missing_skills.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-[#5c6463]">
                    Skills recommended by the industry for {latestGap.target_role} not yet detected in your profile:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {latestGap.missing_skills.map((skill, idx) => (
                      <Badge key={idx} variant="destructive">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <div className="pt-2">
                    <Link href="/skill-gap">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        Review Gap Analysis & Priorities
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Compass}
                  title="No skill gap analysis on record"
                  description="Compare your current capabilities against any target job role to reveal critical gaps."
                  actionLabel="Check Skill Gaps"
                  actionHref="/skill-gap"
                />
              )}
            </CardContent>
          </Card>

          {/* Recent Mock Interviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-[#ca9881]" />
                Recent Interview History
              </CardTitle>
              <CardDescription>
                Past evaluations across accuracy, relevance, and problem-solving
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interviews.length > 0 ? (
                <div className="space-y-3">
                  {interviews.map((intv) => (
                    <div
                      key={intv.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#e2ded7] bg-[#f7f5f2]"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[#262a2a]">{intv.target_role}</div>
                        <div className="text-xs text-[#5c6463]">
                          {intv.interview_type} • {formatDate(intv.created_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        {intv.overall_score !== null ? (
                          <span className="text-sm font-bold text-[#ca9881]">
                            {intv.overall_score}/100
                          </span>
                        ) : (
                          <Badge variant="secondary">In Progress</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Link href="/interview-history">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        View Full Interview History
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="Complete an interview to see your score"
                  description="Practice role-specific questions and get instant feedback on technical accuracy and communication."
                  actionLabel="Start Mock Interview"
                  actionHref="/mock-interview"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Saved Jobs Strip */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-[#ca9881]" />
              Saved Job Listings
            </CardTitle>
            <CardDescription>
              Real job opportunities bookmarked from your live search
            </CardDescription>
          </CardHeader>
          <CardContent>
            {savedJobs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3.5 rounded-lg border border-[#e2ded7] bg-white flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-sm truncate text-[#262a2a]">{job.job_title}</h4>
                      <p className="text-xs text-[#5c6463] truncate">{job.company} • {job.location || 'Remote'}</p>
                    </div>
                    {job.apply_url && (
                      <div className="mt-3 pt-2 border-t border-[#e2ded7]">
                        <a
                          href={job.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#ca9881] hover:underline font-medium"
                        >
                          View Listing ↗
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No saved jobs yet"
                description="Search real open job listings and bookmark positions to track applications."
                actionLabel="Search Jobs"
                actionHref="/job-search"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
