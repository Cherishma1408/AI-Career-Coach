'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface AppShellProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function AppShell({ children, requireAuth = true }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(requireAuth);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!requireAuth) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else {
        setIsAuthenticated(true);
      }
      setLoading(false);
    });
  }, [requireAuth, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex flex-col">
        <div className="h-16 border-b border-[#e2ded7] bg-white px-6 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex-1 flex p-6 gap-6 max-w-7xl mx-auto w-full">
          <Skeleton className="hidden lg:block w-64 h-[500px]" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-[#262a2a] flex flex-col">
      <Navbar
        showSidebarToggle={true}
        onMenuToggle={() => setSidebarOpen((prev) => !prev)}
      />

      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
