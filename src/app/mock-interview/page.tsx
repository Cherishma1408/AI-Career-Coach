'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { parseApiResponse } from '@/lib/utils';
import {
  MessageSquare,
  Play,
  Send,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  History,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Bot,
  User,
  Radio,
  RefreshCw,
} from 'lucide-react';

interface QuestionState {
  id: string;
  questionNumber: number;
  questionText: string;
  category: string;
  totalQuestions: number;
}

interface EvaluationState {
  technical_accuracy_score: number;
  relevance_score: number;
  completeness_score: number;
  communication_score: number;
  problem_solving_score: number;
  feedback: string;
  areas_for_improvement: string[];
}

interface CompletedTurn {
  questionNumber: number;
  questionText: string;
  answerText: string;
  evaluation: EvaluationState;
}

interface FinalSummaryState {
  overall_score: number;
  feedback_summary: string;
  strengths: string[];
  improvements: string[];
}

export default function MockInterviewPage() {
  // Configuration inputs
  const [targetRole, setTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Entry-level');
  const [interviewType, setInterviewType] = useState('technical');
  const [numQuestions, setNumQuestions] = useState<number>(3);

  // Interview Session states
  const [stage, setStage] = useState<'config' | 'in_progress' | 'completed'>('config');
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [historyTurns, setHistoryTurns] = useState<CompletedTurn[]>([]);
  const [finalSummary, setFinalSummary] = useState<FinalSummaryState | null>(null);

  // Live Media & Audio states
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for media & speech
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef<string>('');

  // Load user profile defaults
  useEffect(() => {
    async function loadDefaults() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('career_goal, years_of_experience')
          .eq('id', user.id)
          .maybeSingle();

        if (prof?.career_goal) {
          setTargetRole(prof.career_goal);
        }
      }

      if (typeof window !== 'undefined') {
        const savedVoice = localStorage.getItem('pref_ai_voice');
        if (savedVoice !== null) setAiVoiceEnabled(savedVoice === 'true');

        const savedSTT = localStorage.getItem('pref_speech_recognition');
        if (savedSTT !== null) setMicEnabled(savedSTT === 'true');
      }
    }

    loadDefaults();
  }, []);

  // Timer while interview is in progress
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (stage === 'in_progress') {
      timer = setInterval(() => {
        setSessionSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      setSessionSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [stage]);

  // Format seconds to mm:ss
  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // AI Speech Synthesis (Speak question)
  const speakQuestion = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (!aiVoiceEnabled) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [aiVoiceEnabled]);

  // Speech Recognition (Candidate voice to text)
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }

        if (finalTranscript) {
          setUserAnswer((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalTranscript.trim()}` : finalTranscript.trim();
          });
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition notice:', event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
  }, []);

  // Initialize Media Camera Stream
  const initCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Webcam API is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraEnabled(true);
      setMicEnabled(true);
    } catch (err: any) {
      console.warn('Media access denied or unavailable:', err);
      setCameraError(
        'Camera/Mic permission was not granted or device not found. You can still speak via mic or type responses.'
      );
      setCameraEnabled(false);
    }
  }, []);

  // Cleanup media & speech on unmount or session end
  const stopAllMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    stopListening();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
    }
  }, [stopListening]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, [stopAllMedia]);

  // Handle stream assignment when video element mounts or camera changes
  useEffect(() => {
    if (stage === 'in_progress' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage, cameraEnabled]);

  // Toggle Camera Track
  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !cameraEnabled;
        videoTracks.forEach((t) => (t.enabled = nextState));
        setCameraEnabled(nextState);
      }
    } else if (!cameraEnabled) {
      initCamera();
    }
  };

  // Toggle Mic Track
  const toggleMic = () => {
    const nextState = !micEnabled;
    setMicEnabled(nextState);

    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = nextState));
    }

    if (nextState) {
      startListening();
    } else {
      stopListening();
    }
  };

  // Toggle AI voice
  const toggleAiVoice = () => {
    const nextState = !aiVoiceEnabled;
    setAiVoiceEnabled(nextState);
    if (!nextState && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
    } else if (nextState && currentQuestion) {
      speakQuestion(currentQuestion.questionText);
    }
  };

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      setError('Please specify a target role for your mock interview.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: targetRole.trim(),
          experienceLevel,
          interviewType,
          numQuestions,
        }),
      });

      const startResult = await parseApiResponse<any>(res);
      if (!startResult.ok) {
        throw new Error(startResult.error || 'Failed to start interview');
      }

      const data = startResult.data;
      setInterviewId(data.interviewId);
      setCurrentQuestion(data.question);
      setHistoryTurns([]);
      setFinalSummary(null);
      setUserAnswer('');
      setStage('in_progress');

      // Initialize Camera & Audio
      await initCamera();

      // Speak question and start speech recognition
      speakQuestion(data.question.questionText);
      setTimeout(() => {
        startListening();
      }, 800);
    } catch (err: unknown) {
      console.error('Start interview error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize mock interview.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userAnswer.trim()) {
      setError('Please provide or speak your response before submitting.');
      return;
    }

    if (!currentQuestion) return;

    setError(null);
    setLoading(true);

    // Stop speaking/listening during evaluation
    stopListening();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
    }

    try {
      const res = await fetch('/api/ai/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          questionId: currentQuestion.id,
          targetRole,
          experienceLevel,
          interviewType,
          currentQuestionNumber: currentQuestion.questionNumber,
          totalQuestions: currentQuestion.totalQuestions,
          questionText: currentQuestion.questionText,
          answerText: userAnswer.trim(),
          previousQAs: historyTurns.map((h) => ({
            question: h.questionText,
            answer: h.answerText,
          })),
        }),
      });

      const evalResult = await parseApiResponse<any>(res);
      if (!evalResult.ok) {
        throw new Error(evalResult.error || 'Evaluation failed');
      }

      const evalData = evalResult.data;

      // Record this turn in history
      const turnRecord: CompletedTurn = {
        questionNumber: currentQuestion.questionNumber,
        questionText: currentQuestion.questionText,
        answerText: userAnswer.trim(),
        evaluation: evalData.evaluation,
      };

      setHistoryTurns((prev) => [...prev, turnRecord]);
      setUserAnswer('');

      if (evalData.isFinished) {
        stopAllMedia();
        setFinalSummary(evalData.finalSummary);
        setStage('completed');
      } else if (evalData.nextQuestion) {
        const nextQ = {
          id: evalData.nextQuestion.id,
          questionNumber: evalData.nextQuestion.questionNumber,
          questionText: evalData.nextQuestion.questionText,
          category: evalData.nextQuestion.category,
          totalQuestions: currentQuestion.totalQuestions,
        };
        setCurrentQuestion(nextQ);

        // Voice speak the next question and resume listening
        speakQuestion(nextQ.questionText);
        setTimeout(() => {
          startListening();
        }, 1200);
      }
    } catch (err: unknown) {
      console.error('Answer submission error:', err);
      setError(err instanceof Error ? err.message : 'Error evaluating answer.');
      startListening();
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = () => {
    if (confirm('Are you sure you want to end this interview session?')) {
      stopAllMedia();
      setStage('config');
      setHistoryTurns([]);
      setFinalSummary(null);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e2ded7]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#262a2a] font-serif flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-[#ca9881]" />
              Live AI Mock Interview Room
            </h1>
            <p className="text-sm text-[#5c6463] mt-1">
              Realistic video conference interview with real-time voice recognition and AI evaluation.
            </p>
          </div>

          <Link href="/interview-history">
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-2" />
              Past Interviews
            </Button>
          </Link>
        </div>

        {error && (
          <Alert variant="destructive" title="Interview Notice">
            {error}
          </Alert>
        )}

        {/* Stage 1: Setup Configuration */}
        {stage === 'config' && (
          <Card className="border-[#e2ded7] bg-white">
            <CardHeader>
              <CardTitle className="text-base font-serif">Configure Your Mock Interview Session</CardTitle>
              <CardDescription className="text-[#5c6463]">
                Tailor questions to your target position, seniority level, and focus area. Your camera and microphone will activate once the interview starts.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleStartInterview}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#262a2a]">
                    Target Role
                  </label>
                  <Input
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Frontend Engineer, DevOps Engineer, Product Manager"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#262a2a]">
                      Seniority Level
                    </label>
                    <select
                      className="w-full h-10 px-3 rounded-xl border border-[#dcd7cf] bg-white text-[#262a2a] text-sm focus:outline-none focus:ring-2 focus:ring-[#ca9881]/30 focus:border-[#ca9881]"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                    >
                      <option value="Entry-level / New Grad">Entry-level / New Grad</option>
                      <option value="Mid-level (1-3 years)">Mid-level (1-3 years)</option>
                      <option value="Senior (4+ years)">Senior (4+ years)</option>
                      <option value="Lead / Staff">Lead / Staff</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#262a2a]">
                      Interview Format
                    </label>
                    <select
                      className="w-full h-10 px-3 rounded-xl border border-[#dcd7cf] bg-white text-[#262a2a] text-sm focus:outline-none focus:ring-2 focus:ring-[#ca9881]/30 focus:border-[#ca9881]"
                      value={interviewType}
                      onChange={(e) => setInterviewType(e.target.value)}
                    >
                      <option value="technical">Technical Fundamentals & Architecture</option>
                      <option value="behavioral">Behavioral (STAR Method)</option>
                      <option value="system_design">System Design & Problem Solving</option>
                      <option value="mixed">Comprehensive Mixed Interview</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#262a2a]">
                      Question Count
                    </label>
                    <select
                      className="w-full h-10 px-3 rounded-xl border border-[#dcd7cf] bg-white text-[#262a2a] text-sm focus:outline-none focus:ring-2 focus:ring-[#ca9881]/30 focus:border-[#ca9881]"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                    >
                      <option value={3}>Quick Session (3 Questions)</option>
                      <option value={5}>Standard Session (5 Questions)</option>
                      <option value={8}>Comprehensive (8 Questions)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f5ece7] border border-[#ebdcd4] space-y-2">
                  <div className="text-xs font-semibold text-[#262a2a] flex items-center gap-2">
                    <Camera className="h-4 w-4 text-[#ca9881]" />
                    Live Video & Audio Interview Mode
                  </div>
                  <p className="text-xs text-[#5c6463] leading-relaxed">
                    When you begin, your browser will prompt for camera and microphone access. The AI interviewer will speak each question out loud, and your spoken answers will be transcribed and evaluated in real time.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end pt-2">
                <Button type="submit" size="lg" isLoading={loading}>
                  <Play className="h-4 w-4 mr-2" />
                  Enter Live Interview Room
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Stage 2: Interview In Progress (Live Video Conference) */}
        {stage === 'in_progress' && currentQuestion && (
          <div className="space-y-6">
            {/* Top Meeting Bar */}
            <div className="p-3.5 px-5 rounded-2xl bg-[#262a2a] text-white flex flex-wrap items-center justify-between gap-3 shadow-lg border border-[#4e5958]/30">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold tracking-wider animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-red-500 inline-block"></span>
                  LIVE {formatTimer(sessionSeconds)}
                </div>
                <div className="text-xs text-stone-300 hidden sm:block">
                  <span className="text-white font-medium">{targetRole}</span> • {experienceLevel}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[#f5ece7] border-[#ca9881]/50 bg-[#ca9881]/20 text-xs">
                  Question {currentQuestion.questionNumber} of {currentQuestion.totalQuestions}
                </Badge>
                <div className="w-24 sm:w-36">
                  <Progress
                    value={currentQuestion.questionNumber - 1}
                    max={currentQuestion.totalQuestions}
                    className="bg-stone-800 h-2"
                    indicatorClassName="bg-[#ca9881]"
                  />
                </div>
              </div>
            </div>

            {cameraError && (
              <Alert variant="warning" title="Camera Access">
                {cameraError}
              </Alert>
            )}

            {/* Video Call Grid (AI Interviewer & Candidate Webcam) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tile 1: AI Interviewer */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-b from-[#262a2a] via-[#374241] to-[#262a2a] border border-[#4e5958]/30 shadow-lg flex flex-col items-center justify-center p-6 text-center group">
                {/* Background Tech Grid effect */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(202,152,129,0.15)_0,transparent_70%)] pointer-events-none" />

                {/* AI Persona Avatar */}
                <div className="relative mb-3">
                  <div
                    className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isAiSpeaking
                        ? 'bg-gradient-to-tr from-[#ca9881] to-[#b98871] ring-8 ring-[#ca9881]/30 shadow-[0_0_30px_rgba(202,152,129,0.5)] scale-105'
                        : 'bg-stone-800 ring-4 ring-stone-700/50'
                    }`}
                  >
                    <Bot className="h-12 w-12 text-white" />
                  </div>

                  {/* Dynamic Speaking Animation waves */}
                  {isAiSpeaking && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-stone-900/90 px-2 py-0.5 rounded-full border border-[#ca9881]/40">
                      <span className="h-2 w-1 bg-[#ca9881] animate-[bounce_1s_infinite_100ms] rounded-full" />
                      <span className="h-3 w-1 bg-[#ca9881] animate-[bounce_1s_infinite_200ms] rounded-full" />
                      <span className="h-4 w-1 bg-[#ca9881] animate-[bounce_1s_infinite_300ms] rounded-full" />
                      <span className="h-3 w-1 bg-[#ca9881] animate-[bounce_1s_infinite_400ms] rounded-full" />
                      <span className="h-2 w-1 bg-[#ca9881] animate-[bounce_1s_infinite_500ms] rounded-full" />
                    </div>
                  )}
                </div>

                <div className="z-10">
                  <h3 className="text-white font-semibold text-base flex items-center justify-center gap-1.5 font-serif">
                    AI Lead Interviewer
                    <Sparkles className="h-3.5 w-3.5 text-[#ca9881]" />
                  </h3>
                  <p className="text-xs text-stone-300 mt-0.5">
                    {isAiSpeaking ? 'Speaking question...' : 'Listening & observing your answer'}
                  </p>
                </div>

                {/* Top Badge */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900/80 backdrop-blur border border-stone-700 text-[11px] text-stone-300 font-medium">
                  <Bot className="h-3 w-3 text-[#ca9881]" />
                  Interviewer
                </div>

                {/* Replay voice button */}
                <button
                  type="button"
                  onClick={() => speakQuestion(currentQuestion.questionText)}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs flex items-center gap-1"
                  title="Re-read question"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="hidden sm:inline">Repeat</span>
                </button>
              </div>

              {/* Tile 2: Candidate Live Camera Feed */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-center">
                {cameraEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <div className="h-20 w-20 rounded-full bg-slate-800 flex items-center justify-center mb-2 text-slate-500">
                      <CameraOff className="h-10 w-10" />
                    </div>
                    <p className="text-sm font-medium text-slate-300">Camera is turned off</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click the camera button below to enable video
                    </p>
                  </div>
                )}

                {/* Top Badge: Name & Status */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur border border-slate-700 text-[11px] text-slate-300 font-medium">
                  <User className="h-3 w-3 text-emerald-400" />
                  You (Candidate)
                </div>

                {/* Mic Live Status Badge */}
                <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur border border-slate-700 text-[11px]">
                  {micEnabled && isListening ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      Mic Live (Transcribing)
                    </span>
                  ) : micEnabled ? (
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Mic className="h-3 w-3 text-slate-400" />
                      Mic Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400 font-medium">
                      <MicOff className="h-3 w-3" />
                      Mic Muted
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Video Call Controls Dock */}
            <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur shadow-md">
              <Button
                type="button"
                variant={micEnabled ? 'default' : 'destructive'}
                size="sm"
                onClick={toggleMic}
                className="rounded-full px-4 h-10 gap-2 text-xs font-semibold"
              >
                {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {micEnabled ? 'Mute Mic' : 'Unmute Mic'}
              </Button>

              <Button
                type="button"
                variant={cameraEnabled ? 'outline' : 'destructive'}
                size="sm"
                onClick={toggleCamera}
                className="rounded-full px-4 h-10 gap-2 text-xs font-semibold border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white"
              >
                {cameraEnabled ? <Camera className="h-4 w-4 text-slate-200" /> : <CameraOff className="h-4 w-4" />}
                {cameraEnabled ? 'Turn Off Cam' : 'Turn On Cam'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAiVoice}
                className="rounded-full px-4 h-10 gap-2 text-xs font-semibold border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-white"
                title={aiVoiceEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
              >
                {aiVoiceEnabled ? <Volume2 className="h-4 w-4 text-[#ca9881]" /> : <VolumeX className="h-4 w-4 text-stone-400" />}
                {aiVoiceEnabled ? 'AI Audio On' : 'AI Audio Muted'}
              </Button>

              <div className="h-6 w-px bg-stone-800 mx-1 hidden sm:block" />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEndCall}
                className="rounded-full px-3 h-10 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
              >
                <PhoneOff className="h-4 w-4" />
                <span className="hidden sm:inline">Leave Room</span>
              </Button>
            </div>

            {/* Current Question & Answer Input */}
            <Card className="border-[#e2ded7] shadow-md bg-white">
              <CardHeader className="pb-3 border-b border-[#e2ded7]">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="default" className="text-[11px] uppercase tracking-wider">
                    {currentQuestion.category}
                  </Badge>
                  <span className="text-xs text-[#5c6463]">
                    Speak your answer or edit below
                  </span>
                </div>
                <CardTitle className="text-xl leading-relaxed pt-2 text-[#262a2a] font-serif font-semibold">
                  &ldquo;{currentQuestion.questionText}&rdquo;
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleSubmitAnswer}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#262a2a] flex items-center gap-2">
                      <span>Your Response</span>
                      {isListening && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-normal">
                          <Radio className="h-3 w-3 animate-pulse" />
                          Listening to your microphone...
                        </span>
                      )}
                    </label>
                    {userAnswer && (
                      <button
                        type="button"
                        onClick={() => setUserAnswer('')}
                        className="text-[11px] text-[#5c6463] hover:text-[#262a2a] transition-colors"
                      >
                        Clear text
                      </button>
                    )}
                  </div>
                  <Textarea
                    rows={4}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Start speaking into your microphone — your words will automatically transcribe here. You can also edit or type manually before submitting..."
                    disabled={loading}
                    className="text-sm font-normal leading-relaxed border-[#dcd7cf]"
                    required
                  />
                  <div className="flex justify-between text-[11px] text-[#5c6463] pt-1">
                    <span>Evaluated across Technical Depth, Relevance, Clarity, and Problem Solving.</span>
                    <span>{userAnswer.length} characters</span>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-end pt-0 pb-4">
                  <Button type="submit" size="lg" isLoading={loading}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Answer & Next Question
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Previous Turn Evaluations */}
            {historyTurns.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-[#e2ded7]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#5c6463] font-serif">
                  Completed Questions & Coach Feedback ({historyTurns.length})
                </h3>

                <div className="space-y-4">
                  {historyTurns.map((turn, idx) => (
                    <Card key={idx} className="bg-white border-[#e2ded7]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between text-xs text-[#5c6463]">
                          <span className="font-semibold">Question #{turn.questionNumber}</span>
                        </div>
                        <p className="font-medium text-sm text-[#262a2a] mt-1 font-serif">
                          {turn.questionText}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#f7f5f2] border border-[#e2ded7]">
                          <span className="font-semibold text-[#5c6463] block mb-1 uppercase">YOUR ANSWER</span>
                          <p className="text-[#262a2a] italic">&ldquo;{turn.answerText}&rdquo;</p>
                        </div>

                        {/* 5-Dimension Score Badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
                          <div className="p-2 rounded-xl bg-[#f7f5f2] border border-[#e2ded7]">
                            <span className="block text-[10px] text-[#5c6463]">Accuracy</span>
                            <span className="font-bold text-[#262a2a]">
                              {turn.evaluation.technical_accuracy_score}/10
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-[#f7f5f2] border border-[#e2ded7]">
                            <span className="block text-[10px] text-[#5c6463]">Relevance</span>
                            <span className="font-bold text-[#262a2a]">
                              {turn.evaluation.relevance_score}/10
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-[#f7f5f2] border border-[#e2ded7]">
                            <span className="block text-[10px] text-[#5c6463]">Completeness</span>
                            <span className="font-bold text-[#262a2a]">
                              {turn.evaluation.completeness_score}/10
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-[#f7f5f2] border border-[#e2ded7]">
                            <span className="block text-[10px] text-[#5c6463]">Communication</span>
                            <span className="font-bold text-[#262a2a]">
                              {turn.evaluation.communication_score}/10
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-[#f7f5f2] border border-[#e2ded7] col-span-2 sm:col-span-1">
                            <span className="block text-[10px] text-[#5c6463]">Problem Solving</span>
                            <span className="font-bold text-[#262a2a]">
                              {turn.evaluation.problem_solving_score}/10
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#f5ece7] border border-[#ebdcd4] space-y-1">
                          <span className="font-semibold text-[#9e5e43]">Coach Feedback:</span>
                          <p className="text-[#262a2a]">{turn.evaluation.feedback}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage 3: Interview Completed Final Report */}
        {stage === 'completed' && finalSummary && (
          <div className="space-y-6">
            <Card className="border-[#e2ded7] bg-white shadow-md">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f5ece7] text-[#ca9881] mb-2 ring-8 ring-[#f5ece7]/60">
                  <Award className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold font-serif text-[#262a2a]">Interview Completed!</CardTitle>
                <CardDescription className="text-[#5c6463]">
                  Your complete session for {targetRole} ({experienceLevel})
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="inline-block p-4 rounded-2xl bg-[#f7f5f2] border border-[#e2ded7] shadow-xs">
                  <div className="text-xs font-semibold uppercase text-[#5c6463]">Final Overall Score</div>
                  <div className="text-5xl font-black text-[#ca9881] font-serif mt-1">
                    {finalSummary.overall_score}
                    <span className="text-xl font-normal text-[#5c6463]">/100</span>
                  </div>
                </div>

                <p className="text-sm text-[#5c6463] max-w-2xl mx-auto leading-relaxed">
                  {finalSummary.feedback_summary}
                </p>
              </CardContent>
            </Card>

            {/* Strengths and Improvements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" /> Key Strengths Observed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs">
                    {finalSummary.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span className="text-[#262a2a]">{str}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-5 w-5" /> Recommended Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs">
                    {finalSummary.improvements.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#f5ece7] border border-[#ebdcd4]">
                        <span className="text-[#ca9881] font-bold">!</span>
                        <span className="text-[#262a2a]">{imp}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setStage('config');
                  setHistoryTurns([]);
                  setFinalSummary(null);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Another Interview
              </Button>
              <Link href="/interview-history">
                <Button size="lg">
                  View Full History <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

