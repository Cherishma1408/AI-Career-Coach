import { NextRequest, NextResponse } from 'next/server';
import { JobSearchResult, WorldJobPortalLink } from '@/types/database';

export const runtime = 'nodejs';

function cleanHtmlText(str: string): string {
  if (!str) return '';
  return str
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#32;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateWorldJobLinks(query: string, location: string): WorldJobPortalLink[] {
  const cleanQ = query.trim() || 'Software Engineer';
  const cleanLoc = location.trim();
  const fullSearch = cleanLoc ? `${cleanQ} ${cleanLoc}` : cleanQ;

  return [
    {
      id: 'linkedin',
      name: 'LinkedIn Jobs Worldwide',
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(cleanQ)}${cleanLoc ? `&location=${encodeURIComponent(cleanLoc)}` : '&location=Worldwide'}`,
      description: 'Search 20M+ active global openings with direct employer applications',
      tag: 'Global #1',
    },
    {
      id: 'google-jobs',
      name: 'Google Jobs Engine',
      url: `https://www.google.com/search?q=${encodeURIComponent(`${fullSearch} jobs`)}&ibp=htl;jobs`,
      description: 'Directly aggregates verified openings across every employer career site globally',
      tag: 'Multi-Source',
    },
    {
      id: 'indeed',
      name: 'Indeed Worldwide',
      url: `https://www.indeed.com/jobs?q=${encodeURIComponent(cleanQ)}${cleanLoc ? `&l=${encodeURIComponent(cleanLoc)}` : ''}`,
      description: 'Comprehensive global job database for corporate, tech, and enterprise roles',
      tag: 'Worldwide',
    },
    {
      id: 'wellfound',
      name: 'Wellfound (AngelList)',
      url: `https://wellfound.com/jobs?role=${encodeURIComponent(cleanQ)}`,
      description: 'Explore top startup roles, early-stage ventures, equity options & transparent salaries',
      tag: 'Startups & Tech',
    },
    {
      id: 'remoteok',
      name: 'RemoteOK',
      url: `https://remoteok.com/remote-${encodeURIComponent(cleanQ.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}-jobs`,
      description: 'Worldwide remote tech, product, design, and engineering positions',
      tag: '100% Remote',
    },
    {
      id: 'glassdoor',
      name: 'Glassdoor Jobs',
      url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(cleanQ)}${cleanLoc ? `&locKeyword=${encodeURIComponent(cleanLoc)}` : ''}`,
      description: 'Search jobs alongside verified salaries and authentic workplace reviews',
      tag: 'Verified Reviews',
    },
    {
      id: 'dice',
      name: 'Dice Tech Careers',
      url: `https://www.dice.com/jobs?q=${encodeURIComponent(cleanQ)}${cleanLoc ? `&location=${encodeURIComponent(cleanLoc)}` : ''}`,
      description: 'Dedicated high-growth technology, security, and developer job market',
      tag: 'Tech Exclusive',
    },
  ];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const location = searchParams.get('location') || '';
    const isRemote = searchParams.get('remote') === 'true';

    const cleanQuery = query.toLowerCase().trim();
    const cleanLocation = location.toLowerCase().trim();

    const adzunaAppId = process.env.ADZUNA_APP_ID;
    const adzunaAppKey = process.env.ADZUNA_APP_KEY;
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    const allJobs: JobSearchResult[] = [];
    const activeSources: string[] = [];

    // Helper: matches job search criteria
    const matchesFilter = (
      title: string,
      desc: string,
      jobLoc: string,
      tags: string[] = [],
      remoteFlag = false
    ) => {
      // Query filter
      if (cleanQuery) {
        const textToSearch = `${title} ${desc} ${tags.join(' ')}`.toLowerCase();
        // Check if all words or whole phrase is present
        const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);
        const matchesQuery = queryTerms.some((term) => textToSearch.includes(term));
        if (!matchesQuery) return false;
      }

      // Location filter
      if (cleanLocation) {
        const locText = `${jobLoc}`.toLowerCase();
        const matchesLoc =
          locText.includes(cleanLocation) ||
          (cleanLocation === 'remote' && (locText.includes('remote') || remoteFlag || locText.includes('worldwide') || locText.includes('anywhere')));
        if (!matchesLoc) return false;
      }

      // Remote toggle
      if (isRemote) {
        const locLower = jobLoc.toLowerCase();
        const isActuallyRemote =
          remoteFlag ||
          locLower.includes('remote') ||
          locLower.includes('anywhere') ||
          locLower.includes('worldwide');
        if (!isActuallyRemote) return false;
      }

      return true;
    };

    // 1. Fetch from Remotive API (Global remote/worldwide jobs)
    const fetchRemotive = async () => {
      try {
        const remotiveUrl = cleanQuery
          ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(cleanQuery)}&limit=40`
          : 'https://remotive.com/api/remote-jobs?limit=40';

        const res = await fetch(remotiveUrl, {
          headers: { 'User-Agent': 'AICareerCoach/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          const remotiveJobs = (data.jobs || []).map((item: any) => ({
            id: `remotive-${item.id}`,
            title: item.title,
            company: item.company_name,
            location: item.candidate_required_location || 'Worldwide (Remote)',
            type: item.job_type ? item.job_type.replace('_', ' ') : 'Full-time',
            url: item.url,
            description: cleanHtmlText(item.description || '').slice(0, 300) + '...',
            salary: item.salary || undefined,
            posted_at: item.publication_date,
            tags: item.tags || ['Remote', item.category || 'Tech'],
            source: 'Remotive Global',
          }));

          const filtered = remotiveJobs.filter((j: any) =>
            matchesFilter(j.title, j.description, j.location, j.tags, true)
          );

          if (filtered.length > 0) {
            activeSources.push('Remotive Global');
            allJobs.push(...filtered);
          }
        }
      } catch (err) {
        console.warn('Remotive fetch error:', err);
      }
    };

    // 2. Fetch from Jobicy Worldwide API
    const fetchJobicy = async () => {
      try {
        const jobicyUrl = cleanQuery
          ? `https://jobicy.com/api/v2/remote-jobs?count=40&tag=${encodeURIComponent(cleanQuery)}`
          : 'https://jobicy.com/api/v2/remote-jobs?count=40';

        const res = await fetch(jobicyUrl, {
          headers: { 'User-Agent': 'AICareerCoach/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          const jobicyJobs = (data.jobs || []).map((item: any) => ({
            id: `jobicy-${item.id}`,
            title: item.jobTitle,
            company: item.companyName,
            location: item.jobGeo || 'Worldwide (Remote)',
            type: item.jobType ? item.jobType.join(', ') : 'Full-time',
            url: item.url,
            description: cleanHtmlText(item.jobExcerpt || item.jobDescription || '').slice(0, 300) + '...',
            salary:
              item.annualSalaryMin && item.annualSalaryMax
                ? `${item.salaryCurrency || '$'}${item.annualSalaryMin.toLocaleString()} - ${item.annualSalaryMax.toLocaleString()}`
                : undefined,
            posted_at: item.pubDate,
            tags: [item.jobIndustry, item.jobLevel, 'Remote'].filter(Boolean),
            source: 'Jobicy Worldwide',
          }));

          const filtered = jobicyJobs.filter((j: any) =>
            matchesFilter(j.title, j.description, j.location, j.tags, true)
          );

          if (filtered.length > 0) {
            activeSources.push('Jobicy Worldwide');
            allJobs.push(...filtered);
          }
        }
      } catch (err) {
        console.warn('Jobicy fetch error:', err);
      }
    };

    // 3. Fetch from Himalayas Remote Jobs API
    const fetchHimalayas = async () => {
      try {
        const res = await fetch('https://himalayas.app/jobs/api?limit=50', {
          headers: { 'User-Agent': 'AICareerCoach/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          const himalayasJobs = (data.jobs || []).map((item: any) => ({
            id: `himalayas-${item.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.companyName?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            title: item.title,
            company: item.companyName,
            location: item.location || 'Remote (Worldwide)',
            type: item.employmentType || 'Full-time',
            url: item.applicationLink || `https://himalayas.app/jobs`,
            description: cleanHtmlText(item.excerpt || item.description || '').slice(0, 300) + '...',
            salary:
              item.minSalary && item.maxSalary
                ? `${item.salaryCurrency || '$'}${item.minSalary.toLocaleString()} - ${item.maxSalary.toLocaleString()}`
                : undefined,
            posted_at: item.pubDate,
            tags: item.categories || ['Technology', 'Remote'],
            source: 'Himalayas Global',
          }));

          const filtered = himalayasJobs.filter((j: any) =>
            matchesFilter(j.title, j.description, j.location, j.tags, true)
          );

          if (filtered.length > 0) {
            activeSources.push('Himalayas Global');
            allJobs.push(...filtered);
          }
        }
      } catch (err) {
        console.warn('Himalayas fetch error:', err);
      }
    };

    // 4. Fetch from Arbeitnow Live API
    const fetchArbeitnow = async () => {
      try {
        const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
          headers: { 'User-Agent': 'AICareerCoach/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          const rawJobs = data.data || [];

          const arbeitnowJobs = rawJobs.map((item: any) => ({
            id: `arbeitnow-${item.slug || crypto.randomUUID()}`,
            title: item.title,
            company: item.company_name,
            location: item.location || (item.remote ? 'Remote' : 'Various'),
            type: item.job_types?.join(', ') || 'Full-time',
            url: item.url,
            description: cleanHtmlText(item.description || '').slice(0, 300) + '...',
            posted_at: item.created_at ? new Date(item.created_at * 1000).toISOString() : undefined,
            tags: [...(item.tags || []), item.remote ? 'Remote' : null].filter(Boolean) as string[],
            source: 'Arbeitnow Live',
          }));

          const filtered = arbeitnowJobs.filter((j: any) =>
            matchesFilter(j.title, j.description, j.location, j.tags, j.location?.toLowerCase().includes('remote'))
          );

          if (filtered.length > 0) {
            activeSources.push('Arbeitnow Live');
            allJobs.push(...filtered);
          }
        }
      } catch (err) {
        console.warn('Arbeitnow fetch error:', err);
      }
    };

    // 5. JSearch API (If RAPIDAPI_KEY is configured)
    const fetchJSearch = async () => {
      if (!rapidApiKey) return;
      try {
        const jSearchQuery = [query, location, isRemote ? 'remote' : ''].filter(Boolean).join(' ') || 'software engineer';
        const res = await fetch(
          `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(jSearchQuery)}&num_pages=1`,
          {
            headers: {
              'X-RapidAPI-Key': rapidApiKey,
              'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
            },
            signal: AbortSignal.timeout(7000),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const jJobs = (data.data || []).map((item: any) => ({
            id: `jsearch-${item.job_id || crypto.randomUUID()}`,
            title: item.job_title,
            company: item.employer_name,
            location: item.job_city ? `${item.job_city}, ${item.job_country || ''}` : item.job_country || 'Remote',
            type: item.job_employment_type || 'Full-time',
            url: item.job_apply_link || item.job_google_link,
            description: cleanHtmlText(item.job_description || '').slice(0, 300) + '...',
            salary: item.job_min_salary ? `$${item.job_min_salary} - $${item.job_max_salary}` : undefined,
            posted_at: item.job_posted_at_datetime_utc,
            tags: [item.job_employment_type, item.job_is_remote ? 'Remote' : null].filter(Boolean) as string[],
            source: 'JSearch Global',
          }));

          if (jJobs.length > 0) {
            activeSources.push('JSearch Global');
            allJobs.push(...jJobs);
          }
        }
      } catch (err) {
        console.warn('JSearch fetch error:', err);
      }
    };

    // 6. Adzuna API (If ADZUNA_APP_ID & KEY configured)
    const fetchAdzuna = async () => {
      if (!adzunaAppId || !adzunaAppKey) return;
      try {
        const term = encodeURIComponent(query || 'software');
        const loc = encodeURIComponent(location || '');
        const res = await fetch(
          `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${adzunaAppId}&app_key=${adzunaAppKey}&what=${term}&where=${loc}&results_per_page=20`,
          { signal: AbortSignal.timeout(7000) }
        );

        if (res.ok) {
          const data = await res.json();
          const aJobs = (data.results || []).map((item: any) => ({
            id: `adzuna-${item.id}`,
            title: cleanHtmlText(item.title || 'Job Position'),
            company: item.company?.display_name || 'Hiring Company',
            location: item.location?.display_name || 'Flexible',
            type: item.contract_type || 'Full-time',
            url: item.redirect_url,
            description: cleanHtmlText(item.description || '').slice(0, 300) + '...',
            salary: item.salary_min ? `$${Math.round(item.salary_min)} - $${Math.round(item.salary_max || item.salary_min)}` : undefined,
            posted_at: item.created,
            tags: [item.category?.label, item.contract_time].filter(Boolean) as string[],
            source: 'Adzuna API',
          }));

          if (aJobs.length > 0) {
            activeSources.push('Adzuna API');
            allJobs.push(...aJobs);
          }
        }
      } catch (err) {
        console.warn('Adzuna fetch error:', err);
      }
    };

    // Run all data providers in parallel
    await Promise.allSettled([
      fetchRemotive(),
      fetchJobicy(),
      fetchHimalayas(),
      fetchArbeitnow(),
      fetchJSearch(),
      fetchAdzuna(),
    ]);

    // Deduplicate jobs by matching Title + Company
    const seen = new Set<string>();
    const deduplicatedJobs: JobSearchResult[] = [];

    for (const job of allJobs) {
      const key = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicatedJobs.push(job);
      }
    }

    // Sort: most recent or richest details first
    deduplicatedJobs.sort((a, b) => {
      if (a.posted_at && b.posted_at) {
        return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
      }
      return (b.salary ? 1 : 0) - (a.salary ? 1 : 0);
    });

    // Generate Direct 1-Click Worldwide Search Portal Links
    const worldLinks = generateWorldJobLinks(query, location);

    const providerSummary =
      activeSources.length > 0
        ? `Aggregated Live Feeds (${activeSources.join(', ')})`
        : 'Global Job Aggregator';

    return NextResponse.json({
      success: true,
      provider: providerSummary,
      activeSources,
      isConfigured: true,
      count: deduplicatedJobs.length,
      jobs: deduplicatedJobs.slice(0, 60), // Up to 60 live listings per request
      worldLinks,
    });
  } catch (error: unknown) {
    console.error('Job search API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Job search failed' },
      { status: 500 }
    );
  }
}

