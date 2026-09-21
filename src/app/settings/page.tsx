'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  Settings,
  ShieldCheck,
  LogOut,
  Lock,
  User,
  Volume2,
  Mic,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Preferences
  const [aiVoiceAutoPlay, setAiVoiceAutoPlay] = useState(true);
  const [speechToTextEnabled, setSpeechToTextEnabled] = useState(true);
  const [prefSaved, setPrefSaved] = useState(false);

  useEffect(() => {
    async function loadAuthInfo() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || null);
          if (user.created_at) {
            const date = new Date(user.created_at);
            setCreatedAt(date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }));
          }
        }

        // Load saved preferences
        if (typeof window !== 'undefined') {
          const savedVoice = localStorage.getItem('pref_ai_voice');
          if (savedVoice !== null) setAiVoiceAutoPlay(savedVoice === 'true');

          const savedSTT = localStorage.getItem('pref_speech_recognition');
          if (savedSTT !== null) setSpeechToTextEnabled(savedSTT === 'true');
        }
      } finally {
        setLoading(false);
      }
    }

    loadAuthInfo();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setUpdatingPassword(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update password.',
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleToggleVoice = (checked: boolean) => {
    setAiVoiceAutoPlay(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pref_ai_voice', String(checked));
    }
    showPrefSavedNotice();
  };

  const handleToggleSTT = (checked: boolean) => {
    setSpeechToTextEnabled(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pref_speech_recognition', String(checked));
    }
    showPrefSavedNotice();
  };

  const showPrefSavedNotice = () => {
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2500);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e2ded7]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#262a2a] font-serif flex items-center gap-2">
              <Settings className="h-6 w-6 text-[#ca9881]" />
              Account Settings
            </h1>
            <p className="text-sm text-[#5c6463] mt-1">
              Manage your account profile, interview preferences, and login security.
            </p>
          </div>
        </div>

        {/* Account Details Card */}
        <Card className="border-[#e2ded7] bg-white">
          <CardHeader>
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <User className="h-4 w-4 text-[#ca9881]" />
              Account Overview
            </CardTitle>
            <CardDescription className="text-[#5c6463]">Your registered login and profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-[#e2ded7] bg-[#f7f5f2]">
                <span className="text-[#5c6463] block mb-1">Email Address</span>
                <span className="font-semibold text-sm text-[#262a2a]">
                  {userEmail || (loading ? 'Loading...' : 'Not signed in')}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-[#e2ded7] bg-[#f7f5f2] flex items-center justify-between">
                <div>
                  <span className="text-[#5c6463] block mb-1">Account Status</span>
                  <span className="font-semibold text-sm text-[#262a2a]">
                    Active Member
                  </span>
                </div>
                {createdAt && (
                  <span className="text-[11px] text-[#5c6463]">
                    Joined {createdAt}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#e2ded7]">
              <Link href="/profile">
                <Button variant="outline" size="sm" className="text-xs">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  Edit Career Profile & Skills <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign Out of Current Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Mock Interview & Audio Preferences */}
        <Card className="border-[#e2ded7] bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-serif flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#ca9881]" />
                Interview & Audio Preferences
              </CardTitle>
              {prefSaved && (
                <span className="text-xs text-emerald-700 flex items-center gap-1 animate-fade-in font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
            <CardDescription className="text-[#5c6463]">
              Customize your default live mock interview simulation settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Auto-play AI Voice */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e2ded7] bg-[#f7f5f2]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#f5ece7] text-[#ca9881]">
                  <Volume2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-[#262a2a] text-xs">
                    AI Voice Out Loud
                  </div>
                  <div className="text-[#5c6463] text-[11px]">
                    Automatically read interview questions aloud when they appear
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiVoiceAutoPlay}
                  onChange={(e) => handleToggleVoice(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#eae5df] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#dcd7cf] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ca9881]"></div>
              </label>
            </div>

            {/* Speech to Text live transcription */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e2ded7] bg-[#f7f5f2]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#f5ece7] text-[#ca9881]">
                  <Mic className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-[#262a2a] text-xs">
                    Microphone Voice Transcription
                  </div>
                  <div className="text-[#5c6463] text-[11px]">
                    Auto-transcribe your spoken voice answers in real-time
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={speechToTextEnabled}
                  onChange={(e) => handleToggleSTT(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#eae5df] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#dcd7cf] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ca9881]"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Password Management */}
        <Card className="border-[#e2ded7] bg-white">
          <CardHeader>
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#ca9881]" />
              Change Password
            </CardTitle>
            <CardDescription className="text-[#5c6463]">Update your authentication password</CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdatePassword}>
            <CardContent className="space-y-4">
              {passwordMsg && (
                <Alert variant={passwordMsg.type === 'success' ? 'success' : 'destructive'}>
                  {passwordMsg.text}
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#262a2a]">
                    New Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#262a2a]">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-0">
              <Button type="submit" size="sm" isLoading={updatingPassword}>
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}

