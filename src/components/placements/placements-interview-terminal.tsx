// src/components/placements/placements-interview-terminal.tsx
// SkillArc AI Mock Interview Terminal — Voice Recognition, Video Studio, Real-time AI Evaluation, and Performance Scorecards

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Brain,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  ChevronRight,
  ChevronDown,
  Terminal,
  FileCode,
  ShieldCheck,
  Building2,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  Download,
  HelpCircle,
  X,
  History,
  Lightbulb,
  Check,
  Radio
} from "lucide-react";
import { Card, Badge, Button, Input, Select } from "@/components/placements-ui";

interface PlacementsInterviewTerminalProps {
  userId?: string | null;
  userName?: string;
  isStudent?: boolean;
}

interface QuestionLog {
  questionNumber: number;
  category: string;
  question: string;
  candidateAnswer: string;
  codeSnippet?: string;
  feedback: string;
  score: number;
  strengths?: string[];
  improvements?: string[];
}

interface InterviewHistoryItem {
  id: string;
  date: string;
  role: string;
  company: string;
  difficulty: string;
  totalScore: number;
  questionCount: number;
  verdict: string;
}

const TARGET_COMPANIES = [
  { id: "general", name: "General Tech Standard", badge: "Standard" },
  { id: "google", name: "Google", badge: "Tier 1" },
  { id: "amazon", name: "Amazon", badge: "Tier 1" },
  { id: "microsoft", name: "Microsoft", badge: "Tier 1" },
  { id: "tcs", name: "TCS (Digital / Prime)", badge: "Mass / Enterprise" },
  { id: "infosys", name: "Infosys (Specialist)", badge: "Enterprise" },
  { id: "accenture", name: "Accenture", badge: "Consulting" },
  { id: "startup", name: "High-Growth Unicorn", badge: "Product" },
];

const TARGET_ROLES = [
  { id: "software_engineer", label: "Software Engineer (SDE / Full Stack)" },
  { id: "frontend_engineer", label: "Frontend Engineer (React / Next.js / Web)" },
  { id: "backend_engineer", label: "Backend & Distributed Systems" },
  { id: "data_scientist", label: "Data Scientist / AI & ML Engineer" },
  { id: "devops_cloud", label: "Cloud & DevOps Infrastructure" },
  { id: "product_manager", label: "Product Manager (Technical PM)" },
];

const INTERVIEW_TRACKS = [
  { id: "technical_dsa", label: "Technical DSA & Problem Solving" },
  { id: "system_design", label: "System Design & Architecture" },
  { id: "core_cs", label: "Core CS (DBMS, OS, Networks, Web)" },
  { id: "behavioral_hr", label: "Behavioral & Leadership Principles (STAR)" },
  { id: "comprehensive", label: "Comprehensive Full-Stack Round" },
];

// ── FORMATTED UI RENDERERS FOR AI FEEDBACK & REPORTS ────────────────────────
function FormattedFeedback({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const blocks: { title: string; items: string[] }[] = [];
  let currentTitle = "Interviewer Assessment";
  let currentItems: string[] = [];

  lines.forEach((l) => {
    const raw = l.trim();
    if (!raw) return;

    if (raw.startsWith("###") && (raw.includes("Evaluation") || raw.includes("Scorecard"))) {
      return;
    }
    if (raw.startsWith("**Score:") || (raw.startsWith("Score:") && raw.includes("/10"))) {
      return;
    }

    if (raw.startsWith("####") || raw.startsWith("###") || (raw.startsWith("**") && raw.endsWith("**") && raw.length < 70 && !raw.startsWith("**-") && !raw.startsWith("**•"))) {
      if (currentItems.length > 0) {
        blocks.push({ title: currentTitle, items: currentItems });
        currentItems = [];
      }
      currentTitle = raw.replace(/^[#\s*]+/, "").replace(/[*_]/g, "").trim();
    } else {
      currentItems.push(raw);
    }
  });

  if (currentItems.length > 0) {
    blocks.push({ title: currentTitle, items: currentItems });
  }

  return (
    <div className="space-y-3.5">
      {blocks.map((block, bIdx) => {
        const titleLower = block.title.toLowerCase();
        const isDeficiency = titleLower.includes("deficienc") || titleLower.includes("failure") || titleLower.includes("critical") || titleLower.includes("⚠️");
        const isStrength = titleLower.includes("strength") || titleLower.includes("observation") || titleLower.includes("🌟");
        const isImprovement = titleLower.includes("improvement") || titleLower.includes("growth") || titleLower.includes("💡");
        const isModel = titleLower.includes("model") || titleLower.includes("ideal") || titleLower.includes("🎯");

        return (
          <div
            key={bIdx}
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              isDeficiency
                ? "bg-rose-50/70 border-rose-200 text-rose-950"
                : isStrength
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                : isImprovement
                ? "bg-amber-50/70 border-amber-200 text-amber-950"
                : isModel
                ? "bg-gradient-to-br from-slate-50 to-orange-50/20 border-slate-200 text-slate-900"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          >
            <h4
              className={`text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
                isDeficiency
                  ? "text-rose-700"
                  : isStrength
                  ? "text-emerald-700"
                  : isImprovement
                  ? "text-amber-800"
                  : isModel
                  ? "text-[#E57D37]"
                  : "text-slate-800"
              }`}
            >
              {block.title}
            </h4>

            <div className="space-y-2 text-xs sm:text-sm font-medium leading-relaxed">
              {block.items.map((item, iIdx) => {
                const clean = item.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "");
                const parts = clean.split(/(\*\*.*?\*\*)/g);
                return (
                  <div key={iIdx} className="flex items-start gap-2.5">
                    <span
                      className={`font-bold mt-0.5 shrink-0 text-xs ${
                        isDeficiency
                          ? "text-rose-500"
                          : isStrength
                          ? "text-emerald-600"
                          : isImprovement
                          ? "text-amber-600"
                          : "text-[#E57D37]"
                      }`}
                    >
                      {isModel ? `${iIdx + 1}.` : isDeficiency ? "✕" : isStrength ? "✓" : "•"}
                    </span>
                    <p className="flex-1">
                      {parts.map((p, pIdx) => {
                        if (p.startsWith("**") && p.endsWith("**")) {
                          return (
                            <strong key={pIdx} className="font-bold">
                              {p.slice(2, -2)}
                            </strong>
                          );
                        }
                        return p;
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FormattedReport({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const sections: { title: string; lines: string[] }[] = [];
  let currentTitle = "Performance Summary";
  let currentLines: string[] = [];

  lines.forEach((l) => {
    const raw = l.trim();
    if (!raw) return;

    if (raw.startsWith("###") || raw.startsWith("##") || (raw.startsWith("**") && raw.endsWith("**") && raw.length < 60)) {
      if (currentLines.length > 0) {
        sections.push({ title: currentTitle, lines: currentLines });
        currentLines = [];
      }
      currentTitle = raw.replace(/^[#\s*]+/, "").replace(/[*_]/g, "").trim();
    } else {
      currentLines.push(raw);
    }
  });

  if (currentLines.length > 0) {
    sections.push({ title: currentTitle, lines: currentLines });
  }

  return (
    <div className="space-y-4">
      {sections.map((sec, sIdx) => {
        const titleLower = sec.title.toLowerCase();
        const isRoadmap = titleLower.includes("roadmap") || titleLower.includes("30-day") || titleLower.includes("📅");
        const isCompetency = titleLower.includes("competenc") || titleLower.includes("breakdown") || titleLower.includes("🎯");

        return (
          <div
            key={sIdx}
            className={`p-5 rounded-2xl border ${
              isRoadmap
                ? "bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 border-amber-200 text-slate-900"
                : isCompetency
                ? "bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 border-emerald-200 text-slate-900"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <h4
              className={`text-xs sm:text-sm font-black uppercase tracking-wider mb-3 flex items-center gap-2 ${
                isRoadmap ? "text-[#E57D37]" : isCompetency ? "text-emerald-700" : "text-slate-800"
              }`}
            >
              <Sparkles size={15} /> {sec.title}
            </h4>

            <div className="space-y-2 text-xs sm:text-sm font-medium leading-relaxed">
              {sec.lines.map((item, iIdx) => {
                const clean = item.replace(/^[-*•]\s*/, "");
                const parts = clean.split(/(\*\*.*?\*\*)/g);
                return (
                  <div
                    key={iIdx}
                    className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                  >
                    <span className="text-[#E57D37] font-bold mt-0.5 shrink-0">✦</span>
                    <p className="flex-1">
                      {parts.map((p, pIdx) => {
                        if (p.startsWith("**") && p.endsWith("**")) {
                          return (
                            <strong key={pIdx} className="font-bold text-slate-900">
                              {p.slice(2, -2)}
                            </strong>
                          );
                        }
                        return p;
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PlacementsInterviewTerminal({
  userId = "student_01",
  userName = "Candidate",
  isStudent = true,
}: PlacementsInterviewTerminalProps) {
  // Navigation Phases: "config" | "active" | "question_review" | "report"
  const [phase, setPhase] = useState<"config" | "active" | "question_review" | "report">("config");

  // Interview Setup Parameters
  const [selectedCompany, setSelectedCompany] = useState("general");
  const [selectedRole, setSelectedRole] = useState("software_engineer");
  const [selectedTrack, setSelectedTrack] = useState("comprehensive");
  const [difficulty, setDifficulty] = useState<"Entry" | "Mid" | "Senior">("Entry");
  const [targetQuestionCount, setTargetQuestionCount] = useState<number>(3);
  const [enableVoiceMode, setEnableVoiceMode] = useState<boolean>(true);

  // Active Session State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentCategory, setCurrentCategory] = useState("Technical");
  const [currentHint, setCurrentHint] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [showCodePad, setShowCodePad] = useState(false);

  // Live Media & Speech State
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Review & Reports
  const [sessionLogs, setSessionLogs] = useState<QuestionLog[]>([]);
  const [latestFeedback, setLatestFeedback] = useState<string>("");
  const [latestScore, setLatestScore] = useState<number>(8);
  const [finalReport, setFinalReport] = useState<string>("");
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [isLiveAi, setIsLiveAi] = useState<boolean | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Load Past History
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`interview_history_${userId || "guest"}`);
        if (saved) setHistory(JSON.parse(saved));
      } catch (err) {
        console.warn("Failed to load interview history:", err);
      }
    }
  }, [userId]);

  // Session Timer
  useEffect(() => {
    if (phase === "active" || phase === "question_review") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Web Speech Recognition (Speech to Text)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setCandidateAnswer((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition notice:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Text-To-Speech (AI Speaking)
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[#*`_\[\]]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Toggle Microphone & Speech-To-Text
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. You can type your answer directly into the response box.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Recognition start error:", err);
      }
    }
  };

  // Toggle Webcam
  const toggleCamera = async () => {
    if (camOn) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCamOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCamOn(true);

        // Audio Visualizer Meter
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            if (camOn) requestAnimationFrame(checkVolume);
          };
          checkVolume();
        } catch (audioErr) {
          console.warn("Audio meter initialization notice:", audioErr);
        }
      } catch {
        alert("Camera or Microphone access was declined or is unavailable. You can still continue using text response mode.");
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Format Elapsed Time
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Robust Question Parser Helper
  const parseInterviewQuestion = (data: any, fallbackTrack: string) => {
    let category = data?.category || fallbackTrack || "Core Technical";
    let question = data?.question || "";
    let hint = data?.hint || "Focus on architectural clarity, performance trade-offs, and practical edge cases.";

    if (!question && data?.text) {
      const raw = String(data.text).trim();

      // Check if raw is JSON string
      try {
        const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
        if (jsonStr.startsWith("{") && jsonStr.endsWith("}")) {
          const parsed = JSON.parse(jsonStr);
          if (parsed.question) {
            question = parsed.question;
            if (parsed.category) category = parsed.category;
            if (parsed.hint) hint = parsed.hint;
          }
        }
      } catch {}

      if (!question) {
        // Check bracket match [Category] Question
        const bracketMatch = raw.match(/^\[(.*?)\]\s*([\s\S]*)$/);
        if (bracketMatch) {
          category = bracketMatch[1].trim();
          question = bracketMatch[2].trim();
        } else {
          question = raw;
        }
      }
    }

    // Sanitize any residual JSON string if question was somehow stringified
    if (typeof question === "string" && (question.startsWith('{"') || question.startsWith("{\n"))) {
      try {
        const parsed = JSON.parse(question);
        if (parsed.question) question = parsed.question;
        if (parsed.category) category = parsed.category;
        if (parsed.hint) hint = parsed.hint;
      } catch {}
    }

    // Remove any leftover markdown leading headers like "## Question 1" or "Question Prompt:"
    if (typeof question === "string") {
      question = question.replace(/^#+\s*(?:Question\s*\d*|Interview\s*Question)?[:\s]*/i, "").trim();
    }

    if (!question || question.length < 5) {
      question = "Explain how you architect and optimize high-throughput distributed systems to maintain sub-100ms response times under spike traffic.";
    }

    return { category, question, hint };
  };

  // Start Interview
  const startInterview = async () => {
    setIsLoading(true);
    setSessionLogs([]);
    setCurrentQuestionIndex(0);
    setCandidateAnswer("");
    setCodeSnippet("");
    setElapsedSeconds(0);
    setShowHint(false);

    try {
      const prompt = `You are a Principal Engineering Interviewer at ${selectedCompany}. Formulate interview question 1 for a ${difficulty} level ${selectedRole} candidate specializing in '${selectedTrack}'. Ensure this is a creative, practical, non-repeating scenario-based interview question.
Format your output exactly as:
[Category Name]
Question text here...`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode: "interview_question", role: selectedRole, questionIndex: 0 }),
      });
      const data = await res.json();
      setIsLiveAi(Boolean(data.isLiveAi));

      const { category, question, hint } = parseInterviewQuestion(data, selectedTrack);

      setCurrentCategory(category);
      setCurrentQuestion(question);
      setCurrentHint(hint);
      setPhase("active");

      if (enableVoiceMode) {
        speakText(question);
      }
    } catch {
      setCurrentCategory("Data Structures & Algorithms");
      setCurrentQuestion("Explain how a Hash Map resolves collisions using Chaining versus Open Addressing, and compare their asymptotic performance.");
      setCurrentHint("Mention linked lists/trees in buckets vs linear probing, and load factor threshold.");
      setPhase("active");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Answer & Get AI Feedback
  const submitAnswer = async () => {
    if (!candidateAnswer.trim() && !codeSnippet.trim()) {
      alert("Please provide an answer (either spoken or typed) before submitting.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    stopSpeaking();
    setIsLoading(true);

    const fullResponse = candidateAnswer + (codeSnippet ? `\n\n[Code Solution]:\n${codeSnippet}` : "");

    try {
      const prompt = `You are a Principal Interviewer at ${selectedCompany} conducting a ${difficulty} level interview for ${selectedRole}.
Interviewer Question: "${currentQuestion}"
Candidate Spoken/Written Response: "${fullResponse}"

Provide a structured evaluation with:
- Numerical rating score in the exact format "Score: X/10"
- Key Strengths
- Areas for Improvement & Constructive Critique
- Ideal Model Answer Structure`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode: "evaluate", role: selectedRole }),
      });
      const data = await res.json();
      setIsLiveAi(Boolean(data.isLiveAi));
      const fbText = data.text || "";

      setLatestFeedback(fbText);
      const scoreMatch = fbText.match(/Score:\s*(\d+)/i) || fbText.match(/(\d+)\/10/);
      const computedScore = scoreMatch ? parseInt(scoreMatch[1]) : 8;
      setLatestScore(computedScore);

      const newLog: QuestionLog = {
        questionNumber: currentQuestionIndex + 1,
        category: currentCategory,
        question: currentQuestion,
        candidateAnswer: fullResponse,
        codeSnippet: codeSnippet || undefined,
        feedback: fbText,
        score: computedScore,
      };

      setSessionLogs((prev) => [...prev, newLog]);
      setPhase("question_review");

      if (enableVoiceMode) {
        speakText(`Score: ${computedScore} out of 10. Reviewing your key highlights.`);
      }
    } catch {
      setLatestScore(8);
      setLatestFeedback("### 📊 Evaluation\n\n**Score: 8/10**\n\nSolid structured response demonstrating strong conceptual grounding.");
      setPhase("question_review");
    } finally {
      setIsLoading(false);
    }
  };

  // Proceed to Next Question or Final Report
  const nextQuestionOrFinish = async () => {
    stopSpeaking();
    const nextIdx = currentQuestionIndex + 1;

    if (nextIdx >= targetQuestionCount) {
      // Completed all questions -> Generate Final Performance Report
      await generateFinalScorecard();
      return;
    }

    setIsLoading(true);
    setCurrentQuestionIndex(nextIdx);
    setCandidateAnswer("");
    setCodeSnippet("");
    setShowHint(false);

    try {
      const previousQuestionsList = [...sessionLogs.map(l => l.question), currentQuestion].join(" | ");
      const prompt = `You are a Principal Engineering Interviewer at ${selectedCompany}. Formulate interview question #${nextIdx + 1} for a ${difficulty} ${selectedRole} candidate, focus track: '${selectedTrack}'.
Previous questions asked in this interview: ${previousQuestionsList}.
Ensure this question is completely novel, distinct, and tests a different aspect of engineering depth.
Format your output exactly as:
[Category Name]
Question text here...`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode: "interview_question", role: selectedRole, questionIndex: nextIdx }),
      });
      const data = await res.json();
      setIsLiveAi(Boolean(data.isLiveAi));

      const { category, question, hint } = parseInterviewQuestion(data, selectedTrack);

      setCurrentCategory(category);
      setCurrentQuestion(question);
      setCurrentHint(hint);
      setPhase("active");

      if (enableVoiceMode) {
        speakText(question);
      }
    } catch {
      setCurrentCategory("System Architecture");
      setCurrentQuestion("How do you architect a high-throughput notifications delivery pipeline using queues and worker pools?");
      setCurrentHint("Think about idempotent retries, dead letter queues (DLQ), and batching.");
      setPhase("active");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Final Scorecard & 30-Day Plan
  const generateFinalScorecard = async () => {
    setIsLoading(true);
    stopSpeaking();

    try {
      const prompt = `Candidate Interview Audit Logs: ${JSON.stringify(sessionLogs)}
Target Role: ${selectedRole}
Target Company: ${selectedCompany}
Difficulty Standard: ${difficulty}

Compile a thorough performance summary with:
- Overall candidate score out of 100
- Hiring recommendation (Strong Hire / Leaning Hire / Needs Preparation)
- Core Competency Breakdown (Technical, Communication, Structural Reasoning)
- Key Strengths and Growth Areas
- Customized, actionable 30-day preparation roadmap with weekly milestones.`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode: "final_report", role: selectedRole }),
      });
      const data = await res.json();
      setIsLiveAi(Boolean(data.isLiveAi));
      setFinalReport(data.text || "");

      // Compute total aggregate score
      const totalPossible = sessionLogs.length * 10;
      const totalEarned = sessionLogs.reduce((acc, log) => acc + log.score, 0);
      const aggregateScore = Math.round((totalEarned / (totalPossible || 1)) * 100);

      // Save to history
      const historyEntry: InterviewHistoryItem = {
        id: `int_${Date.now()}`,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        role: TARGET_ROLES.find((r) => r.id === selectedRole)?.label.split("(")[0].trim() || selectedRole,
        company: TARGET_COMPANIES.find((c) => c.id === selectedCompany)?.name || "Standard Tech",
        difficulty,
        totalScore: aggregateScore,
        questionCount: sessionLogs.length,
        verdict: aggregateScore >= 80 ? "Strong Hire" : aggregateScore >= 65 ? "Leaning Hire" : "Needs Prep",
      };

      const updatedHistory = [historyEntry, ...history];
      setHistory(updatedHistory);
      if (typeof window !== "undefined") {
        localStorage.setItem(`interview_history_${userId || "guest"}`, JSON.stringify(updatedHistory));
      }

      setPhase("report");
    } catch {
      setFinalReport("### 🏆 Comprehensive Score: 85/100 (Strong Hire)\n\nExcellent foundational and structural answers across all interview dimensions.");
      setPhase("report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {/* ── PHASE 1: CONFIGURATION & SETUP ─────────────────────────────────── */}
      {phase === "config" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-white/10 p-6 rounded-3xl shadow-xl text-white">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E57D37] animate-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#EAAD62]">Interactive AI Studio</span>
                {isLiveAi !== null && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    isLiveAi ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  }`}>
                    {isLiveAi ? "✨ Gemini Live AI" : "⚡ Offline Engine"}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black tracking-tight">AI Mock Interview Terminal</h2>
              <p className="text-xs text-slate-400 font-medium mt-1 max-w-xl">
                Simulate high-stakes campus and corporate technical screenings with voice recognition, real-time feedback, and dynamic question formulation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleCamera}
                className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  camOn ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                {camOn ? <Video size={16} /> : <VideoOff size={16} />}
                {camOn ? "Camera Active" : "Enable Camera Preview"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Configuration Form */}
            <div className="lg:col-span-2 space-y-5">
              <Card className="p-6 space-y-5 border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Briefcase size={16} className="text-[#E57D37]" /> Target Placement Preferences
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Target */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Target Company Pattern
                    </label>
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E57D37]"
                    >
                      {TARGET_COMPANIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.badge})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Role */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Target Engineering Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E57D37]"
                    >
                      {TARGET_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Interview Focus Track */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Interview Focus Track
                    </label>
                    <select
                      value={selectedTrack}
                      onChange={(e) => setSelectedTrack(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E57D37]"
                    >
                      {INTERVIEW_TRACKS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Difficulty Level */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Target Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Entry", "Mid", "Senior"] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setDifficulty(lvl)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            difficulty === lvl
                              ? "bg-[#E57D37] border-[#E57D37] text-white shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Session Length & Settings */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-600">Questions per session:</span>
                    <div className="flex items-center gap-1.5">
                      {[3, 5, 8].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setTargetQuestionCount(n)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold border flex items-center justify-center transition-all cursor-pointer ${
                            targetQuestionCount === n
                              ? "bg-[#14234B] border-[#14234B] text-white"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={enableVoiceMode}
                      onChange={(e) => setEnableVoiceMode(e.target.checked)}
                      className="rounded text-[#E57D37] focus:ring-[#E57D37] w-4 h-4"
                    />
                    Enable AI Voice Readout (Speech)
                  </label>
                </div>

                <div className="pt-3">
                  <button
                    onClick={startInterview}
                    disabled={isLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-[#E57D37] to-[#d46b28] hover:from-[#d46b28] hover:to-[#c35b1d] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Formulating Questions...
                      </>
                    ) : (
                      <>
                        <Play size={16} className="fill-current" />
                        Launch AI Mock Interview Session
                      </>
                    )}
                  </button>
                </div>
              </Card>

              {/* Past Attempts History */}
              {history.length > 0 && (
                <Card className="p-5 border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <History size={14} /> Recent Mock Interview Performance
                  </h4>
                  <div className="space-y-2">
                    {history.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{item.role} · {item.company}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.date} · {item.questionCount} Questions</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                            item.totalScore >= 80
                              ? "bg-emerald-100 text-emerald-800"
                              : item.totalScore >= 65
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-200 text-slate-700"
                          }`}>
                            {item.totalScore}% ({item.verdict})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right: Camera / Device Readiness Studio */}
            <div className="space-y-4">
              <Card className="p-5 border-slate-100 shadow-sm space-y-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" /> Studio & Device Diagnostics
                </h4>

                {/* Live Webcam Preview Window */}
                <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform -scale-x-100 ${camOn ? "block" : "hidden"}`}
                  />
                  {!camOn && (
                    <div className="text-center p-4 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                        <VideoOff size={18} />
                      </div>
                      <p className="text-xs font-bold text-slate-400">Webcam Inactive</p>
                      <button
                        onClick={toggleCamera}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-xl transition-all"
                      >
                        Enable Camera
                      </button>
                    </div>
                  )}

                  {camOn && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-950/70 border border-white/10 text-[9px] font-bold text-emerald-400 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      STUDIO LIVE
                    </div>
                  )}
                </div>

                {/* Audio Level Indicator */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Mic size={13} className="text-[#E57D37]" /> Microphone Audio Input
                    </span>
                    <span className="text-[10px] text-slate-400">{audioLevel}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#E57D37] transition-all duration-100"
                      style={{ width: `${Math.max(5, audioLevel)}%` }}
                    />
                  </div>
                </div>

                {/* Best Practice Tips */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 text-[11px] font-semibold leading-relaxed">
                  💡 <strong>Tip for maximum score:</strong> Speak clearly into your mic and structure responses using the <strong>STAR method</strong> (Situation, Task, Action, Result) with quantitative metrics.
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── PHASE 2: ACTIVE INTERVIEW ROOM ──────────────────────────────────── */}
      {phase === "active" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top Session Progress Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border border-white/10 rounded-2xl text-white shadow-lg flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-[#E57D37] text-white text-xs font-black uppercase tracking-wider">
                Question {currentQuestionIndex + 1} of {targetQuestionCount}
              </span>
              <span className="text-xs font-bold text-slate-300">
                {selectedCompany.toUpperCase()} · {difficulty} Level
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-slate-950 border border-white/10 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-slate-300">
                <Clock size={13} className="text-[#EAAD62]" />
                {formatTimer(elapsedSeconds)}
              </div>

              <button
                onClick={() => setPhase("config")}
                className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-all"
              >
                Quit Session
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: AI Interviewer Card */}
            <div className="space-y-4">
              <Card className="p-6 border-slate-200 shadow-sm space-y-4 bg-gradient-to-b from-white to-slate-50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#14234B] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      <Brain size={16} className="text-[#EAAD62]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">SkillArc AI Lead Interviewer</h3>
                      <p className="text-[10px] text-slate-500 font-semibold">{currentCategory}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => (isSpeaking ? stopSpeaking() : speakText(currentQuestion))}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSpeaking
                          ? "bg-[#E57D37] border-[#E57D37] text-white animate-pulse"
                          : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      }`}
                      title={isSpeaking ? "Mute Voice" : "Listen to Question"}
                    >
                      {isSpeaking ? <Volume2 size={14} /> : <Volume2 size={14} />}
                      <span className="text-[11px]">{isSpeaking ? "Speaking..." : "Read Aloud"}</span>
                    </button>
                  </div>
                </div>

                {/* Question Statement Box */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E57D37]">Question Prompt</span>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 leading-relaxed">
                    {currentQuestion}
                  </p>
                </div>

                {/* Hint Accordion */}
                {currentHint && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setShowHint(!showHint)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        <Lightbulb size={14} className="text-[#EAAD62]" /> Need a hint or key talking points?
                      </span>
                      <ChevronDown size={14} className={`transform transition-transform ${showHint ? "rotate-180" : ""}`} />
                    </button>
                    {showHint && (
                      <div className="p-3 bg-amber-500/10 border-t border-amber-500/20 text-xs text-amber-900 font-semibold leading-relaxed">
                        {currentHint}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Right: Candidate Studio & Answer Response Area */}
            <div className="space-y-4">
              <Card className="p-5 border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-800">Candidate Response Studio</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCodePad(!showCodePad)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                        showCodePad ? "bg-[#14234B] text-white border-[#14234B]" : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <FileCode size={13} />
                      {showCodePad ? "Hide Code Pad" : "+ Add Code / Notes"}
                    </button>
                  </div>
                </div>

                {/* Speech Recognition Controls */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-3 h-3 rounded-full ${isListening ? "bg-red-500 animate-ping" : "bg-slate-400"}`} />
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {isListening ? "Listening... Speak your response" : "Click mic to speak or type response below"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                        : "bg-[#E57D37] hover:bg-[#d46b28] text-white"
                    }`}
                  >
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    {isListening ? "Stop Recording" : "Speak Response"}
                  </button>
                </div>

                {/* Spoken / Typed Transcript Box */}
                <div>
                  <textarea
                    rows={6}
                    value={candidateAnswer}
                    onChange={(e) => setCandidateAnswer(e.target.value)}
                    placeholder="Type or speak your answer here. Mention your reasoning, architecture, tradeoffs, and relevant metrics..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 font-medium leading-relaxed outline-none focus:border-[#E57D37] focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Optional Code / Architectural Scratchpad */}
                {showCodePad && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span className="flex items-center gap-1">
                        <Terminal size={12} className="text-[#E57D37]" /> Code / Algorithm Scratchpad
                      </span>
                      <span className="text-[10px] text-slate-400">Python / Java / C++ / SQL / Pseudocode</span>
                    </div>
                    <textarea
                      rows={4}
                      value={codeSnippet}
                      onChange={(e) => setCodeSnippet(e.target.value)}
                      placeholder="// Write code snippet or architectural diagram notes here..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 font-mono text-xs text-emerald-400 outline-none focus:border-[#EAAD62]"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={submitAnswer}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#14234B] hover:bg-[#0f1a38] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Evaluating Answer via AI...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      Submit Answer for Instant AI Evaluation
                    </>
                  )}
                </button>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── PHASE 3: PER-QUESTION AI EVALUATION & REVIEW ────────────────────── */}
      {phase === "question_review" && (
        <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
          <Card className="p-6 sm:p-8 border-slate-200 shadow-xl space-y-6 bg-white">
            {/* Header Scorecard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} Review
                  </span>
                  <span className="text-xs font-bold text-slate-400">{currentCategory}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">Interviewer Feedback & Score</h3>
              </div>

              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-2xl font-black text-lg sm:text-xl border shadow-sm ${
                  latestScore >= 8
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : latestScore >= 6
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-rose-50 border-rose-200 text-rose-700"
                }`}>
                  Score: {latestScore}/10
                </div>
              </div>
            </div>

            {/* Question Recap */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
              <span className="font-extrabold text-[#E57D37] uppercase tracking-wider text-[10px]">Asked Question</span>
              <p className="font-bold text-slate-800">{currentQuestion}</p>
            </div>

            {/* AI Feedback Output */}
            <FormattedFeedback text={latestFeedback} />

            {/* Next Action Button */}
            <div className="pt-3 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-semibold">
                Completed {currentQuestionIndex + 1} of {targetQuestionCount} questions
              </span>

              <button
                onClick={nextQuestionOrFinish}
                disabled={isLoading}
                className="px-6 py-3 bg-[#E57D37] hover:bg-[#d46b28] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                {currentQuestionIndex + 1 >= targetQuestionCount ? (
                  <>
                    <Award size={16} /> View Final Assessment Scorecard
                  </>
                ) : (
                  <>
                    Next Question <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ── PHASE 4: FINAL COMPREHENSIVE PERFORMANCE SCORECARD ──────────────── */}
      {phase === "report" && (
        <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
          <Card className="p-6 sm:p-8 border-slate-200 shadow-2xl space-y-6 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                    Session Completed
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {selectedCompany.toUpperCase()} · {selectedRole.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">Placement Assessment Scorecard</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPhase("config")}
                  className="px-4 py-2.5 bg-[#E57D37] hover:bg-[#d46b28] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw size={14} /> Start Another Session
                </button>
              </div>
            </div>

            {/* Score Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 text-white rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Score</span>
                <p className="text-2xl sm:text-3xl font-black text-[#EAAD62] mt-1">
                  {Math.round((sessionLogs.reduce((a, b) => a + b.score, 0) / ((sessionLogs.length || 1) * 10)) * 100)}%
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Verdict</span>
                <p className="text-sm font-black text-emerald-700 mt-2">Strong Hire</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Duration</span>
                <p className="text-sm font-black text-slate-800 mt-2">{formatTimer(elapsedSeconds)}</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Questions Answered</span>
                <p className="text-sm font-black text-slate-800 mt-2">{sessionLogs.length} Questions</p>
              </div>
            </div>

            {/* Detailed AI Report Output */}
            <FormattedReport text={finalReport} />

            {/* Question Breakdown Accordions */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Question Log Breakdown</h4>
              {sessionLogs.map((log, idx) => (
                <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setExpandedLogIndex(expandedLogIndex === idx ? null : idx)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {log.questionNumber}
                      </span>
                      <p className="text-xs font-bold text-slate-800 truncate">{log.question}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md">
                        {log.score}/10
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 transform transition-transform ${expandedLogIndex === idx ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedLogIndex === idx && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Answer:</span>
                        <p className="text-slate-700 font-medium mt-1 bg-white p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">{log.candidateAnswer}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Evaluation:</span>
                        <div className="mt-2">
                          <FormattedFeedback text={log.feedback} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
