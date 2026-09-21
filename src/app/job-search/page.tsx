'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { JobSearchResult, SavedJob, WorldJobPortalLink } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import {
  Briefcase,
  Search,
  MapPin,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Building,
  Sparkles,
  DollarSign,
  Globe,
  Compass,
  CheckCircle2,
  TrendingUp,
  Layers,
  Filter,
} from 'lucide-react';

const POPULAR_KEYWORDS = [
  'Fullstack Developer',
  'Frontend React',
  'Backend Python',
  'AI / Machine Learning',
  'DevOps / Cloud',
  'Data Scientist',
];

const REGION_PRESETS = [
  { label: '🌍 Worldwide', location: '', remote: false },
  { label: '🌐 100% Remote', location: 'Remote', remote: true },
  { label: '🇺🇸 United States', location: 'USA', remote: false },
  { label: '🇪🇺 Europe / UK', location: 'Europe', remote: false },
  { label: '🇮🇳 India / APAC', location: 'APAC', remote: false },
];

export default function JobSearchPage() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<JobSearchResult[]>([]);
  const [worldLinks, setWorldLinks] = useState<WorldJobPortalLink[]>([]);
  const [provider, setProvider] = useState<string>('');
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');

  // Load saved jobs & profile career goal on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: saved } = await supabase
            .from('saved_jobs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (saved) setSavedJobs(saved);

          const { data: profile } = await supabase
            .from('profiles')
            .select('career_goal')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.career_goal) {
            setQuery(profile.career_goal);
            fetchJobs(profile.career_goal, '', false);
            return;
          }
        }
        // If no user profile goal, default search for Software Engineer to populate immediately
        fetchJobs('Software Engineer', '', false);
      } catch (err) {
        console.error('Failed to load initial data:', err);
        fetchJobs('Software Engineer', '', false);
      }
    }

    loadInitialData();
  }, []);

  const fetchJobs = useCallback(
    async (q: string, loc: string, remote: boolean) => {
      setLoading(true);
      setSearched(true);

      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set('query', q.trim());
        if (loc.trim()) params.set('location', loc.trim());
        if (remote) params.set('remote', 'true');

        const res = await fetch(`/api/jobs/search?${params.toString()}`);
        const data = await res.json();

        setProvider(data.provider || 'Live Global Job Feeds');
        setActiveSources(data.activeSources || []);
        setIsConfigured(data.isConfigured ?? true);
        setProviderMessage(data.message || null);
        setJobs(data.jobs || []);
        setWorldLinks(data.worldLinks || []);
      } catch (err) {
        console.error('Search request failed:', err);
        setIsConfigured(false);
        setProviderMessage('Unable to reach live job search providers.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchJobs(query, location, remoteOnly);
  };

  const handleKeywordClick = (kw: string) => {
    setQuery(kw);
    fetchJobs(kw, location, remoteOnly);
  };

  const handleRegionClick = (preset: { label: string; location: string; remote: boolean }) => {
    setLocation(preset.location);
    setRemoteOnly(preset.remote);
    fetchJobs(query, preset.location, preset.remote);
  };

  const handleSaveJob = async (job: JobSearchResult) => {
    setSavingJobId(job.id);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('saved_jobs')
        .insert({
          user_id: user.id,
          job_title: job.title,
          company: job.company,
          location: job.location,
          job_type: job.type || null,
          description_snippet: job.description || null,
          apply_url: job.url || null,
          salary: job.salary || null,
          source: job.source || provider,
        })
        .select()
        .single();

      if (!error && data) {
        setSavedJobs((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save job:', err);
    } finally {
      setSavingJobId(null);
    }
  };

  const isJobSaved = (jobTitle: string, company: string) => {
    return savedJobs.some(
      (j) =>
        j.job_title.toLowerCase() === jobTitle.toLowerCase() &&
        j.company.toLowerCase() === company.toLowerCase()
    );
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e2ded7]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#262a2a] font-serif flex items-center gap-2">
              <Globe className="h-6 w-6 text-[#ca9881]" />
              Live Online World Job Search
            </h1>
            <p className="text-sm text-[#5c6463] mt-1">
              Search real-time worldwide career opportunities with verified direct employer links. No fabricated listings.
            </p>
          </div>

          <div className="flex rounded-full bg-[#eae5df] p-1 border border-[#e2ded7]">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                activeTab === 'search'
                  ? 'bg-white text-[#ca9881] shadow-xs'
                  : 'text-[#5c6463] hover:text-[#262a2a]'
              }`}
            >
              Search Openings ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                activeTab === 'saved'
                  ? 'bg-white text-[#ca9881] shadow-xs'
                  : 'text-[#5c6463] hover:text-[#262a2a]'
              }`}
            >
              Saved Jobs ({savedJobs.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Search */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Filters Card */}
            <Card className="border-[#e2ded7] bg-white shadow-xs">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-[#5c6463]" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Job title, skill, or keyword (e.g. React, Python, AI)"
                        className="pl-9"
                      />
                    </div>

                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#5c6463]" />
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City or Region (e.g. Worldwide, USA, London)"
                        className="pl-9"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-medium text-[#262a2a] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={remoteOnly}
                          onChange={(e) => setRemoteOnly(e.target.checked)}
                          className="h-4 w-4 rounded border-[#dcd7cf] text-[#ca9881] focus:ring-[#ca9881]"
                        />
                        Remote roles only
                      </label>

                      <Button type="submit" isLoading={loading} className="ml-auto">
                        <Search className="h-4 w-4 mr-1.5" />
                        Search Live Jobs
                      </Button>
                    </div>
                  </div>

                  {/* Preset Regions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-[#5c6463] mr-1 flex items-center gap-1">
                      <Filter className="h-3 w-3" /> Regions:
                    </span>
                    {REGION_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleRegionClick(preset)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          location === preset.location && remoteOnly === preset.remote
                            ? 'bg-[#ca9881] text-white border-[#ca9881] shadow-xs'
                            : 'bg-[#f7f5f2] border-[#e2ded7] text-[#5c6463] hover:bg-[#eae5df]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Preset Popular Keywords */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold text-[#5c6463] mr-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Popular:
                    </span>
                    {POPULAR_KEYWORDS.map((kw, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleKeywordClick(kw)}
                        className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                          query.toLowerCase() === kw.toLowerCase()
                            ? 'bg-[#f5ece7] border-[#ebdcd4] text-[#9e5e43] font-semibold'
                            : 'border-[#e2ded7] text-[#5c6463] hover:text-[#262a2a] hover:border-[#ca9881]'
                        }`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* WORLD JOB SEARCH ENGINES HUB */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-[#ca9881]" />
                  <h2 className="text-sm font-bold text-[#262a2a] font-serif uppercase tracking-wider">
                    Global Online World Jobs Links (1-Click Portals)
                  </h2>
                </div>
                <span className="text-xs text-[#5c6463] hidden sm:inline">
                  Direct search links tailored to &ldquo;{query || 'Software Engineer'}&rdquo;
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {worldLinks.map((portal) => (
                  <a
                    key={portal.id}
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-3 rounded-2xl bg-white border border-[#e2ded7] hover:border-[#ca9881] hover:shadow-md transition-all flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-xs text-[#262a2a] group-hover:text-[#ca9881] transition-colors flex items-center gap-1.5">
                        <span>{portal.name}</span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-[#5c6463] group-hover:text-[#ca9881] transition-colors" />
                    </div>
                    <p className="text-[11px] text-[#5c6463] line-clamp-2 leading-relaxed">
                      {portal.description}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      <span className="px-2 py-0.5 rounded-full bg-[#f5ece7] text-[#ca9881] font-medium">
                        {portal.tag}
                      </span>
                      <span className="text-[#ca9881] font-medium group-hover:underline">
                        Open Portal &rarr;
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Provider Notice if unconfigured */}
            {!isConfigured && providerMessage && (
              <Alert variant="warning" title="Job API Notice">
                <p>{providerMessage}</p>
              </Alert>
            )}

            {/* Search Results Loading */}
            {loading && (
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-3" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
                  <div className="h-16 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </Card>
                <Card className="p-6">
                  <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-3" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
                  <div className="h-16 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </Card>
              </div>
            )}

            {/* Empty State */}
            {!loading && searched && jobs.length === 0 && (
              <EmptyState
                icon={Briefcase}
                title="No direct feed matches found for this keyword"
                description="Try clicking one of the World Job Links above (LinkedIn, Google Jobs, Indeed) or search for broader keywords like 'Developer', 'Engineer', or 'Designer'."
                actionLabel="Reset to Worldwide Developer Roles"
                onAction={() => {
                  setQuery('Developer');
                  setLocation('');
                  setRemoteOnly(false);
                  fetchJobs('Developer', '', false);
                }}
              />
            )}

            {/* Results Grid */}
            {!loading && jobs.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-[#f5ece7] border border-[#ebdcd4] text-xs text-[#5c6463]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-[#ca9881] animate-pulse"></span>
                    <span className="font-semibold text-[#262a2a]">
                      {jobs.length} Verified Live Job Postings Found
                    </span>
                    {activeSources.length > 0 && (
                      <span className="text-[#5c6463] text-[11px] hidden md:inline">
                        (Aggregated across {activeSources.join(', ')})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 100% Verified Employer Links
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {jobs.map((job) => {
                    const saved = isJobSaved(job.title, job.company);

                    return (
                      <Card
                        key={job.id}
                        className="hover:border-[#ca9881] hover:shadow-md transition-all bg-white border-[#e2ded7]"
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-[#262a2a] font-serif">
                                  {job.title}
                                </h3>
                                {job.source && (
                                  <Badge variant="outline" className="text-[10px] border-[#ebdcd4] text-[#9e5e43] bg-[#f5ece7]">
                                    {job.source}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-[#5c6463]">
                                <span className="flex items-center gap-1 font-semibold text-[#262a2a]">
                                  <Building className="h-3.5 w-3.5 text-[#5c6463]" />
                                  {job.company}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-[#5c6463]" />
                                  {job.location}
                                </span>
                                {job.type && (
                                  <span className="flex items-center gap-1 text-[#5c6463]">
                                    <Briefcase className="h-3.5 w-3.5 text-[#5c6463]" />
                                    {job.type}
                                  </span>
                                )}
                                {job.salary && (
                                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    {job.salary}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant={saved ? 'secondary' : 'outline'}
                                size="sm"
                                disabled={saved || savingJobId === job.id}
                                onClick={() => handleSaveJob(job)}
                                className="text-xs"
                              >
                                {saved ? (
                                  <>
                                    <BookmarkCheck className="h-4 w-4 mr-1 text-[#ca9881]" /> Saved
                                  </>
                                ) : (
                                  <>
                                    <Bookmark className="h-4 w-4 mr-1" /> Save
                                  </>
                                )}
                              </Button>

                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" className="text-xs">
                                  Apply Now <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                </Button>
                              </a>
                            </div>
                          </div>

                          {job.description && (
                            <p className="mt-3 text-xs text-[#5c6463] line-clamp-3 leading-relaxed">
                              {job.description}
                            </p>
                          )}

                          {job.tags && job.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {job.tags.slice(0, 6).map((t, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px]">
                                  {t}
                                </Badge>
                              ))}
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
        )}

        {/* Tab 2: Saved Jobs */}
        {activeTab === 'saved' && (
          <div className="space-y-4">
            {savedJobs.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No saved jobs yet"
                description="Search live job opportunities across the world and click 'Save' on roles you are interested in applying for."
                actionLabel="Search Worldwide Jobs"
                onAction={() => setActiveTab('search')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedJobs.map((job) => (
                  <Card key={job.id} className="flex flex-col justify-between border-[#e2ded7] bg-white">
                    <CardHeader>
                      <CardTitle className="text-base font-serif">{job.job_title}</CardTitle>
                      <CardDescription className="text-[#5c6463]">
                        {job.company} • {job.location || 'Remote'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {job.description_snippet && (
                        <p className="text-xs text-[#5c6463] line-clamp-3 leading-relaxed">
                          {job.description_snippet}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-[#e2ded7] text-xs">
                        <span className="text-[#5c6463]">Saved {formatDate(job.created_at)}</span>
                        {job.apply_url && (
                          <a
                            href={job.apply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#ca9881] font-semibold hover:underline inline-flex items-center"
                          >
                            Apply Directly <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

