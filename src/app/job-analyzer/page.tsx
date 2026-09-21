'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Profile, Resume, ResumeAnalysis, JobDescription, JobMatch } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, parseApiResponse } from '@/lib/utils';
import {
  ScanSearch,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Briefcase,
  ArrowRight,
  History,
} from 'lucide-react';

export default function JobAnalyzerPage() {
  const [jobText, setJobText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User context
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestResume, setLatestResume] = useState<Resume | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<ResumeAnalysis | null>(null);

  // Current analysis result
  const [result, setResult] = useState<{
    job: {
      title: string;
      company?: string;
      location?: string;
      required_skills: string[];
      preferred_skills: string[];
      experience_requirements?: string;
      education_requirements?: string;
      responsibilities: string[];
      technologies: string[];
      keywords: string[];
    };
    match: {
      match_score: number;
      matching_skills: string[];
      missing_skills: string[];
      partially_matching_skills: string[];
      relevant_experience: string;
      potential_gaps: string[];
      verdict: string;
      detailed_feedback: string;
    };
  } | null>(null);

  // Past analyzed jobs
  const [pastJobs, setPastJobs] = useState<JobDescription[]>([]);

  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Fetch profile
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (prof) setProfile(prof);

          // Fetch latest resume & analysis
          const { data: resData } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (resData) {
            setLatestResume(resData);
            const { data: anaData } = await supabase
              .from('resume_analyses')
              .select('*')
              .eq('resume_id', resData.id)
              .maybeSingle();
            if (anaData) setLatestAnalysis(anaData);
          }

          // Fetch past jobs
          const { data: jobs } = await supabase
            .from('job_descriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);
          if (jobs) setPastJobs(jobs);
        }
      } catch (err) {
        console.error('Failed to load user data:', err);
      }
    }

    loadUserData();
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobText.trim() || jobText.trim().length < 40) {
      setError('Please paste a full job description (at least 40 characters).');
      return;
    }

    setError(null);
    setAnalyzing(true);
    setResult(null);

    try {
      // Build candidate profile context
      let profileContext = 'Candidate Profile:\n';
      if (profile) {
        profileContext += `Role: ${profile.current_role || 'Not specified'}\n`;
        profileContext += `Experience: ${profile.years_of_experience || 0} years\n`;
        profileContext += `Education: ${profile.education || ''} from ${profile.college || ''}\n`;
        profileContext += `Technical Skills: ${profile.technical_skills?.join(', ') || 'None'}\n`;
        profileContext += `Soft Skills: ${profile.soft_skills?.join(', ') || 'None'}\n`;
      }

      let resumeContext = '';
      if (latestAnalysis) {
        resumeContext = `Extracted Skills: ${latestAnalysis.technical_skills.join(', ')}\n`;
        resumeContext += `Experience Summary: ${latestAnalysis.work_experience_parsed.map(e => `${e.role} at ${e.company}`).join('; ')}\n`;
      } else if (latestResume?.raw_text) {
        resumeContext = latestResume.raw_text.slice(0, 1500);
      }

      const res = await fetch('/api/ai/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobText,
          profileContext,
          resumeContext,
        }),
      });

      const apiResult = await parseApiResponse<any>(res);
      if (!apiResult.ok) {
        throw new Error(apiResult.error || 'Job analysis failed');
      }

      setResult(apiResult.data);

      // Refresh past jobs list
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: jobs } = await supabase
          .from('job_descriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (jobs) setPastJobs(jobs);
      }
    } catch (err: unknown) {
      console.error('Job analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze job description.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e2ded7]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#262a2a] font-serif flex items-center gap-2">
              <ScanSearch className="h-6 w-6 text-[#ca9881]" />
              Job Description Analyzer
            </h1>
            <p className="text-sm text-[#5c6463] mt-1">
              Paste any real job posting. Our AI extracts core requirements and evaluates your authentic match against your verified profile and resume.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" title="Analysis Notice">
            {error}
          </Alert>
        )}

        {/* Input Form */}
        <Card className="border-[#e2ded7] bg-white">
          <CardHeader>
            <CardTitle className="text-base font-serif">Paste Authentic Job Posting</CardTitle>
            <CardDescription className="text-[#5c6463]">
              Copy the full text from LinkedIn, Indeed, or company careers page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <Textarea
                rows={6}
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Paste the complete job description text here (including responsibilities, qualifications, and requirements)..."
                disabled={analyzing}
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-[#5c6463]">
                  {latestResume ? (
                    <span className="text-emerald-700 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Comparing with resume: {latestResume.file_name}
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" /> No resume uploaded. Comparing against profile only.
                    </span>
                  )}
                </div>

                <Button type="submit" isLoading={analyzing} className="w-full sm:w-auto">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Job & Calculate Match
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results View */}
        {result && (
          <div className="space-y-6">
            {/* Overview Score Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-[#f5ece7] to-white border-[#ebdcd4]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#9e5e43]">
                    Match Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-[#262a2a] font-serif">
                      {result.match.match_score}
                    </span>
                    <span className="text-sm font-semibold text-[#5c6463]">/ 100</span>
                  </div>
                  <div className="mt-2">
                    <Badge
                      variant={
                        result.match.match_score >= 75
                          ? 'success'
                          : result.match.match_score >= 50
                          ? 'warning'
                          : 'destructive'
                      }
                    >
                      {result.match.verdict}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 font-serif">
                    <Briefcase className="h-4 w-4 text-[#ca9881]" />
                    {result.job.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#5c6463]">
                    {result.job.company ? `${result.job.company} • ` : ''}
                    {result.job.location || 'Location not specified'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-[#5c6463] leading-relaxed">
                    {result.match.detailed_feedback}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/skill-gap?role=${encodeURIComponent(result.job.title)}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        View Skill Gap Analysis for this Role <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Two Column Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: Match Analysis */}
              <Card className="border-[#e2ded7] bg-white">
                <CardHeader>
                  <CardTitle className="text-base font-serif">Skill Compatibility Breakdown</CardTitle>
                  <CardDescription className="text-[#5c6463]">Direct comparison between requirements and your background</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Matching Skills */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Matching Skills ({result.match.matching_skills.length})
                    </h4>
                    {result.match.matching_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.match.matching_skills.map((skill, i) => (
                          <Badge key={i} variant="success">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#5c6463]">No direct skill matches detected.</p>
                    )}
                  </div>

                  {/* Partially Matching */}
                  {result.match.partially_matching_skills.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Partially Matching / Adjacent ({result.match.partially_matching_skills.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.match.partially_matching_skills.map((skill, i) => (
                          <Badge key={i} variant="warning">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Missing Required Skills ({result.match.missing_skills.length})
                    </h4>
                    {result.match.missing_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.match.missing_skills.map((skill, i) => (
                          <Badge key={i} variant="destructive">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 font-medium">No missing required skills!</p>
                    )}
                  </div>

                  {/* Potential Gaps */}
                  {result.match.potential_gaps.length > 0 && (
                    <div className="pt-2 border-t border-[#e2ded7]">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5c6463] mb-2">
                        Potential Experience & Qualification Gaps
                      </h4>
                      <ul className="space-y-1 text-xs text-[#5c6463]">
                        {result.match.potential_gaps.map((gap, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Column 2: Extracted Job Requirements */}
              <Card className="border-[#e2ded7] bg-white">
                <CardHeader>
                  <CardTitle className="text-base font-serif">Extracted Job Requirements</CardTitle>
                  <CardDescription className="text-[#5c6463]">Key parameters extracted from the job description</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Experience & Education */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#f7f5f2] border border-[#e2ded7]">
                      <span className="font-semibold text-[#5c6463] block mb-1 uppercase">Experience Req</span>
                      <span className="text-[#262a2a] font-medium">
                        {result.job.experience_requirements || 'Not explicitly stated'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#f7f5f2] border border-[#e2ded7]">
                      <span className="font-semibold text-[#5c6463] block mb-1 uppercase">Education Req</span>
                      <span className="text-[#262a2a] font-medium">
                        {result.job.education_requirements || 'Not explicitly stated'}
                      </span>
                    </div>
                  </div>

                  {/* Required Skills */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5c6463] mb-2">
                      Required Technologies & Skills
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.job.required_skills.map((skill, i) => (
                        <Badge key={i} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Skills */}
                  {result.job.preferred_skills.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5c6463] mb-2">
                        Preferred Skills (Nice-to-Have)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.job.preferred_skills.map((skill, i) => (
                          <Badge key={i} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Responsibilities */}
                  {result.job.responsibilities.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5c6463] mb-2">
                        Core Responsibilities
                      </h4>
                      <ul className="space-y-1.5 text-xs text-[#5c6463]">
                        {result.job.responsibilities.slice(0, 4).map((resp, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-[#ca9881] font-bold">›</span>
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Past Analyzed Jobs Section */}
        {pastJobs.length > 0 && (
          <Card className="border-[#e2ded7] bg-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 font-serif">
                <History className="h-4 w-4 text-[#ca9881]" />
                Previously Analyzed Jobs
              </CardTitle>
              <CardDescription className="text-[#5c6463]">Saved job descriptions from your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pastJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#e2ded7] bg-[#f7f5f2] hover:bg-[#eae5df] transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-[#262a2a]">{job.title}</h4>
                      <p className="text-xs text-[#5c6463]">
                        {job.company ? `${job.company} • ` : ''}{formatDate(job.created_at)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setJobText(job.raw_text)}
                      className="text-xs"
                    >
                      Re-Analyze
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
