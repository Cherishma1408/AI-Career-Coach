'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Sparkles, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  const oauthError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    oauthError ? 'OAuth sign-in was not completed or failed.' : null
  );

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oAuthError) {
        throw oAuthError;
      }
    } catch (err: unknown) {
      console.error('Google OAuth error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Google authentication failed. Please verify that Google provider is enabled in your Supabase Auth settings.'
      );
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Sign in to your account</CardTitle>
        <CardDescription>
          Enter your email and password or continue with Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" title="Authentication Notice">
            {error}
          </Alert>
        )}

        {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            isLoading={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 h-11 border-[#dcd7cf] hover:bg-[#f7f5f2]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-semibold text-[#262a2a]">
              Continue with Google
            </span>
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-[#e2ded7]" />
            <span className="bg-white px-3 text-xs uppercase tracking-wider text-[#8c9493] font-semibold absolute">
              or with email
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#262a2a]">
                Email address
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || googleLoading}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#262a2a]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#ca9881] hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || googleLoading}
              />
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={loading}>
              Sign In <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-[#e2ded7] pt-4">
          <div className="text-center text-xs text-[#5c6463]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#ca9881] font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </CardFooter>
      </Card>
    );
  }

  export default function LoginPage() {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-[#262a2a]">
        <div className="w-full max-w-md mx-auto">
          <Link href="/" className="flex items-center justify-center gap-3 mb-6">
            <img
              src="/assets/logo-mark.png"
              alt="AI Career Coach"
              className="h-10 w-10 object-contain"
            />
            <span className="text-2xl font-bold tracking-tight text-[#262a2a] font-serif">
              AI Career Coach
            </span>
          </Link>
        </div>

        <div className="w-full max-w-md mx-auto">
          <Suspense fallback={<div className="p-8 text-center text-sm text-[#8c9493]">Loading sign in...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    );
  }
