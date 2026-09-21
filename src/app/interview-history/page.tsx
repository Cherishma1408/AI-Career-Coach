'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Interview, InterviewQuestion, InterviewAnswer } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import {
  History,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Play,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function InterviewHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [expandedInterviewId, setExpandedInterviewId] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from('interviews')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && data) {
            setInterviews(data);
          }
        }
      } catch (err) {
        console.error('Failed to load interview history:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedInterviewId((prev) => (prev === id ? null : id));
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e2ded7]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#262a2a] font-serif flex items-center gap-2">
              <History className="h-6 w-6 text-[#ca9881]" />
              Interview Performance History
            </h1>
            <p className="text-sm text-[#5c6463] mt-1">
              Review your authentic past mock interview sessions, scores, and coaching feedback.
            </p>
          </div>

          <Link href="/mock-interview">
            <Button size="sm">
              <Play className="h-4 w-4 mr-1.5" />
              Practice New Interview
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}

        {/* Empty State */}
        {!loading && interviews.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="Complete an interview to see your score"
            description="You haven't completed any mock interview sessions yet. Test your knowledge against role-tailored questions to measure your performance."
            actionLabel="Start Mock Interview"
            actionHref="/mock-interview"
          />
        )}

        {/* Interview List */}
        {!loading && interviews.length > 0 && (
          <div className="space-y-4">
            {interviews.map((intv) => {
              const isExpanded = expandedInterviewId === intv.id;

              return (
                <Card key={intv.id} className="transition-all border-[#e2ded7] bg-white hover:border-[#ca9881]">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <CardTitle className="text-base font-bold text-[#262a2a] font-serif">
                            {intv.target_role}
                          </CardTitle>
                          <Badge variant="outline" className="text-[10px]">
                            {intv.experience_level}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {intv.interview_type}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs mt-1 flex items-center gap-1.5 text-[#5c6463]">
                          <Calendar className="h-3 w-3" />
                          {formatDate(intv.created_at)} • {intv.num_questions} Questions
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {intv.overall_score !== null ? (
                            <div className="text-xl font-extrabold text-[#ca9881] font-serif">
                              {intv.overall_score}
                              <span className="text-xs text-[#5c6463] font-normal">/100</span>
                            </div>
                          ) : (
                            <Badge variant="secondary">Incomplete</Badge>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(intv.id)}
                          className="text-xs"
                        >
                          {isExpanded ? (
                            <>
                              Hide Details <ChevronUp className="h-3.5 w-3.5 ml-1" />
                            </>
                          ) : (
                            <>
                              View Report <ChevronDown className="h-3.5 w-3.5 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="px-5 pb-5 pt-2 border-t border-[#e2ded7] mt-3 space-y-4 text-xs">
                      {intv.feedback_summary && (
                        <div className="p-3.5 rounded-xl bg-[#f7f5f2] border border-[#e2ded7]">
                          <span className="font-semibold text-[#5c6463] block mb-1">
                            OVERALL SUMMARY & EVALUATION
                          </span>
                          <p className="text-[#262a2a] leading-relaxed">
                            {intv.feedback_summary}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths */}
                        {intv.strengths && intv.strengths.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                            </span>
                            <ul className="space-y-1 text-[#5c6463]">
                              {intv.strengths.map((s, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-emerald-600 font-bold">✓</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Improvements */}
                        {intv.improvements && intv.improvements.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="font-semibold text-amber-700 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" /> Areas For Improvement
                            </span>
                            <ul className="space-y-1 text-[#5c6463]">
                              {intv.improvements.map((imp, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-amber-600 font-bold">!</span>
                                  <span>{imp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
