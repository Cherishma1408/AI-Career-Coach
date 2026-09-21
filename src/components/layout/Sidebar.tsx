'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  ScanSearch,
  Briefcase,
  Compass,
  Milestone,
  MessageSquare,
  History,
  UserCheck,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Resume Analyzer', href: '/resume-analyzer', icon: FileText },
  { label: 'Job Analyzer', href: '/job-analyzer', icon: ScanSearch },
  { label: 'Live Job Search', href: '/job-search', icon: Briefcase },
  { label: 'Skill Gap', href: '/skill-gap', icon: Compass },
  { label: 'Learning Roadmap', href: '/roadmap', icon: Milestone },
  { label: 'Mock Interview', href: '/mock-interview', icon: MessageSquare },
  { label: 'Interview History', href: '/interview-history', icon: History },
  { label: 'My Profile', href: '/profile', icon: UserCheck },
  { label: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed top-16 bottom-0 left-0 z-40 w-64 border-r border-[#e2ded7] bg-white overflow-y-auto transition-transform duration-200 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full py-4 px-3">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5c6463]/70 font-sans">
              Career Toolkit
            </p>
          </div>

          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[#f5ece7] text-[#9e5e43] font-semibold shadow-xs'
                      : 'text-[#5c6463] hover:bg-[#f7f5f2] hover:text-[#262a2a]'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[#ca9881]' : 'text-[#8c9493]')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
