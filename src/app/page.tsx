'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import './landing.css';

interface NavFeature {
  id: string;
  label: string;
  headline1: string;
  headline2: string;
  subhead: string;
  ctaText: string;
  ctaHref: string;
}

const FEATURES: NavFeature[] = [
  {
    id: 'overview',
    label: 'Overview',
    headline1: 'AI Career Coach',
    headline2: 'Designed To Evolve',
    subhead:
      'Master your career transition with honest ATS resume scoring, personalized skill gap roadmaps, live camera & voice mock interviews, and real-time global job searches with zero mock data.',
    ctaText: 'Get Started Free',
    ctaHref: '/dashboard',
  },
  {
    id: 'resume-ai',
    label: 'Resume AI',
    headline1: 'Resume Intelligence',
    headline2: 'Score Higher ATS',
    subhead:
      'Upload your PDF resume for instant ATS scoring, genuine strength and weakness breakdowns, and tailored keyword recommendations for target roles.',
    ctaText: 'Analyze Resume',
    ctaHref: '/resume-analyzer',
  },
  {
    id: 'skill-gap',
    label: 'Skill Gap',
    headline1: 'Skill Gap Analysis',
    headline2: 'Bridge Every Divide',
    subhead:
      'Compare your verified skills directly against real employer job standards and discover high-priority competencies required to level up.',
    ctaText: 'Find Skill Gaps',
    ctaHref: '/skill-gap',
  },
  {
    id: 'roadmap',
    label: 'Roadmaps',
    headline1: 'Career Roadmaps',
    headline2: 'Step-By-Step Growth',
    subhead:
      'Generate dynamic step-by-step learning roadmaps customized to your target role, timeline, and current skill baseline with milestone tracking.',
    ctaText: 'Generate Roadmap',
    ctaHref: '/roadmap',
  },
  {
    id: 'interview',
    label: 'AI Interview',
    headline1: 'Mock Interviews',
    headline2: 'Live Camera & Voice',
    subhead:
      'Practice in real-time simulations with active camera monitoring, voice input, and granular AI evaluation for behavioral and technical questions.',
    ctaText: 'Start AI Interview',
    ctaHref: '/mock-interview',
  },
  {
    id: 'jobs',
    label: 'Live Jobs',
    headline1: 'Live Job Feeds',
    headline2: 'Search The World',
    subhead:
      'Search and apply to verified global job opportunities sourced directly from live worldwide employment boards with zero mock data.',
    ctaText: 'Explore Live Jobs',
    ctaHref: '/job-search',
  },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');

  const currentFeature = FEATURES.find((f) => f.id === activeNav) || FEATURES[0];

  // Stats Count-Up Animation
  useEffect(() => {
    function easeOutCubic(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    const statItems = document.querySelectorAll('.stat-item');

    function animateStat(item: Element, index: number) {
      const target = parseFloat(item.getAttribute('data-target') || '0');
      const suffix = item.getAttribute('data-suffix') || '';
      const decimals = parseInt(item.getAttribute('data-decimals') || '0', 10);
      const valElem = item.querySelector('.stat-val');
      if (!valElem) return;
      const targetElem = valElem;

      const duration = 1500 + index * 80;
      const startDelay = 480 + index * 90;

      setTimeout(() => {
        let startTime: number | null = null;

        function step(timestamp: number) {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = easeOutCubic(progress);
          const current = eased * target;

          targetElem.textContent = current.toFixed(decimals) + suffix;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            targetElem.textContent = target.toFixed(decimals) + suffix;
          }
        }

        requestAnimationFrame(step);
      }, startDelay);
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            statItems.forEach((item, i) => animateStat(item, i));
            obs.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );

    const statsFooter = document.querySelector('.stats-footer');
    if (statsFooter) {
      observer.observe(statsFooter);
    } else {
      statItems.forEach((item, i) => animateStat(item, i));
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle escape key and resize for mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth > 720) setMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  }, [menuOpen]);

  return (
    <div className="intelligence-landing">
      {/* Full-viewport cover video */}
      <div className="bg">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Main Viewport Layout */}
      <div className="page">
        {/* 1) Header */}
        <header className="header">
          <Link href="/" className="logo-btn" aria-label="AI Career Coach Home">
            <img
              src="/assets/logo-mark.png"
              alt="AI Career Coach Logo"
              width={52}
              height={52}
              className="logo-img"
            />
          </Link>

          {/* Desktop Nav Pill */}
          <nav className="nav-pill" aria-label="Primary Navigation">
            {FEATURES.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveNav(item.id);
                }}
                className={`nav-link ${activeNav === item.id ? 'active' : ''}`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop Sign In */}
          <Link href="/login" className="sign-in-btn">Sign in</Link>

          {/* Mobile Hamburger Button */}
          <button
            className="mobile-burger"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="burger-bar"></span>
            <span className="burger-bar"></span>
            <span className="burger-bar"></span>
          </button>
        </header>

        {/* Mobile Menu Overlay & Sheet */}
        <div
          className="mobile-overlay"
          onClick={() => setMenuOpen(false)}
        ></div>
        <nav className="mobile-menu-sheet" aria-label="Mobile Navigation">
          {FEATURES.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveNav(item.id);
                setMenuOpen(false);
              }}
              className={`mobile-nav-link ${activeNav === item.id ? 'active' : ''}`}
            >
              {item.label}
            </a>
          ))}
          <Link href="/login" className="mobile-sign-in" onClick={() => setMenuOpen(false)}>Sign in</Link>
        </nav>

        {/* 2) Hero (Center) */}
        <main className="hero">
          {/* Trust row */}
          <div className="trust-row anim" style={{ '--d': '0.05s' } as React.CSSProperties}>
            <div className="avatar-group">
              <div className="avatar-ring a1">
                <div className="avatar-inner">
                  <i className="fa-brands fa-microsoft"></i>
                </div>
              </div>
              <div className="avatar-ring a2">
                <div className="avatar-inner">
                  <i className="fa-brands fa-amazon"></i>
                </div>
              </div>
              <div className="avatar-ring a3">
                <div className="avatar-inner">
                  <i className="fa-brands fa-google"></i>
                </div>
              </div>
            </div>
            <div className="trust-pill">
              Trusted by 10,000+ Job Seekers
            </div>
          </div>

          {/* Headline */}
          <h1 className="headline anim" key={currentFeature.id}>
            <span className="headline-line line-1">{currentFeature.headline1}</span>
            <span className="headline-line line-2">{currentFeature.headline2}</span>
          </h1>

          {/* Subhead */}
          <p
            className="subhead anim"
            key={`sub-${currentFeature.id}`}
            style={{ '--d': '0.28s' } as React.CSSProperties}
          >
            {currentFeature.subhead}
          </p>

          {/* CTA */}
          <Link
            href={currentFeature.ctaHref}
            className="cta-btn anim"
            key={`cta-${currentFeature.id}`}
            style={{ '--d': '0.4s' } as React.CSSProperties}
          >
            {currentFeature.ctaText}
          </Link>
        </main>

        {/* 3) Stats footer */}
        <footer className="stats-footer">
          <div
            className="stat-item anim"
            style={{ '--d': '0.5s' } as React.CSSProperties}
            data-target="98"
            data-suffix="%"
            data-decimals="0"
          >
            <span className="stat-icon">&lt;</span>
            <span className="stat-val">0%</span>
            <span className="stat-label">ATS Match Accuracy</span>
          </div>
          <div
            className="stat-item anim"
            style={{ '--d': '0.58s' } as React.CSSProperties}
            data-target="24"
            data-suffix="/7"
            data-decimals="0"
          >
            <span className="stat-icon">*</span>
            <span className="stat-val">0/7</span>
            <span className="stat-label">Live Voice &amp; Camera AI</span>
          </div>
          <div
            className="stat-item anim"
            style={{ '--d': '0.66s' } as React.CSSProperties}
            data-target="150"
            data-suffix="k+"
            data-decimals="0"
          >
            <span className="stat-icon">#</span>
            <span className="stat-val">0k+</span>
            <span className="stat-label">Verified Global Jobs</span>
          </div>
          <div
            className="stat-item anim"
            style={{ '--d': '0.74s' } as React.CSSProperties}
            data-target="100"
            data-suffix="%"
            data-decimals="0"
          >
            <span className="stat-icon">%</span>
            <span className="stat-val">0%</span>
            <span className="stat-label">Zero-Mock Guarantee</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

