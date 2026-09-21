'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Resume, ResumeAnalysis } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { formatFileSize, formatDate, parseApiResponse } from '@/lib/utils';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function ResumeAnalyzerPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loadingHistory, setLoadingHistory] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);

  // Load existing user resumes
  useEffect(() => {
    async function loadResumeHistory() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: resData } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (resData && resData.length > 0) {
            setResumes(resData);
            setSelectedResume(resData[0]);

            // Load analysis for the latest resume
            const { data: anaData } = await supabase
              .from('resume_analyses')
              .select('*')
              .eq('resume_id', resData[0].id)
              .maybeSingle();

            if (anaData) {
              setAnalysis(anaData);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load resumes:', err);
      } finally {
        setLoadingHistory(false);
      }
    }

    loadResumeHistory();
  }, []);

  // Handle PDF upload and analysis
  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF document.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }

    setError(null);
    setAnalyzing(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be logged in to analyze your resume.');
      }

      // Step 1: Upload to Supabase Storage
      setStatusStep('Uploading file securely to storage...');
      const fileExt = 'pdf';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${user.id}/${Date.now()}_${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.warn('Supabase storage upload note:', uploadError.message);
        // Continue even if storage policy isn't configured, but alert if completely broken
      }

      // Step 2: Extract text from PDF server-side
      setStatusStep('Extracting text from PDF document...');
      const formData = new FormData();
      formData.append('file', file);

      const parseRes = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData,
      });

      const parseResult = await parseApiResponse<{ text: string; pageCount: number }>(parseRes);
      if (!parseResult.ok) {
        throw new Error(parseResult.error || 'Failed to extract text from PDF');
      }

      const extractedText = parseResult.data.text;

      // Step 3: Insert record into `resumes` table
      setStatusStep('Recording resume metadata...');
      const { data: resumeRecord, error: resumeInsertError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          raw_text: extractedText,
        })
        .select()
        .single();

      if (resumeInsertError) {
        console.warn('Error saving resume to database:', resumeInsertError.message);
      }

      const activeResumeRecord = resumeRecord || {
        id: crypto.randomUUID(),
        user_id: user.id,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        raw_text: extractedText,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Step 4: AI Analysis
      setStatusStep('Running objective AI evaluation and skill extraction...');
      const aiRes = await fetch('/api/ai/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: extractedText,
          resumeId: activeResumeRecord.id,
        }),
      });

      const aiResult = await parseApiResponse<{ success: boolean; analysis: ResumeAnalysis }>(aiRes);
      if (!aiResult.ok) {
        throw new Error(aiResult.error || 'AI resume analysis failed');
      }

      const aiData = aiResult.data;

      // Update state
      setResumes((prev) => [activeResumeRecord, ...prev]);
      setSelectedResume(activeResumeRecord);
      setAnalysis(aiData.analysis);

      // Also automatically register detected technical skills to profile & skills table
      if (aiData.analysis.technical_skills?.length > 0) {
        for (const skill of aiData.analysis.technical_skills) {
          await supabase
            .from('skills')
            .upsert(
              { user_id: user.id, name: skill, category: 'technical', source: 'resume' },
              { onConflict: 'user_id,name' }
            );
        }
      }
    } catch (err: unknown) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during resume analysis.');
    } finally {
      setAnalyzing(false);
      setStatusStep('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectPastResume = async (res: Resume) => {
    setSelectedResume(res);
    setError(null);

    const supabase = createClient();
    const { data: anaData } = await supabase
      .from('resume_analyses')
      .select('*')
      .eq('resume_id', res.id)
      .maybeSingle();

    setAnalysis(anaData);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e2ded7]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#262a2a] font-serif flex items-center gap-2">
              <FileText className="h-6 w-6 text-[#ca9881]" />
              Resume Analyzer
            </h1>
            <p className="text-sm text-[#5c6463] mt-1">
              Upload your genuine PDF resume. Our AI inspects your actual experience, detects skills, identifies gaps, and scores completeness.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              isLoading={analyzing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload PDF Resume
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" title="Resume Analysis Notice">
            {error}
          </Alert>
        )}

        {analyzing && (
          <Card className="border-[#ebdcd4] bg-[#f5ece7]/40 p-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-10 w-10 border-4 border-[#ca9881] border-t-transparent rounded-full animate-spin" />
              <h3 className="font-semibold text-[#262a2a] text-base font-serif">
                Analyzing Your Resume
              </h3>
              <p className="text-sm text-[#5c6463] max-w-md">
                {statusStep || 'Processing your document...'}
              </p>
            </div>
          </Card>
        )}

        {/* Upload Drop Zone if no resume exists */}
        {!analyzing && resumes.length === 0 && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileUpload(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#dcd7cf] hover:border-[#ca9881] rounded-2xl p-12 text-center bg-[#f7f5f2]/60 cursor-pointer transition-colors"
          >
            <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
              <div className="h-16 w-16 rounded-full bg-[#f5ece7] flex items-center justify-center text-[#ca9881] ring-8 ring-[#f5ece7]/60">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#262a2a] font-serif">
                Upload your real PDF resume
              </h3>
              <p className="text-sm text-[#5c6463]">
                Drag and drop your file here, or click to browse. Max size: 5MB. PDF format only.
              </p>
              <Button size="sm" className="mt-2 pointer-events-none">
                Select PDF
              </Button>
            </div>
          </div>
        )}

        {/* Analysis Results View */}
        {selectedResume && analysis && (
          <div className="space-y-6">
            {/* Top Overview Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Score Card */}
              <Card className="bg-gradient-to-br from-[#f5ece7] to-white border-[#ebdcd4]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#9e5e43]">
                    Overall Resume Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-[#262a2a] font-serif">
                      {analysis.overall_score}
                    </span>
                    <span className="text-sm font-semibold text-[#5c6463]">/ 100</span>
                  </div>
                  <p className="text-xs text-[#5c6463] mt-2">
                    Based on section completeness, impact metrics, and clarity.
                  </p>
                </CardContent>
              </Card>

              {/* Active File Info */}
              <Card className="md:col-span-3 border-[#e2ded7] bg-white">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      {selectedResume.file_name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5 text-[#5c6463]">
                      Uploaded {formatDate(selectedResume.created_at)} • Size: {formatFileSize(selectedResume.file_size)}
                    </CardDescription>
                  </div>
                  {resumes.length > 1 && (
                    <select
                      className="text-xs border rounded-full px-3 py-1 bg-white border-[#dcd7cf] text-[#262a2a]"
                      value={selectedResume.id}
                      onChange={(e) => {
                        const found = resumes.find((r) => r.id === e.target.value);
                        if (found) handleSelectPastResume(found);
                      }}
                    >
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.file_name} ({formatDate(r.created_at)})
                        </option>
                      ))}
                    </select>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#5c6463]">
                    {analysis.contact_info.email && <span>✉️ {analysis.contact_info.email}</span>}
                    {analysis.contact_info.phone && <span>📞 {analysis.contact_info.phone}</span>}
                    {analysis.contact_info.location && <span>📍 {analysis.contact_info.location}</span>}
                    {analysis.contact_info.linkedin && <span>🔗 LinkedIn detected</span>}
                    {analysis.contact_info.github && <span>💻 GitHub detected</span>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Two Column Layout: Extracted Data vs AI Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: Factual Information Extracted from Resume */}
              <div className="space-y-6">
                <Card className="border-[#e2ded7] bg-white">
                  <CardHeader>
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#ca9881]" />
                      Verified Resume Content
                    </CardTitle>
                    <CardDescription className="text-[#5c6463]">
                      Data extracted directly from your PDF document
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Skills Detected */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5c6463] mb-2.5">
                        Technical Skills Detected ({analysis.technical_skills.length})
                      </h4>
                      {analysis.technical_skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.technical_skills.map((skill, i) => (
                            <Badge key={i} variant="default">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#5c6463]">No explicit technical skills found.</p>
                      )}
                    </div>

                    {/* Soft Skills */}
                    {analysis.soft_skills?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5c6463] mb-2">
                          Soft Skills & Competencies ({analysis.soft_skills.length})
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.soft_skills.map((skill, i) => (
                            <Badge key={i} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work Experience */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5c6463] mb-2.5">
                        Work Experience ({analysis.work_experience_parsed.length})
                      </h4>
                      {analysis.work_experience_parsed.length > 0 ? (
                        <div className="space-y-3">
                          {analysis.work_experience_parsed.map((exp, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl border border-[#e2ded7] bg-[#f7f5f2] text-xs space-y-1"
                            >
                              <div className="flex justify-between font-semibold text-[#262a2a]">
                                <span>{exp.role}</span>
                                <span className="text-[#5c6463]">{exp.duration}</span>
                              </div>
                              <div className="text-[#ca9881] font-medium">{exp.company}</div>
                              {exp.highlights?.length > 0 && (
                                <ul className="list-disc list-inside space-y-0.5 pt-1 text-[#5c6463]">
                                  {exp.highlights.slice(0, 2).map((hl, hidx) => (
                                    <li key={hidx} className="truncate">{hl}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#5c6463]">No work experience sections detected.</p>
                      )}
                    </div>

                    {/* Education */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5c6463] mb-2.5">
                        Education
                      </h4>
                      {analysis.education_parsed.length > 0 ? (
                        <div className="space-y-2">
                          {analysis.education_parsed.map((edu, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl border border-[#e2ded7] bg-[#f7f5f2] text-xs"
                            >
                              <div className="font-semibold text-[#262a2a]">
                                {edu.degree}
                              </div>
                              <div className="text-[#5c6463]">
                                {edu.institution} {edu.year ? `• ${edu.year}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#5c6463]">No education entries detected.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Column 2: AI Recommendations & Audit */}
              <div className="space-y-6">
                <Card className="border-[#e2ded7] bg-white">
                  <CardHeader>
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#ca9881]" />
                      AI Coach Recommendations
                    </CardTitle>
                    <CardDescription className="text-[#5c6463]">
                      Actionable improvements to elevate your resume
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Strengths */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Strengths Detected
                      </h4>
                      {analysis.strengths.length > 0 ? (
                        <ul className="space-y-2 text-xs">
                          {analysis.strengths.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span className="text-[#262a2a]">{str}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#5c6463]">No specific strengths documented.</p>
                      )}
                    </div>

                    {/* Weaknesses */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Areas For Improvement
                      </h4>
                      {analysis.weaknesses.length > 0 ? (
                        <ul className="space-y-2 text-xs">
                          {analysis.weaknesses.map((wk, idx) => (
                            <li key={idx} className="flex items-start gap-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                              <span className="text-amber-600 font-bold">!</span>
                              <span className="text-[#262a2a]">{wk}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#5c6463]">No weaknesses detected.</p>
                      )}
                    </div>

                    {/* Missing Sections */}
                    {analysis.missing_sections?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">
                          Missing Sections
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.missing_sections.map((ms, idx) => (
                            <Badge key={idx} variant="destructive">
                              {ms}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Concrete Recommendations */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9e5e43] mb-2 font-serif">
                        Next Action Steps
                      </h4>
                      {analysis.recommendations.length > 0 ? (
                        <div className="space-y-2 text-xs">
                          {analysis.recommendations.map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-3 rounded-xl border border-[#e2ded7] bg-[#f7f5f2]">
                              <span className="text-[#ca9881] font-bold">{idx + 1}.</span>
                              <span className="text-[#262a2a]">{rec}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#5c6463]">No recommendations available.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
