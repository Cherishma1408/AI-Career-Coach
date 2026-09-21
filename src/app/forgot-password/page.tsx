'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/settings`,
      });

      if (resetErr) {
        setError(resetErr.message);
        setLoading(false);
        return;
      }

      setSuccess('If an account exists for that email, a password reset link has been dispatched.');
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-[#262a2a] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
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

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="border-[#e2ded7] bg-white shadow-xs">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-serif">Reset your password</CardTitle>
            <CardDescription className="text-[#5c6463]">
              Enter the email associated with your account to receive a reset link
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleReset}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" title="Error">
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" title="Link Sent">
                  {success}
                </Alert>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#262a2a]">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full" isLoading={loading}>
                Send Reset Link
              </Button>

              <div className="text-center text-sm text-[#5c6463]">
                <Link href="/login" className="inline-flex items-center text-[#ca9881] font-medium hover:underline">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
