'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { User, LogOut, Sparkles, Menu } from 'lucide-react';

interface NavbarProps {
  onMenuToggle?: () => void;
  showSidebarToggle?: boolean;
}

export function Navbar({ onMenuToggle, showSidebarToggle = false }: NavbarProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#e2ded7] bg-white/95 backdrop-blur-md shadow-xs">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {showSidebarToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg text-[#5c6463] hover:bg-[#eae5df]/60"
              aria-label="Toggle Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-[#262a2a]">
            <img
              src="/assets/logo-mark.png"
              alt="AI Career Coach"
              className="h-9 w-9 object-contain rounded-lg"
            />
            <span className="tracking-tight font-extrabold font-serif">
              AI Career <span className="text-[#ca9881]">Coach</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {!loading && (
            <>
              {userEmail ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#5c6463] hover:text-[#ca9881]">
                    <div className="h-7 w-7 rounded-full bg-[#f5ece7] border border-[#ebdcd4] flex items-center justify-center text-[#ca9881]">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="max-w-[140px] truncate">{userEmail}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-xs text-[#5c6463] hover:text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4 mr-1.5" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
