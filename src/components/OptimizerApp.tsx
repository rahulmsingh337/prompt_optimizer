import { useState, useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush
} from "recharts";

import { 
  Sparkles, 
  Eye,
  Terminal, 
  HelpCircle, 
  CheckCircle2, 
  Copy, 
  RefreshCw, 
  LogOut, 
  MessageSquare,
  Zap, 
  AlertTriangle,
  Play,
  ArrowRight,
  User,
  ExternalLink,
  ChevronRight,
  Check,
  ThumbsUp,
  ThumbsDown,
  Send,
  Network,
  Bookmark,
  History,
  Save,
  Trash2,
  GitCompare,
  Cpu,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Languages
} from "lucide-react";
import { User as UserType, OptimizedResponse, QueryState, HistoryItem, UserPreferences } from "../types";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface DiffChunk {
  type: "added" | "removed" | "equal";
  value: string;
}

export function computeWordDiff(oldText: string, newText: string): DiffChunk[] {
  const oldWords = oldText.match(/\s+|\w+|[^\w\s]+/g) || [];
  const newWords = newText.match(/\s+|\w+|[^\w\s]+/g) || [];

  // Safety boundary check for ReDoS/excess memory use matrix limit
  if (oldWords.length > 1000 || newWords.length > 2000) {
    return [
      { type: "removed", value: oldText },
      { type: "added", value: newText }
    ];
  }

  const matrix: number[][] = Array(oldWords.length + 1)
    .fill(0)
    .map(() => Array(newWords.length + 1).fill(0));

  for (let i = 1; i <= oldWords.length; i++) {
    for (let j = 1; j <= newWords.length; j++) {
      if (oldWords[i - 1].toLowerCase() === newWords[j - 1].toLowerCase()) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  const result: DiffChunk[] = [];
  let i = oldWords.length;
  let j = newWords.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1].toLowerCase() === newWords[j - 1].toLowerCase()) {
      result.unshift({ type: "equal", value: newWords[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      result.unshift({ type: "added", value: newWords[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", value: oldWords[i - 1] });
      i--;
    }
  }

  return result;
}

export interface LineSegment {
  type: "added" | "removed" | "equal";
  value: string;
}

export interface DiffLine {
  segments: LineSegment[];
  hasChanges: boolean;
  isEntirelyNew?: boolean;
}

export function getLinesFromChunks(chunks: DiffChunk[], isLeft: boolean): DiffLine[] {
  const lines: DiffLine[] = [];
  let currentSegments: LineSegment[] = [];
  let currentHasChanges = false;

  for (const chunk of chunks) {
    if (isLeft && chunk.type === "added") continue;
    if (!isLeft && chunk.type === "removed") continue;

    const value = chunk.value;
    const parts = value.split("\n");

    for (let p = 0; p < parts.length; p++) {
      const partText = parts[p];
      
      if (partText !== undefined && partText !== "") {
        currentSegments.push({
          type: chunk.type,
          value: partText
        });
        if (chunk.type !== "equal") {
          currentHasChanges = true;
        }
      }

      if (p < parts.length - 1) {
        lines.push({
          segments: currentSegments,
          hasChanges: currentHasChanges,
          isEntirelyNew: currentSegments.every(s => s.type === (isLeft ? "removed" : "added")) && currentSegments.length > 0
        });
        currentSegments = [];
        currentHasChanges = false;
      }
    }
  }

  if (currentSegments.length > 0 || lines.length === 0) {
    lines.push({
      segments: currentSegments,
      hasChanges: currentHasChanges,
      isEntirelyNew: currentSegments.every(s => s.type === (isLeft ? "removed" : "added")) && currentSegments.length > 0
    });
  }

  return lines;
}

export function detectLanguage(text: string): string {
  if (!text) return "markdown";
  const trimmed = text.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch (e) {}
  }
  const lowersText = text.toLowerCase();
  
  if (lowersText.includes("select ") && lowersText.includes("from ") && (lowersText.includes("where ") || lowersText.includes("join "))) {
    return "sql";
  }
  if (lowersText.includes("def ") && (lowersText.includes("import ") || lowersText.includes("print(") || lowersText.includes("self."))) {
    return "python";
  }
  if (lowersText.includes("def ") || (text.includes(":") && text.includes("    ") && lowersText.includes("elif "))) {
    return "python";
  }
  if ((lowersText.includes("import ") || lowersText.includes("const ") || lowersText.includes("function ")) && (lowersText.includes("from '") || lowersText.includes("from \"") || lowersText.includes("=>"))) {
    return "javascript";
  }
  if (lowersText.includes("yaml") || (trimmed.includes(":") && trimmed.includes("\n") && (trimmed.includes("- ") || trimmed.includes("  ")))) {
    if (!trimmed.includes("{") && !trimmed.includes("}")) {
      return "yaml";
    }
  }
  if (lowersText.includes("dockerfile") || lowersText.includes("bash") || lowersText.includes("shell") || trimmed.startsWith("$ ") || trimmed.startsWith("npm ")) {
    return "bash";
  }
  return "markdown";
}

interface OptimizerAppProps {
  user: UserType;
  onSignOut: () => void;
}

export default function OptimizerApp({ user, onSignOut }: OptimizerAppProps) {
  // Input configuration states
  const [targetAI, setTargetAI] = useState<string>("ChatGPT");
  const [modePreference, setModePreference] = useState<"Auto" | "BASIC" | "DETAIL">("Auto");
  const [domain, setDomain] = useState<string>("General");
  const [tone, setTone] = useState<string>("Professional");
  const [roughRequest, setRoughRequest] = useState<string>("");

  // Workflow dynamic states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Accumulated responses
  const [response, setResponse] = useState<OptimizedResponse | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [originalRequestForDiff, setOriginalRequestForDiff] = useState<string>("");
  const [promptViewStyle, setPromptViewStyle] = useState<"clean" | "diff">("clean");
  const [highlightImpactLines, setHighlightImpactLines] = useState<boolean>(true);

  // Helper generator to render line-by-line colored diff comparisons
  const renderDiffContent = (isLeft: boolean, isFullScreen: boolean = false) => {
    const sourceText = isLeft ? originalRequestForDiff : (response?.optimizedPrompt || "");
    if (!sourceText) {
      return (
        <div className="p-4 overflow-y-auto max-h-72 min-h-[160px] whitespace-pre-wrap leading-relaxed font-sans text-slate-500">
          <span className="italic">
            {isLeft ? "Empty workspace input" : "Empty compiled outcome"}
          </span>
        </div>
      );
    }

    const chunks = computeWordDiff(originalRequestForDiff, response?.optimizedPrompt || "");
    const lines = getLinesFromChunks(chunks, isLeft);

    const scrollContainerClass = isFullScreen 
      ? "overflow-y-auto flex-1 font-mono leading-relaxed text-sm max-h-[50vh] flex flex-col pt-2"
      : "overflow-y-auto max-h-72 min-h-[160px] flex flex-col font-mono text-[11px] sm:text-xs pt-2";

    return (
      <div className={scrollContainerClass}>
        {lines.map((line, lineIdx) => {
          const hasChanges = line.hasChanges;
          const lineNum = lineIdx + 1;
          
          let highlightClass = "border-l-2 border-transparent hover:bg-slate-900/40";
          let label = null;
          
          if (highlightImpactLines && hasChanges) {
            if (isLeft) {
              highlightClass = "bg-red-500/5 hover:bg-red-500/10 border-l-2 border-red-500/50";
              label = "Modified";
            } else {
              highlightClass = "bg-emerald-500/5 hover:bg-emerald-500/10 border-l-2 border-emerald-500/60";
              label = line.isEntirelyNew ? "Added Line" : "Optimized";
            }
          }

          return (
            <div 
              key={lineIdx} 
              className={`group/diff-line flex items-stretch leading-relaxed transition-all py-0.5 relative ${highlightClass}`}
            >
              <div className="w-10 select-none text-right pr-3.5 text-slate-600 font-mono text-[10px] shrink-0 border-r border-slate-900/20 bg-slate-950/10">
                {lineNum}
              </div>
              <div className={`pl-3.5 pr-2 flex-1 whitespace-pre-wrap break-all text-left ${isLeft ? "font-sans text-slate-400 text-xs sm:text-sm" : "font-mono text-slate-205 text-xs sm:text-sm"}`}>
                {line.segments.length === 0 ? (
                  <span className="inline-block w-4">&#8203;</span>
                ) : (
                  line.segments.map((seg, segIdx) => {
                    if (seg.type === "removed") {
                      return (
                        <span 
                          key={segIdx} 
                          className="bg-red-500/20 text-red-300 px-0.5 rounded border border-red-500/10 line-through decoration-red-500/40 font-medium"
                        >
                          {seg.value}
                        </span>
                      );
                    } else if (seg.type === "added") {
                      return (
                        <span 
                          key={segIdx} 
                          className="bg-emerald-500/15 text-emerald-300 px-0.5 rounded border border-emerald-500/10 font-bold"
                        >
                          {seg.value}
                        </span>
                      );
                    }
                    return (
                      <span key={segIdx}>
                        {seg.value}
                      </span>
                    );
                  })
                )}
              </div>
              {label && (
                <span className="opacity-0 group-hover/diff-line:opacity-100 transition-opacity absolute right-4 text-[8px] font-sans font-bold tracking-wider bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-400 uppercase pointer-events-none select-none z-10 shrink-0">
                  {label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Highlight states
  const [highlightLanguage, setHighlightLanguage] = useState<string>("markdown");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");

  // Auto detect or set the language reactively
  useEffect(() => {
    if (!response?.optimizedPrompt) return;
    if (selectedLanguage === "auto") {
      const detected = detectLanguage(response.optimizedPrompt);
      setHighlightLanguage(detected);
    } else {
      setHighlightLanguage(selectedLanguage);
    }
  }, [response?.optimizedPrompt, selectedLanguage]);

  // Detail interactive questionnaire answers state
  const [questionAnswers, setQuestionAnswers] = useState<{ [qId: string]: { question: string; answer: string } }>({});

  // Welcome state modal / drawer to display welcome on "hello" button activation
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  // Anonymous rating and feedback state variables
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(null);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [communityFeedbacks, setCommunityFeedbacks] = useState<any[]>([]);

  // Fetch anonymized feedback entries from active storage
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isSavingPrefs, setIsSavingPrefs] = useState<boolean>(false);
  const [prefSaveSuccess, setPrefSaveSuccess] = useState<boolean>(false);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState<string>(window.location.search.includes("search=") ? new URLSearchParams(window.location.search).get("search") || "" : "");
  const [selectedChartPoint, setSelectedChartPoint] = useState<any | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Web Speech API states for prompt dictation
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Token status tracker
  const [tokenStatus, setTokenStatus] = useState<{
    isOwner: boolean;
    tokensUsed: number;
    dailyLimit: number;
    remaining: number;
    reachedLimit: boolean;
  } | null>(null);

  const fetchTokenStatus = async () => {
    try {
      const res = await fetch(`/api/token-status?userId=${user.id}&email=${encodeURIComponent(user.login || "")}`);
      if (res.ok) {
        const data = await res.json();
        setTokenStatus(data);
      }
    } catch (err) {
      console.error("Failed to retrieve token status:", err);
    }
  };

  const updateTokenStatusFromData = (data: any) => {
    if (data && data.tokenResult) {
      setTokenStatus({
        isOwner: data.tokenResult.isOwner || (user.login || "").toLowerCase().trim() === "rs826748@gmail.com",
        tokensUsed: data.tokenResult.tokensUsed,
        dailyLimit: 500000,
        remaining: data.tokenResult.remaining,
        reachedLimit: data.tokenResult.reachedLimit
      });
    } else {
      fetchTokenStatus();
    }
  };

  // Auto-translation states
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  // Full Screen State for Optimized Prompt Area
  const [isFullScreenPrompt, setIsFullScreenPrompt] = useState<boolean>(false);

  // Syntax highlighting state preference
  const [enableHighlighting, setEnableHighlighting] = useState<boolean>(true);

  // Esc key down event listener to close full screen focused prompt mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullScreenPrompt(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startSpeechRecognition = () => {
    setSpeechError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechError("Web Speech API is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript;
        if (transcript) {
          setRoughRequest((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${transcript.trim()}` : transcript.trim();
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setSpeechError("Microphone access denied. Please verify your browser/iframe permission settings.");
        } else if (event.error === "no-speech") {
          // Benign error, can ignore
        } else {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error("Failed to start speech recognition:", e);
      setSpeechError(e.message || "Failed to initialize microphone.");
      setIsListening(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Safe check
      }
    }
    setIsListening(false);
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  // Load preferences across sessions
  const loadUserPreferences = async () => {
    try {
      const prefDocRef = doc(db, "users", String(user.id), "preferences", "settings");
      const docSnap = await getDoc(prefDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserPreferences;
        setPreferences(data);
        if (data.targetAI) setTargetAI(data.targetAI);
        if (data.modePreference) setModePreference(data.modePreference);
        if (data.domain) setDomain(data.domain);
        if (data.enableHighlighting !== undefined) setEnableHighlighting(data.enableHighlighting);
        if (data.tone) setTone(data.tone);
      }
    } catch (e) {
      console.error("Failed to load user preferences: ", e);
    }
  };

  // Save current options as default session preferences
  const saveUserPreferences = async () => {
    setIsSavingPrefs(true);
    setPrefSaveSuccess(false);
    const prefPayload: UserPreferences = {
      targetAI,
      modePreference,
      domain,
      enableHighlighting,
      tone,
      updatedAt: new Date().toISOString()
    };
    try {
      const prefDocRef = doc(db, "users", String(user.id), "preferences", "settings");
      await setDoc(prefDocRef, prefPayload);
      setPreferences(prefPayload);
      setPrefSaveSuccess(true);
      setTimeout(() => setPrefSaveSuccess(false), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.id}/preferences/settings`);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // Synchronously write completed optimizations to permanent history
  const saveToHistory = async (rough: string, responseData: OptimizedResponse) => {
    const docId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const historyPayload = {
      userId: String(user.id),
      roughRequest: rough,
      optimizedPrompt: responseData.optimizedPrompt || "",
      proTip: responseData.proTip || null,
      domain: domain || "General",
      targetAI: targetAI || "ChatGPT",
      tone: tone || "Professional",
      timestamp: new Date().toISOString(),
      modeUsed: responseData.modeUsed || "BASIC",
      improvements: responseData.improvements || null,
      techniquesApplied: responseData.techniquesApplied || null
    };

    try {
      const optDocRef = doc(db, "users", String(user.id), "optimizations", docId);
      await setDoc(optDocRef, historyPayload);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.id}/optimizations/${docId}`);
    }
  };

  // Sync with Firestore developments and read user defaults on mount
  useEffect(() => {
    const q = query(
      collection(db, "users", String(user.id), "optimizations"),
      orderBy("timestamp", "desc")
    );

    setIsLoadingHistory(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: HistoryItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          userId: data.userId,
          roughRequest: data.roughRequest,
          optimizedPrompt: data.optimizedPrompt,
          proTip: data.proTip,
          domain: data.domain,
          targetAI: data.targetAI,
          timestamp: data.timestamp,
          modeUsed: data.modeUsed,
          improvements: data.improvements,
          techniquesApplied: data.techniquesApplied
        });
      });
      setHistoryItems(items);
      setIsLoadingHistory(false);
      setHistoryError(null);
    }, (error) => {
      setIsLoadingHistory(false);
      setHistoryError("Unable to synchronize with Firestore.");
      handleFirestoreError(error, OperationType.LIST, `users/${user.id}/optimizations`);
    });

    loadUserPreferences();
    fetchTokenStatus();

    return () => unsubscribe();
  }, [user.id]);

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch("/api/feedback");
      const data = await res.json();
      if (data.feedbacks) {
        setCommunityFeedbacks(data.feedbacks);
      }
    } catch (e) {
      console.warn("Telemetry unavailable: ", e);
    }
  };

  // Dispatch feedback anonymously (zero privacy retention specs)
  const handleFeedbackSubmit = async () => {
    if (!feedbackRating) return;
    setFeedbackError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: feedbackRating,
          comment: feedbackComment,
          domain,
          targetAI
        })
      });
      if (res.ok) {
        setFeedbackSubmitted(true);
        fetchFeedbacks();
        setTimeout(() => {
          setFeedbackRating(null);
          setFeedbackComment("");
          setFeedbackSubmitted(false);
        }, 5000);
      } else {
        setFeedbackError("Failed to submit rating session.");
      }
    } catch (err) {
      setFeedbackError("Anonymous route could not complete.");
    }
  };

  // Helper template inserts to demonstrate Domain specific results
  const insertPreset = (presetType: "marketing" | "code" | "creative") => {
    if (presetType === "marketing") {
      setDomain("Marketing");
      setTargetAI("Claude");
      setRoughRequest("Write me a marketing email promoting our new organic energy drink");
    } else if (presetType === "code") {
      setDomain("Software Development");
      setTargetAI("ChatGPT");
      setRoughRequest("Make a SQL table script for library users and book loans and some sample indexes");
    } else if (presetType === "creative") {
      setDomain("Creative Writing");
      setTargetAI("Gemini");
      setRoughRequest("Create an outline for a fast-paced thriller short story set inside a silent neon train carriage");
    }
  };

  // Load initial feeds
  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // Set default values when questions arrive
  useEffect(() => {
    if (response?.clarifyingQuestions) {
      const initialAnswers: { [qId: string]: { question: string; answer: string } } = {};
      response.clarifyingQuestions.forEach((q) => {
        initialAnswers[q.id] = {
          question: q.question,
          answer: q.defaultAnswer || ""
        };
      });
      setQuestionAnswers(initialAnswers);
    }
  }, [response]);

  // Standard reset
  const handleReset = () => {
    setRoughRequest("");
    setResponse(null);
    setErrorMessage(null);
    setQuestionAnswers({});
    setIsLoading(false);
    setTranslationError(null);
    setDetectedLanguage(null);
  };

  // Auto-translate rough request text to English using server-side Gemini Translate
  const handleAutoTranslateToEnglish = async () => {
    if (!roughRequest.trim()) return;

    setIsTranslating(true);
    setTranslationError(null);
    setDetectedLanguage(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          text: roughRequest,
          userId: user.id || "anonymous_sandbox_guest",
          email: user.login || ""
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to complete translation.");
      }

      const data = await response.json();
      if (data.translatedText) {
        setRoughRequest(data.translatedText);
        setDetectedLanguage(data.detectedLanguage || "Unspecified");
        // Update user token limits client-side
        updateTokenStatusFromData(data);
        // Clear detection status after 5 seconds to keep the interface tidy
        setTimeout(() => setDetectedLanguage(null), 6000);
      } else {
        throw new Error("Translation synthesis returned empty text outcome.");
      }
    } catch (err: any) {
      console.error("Translation error: ", err);
      setTranslationError(err.message || "Could not translate text. Please verify service status.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Standard prompt execution
  const handleOptimize = async () => {
    if (!roughRequest.trim()) {
      setErrorMessage("Please input a rough request prompt to optimize.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResponse(null);
    setOriginalRequestForDiff(roughRequest);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          targetAI,
          modePreference,
          domain,
          roughRequest,
          tone,
          userId: user.id || "anonymous_sandbox_guest",
          email: user.login || ""
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Something went wrong during optimization.");
      }

      const data = await res.json();
      setResponse(data);
      // Update token limits
      updateTokenStatusFromData(data);
      if (data && data.optimizedPrompt) {
        saveToHistory(roughRequest, data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "AI Server failed to respond.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit questionnaire answers to obtain finalized prompt
  const handleAnswerSubmit = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setOriginalRequestForDiff(roughRequest);

    // Turn answers dictionary into array schema for LLM processing
    const answersPayload = Object.values(questionAnswers).map((item: { question: string; answer: string }) => ({
      question: item.question,
      answer: item.answer
    }));

    try {
      const res = await fetch("/api/optimize/answers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          targetAI,
          domain,
          roughRequest,
          answers: answersPayload,
          tone,
          userId: user.id || "anonymous_sandbox_guest",
          email: user.login || ""
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to synthesize answers.");
      }

      const data = await res.json();
      setResponse(data);
      // Update token limits
      updateTokenStatusFromData(data);
      if (data && data.optimizedPrompt) {
        saveToHistory(roughRequest, data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Answer synthesis synthesis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Clipboard copy handler
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col justify-between">
      
      {/* Absolute aura background spots */}
      <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main APP Header */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/40 backdrop-blur px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 sm:gap-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shrink-0">
            <span className="font-display font-black text-sm text-white">N</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base text-white tracking-tight">NEXA Workspace</span>
              <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase font-bold">LIVE AGENT</span>
            </div>
          </div>
        </div>

        {/* User Badge Profile + Logout Control */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowWelcome(true)}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg border border-sky-500/20 text-sky-400 bg-slate-950 hover:bg-sky-500/10 transition-colors cursor-pointer select-none shrink-0"
            title="Open About NEXA system handbook"
          >
            About Us
          </button>

          {/* Token usage widget */}
          {tokenStatus && (
            <div 
              className="hidden sm:flex items-center gap-2 bg-slate-950 p-1.5 px-3 rounded-xl border border-slate-900 cursor-pointer select-none relative group"
              title="NEXA Daily AI Token Limit"
            >
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-mono font-semibold text-slate-300">
                  {tokenStatus.isOwner ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <span>∞</span> Owner Mode
                    </span>
                  ) : (
                    <span>{tokenStatus.remaining.toLocaleString()} left</span>
                  )}
                </span>
                <span className="text-[8px] font-mono text-slate-500 uppercase">
                  {tokenStatus.isOwner ? "No limit active" : `Used: ${Math.round(tokenStatus.tokensUsed / 1000)}k / 500k`}
                </span>
              </div>
              <div className="relative">
                <span className={`relative flex h-2 w-2 rounded-full ${tokenStatus.reachedLimit ? "bg-red-500" : tokenStatus.isOwner ? "bg-amber-400" : "bg-emerald-500"}`}>
                  {!tokenStatus.reachedLimit && !tokenStatus.isOwner && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                </span>
              </div>

              {/* Tooltip detail block */}
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute right-2 top-11 p-3 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 w-64 space-y-2 transition-all duration-300 text-left">
                <div className="text-xs font-bold text-slate-200">Daily Token Allocation Status</div>
                <p className="text-[10px] text-slate-400 leading-relaxed uppercase font-sans normal-case">
                  Each NEXA member has a daily traffic allotment of 500,000 tokens (approx. 2 million characters of input and output) to prevent abuse.
                </p>
                {!tokenStatus.isOwner && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Consumed:</span>
                      <span className="text-slate-300 font-bold">{tokenStatus.tokensUsed.toLocaleString()} / 500,000</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full ${tokenStatus.reachedLimit ? "bg-red-500" : "bg-emerald-500"}`} 
                        style={{ width: `${Math.min(100, (tokenStatus.tokensUsed / 500000) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="text-[9px] font-mono text-indigo-400 text-center border-t border-slate-900 pt-1.5 mt-1">
                  Resets automatically every day
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-950 p-1.5 px-3 rounded-xl border border-slate-900 shrink-0">
            {user.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name} 
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full border border-slate-800"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
              </div>
            )}
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200 truncate max-w-[90px] sm:max-w-none">{user.name}</div>
              <div className="text-[8px] font-mono text-slate-500 uppercase">{user.provider}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors cursor-pointer text-slate-400 shrink-0 flex items-center justify-center"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Primary Workspace Layout */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: Controls Panel (5 Columns) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-slate-950/45 border border-slate-900/60 flex flex-col gap-5 backdrop-blur-lg shadow-xl shadow-slate-950/10">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <Terminal className="w-5 h-5 text-sky-500" />
              <h2 className="font-display font-bold text-sm text-slate-200">Core Optimization Parameters</h2>
            </div>

            {/* Target LLM */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">Target AI Platform</label>
              <select
                value={targetAI}
                onChange={(e) => setTargetAI(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="ChatGPT">ChatGPT</option>
                <option value="Claude">Claude</option>
                <option value="Gemini">Gemini</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Style mode */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">Optimization ModeStyle</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-lg">
                {(["Auto", "BASIC", "DETAIL"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setModePreference(style)}
                    className={`py-1.5 text-xs rounded font-medium transition-all cursor-pointer ${modePreference === style ? "bg-slate-800 text-white font-semibold shadow" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                <strong>Auto-detect:</strong> NEXA evaluates characters and topics to toggle BASIC or custom questions.
              </p>
            </div>

            {/* Subject Area Domain */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">Workflow Domain Focus</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-200 focus:border-sky-500 focus:outline-none cursor-pointer"
              >
                <option value="General">General / All-Purpose</option>
                <option value="Marketing">Marketing (Campaigns, Emails, Hooks)</option>
                <option value="Software Development">Software Development (API, Scripts, SQL)</option>
                <option value="Creative Writing">Creative Writing (Outline, Stories, Tone)</option>
                <option value="Educational">Educational Guides & Pedagogy</option>
                <option value="Business">Business & Financial Insights</option>
              </select>
            </div>

            {/* Desired Prompt Tone */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">Desired Prompt Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-200 focus:border-sky-500 focus:outline-none cursor-pointer"
              >
                <option value="Professional">Professional (Corporate, Objective, Clear)</option>
                <option value="Casual">Casual (Friendly, Conversational, Relatable)</option>
                <option value="Academic">Academic (Rigorous, Formal, Analytical)</option>
                <option value="Urgent">Urgent (Action-Oriented, High-Priority, Direct)</option>
                <option value="Creative">Creative (Expressive, Narrative, Inspiring)</option>
                <option value="Direct">Direct & Concise (Brutally Short, High-Signal)</option>
                <option value="Enthusiastic">Enthusiastic (High-Energy, Excitable, Passionate)</option>
                <option value="Empathetic">Empathetic (Compassionate, Patient, Supporitive)</option>
              </select>
            </div>

            {/* Practical Preset Changers */}
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 font-bold">Interactive Domain Presets</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => insertPreset("marketing")}
                  className={`text-[10px] px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                    domain === "Marketing" 
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold" 
                      : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                  }`}
                  title="Click to load a Marketing Email scenario and see how selecting Marketing changes the instructions"
                >
                  📢 Marketing Email
                </button>
                <button
                  type="button"
                  onClick={() => insertPreset("code")}
                  className={`text-[10px] px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                    domain === "Software Development" 
                      ? "bg-sky-500/10 border-sky-500/30 text-sky-400 font-bold" 
                      : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  📦 SQL Database Schema
                </button>
                <button
                  type="button"
                  onClick={() => insertPreset("creative")}
                  className={`text-[10px] px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                    domain === "Creative Writing" 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold" 
                      : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  ✍ Thriller Short Story
                </button>
              </div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-normal">
                💡 <strong>Try this:</strong> Click <strong>"Marketing Email"</strong>, keep style as <strong>"BASIC"</strong> or <strong>"DETAIL"</strong>, and click analyze. NEXA uses custom conversion formulas (like AIDA) and identifies implicit goals and anti-spam constraints automatically!
              </p>
            </div>

            {/* Original prompt text */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Original Rough Prompt</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                      isListening 
                        ? "bg-red-500/10 text-red-400 border-red-500/35 shadow-[0_0_10px_rgba(239,68,68,0.25)] animate-pulse" 
                        : "bg-slate-950/80 text-slate-400 border-slate-900 hover:text-sky-400 hover:border-slate-800"
                    }`}
                    title={isListening ? "Stop voice dictation" : "Dictate your prompt via microphone"}
                  >
                    {isListening ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-450 animate-ping"></span>
                        <Mic className="w-3 h-3 text-red-400" />
                        <span className="font-bold text-red-450">Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3 text-slate-400 group-hover:text-sky-400" />
                        <span>Dictate</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoTranslateToEnglish}
                    disabled={isTranslating || !roughRequest.trim()}
                    className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                      isTranslating 
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.25)] animate-pulse" 
                        : "bg-slate-950/80 text-slate-400 border-slate-900 hover:text-sky-400 hover:border-slate-800 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-900"
                    }`}
                    title="Detect language and translate text to English instantly"
                  >
                    <Languages className={`w-3 h-3 ${isTranslating ? "text-sky-400 animate-spin" : "text-slate-400"}`} />
                    <span>{isTranslating ? "Translating..." : "Translate to English"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[10px] font-mono text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                  >
                    Clear Workspace
                  </button>
                </div>
              </div>

              {speechError && (
                <div className="mb-2 p-2 rounded-lg bg-red-950/30 border border-red-500/20 text-[10px] font-mono text-red-400 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{speechError}</span>
                    <button 
                      type="button"
                      onClick={() => setSpeechError(null)} 
                      className="ml-2 underline text-slate-400 hover:text-slate-200"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {translationError && (
                <div className="mb-2 p-2 rounded-lg bg-red-950/30 border border-red-500/20 text-[10px] font-mono text-red-400 flex items-start gap-1.5 text-left">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{translationError}</span>
                    <button 
                      type="button"
                      onClick={() => setTranslationError(null)} 
                      className="ml-2 underline text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {detectedLanguage && (
                <div className="mb-2 p-2 rounded-lg bg-emerald-950/35 border border-emerald-500/25 text-[10px] font-mono text-emerald-400 flex items-start gap-1.5 text-left">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>Language Auto-Detected & Translated: <strong className="text-emerald-300 uppercase">{detectedLanguage}</strong> ➔ ENGLISH.</span>
                    <button 
                      type="button"
                      onClick={() => setDetectedLanguage(null)} 
                      className="ml-2 underline text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={roughRequest}
                onChange={(e) => setRoughRequest(e.target.value)}
                placeholder="Share your rough idea, tasks, or list here..."
                className="w-full h-40 bg-[#0c1222]/35 border border-slate-850/60 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 resize-none focus:border-sky-500 focus:outline-none leading-relaxed font-sans backdrop-blur-sm"
              />
              <div className="flex flex-wrap items-center justify-between mt-1.5 px-1 text-[10px] font-mono text-slate-500 gap-2">
                <div className="flex items-center gap-2.5">
                  <span>Chars: <strong className="text-slate-300">{(roughRequest || "").length}</strong></span>
                  <span>•</span>
                  <span>Words: <strong className="text-slate-300">{(roughRequest || "").trim() ? (roughRequest || "").trim().split(/\s+/).length : 0}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 bg-sky-950/40 border border-sky-950/60 px-2 py-0.5 rounded text-sky-400">
                  <Cpu className="w-2.5 h-2.5 shrink-0" />
                  <span>Est. Tokens: <strong className="text-sky-300 font-extrabold">{Math.ceil((roughRequest || "").length / 4.1)}</strong></span>
                </div>
              </div>
            </div>

            {/* Token limit exceeded warning banner */}
            {tokenStatus?.reachedLimit && !tokenStatus?.isOwner && (
              <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/20 text-xs text-red-400 leading-normal flex items-start gap-2.5 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)] text-left">
                <AlertTriangle className="w-4 h-4 text-red-505 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold mb-0.5">Daily Token Allocation Exhausted</div>
                  <span className="text-[11px] text-slate-300">
                    You have spent your daily allocation of 500,000 tokens. The token quota resets automatically every day.
                  </span>
                </div>
              </div>
            )}

            {/* Error notifications */}
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/20 text-xs text-red-400 leading-normal flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Trigger Button Row */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-850 text-slate-400 font-semibold text-xs tracking-wider uppercase transition-colors disabled:opacity-50 cursor-pointer"
              >
                Reset Workspace
              </button>
              <button
                type="button"
                onClick={handleOptimize}
                disabled={isLoading || !roughRequest.trim() || (tokenStatus?.reachedLimit && !tokenStatus?.isOwner)}
                className="py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-bold text-xs text-white tracking-widest uppercase shadow shadow-sky-500/10 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    Analyze & Expand <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

          </div>

          {/* USER ACCOUNT VAULT: PREFERENCES */}
          <div className="p-6 rounded-2xl bg-slate-950/45 border border-slate-900/60 flex flex-col gap-4 backdrop-blur-lg shadow-xl shadow-slate-950/10">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-400" />
                <h2 className="font-display font-bold text-xs text-slate-200">Session Defaults</h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Preferences</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Lock your preferred parameters (Target Platform, Mode Style, and Domain) securely across sessions.
            </p>

            <div className="flex items-center justify-between bg-[#0a0f1d]/50 p-3 rounded-xl border border-slate-900/40">
              <div className="text-left">
                <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">LOCKED DEFAULTS</span>
                <span className="text-[11px] font-semibold text-slate-300">
                  {preferences ? `${preferences.targetAI} • ${preferences.modePreference} • ${preferences.domain}${preferences.tone ? ` • ${preferences.tone}` : ""}${preferences.enableHighlighting !== undefined ? ` • Highlighting: ${preferences.enableHighlighting ? "On" : "Off"}` : ""}` : "No defaults locked"}
                </span>
              </div>
              
              <button
                type="button"
                onClick={saveUserPreferences}
                disabled={isSavingPrefs}
                className="px-2.5 py-1.5 bg-indigo-550/10 hover:bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer select-none disabled:opacity-50"
              >
                {isSavingPrefs ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : prefSaveSuccess ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Locked!
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3" /> Lock Current
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-col gap-3 pt-2 border-t border-slate-900/50 mt-1">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">Syntax Highlighting Colors</span>
                  <p className="text-[9px] text-slate-500 font-sans leading-none mt-0.5">Render prompt outputs with syntax color styles. Disable for a clean, plain text view.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-450 uppercase font-bold">{enableHighlighting ? "Enabled" : "Disabled (Plain)"}</span>
                  <button
                    type="button"
                    onClick={() => setEnableHighlighting(!enableHighlighting)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enableHighlighting ? "bg-sky-500" : "bg-slate-800"
                    }`}
                    title="Toggle syntax highlighting on or off"
                    id="toggle-syntax-highlighting"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enableHighlighting ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* HISTORICAL PROMPT RECORD VAULT */}
          <div className="p-6 rounded-2xl bg-slate-950/45 border border-slate-900/60 flex flex-col gap-4 backdrop-blur-lg shadow-xl shadow-slate-950/10">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-sky-450" />
                <h2 className="font-display font-bold text-xs text-slate-200 font-semibold font-display">Prompt History</h2>
              </div>
              <span className="text-[9px] font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded uppercase font-bold">
                {historyItems.length} Saved
              </span>
            </div>

            {/* History Search filter */}
            {historyItems.length > 0 && (
              <input
                type="text"
                placeholder="Search history records..."
                value={searchHistoryQuery}
                onChange={(e) => setSearchHistoryQuery(e.target.value)}
                className="w-full bg-[#0c1222]/35 border border-slate-850/60 text-xs text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:outline-none font-sans backdrop-blur-sm placeholder-slate-600"
              />
            )}

            {historyError ? (
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/20 text-xs text-red-400">
                {historyError}
              </div>
            ) : isLoadingHistory ? (
              <div className="text-center py-6 text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin text-sky-400" /> Syncing history...
              </div>
            ) : historyItems.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-sans text-xs border border-dashed border-slate-900/40 rounded-xl p-4 leading-normal">
                Optimize prompts to save secure session records here.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {historyItems
                  .filter(item => {
                    const term = searchHistoryQuery.trim().toLowerCase();
                    if (!term) return true;
                    return (
                      item.roughRequest.toLowerCase().includes(term) ||
                      item.optimizedPrompt.toLowerCase().includes(term) ||
                      (item.domain || "").toLowerCase().includes(term) ||
                      (item.targetAI || "").toLowerCase().includes(term)
                    );
                  })
                  .slice(0, 10)
                  .map((item) => (
                    <div 
                      key={item.id} 
                      className="p-3 rounded-xl bg-slate-950/30 hover:bg-[#0c1222]/50 border border-slate-900/50 hover:border-slate-800 transition-all flex flex-col gap-1.5 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-mono bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded font-bold">
                            {item.targetAI || "Other"}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">•</span>
                          <span className="text-[9px] font-mono text-slate-400 font-bold">
                            {item.domain || "General"}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">•</span>
                          <span className="text-[9px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/15 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Cpu className="w-2.5 h-2.5 shrink-0" />
                            {Math.ceil((item.optimizedPrompt || "").length / 4.1)} tkns
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetAI(item.targetAI || "ChatGPT");
                              setDomain(item.domain || "General");
                              setTone(item.tone || "Professional");
                              setRoughRequest(item.roughRequest);
                              setOriginalRequestForDiff(item.roughRequest);
                              setResponse({
                                modeUsed: item.modeUsed || "BASIC",
                                optimizedPrompt: item.optimizedPrompt,
                                proTip: item.proTip || null,
                                improvements: item.improvements || null,
                                techniquesApplied: item.techniquesApplied || null
                              });
                              setErrorMessage(null);
                            }}
                            className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 text-[9px] font-mono transition-colors cursor-pointer"
                            title="Load prompt state"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm("Permanently delete this prompt record?")) {
                                try {
                                  await deleteDoc(doc(db, "users", String(user.id), "optimizations", item.id));
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.DELETE, `users/${user.id}/optimizations/${item.id}`);
                                }
                              }
                            }}
                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 transition-colors cursor-pointer border border-red-500/10"
                            title="Delete record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-350 line-clamp-2 leading-relaxed font-sans">
                        {item.roughRequest}
                      </p>

                      <div className="text-[9px] font-mono text-slate-600 text-left">
                        {new Date(item.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })} • {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </section>


        {/* RIGHT COLUMN: Active Response Panel (7 Columns) */}
        <section className="lg:col-span-7 flex flex-col gap-6">

          {/* ACTIVE QUEUED / EXECUTED VIEW */}
          {!response && !isLoading ? (
            <div className="flex-1 rounded-2xl bg-slate-950/30 border border-slate-900/40 border-dashed p-10 flex flex-col items-center justify-center text-center backdrop-blur-md">
              <Zap className="w-10 h-10 text-slate-600 animate-pulse mb-4" />
              <h3 className="font-display font-medium text-slate-400 text-sm">Awaiting Instruction Stream</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-normal">
                Input your rough request, tune target variables in the parameters panel, and submit to compile dynamic prompts.
              </p>
            </div>
          ) : isLoading ? (
            /* LOADING INTERMEDIATE SHIELD */
            <div className="flex-1 rounded-2xl bg-slate-950/45 border border-slate-900/60 p-8 flex flex-col items-center justify-center text-center backdrop-blur-lg shadow-xl shadow-slate-950/10">
              <div className="relative mb-6">
                <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-sky-500 animate-spin"></div>
                <Sparkles className="w-5 h-5 text-sky-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="font-mono text-xs text-sky-400 font-bold">DECONSTRUCTING USER INPUT INTENT...</p>
              <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed font-sans">
                NEXA is evaluating your domain parameters, cataloging potential context omissions, and mapping targeted structural schemas inside Gemini.
              </p>
            </div>
          ) : response?.clarifyingQuestions ? (
            
            /* ACTIVE DETAIL QUESTIONNAIRE CARD SYSTEM */
            <div className="flex-1 rounded-2xl bg-slate-950/45 border border-slate-900/60 p-6 flex flex-col justify-between text-left backdrop-blur-lg shadow-xl shadow-slate-950/10">
              <div>
                <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-5">
                  <div className="flex items-center gap-2 text-amber-500">
                    <HelpCircle className="w-5 h-5 text-amber-400" />
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest font-extrabold block text-amber-400">DETAIL Mode Active (Questions)</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 select-all">Mode: {response.modeUsed}</span>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-slate-350 leading-relaxed mb-6">
                  💡 NEXA deconstructed your rough engineering spec and flagged critical parameter openings. To complete optimization, answer the context queries below:
                </div>

                <div className="space-y-5">
                  {response.clarifyingQuestions.map((q) => (
                    <div key={q.id} className="text-left space-y-1.5">
                      <label className="block text-xs font-medium text-slate-200">{q.question}</label>
                      <input
                        type="text"
                        value={questionAnswers[q.id]?.answer || ""}
                        onChange={(e) => {
                          setQuestionAnswers({
                            ...questionAnswers,
                            [q.id]: {
                              question: q.question,
                              answer: e.target.value
                            }
                          });
                        }}
                        className="w-full bg-[#0c1222]/35 border border-slate-850/60 text-xs text-slate-200 rounded-lg p-3 focus:border-sky-500 focus:outline-none font-sans backdrop-blur-sm"
                        placeholder="Type answer or modify suggested response..."
                      />
                      <span className="block text-[10px] text-slate-500 italic">Smart Suggestion: {q.defaultAnswer}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-900 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setResponse(null)}
                  className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 text-xs font-mono transition-colors cursor-pointer"
                >
                  ← Go Back
                </button>
                <button
                  type="button"
                  disabled={tokenStatus?.reachedLimit && !tokenStatus?.isOwner}
                  onClick={handleAnswerSubmit}
                  className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  Compile Final Prompt <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          ) : (
            
            /* COMPILED OPTIMIZATION WRAPPER OUTPUT */
            <div className="flex-1 rounded-2xl bg-slate-950/45 border border-slate-900/60 p-6 flex flex-col gap-6 text-left backdrop-blur-lg shadow-xl shadow-slate-950/10">
              
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2 text-sky-400">
                  <CheckCircle2 className="w-5 h-5 text-sky-400" />
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest font-extrabold block">NEXA Compilation Successful</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 select-all">Format: {response.modeUsed} || {targetAI}</span>
                  <button
                    type="button"
                    onClick={() => setIsFullScreenPrompt(true)}
                    className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 cursor-pointer font-bold transition-all select-none"
                    title="Enable Full Screen / Focus view"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Full Screen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponse(null)}
                    className="text-[10px] font-mono px-2 py-0.5 text-slate-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Close Result
                  </button>
                </div>
              </div>

              {/* Your Optimized Prompt Box or Side-by-Side Comparison */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-900/80 pb-2 mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold block">Response Output Format</span>
                    <button
                      type="button"
                      onClick={() => setIsFullScreenPrompt(true)}
                      className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-850 text-slate-450 hover:text-white border border-slate-800 transition-all cursor-pointer font-bold select-none"
                      title="Maximize prompt display"
                    >
                      <Maximize2 className="w-3 h-3 text-sky-400 animate-pulse" />
                      <span>Full Screen Mode</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-900 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setPromptViewStyle("clean")}
                      className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                        promptViewStyle === "clean"
                          ? "bg-slate-900 text-sky-450 shadow border border-slate-800/80 font-bold"
                          : "text-slate-500 hover:text-slate-350"
                      }`}
                    >
                      Optimized Text Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromptViewStyle("diff")}
                      className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                        promptViewStyle === "diff"
                          ? "bg-slate-900 text-sky-450 shadow border border-slate-800/80 font-bold"
                          : "text-slate-500 hover:text-slate-350"
                      }`}
                    >
                      <GitCompare className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      Side-by-Side Diff Compare
                    </button>
                  </div>
                </div>

                {promptViewStyle === "clean" ? (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold block">Your Optimized Prompt:</span>
                        <div className="flex items-center gap-1 bg-sky-950/40 border border-sky-500/20 px-2 py-0.5 rounded-lg text-sky-400 font-mono text-[9px]">
                          <Cpu className="w-2.5 h-2.5 text-sky-450 animate-pulse shrink-0" />
                          <span>Estimated Tokens: <strong className="text-sky-300 font-extrabold">{Math.ceil((response.optimizedPrompt || "").length / 4.1)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-900">
                          <span className="text-[8px] font-mono text-slate-500 uppercase select-none font-bold">Syntax:</span>
                          <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="bg-transparent text-sky-450 border-none px-1 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:text-sky-300 outline-none transition-all font-bold"
                          >
                            <option value="auto" className="bg-slate-950 text-slate-300">Auto ({highlightLanguage})</option>
                            <option value="markdown" className="bg-slate-950 text-slate-300">Markdown</option>
                            <option value="javascript" className="bg-slate-950 text-slate-300">JavaScript</option>
                            <option value="python" className="bg-slate-950 text-slate-300">Python</option>
                            <option value="sql" className="bg-slate-950 text-slate-300">SQL</option>
                            <option value="json" className="bg-slate-950 text-slate-300">JSON</option>
                            <option value="yaml" className="bg-slate-950 text-slate-300">YAML</option>
                            <option value="bash" className="bg-slate-950 text-slate-300">Shell/Bash</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(response.optimizedPrompt || "")}
                        className="p-1 px-3 rounded bg-slate-900 border border-slate-850 hover:bg-slate-850 transition-colors text-[10px] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer font-mono"
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied to Clipboard
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy to Clipboard
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative group/prompt overflow-hidden w-full min-w-0">
                      {enableHighlighting ? (
                        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }} className={`language-${highlightLanguage} p-4 pr-12 rounded-xl bg-[#030610]/40 border border-slate-950/50 text-sm text-slate-200 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words leading-relaxed min-h-[400px] max-h-[60vh] select-all select-none backdrop-blur-sm w-full`}>
                          <code
                            className={`language-${highlightLanguage}`}
                            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}
                            dangerouslySetInnerHTML={{
                              __html: (() => {
                                const code = response.optimizedPrompt || "";
                                const grammar = Prism.languages[highlightLanguage];
                                if (grammar) {
                                  return Prism.highlight(code, grammar, highlightLanguage);
                                }
                                return Prism.highlight(code, Prism.languages.markdown || Prism.languages.markup, "markdown");
                              })()
                            }}
                          />
                        </pre>
                      ) : (
                        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }} className="p-4 pr-12 rounded-xl bg-[#030610]/40 border border-slate-950/50 text-sm text-slate-200 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words leading-relaxed min-h-[400px] max-h-[60vh] select-all select-none backdrop-blur-sm font-sans w-full">
                          <code className="text-slate-200">{response.optimizedPrompt || ""}</code>
                        </pre>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(response.optimizedPrompt || "")}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:bg-slate-850 hover:text-white transition-all text-slate-400 cursor-pointer shadow-md flex items-center justify-center"
                        title="Copy to Clipboard"
                      >
                        {copiedPrompt ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* ── LAUNCH ON AI PLATFORM BUTTONS ─────────────────── */}
                    <div className="mt-4 flex flex-col gap-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                        Open Prompt In:
                      </span>
                      <div className="flex flex-wrap gap-2">

                        {/* ChatGPT */}
                        <button
                          type="button"
                          onClick={() => {
                            const prompt = response.optimizedPrompt || "";
                            if (!prompt.trim()) return;
                            navigator.clipboard.writeText(prompt).catch(() => {});
                            const encoded = encodeURIComponent(prompt.slice(0, 2000));
                            window.open(`https://chatgpt.com/?q=${encoded}`, "_blank", "noopener,noreferrer");
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#10a37f]/10 hover:bg-[#10a37f]/20 border border-[#10a37f]/30 hover:border-[#10a37f]/60 text-[#10a37f] text-xs font-semibold font-mono transition-all duration-200 cursor-pointer select-none group"
                          title="Copy prompt and open in ChatGPT"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.759a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                          </svg>
                          <span>ChatGPT</span>
                          <span className="text-[9px] text-[#10a37f]/60 group-hover:text-[#10a37f]/80 font-normal">↗</span>
                        </button>

                        {/* Claude */}
                        <button
                          type="button"
                          onClick={() => {
                            const prompt = response.optimizedPrompt || "";
                            if (!prompt.trim()) return;
                            navigator.clipboard.writeText(prompt).catch(() => {});
                            window.open(`https://claude.ai/new`, "_blank", "noopener,noreferrer");
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#da7756]/10 hover:bg-[#da7756]/20 border border-[#da7756]/30 hover:border-[#da7756]/60 text-[#da7756] text-xs font-semibold font-mono transition-all duration-200 cursor-pointer select-none group"
                          title="Copy prompt and open in Claude — paste with Ctrl+V"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.304 1.01C13.935 1.01 11.61 2.973 10.31 5.08c-.5-.327-1.103-.59-1.83-.723-.977-.178-2.031-.09-3.078.417C3.003 6.053 1.7 8.46 1.928 11.45c.055.718.224 1.458.516 2.188l.026.065c.37.93.574 1.647.574 2.27 0 .55-.17.973-.524 1.363-.493.543-.636 1.287-.448 2.07.185.769.65 1.358 1.19 1.698.782.49 1.643.537 2.283.266.377-.16.757-.468 1.052-.956.174-.286.34-.68.442-1.226.105-.556.26-.886.422-1.097.133-.174.3-.295.54-.395.228-.095.43-.102.626-.015.198.088.345.261.446.502.17.408.22.978.17 1.718-.042.622.056 1.218.323 1.728.32.613.847 1.025 1.537 1.143 1.06.183 1.955-.185 2.533-.825.538-.595.8-1.35.786-2.097-.01-.573-.165-1.063-.302-1.404-.244-.608-.38-1.105-.38-1.55 0-.452.14-.903.4-1.362.357-.626.923-1.198 1.628-1.684 1.65-1.14 2.63-2.774 2.818-4.471.166-1.512-.267-2.834-.973-3.795-.718-.98-1.747-1.62-2.863-1.852-.338-.07-.682-.1-1.025-.1zm-4.19 7.673a.75.75 0 0 1 .96.456l2.435 6.968.842-2.265a.75.75 0 0 1 .703-.488h2.43a.75.75 0 0 1 0 1.5h-1.852l-1.414 3.802a.75.75 0 0 1-1.42-.036l-2.398-6.861-.917 2.194a.75.75 0 0 1-.69.457H9.903a.75.75 0 1 1 0-1.5h1.408l1.547-3.698a.75.75 0 0 1 .256-.529z"/>
                          </svg>
                          <span>Claude</span>
                          <span className="text-[9px] text-[#da7756]/60 group-hover:text-[#da7756]/80 font-normal">↗ paste prompt</span>
                        </button>

                        {/* Gemini */}
                        <button
                          type="button"
                          onClick={() => {
                            const prompt = response.optimizedPrompt || "";
                            if (!prompt.trim()) return;
                            navigator.clipboard.writeText(prompt).catch(() => {});
                            const encoded = encodeURIComponent(prompt.slice(0, 2000));
                            window.open(`https://gemini.google.com/app?q=${encoded}`, "_blank", "noopener,noreferrer");
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4285f4]/10 hover:bg-[#4285f4]/20 border border-[#4285f4]/30 hover:border-[#4285f4]/60 text-[#4285f4] text-xs font-semibold font-mono transition-all duration-200 cursor-pointer select-none group"
                          title="Copy prompt and open in Gemini"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 24A14.232 14.232 0 0 1 9.7 9.7 14.235 14.235 0 0 1 24 12a14.232 14.232 0 0 1-14.3 2.3A14.235 14.235 0 0 1 12 24zm0-24a14.232 14.232 0 0 1 2.3 14.3A14.235 14.235 0 0 1 0 12 14.232 14.232 0 0 1 14.3 9.7 14.235 14.235 0 0 1 12 0z"/>
                          </svg>
                          <span>Gemini</span>
                          <span className="text-[9px] text-[#4285f4]/60 group-hover:text-[#4285f4]/80 font-normal">↗</span>
                        </button>

                      </div>
                      <p className="text-[9px] font-mono text-slate-600 leading-normal">
                        Prompt is copied to clipboard automatically. Claude requires manual paste (Ctrl+V / ⌘+V).
                      </p>
                    </div>
                    {/* ── END PLATFORM BUTTONS ───────────────────────────── */}

                  </div>
                ) : (
                  /* GORGEOUS INSIGHTFUL SIDE-BY-SIDE DIFF PANELS */
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-900/60">
                      <div className="text-left font-sans">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-sky-500" /> NEXA Impact Analyzer
                        </span>
                        <p className="text-[11px] text-slate-400/80 leading-normal mt-0.5">
                          Our Develop stage expands, specifies constraints, and enforces optimal prompt instructions. Toggle impact lines to highlight optimized sectors.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center bg-slate-950 p-1.5 px-3 rounded-lg border border-slate-900 shadow">
                        <span className="text-[10px] text-slate-300 font-bold select-none font-sans uppercase tracking-widest text-[9px]">Highlight Changed Lines</span>
                        <button
                          type="button"
                          onClick={() => setHighlightImpactLines(!highlightImpactLines)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            highlightImpactLines ? "bg-sky-500" : "bg-slate-800"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 transition duration-200 ease-in-out ${
                              highlightImpactLines ? "translate-x-4 bg-white font-bold" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Left Block: Original Rough Request with removed highlight */}
                      <div className="flex flex-col rounded-xl bg-[#030610]/20 border border-slate-900/60 overflow-hidden text-xs">
                        <div className="bg-red-950/20 px-3 py-2 border-b border-red-950/40 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider font-extrabold text-red-400">
                          <span>1. Original Input</span>
                          <div className="flex items-center gap-2">
                            <span className="bg-red-500/10 px-1.5 py-0.5 rounded text-[9px] border border-red-500/15">{originalRequestForDiff ? Math.ceil(originalRequestForDiff.length / 4.1) : 0} Tokens</span>
                            <span>{originalRequestForDiff ? originalRequestForDiff.length : 0} Chars</span>
                          </div>
                        </div>
                        
                        {renderDiffContent(true, false)}
                      </div>

                      {/* Right Block: Expanded Output with green highlights */}
                      <div className="flex flex-col rounded-xl bg-[#030610]/20 border border-slate-900/60 overflow-hidden text-xs relative group/diff-pane">
                        <div className="bg-emerald-950/20 px-3 py-2 border-b border-emerald-950/40 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider font-extrabold text-emerald-400">
                          <span>2. Optimized Output</span>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] border border-emerald-550/15">{response.optimizedPrompt ? Math.ceil(response.optimizedPrompt.length / 4.1) : 0} Tokens</span>
                            <span>{response.optimizedPrompt ? response.optimizedPrompt.length : 0} Chars</span>
                          </div>
                        </div>
                        
                        {renderDiffContent(false, false)}

                        {/* Direct floating copy action */}
                        <button
                          type="button"
                          onClick={() => handleCopy(response.optimizedPrompt || "")}
                          className="absolute bottom-3 right-3 p-1 px-2.5 rounded bg-slate-950/90 border border-slate-800 hover:bg-slate-900 text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-md"
                        >
                          {copiedPrompt ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Output
                            </>
                          )}
                        </button>
                      </div>

                    </div>

                    {/* Diff Expansion Metrics Banner */}
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-900/80 text-[10px] text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-mono">
                      <span className="uppercase tracking-wider font-bold text-slate-400">🔥 NEXA Expansion Intelligence:</span>
                      <div className="flex flex-wrap items-center gap-2 text-slate-350">
                        <span>Input: <strong className="text-red-400/80">{originalRequestForDiff ? originalRequestForDiff.trim().split(/\s+/).length : 0} words</strong></span>
                        <span className="text-slate-600">•</span>
                        <span>Output: <strong className="text-emerald-450 font-bold">{response.optimizedPrompt ? response.optimizedPrompt.trim().split(/\s+/).length : 0} words</strong></span>
                        <span className="text-slate-600">•</span>
                        <span>Space Factor: <strong className="text-sky-400 font-extrabold">x{originalRequestForDiff ? (response.optimizedPrompt.length / (originalRequestForDiff.length || 1)).toFixed(1) : "0"} expansion</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Token Estimation Counter Widget */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900/60 backdrop-blur-md space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-900/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-sky-450 animate-pulse" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold">NEXA Token Assessment & API Resource Forecast</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">Industry standard sub-unit costings</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#030610]/40 p-3 rounded-xl border border-slate-900/80 flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-slate-450 uppercase font-semibold">Calculated Tokens</span>
                    <span className="text-xl font-bold font-mono text-sky-400 mt-1">
                      {Math.ceil((response.optimizedPrompt || "").length / 4.1)}
                    </span>
                    <span className="text-[8px] text-slate-500 mt-1 font-mono">1 token ≈ 4.1 chars (EN)</span>
                  </div>

                  <div className="bg-[#030610]/40 p-3 rounded-xl border border-slate-900/80 flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-slate-450 uppercase font-semibold">Total Words</span>
                    <span className="text-xl font-bold font-mono text-slate-350 mt-1">
                      {(response.optimizedPrompt || "").trim() ? (response.optimizedPrompt || "").trim().split(/\s+/).length : 0}
                    </span>
                    <span className="text-[8px] text-slate-500 mt-1 font-mono">Word count metric</span>
                  </div>

                  <div className="bg-[#030610]/40 p-3 rounded-xl border border-slate-900/80 flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-slate-450 uppercase font-semibold">Character Count</span>
                    <span className="text-xl font-bold font-mono text-slate-350 mt-1">
                      {(response.optimizedPrompt || "").length}
                    </span>
                    <span className="text-[8px] text-slate-500 mt-1 font-mono">Bytes & spacing depth</span>
                  </div>

                  <div className="bg-[#030610]/40 p-3 rounded-xl border border-slate-900/80 flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-slate-450 uppercase font-semibold">Approx. Cost (USD)</span>
                    <span className="text-sm font-extrabold font-mono text-emerald-450 mt-1">
                      ${((Math.ceil((response.optimizedPrompt || "").length / 4.1) * 0.075) / 1000000).toLocaleString(undefined, { minimumFractionDigits: 7, maximumFractionDigits: 7 })}
                    </span>
                    <span className="text-[8px] text-slate-500 mt-1 font-mono">Gemini 1.5 Flash reference</span>
                  </div>
                </div>

                <div className="text-[9px] text-slate-400 flex items-center gap-2 font-mono bg-slate-950/20 p-2 rounded-lg border border-slate-900/30">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-ping"></span>
                  <span><strong>Developer Hint</strong>: Lower token usage results in quicker generation latencies & significantly minimized API request expenses.</span>
                </div>

                {/* Recharts Token Consumption History Line Chart */}
                <div className="border-t border-slate-900/80 pt-3 mt-1.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold block">Consumption Analytics</span>
                    {historyItems.length > 0 && (
                      <span className="text-[8px] font-mono text-slate-500 uppercase font-bold bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-900">
                        {Math.min(historyItems.length, 20)} of {historyItems.length} generations
                      </span>
                    )}
                  </div>
                  
                  <div className="h-[190px] w-full relative flex items-center justify-center">
                    {(() => {
                      const reversedHistory = [...historyItems]
                        .slice(0, 20)
                        .reverse();

                      const chartData = reversedHistory.map((item, idx) => {
                        const tokens = Math.ceil((item.optimizedPrompt || "").length / 4.1);
                        const dateObj = item.timestamp ? new Date(item.timestamp) : new Date();
                        return {
                          index: idx + 1,
                          time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          date: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                          tokens: tokens,
                          chars: (item.optimizedPrompt || "").length,
                          domain: item.domain || "General",
                          targetAI: item.targetAI || "ChatGPT"
                        };
                      });

                      if (chartData.length === 0) {
                        return (
                          <div className="absolute inset-0 flex flex-col items-center justify-center border border-dashed border-slate-900/60 rounded-xl bg-slate-950/20 p-4 text-center">
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-0.5 font-bold">No historical data yet</span>
                            <p className="text-[8px] text-slate-600 max-w-[250px] font-sans leading-normal">
                              Optimized prompts added to your history will construct token utilisation charts.
                            </p>
                          </div>
                        );
                      }

                      const CustomTooltip = ({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const isClicked = selectedChartPoint && selectedChartPoint.time === data.time && selectedChartPoint.date === data.date;
                          
                          // Custom localized recommendation generator
                          const getHint = (dom: string, tgt: string) => {
                            const d = dom.toLowerCase();
                            const t = tgt.toLowerCase();
                            if (t.includes("chatgpt")) {
                              if (d.includes("program") || d.includes("dev") || d.includes("sql")) return "Optimized system role reduces context token boilerplate.";
                              return "Generates precise formatting rules for ChatGPT parser.";
                            }
                            if (t.includes("claude")) {
                              return "XML tags included to maximize Claude prompt compliance.";
                            }
                            if (t.includes("gemini")) {
                              return "Structured declaration matches Gemini context layout.";
                            }
                            return "4-D optimized structures minimize platform call latency.";
                          };

                          return (
                            <div className={`bg-slate-950 p-2.5 rounded-lg border shadow-2xl text-[9px] font-mono space-y-1 transition-all ${
                              isClicked ? "border-sky-500 ring-1 ring-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.25)]" : "border-slate-800"
                            }`}>
                              {isClicked && (
                                <div className="text-sky-400 font-extrabold text-[7px] tracking-widest uppercase mb-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse"></span>
                                  Selected Generation Node
                                </div>
                              )}
                              <div className="text-slate-400 font-bold border-b border-slate-900 pb-0.5 mb-1 text-[8px] uppercase flex items-center justify-between">
                                <span>{data.date} • {data.time}</span>
                                {isClicked && <span className="text-sky-400 text-[6px] border border-sky-950 px-1 rounded">ACTIVE</span>}
                              </div>
                              <div className="flex items-center gap-3 justify-between">
                                <span className="text-slate-500">Tokens:</span>
                                <span className="text-sky-400 font-extrabold">{data.tokens}</span>
                              </div>
                              <div className="flex items-center gap-3 justify-between">
                                <span className="text-slate-500">Domain:</span>
                                <span className="text-slate-300 font-medium">{data.domain}</span>
                              </div>
                              <div className="flex items-center gap-3 justify-between">
                                <span className="text-slate-500">Target:</span>
                                <span className="text-slate-350 font-medium">{data.targetAI}</span>
                              </div>
                              
                              <div className="pt-1 mt-1 border-t border-slate-900/60 text-[7.5px] text-slate-400 leading-normal max-w-[170px]">
                                <span className="text-slate-500 font-bold uppercase tracking-wider block text-[6.5px]">Optimization Hint:</span>
                                {getHint(data.domain, data.targetAI)}
                              </div>

                              <div className="text-[7px] text-slate-500 text-center pt-0.5 border-t border-slate-950">
                                Click node to pin breakdown
                              </div>
                            </div>
                          );
                        }
                        return null;
                      };

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart 
                            data={chartData} 
                            margin={{ top: 8, right: 8, left: -24, bottom: 5 }}
                            style={{ cursor: 'pointer' }}
                            onClick={(state: any) => {
                              if (state && state.activePayload && state.activePayload.length) {
                                const payloadData = state.activePayload[0].payload;
                                setSelectedChartPoint(payloadData);
                              }
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#0c0e17" vertical={false} />
                            <XAxis 
                              dataKey="time" 
                              stroke="#334155" 
                              fontSize={8} 
                              fontFamily="monospace"
                              tickLine={false}
                              axisLine={{ stroke: '#0f172a' }}
                            />
                            <YAxis 
                              stroke="#334155" 
                              fontSize={8} 
                              fontFamily="monospace"
                              tickLine={false}
                              axisLine={{ stroke: '#0f172a' }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#1e293b', strokeWidth: 1 }} />
                            <Line 
                              type="monotone" 
                              dataKey="tokens" 
                              stroke="#38bdf8" 
                              strokeWidth={1.5}
                              dot={{ r: 2.5, fill: '#030610', stroke: '#38bdf8', strokeWidth: 1.5 }}
                              activeDot={{ r: 4, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 1 }}
                            />
                            <Brush
                              dataKey="time"
                              height={18}
                              stroke="#334155"
                              fill="#090d16"
                              tickFormatter={() => ""}
                              travellerWidth={6}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>

                {/* Clicked Data Node Details Display */}
                {selectedChartPoint && (
                  <div className="bg-slate-950/60 border border-sky-950/40 p-2.5 rounded-xl space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]"></span>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">Selected Node Breakdown</span>
                      </div>
                      <button 
                        onClick={() => setSelectedChartPoint(null)}
                        className="text-[8px] font-mono text-slate-500 hover:text-slate-350 transition-colors uppercase px-1.5 py-0.5 rounded hover:bg-slate-900 border border-transparent hover:border-slate-800"
                        title="Clear selection"
                      >
                        [clear]
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-left">
                      <div className="bg-slate-950/80 p-1.5 rounded border border-slate-900">
                        <span className="text-[8px] font-mono text-slate-500 uppercase block">Timestamp</span>
                        <span className="text-[10px] font-medium text-slate-300 font-mono">
                          {selectedChartPoint.date} {selectedChartPoint.time}
                        </span>
                      </div>
                      <div className="bg-slate-950/80 p-1.5 rounded border border-slate-900">
                        <span className="text-[8px] font-mono text-slate-500 uppercase block">Domain Mode</span>
                        <span className="text-[10px] font-extrabold text-sky-350 font-mono uppercase">
                          {selectedChartPoint.domain}
                        </span>
                      </div>
                      <div className="bg-slate-950/80 p-1.5 rounded border border-slate-900">
                        <span className="text-[8px] font-mono text-slate-500 uppercase block">Target Engine</span>
                        <span className="text-[10px] font-extrabold text-blue-350 font-mono">
                          {selectedChartPoint.targetAI}
                        </span>
                      </div>
                      <div className="bg-slate-950/80 p-1.5 rounded border border-slate-900">
                        <span className="text-[8px] font-mono text-slate-500 uppercase block">Token Volume</span>
                        <span className="text-[10px] font-extrabold text-emerald-450 font-mono">
                          {selectedChartPoint.tokens} <span className="text-[8px] text-slate-500 font-normal">tokens</span>
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950/90 p-2 rounded border border-slate-900/60 text-[9px] text-slate-300 leading-relaxed font-sans">
                      <span className="text-sky-400 font-bold font-mono tracking-wide text-[8px] uppercase block mb-0.5">Engine Context Optimization Strategy:</span>
                      {(() => {
                        const dom = (selectedChartPoint.domain || "").toLowerCase();
                        const tgt = (selectedChartPoint.targetAI || "").toLowerCase();
                        if (tgt.includes("chatgpt")) {
                          if (dom.includes("program") || dom.includes("dev") || dom.includes("sql") || dom.includes("data")) {
                            return "GPT-4o optimization bias: Strips unnecessary prompt boilerplate, optimizes code indentation and leverages inline JSON schemas efficiently.";
                          }
                          if (dom.includes("market") || dom.includes("cop") || dom.includes("creative")) {
                            return "GPT-4o creative context bias: Prefers short persuasive templates. Optimized system guidelines restrict token bloat and hallucination vectors.";
                          }
                          return "ChatGPT standard: Minimizes input formatting guidelines to ensure robust system instructions persist uniformly across standard conversation streams.";
                        }
                        if (tgt.includes("claude")) {
                          if (dom.includes("program") || dom.includes("dev") || dom.includes("sql") || dom.includes("data")) {
                            return "Claude 3.5 Sonnet structure: Harnesses XML tags (<code_block>, <instructions>) as logical barriers. Keeps technical parameters strictly separate.";
                          }
                          return "Claude optimization logic: Injects clear tags for variables and systemic requirements to maximize the reasoning index of Opus and Sonnet engines.";
                        }
                        if (tgt.includes("gemini")) {
                          return "Gemini 1.5 Flash/Pro logic: Places core instruction directives at the absolute top of the system prompt to scale up instruction compliance across deep context windows.";
                        }
                        return "General LLM configuration: Integrates strict semantic anchors to suppress redundant markdown fluff and keep production pricing parameters nominal.";
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Bullet Improvements */}
              {response.improvements && response.improvements.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold block mb-2">Key Improvements:</span>
                  <ul className="space-y-1.5">
                    {response.improvements.map((imp, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Techniques Applied list */}
              {response.techniquesApplied && response.techniquesApplied.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold block mb-1.5">Techniques Applied:</span>
                  <div className="flex flex-wrap gap-2">
                    {response.techniquesApplied.map((tech, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-850 text-slate-400">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Expert Pro Tip */}
              {response.proTip && (
                <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/10 text-xs">
                  <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest font-extrabold block mb-1">PRO ENGINEER PRO TIP</span>
                  <span className="text-slate-300 leading-relaxed font-sans block">{response.proTip}</span>
                </div>
              )}

              {/* Interactive Workspace Rating & Anonymous Feedback */}
              <div className="pt-4 border-t border-slate-900 mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold block">Rate NEXA Optimization Outcome</span>
                    <span className="text-[10px] text-slate-400 leading-snug">Feedback is collected 100% anonymously. No prompt content or user details are preserved.</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      key="up-btn"
                      type="button"
                      onClick={() => setFeedbackRating("up")}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        feedbackRating === "up" 
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
                          : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-205"
                      }`}
                      title="Thumbs Up - Met requirements"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      key="down-btn"
                      type="button"
                      onClick={() => setFeedbackRating("down")}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        feedbackRating === "down" 
                          ? "bg-red-500/20 border-red-500 text-red-500" 
                          : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-205"
                      }`}
                      title="Thumbs Down - Missing details"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {feedbackRating && !feedbackSubmitted && (
                  <div className="space-y-3">
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Optional: What could NEXA do better? e.g. target formatting, tone tweaks..."
                      className="w-full h-16 bg-[#0c1222]/35 border border-slate-850/60 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:border-sky-500 focus:outline-none resize-none leading-relaxed backdrop-blur-sm"
                    />
                    <div className="flex items-center justify-between">
                      {feedbackError ? (
                        <span className="text-[10px] text-red-400 font-mono font-semibold">{feedbackError}</span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                          <span>No credentials saved.</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleFeedbackSubmit}
                        className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        Submit Anonymously <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {feedbackSubmitted && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Telemetry dispatched successfully. Thank you for contributing to NEXA's model routing accuracy!
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Anonymized Community Telemetry Log */}
          {communityFeedbacks.length > 0 && (
            <div className="p-6 rounded-2xl bg-slate-950/30 border border-slate-900/50 flex flex-col gap-4 text-left backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block">Anonymous Telemetry Log</span>
                </div>
                <span className="text-[9px] font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded uppercase font-semibold">Decentralized Stream</span>
              </div>
              
              <div className="space-y-2.5 max-h-48 overflow-y-auto">
                {communityFeedbacks.slice(0, 4).map((f: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-950/25 border border-slate-900/40 flex items-start gap-2.5 text-xs backdrop-blur-sm">
                    <span className="shrink-0 mt-0.5">
                      {f.rating === "up" ? (
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                      )}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        <span className="text-slate-400 font-bold">{f.domain || "General"}</span>
                        <span>•</span>
                        <span>{f.targetAI || "ChatGPT"}</span>
                        <span>•</span>
                        <span>{new Date(f.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      {f.comment && (
                        <p className="text-slate-350 italic text-[11px] leading-relaxed">{f.comment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-slate-500 leading-snug">
                This diagnostic output records ratings and comments for continuous pattern reinforcement. All prompt configurations are discarded immediately upon session close to guard secret properties.
              </p>
            </div>
          )}

        </section>

      </main>

      {/* SYSTEM REQUIRED ABOUT US POPUP AND ON FIRST TIME APP LOG IN */}
      {showWelcome && (
        <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full bg-slate-950/65 border border-slate-900/80 p-5 sm:p-8 rounded-2xl shadow-2xl-strong text-left relative overflow-hidden backdrop-blur-xl max-h-[90vh] overflow-y-auto">
            {/* Design accents */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl"></div>

            <div className="flex items-center gap-3 border-b border-slate-900 pb-4 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-base text-white">About NEXA Optimizer</span>
                <span className="block text-[9px] font-mono text-sky-400 font-bold tracking-wider uppercase">CORE SERVICES SPECIFICATION</span>
              </div>
            </div>

            {/* PRECISE TEXT AS STIPULATED BY SPECIFICATIONS */}
            <pre className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed select-text p-4 bg-slate-900/40 rounded-xl border border-slate-900">
              {`Hello! I'm NEXA, your AI prompt optimizer. I transform vague requests into precise, effective prompts that deliver better results across any AI platform.
What I need to know:
- Target AI: ChatGPT, Claude, Gemini, or Other
- Prompt Style: DETAIL (clarifying questions first) or BASIC (quick optimization)
Examples:
- DETAIL using Claude — Write me a marketing email
- BASIC using ChatGPT — Help with my resume
- DETAIL using Gemini — Build a content strategy
Just share your rough prompt and I'll handle the rest!`}
            </pre>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWelcome(false)}
                className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow shadow-sky-500/10 selection:bg-sky-500"
              >
                Acknowledge & Access Optimizer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN PROMPT EXCLUSIVITY OUTCOME OVERLAY */}
      {isFullScreenPrompt && response && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-50">
          <div className="w-full h-full max-w-7xl max-h-[92vh] bg-slate-900/90 border border-slate-800 shadow-2xl rounded-2xl flex flex-col overflow-hidden backdrop-blur-xl relative">
            
            {/* Header section with telemetry and actions */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="font-display font-bold text-sm text-white tracking-wide">NEXA Focus Engine Pro</h3>
                  <span className="block text-[9px] font-mono text-sky-400 tracking-wider uppercase font-semibold text-left">Active Distraction-Free Context Exclusivity</span>
                </div>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-md border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPromptViewStyle("clean")}
                  className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                    promptViewStyle === "clean"
                      ? "bg-slate-805 text-sky-400 shadow border border-slate-700 font-bold"
                      : "text-slate-500 hover:text-slate-350"
                  }`}
                >
                  Optimized Text Only
                </button>
                <button
                  type="button"
                  onClick={() => setPromptViewStyle("diff")}
                  className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                    promptViewStyle === "diff"
                      ? "bg-slate-805 text-sky-400 shadow border border-slate-700 font-bold"
                      : "text-slate-500 hover:text-slate-350"
                  }`}
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  Side-by-Side Diff
                </button>
              </div>

              {/* Meta indicators & Minimize */}
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 select-all">
                  Engine: {targetAI || "Other"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsFullScreenPrompt(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-650 text-slate-200 hover:text-white text-xs font-mono transition-colors cursor-pointer select-none"
                  title="Close Full Screen [Esc]"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Focus [Esc]</span>
                </button>
              </div>
            </div>

            {/* Main scrollable body panel */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
              
              {/* Dynamic instruction box when in clean view */}
              {promptViewStyle === "clean" ? (
                <div className="h-full flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/65 p-3.5 rounded-xl border border-slate-900">
                    <div className="flex flex-wrap items-center gap-3 text-left">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold block">Your Optimized Prompt Result</span>
                      <div className="flex items-center gap-1 bg-sky-950/40 border border-sky-500/20 px-2 py-0.5 rounded text-sky-400 font-mono text-[9px]">
                        <Cpu className="w-2.5 h-2.5 text-sky-450 animate-pulse shrink-0" />
                        <span>Estimated Tokens: <strong className="text-sky-300 font-extrabold">{Math.ceil((response.optimizedPrompt || "").length / 4.1)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-850">
                        <span>Characters: <strong className="text-slate-300">{(response.optimizedPrompt || "").length}</strong></span>
                        <span>•</span>
                        <span>Words: <strong className="text-slate-300">{(response.optimizedPrompt || "").trim() ? (response.optimizedPrompt || "").split(/\s+/).length : 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-850">
                        <span className="text-[8px] font-mono text-slate-500 uppercase select-none font-bold">Syntax:</span>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="bg-transparent text-sky-450 border-none px-1 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:text-sky-300 outline-none transition-all font-bold"
                        >
                          <option value="auto" className="bg-slate-950 text-slate-300">Auto ({highlightLanguage})</option>
                          <option value="markdown" className="bg-slate-950 text-slate-300">Markdown</option>
                          <option value="javascript" className="bg-slate-950 text-slate-300">JavaScript</option>
                          <option value="python" className="bg-slate-950 text-slate-300">Python</option>
                          <option value="sql" className="bg-slate-950 text-slate-300">SQL</option>
                          <option value="json" className="bg-slate-950 text-slate-300">JSON</option>
                          <option value="yaml" className="bg-slate-950 text-slate-300">YAML</option>
                          <option value="bash" className="bg-slate-950 text-slate-300">Shell/Bash</option>
                        </select>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleCopy(response.optimizedPrompt || "")}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/10"
                    >
                      {copiedPrompt ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-950" /> Prompt Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy Prompt
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex-1 relative group/fullscreen-pre min-h-[500px]">
                    {enableHighlighting ? (
                      <pre className={`language-${highlightLanguage} w-full h-full p-6 pr-12 rounded-xl bg-[#030610]/60 border border-slate-950/70 text-sm sm:text-base text-slate-100 overflow-auto whitespace-pre-wrap leading-loose select-all font-mono backdrop-blur-sm shadow-inner`}>
                        <code
                          className={`language-${highlightLanguage}`}
                          dangerouslySetInnerHTML={{
                            __html: (() => {
                              const code = response.optimizedPrompt || "";
                              const grammar = Prism.languages[highlightLanguage];
                              if (grammar) {
                                return Prism.highlight(code, grammar, highlightLanguage);
                              }
                              return Prism.highlight(code, Prism.languages.markdown || Prism.languages.markup, "markdown");
                            })()
                          }}
                        />
                      </pre>
                    ) : (
                      <pre className="w-full h-full p-6 pr-12 rounded-xl bg-[#030610]/60 border border-slate-950/70 text-sm sm:text-base text-slate-100 overflow-auto whitespace-pre-wrap leading-loose select-all font-sans backdrop-blur-sm shadow-inner">
                        <code className="text-slate-205">{response.optimizedPrompt || ""}</code>
                      </pre>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopy(response.optimizedPrompt || "")}
                      className="absolute top-4 right-4 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:text-white transition-all text-slate-400 cursor-pointer shadow-lg flex items-center justify-center"
                      title="Copy to Clipboard"
                    >
                      {copiedPrompt ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* IN COMPARISON VIEW */
                <div className="space-y-6 h-full flex flex-col">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-900/60 font-sans">
                    <div className="text-left">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-slate-350 flex items-center gap-1.5 font-sans">
                        <Eye className="w-4 h-4 text-sky-450 animate-pulse" /> Fullscreen NEXA Impact Dashboard
                      </span>
                      <p className="text-xs text-slate-400 leading-normal mt-0.5 max-w-2xl font-sans text-left">
                        Our specialized Develop Optimizer analyzes input patterns to auto-flesh detailed descriptions, context parameters, and format guidelines. Toggle line-level highlighting to trace edits instantly.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center bg-slate-950 p-2 px-3 rounded-lg border border-slate-850 shadow">
                      <span className="text-[10px] text-slate-300 font-bold select-none uppercase tracking-widest text-[9px] font-sans">Highlight Changed Lines</span>
                      <button
                        type="button"
                        onClick={() => setHighlightImpactLines(!highlightImpactLines)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          highlightImpactLines ? "bg-sky-500" : "bg-slate-800"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 transition duration-200 ease-in-out ${
                            highlightImpactLines ? "translate-x-4 bg-white font-bold" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
                    
                    {/* Left: Original Input Block */}
                    <div className="flex flex-col rounded-xl bg-slate-950/40 border border-slate-800 overflow-hidden text-xs">
                      <div className="bg-red-950/20 px-4 py-3 border-b border-red-950/40 flex items-center justify-between text-xs font-mono uppercase tracking-wider font-extrabold text-red-400">
                        <span>1. Original Draft Spec</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-red-500/10 px-2 py-0.5 rounded border border-red-500/15">{originalRequestForDiff ? Math.ceil(originalRequestForDiff.length / 4.1) : 0} Tokens</span>
                          <span>{originalRequestForDiff ? originalRequestForDiff.length : 0} Chars</span>
                        </div>
                      </div>
                      
                      {renderDiffContent(true, true)}
                    </div>

                    {/* Right: Expanded/Optimized Output Block */}
                    <div className="flex flex-col rounded-xl bg-slate-950/40 border border-slate-850 overflow-hidden text-xs relative group/fullscreen-diff-pane">
                      <div className="bg-emerald-950/20 px-4 py-3 border-b border-emerald-950/40 flex items-center justify-between text-xs font-mono uppercase tracking-wider font-extrabold text-emerald-400">
                        <span>2. NEXA Expanded Structure</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-555/15">{response.optimizedPrompt ? Math.ceil(response.optimizedPrompt.length / 4.1) : 0} Tokens</span>
                          <span>{response.optimizedPrompt ? response.optimizedPrompt.length : 0} Chars</span>
                        </div>
                      </div>
                      
                      {renderDiffContent(false, true)}

                      <button
                        type="button"
                        onClick={() => handleCopy(response.optimizedPrompt || "")}
                        className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-805 hover:bg-slate-850 text-xs font-mono text-slate-300 hover:text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-slate-950"
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Outcome
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Output
                          </>
                        )}
                      </button>
                    </div>

                  </div>

                  {/* Wide Statistics Tracker Panel */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-900 text-xs text-slate-400 flex flex-col md:flex-row md:items-center md:justify-between gap-3 font-mono">
                    <span className="uppercase tracking-widest font-extrabold text-sky-455 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                      NEXA Prompt Expansion Intelligence Quotient:
                    </span>
                    <div className="flex flex-wrap items-center gap-4 text-slate-300">
                      <span>Input Volume: <strong className="text-red-400">{originalRequestForDiff ? originalRequestForDiff.trim().split(/\s+/).length : 0} words</strong></span>
                      <span className="text-slate-700">•</span>
                      <span>Output Volume: <strong className="text-emerald-450 font-bold">{response.optimizedPrompt ? response.optimizedPrompt.trim().split(/\s+/).length : 0} words</strong></span>
                      <span className="text-slate-700">•</span>
                      <span>Volumetric Scaling Factor: <strong className="text-sky-400 font-extrabold">x{originalRequestForDiff ? (response.optimizedPrompt.length / (originalRequestForDiff.length || 1)).toFixed(1) : "0"} expansion</strong></span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer containing quick advice */}
            <div className="p-3.5 border-t border-slate-800/60 bg-slate-950/90 text-center text-slate-500 font-mono text-[9px]">
              Distraction-Free Focus mode enables optimal inspection of parameters. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-bold">ESC</kbd> to return to active workspace.
            </div>
          </div>
        </div>
      )}

      {/* Workspace Footer Context */}
      <footer className="border-t border-slate-950 bg-slate-950 px-6 py-6 text-center text-slate-600 text-[10px] relative z-20">
        NEXA Compiler 2026. Custom session active. All prompt generation pipelines operate in stateless processes. Zero log retention.
      </footer>
    </div>
  );
}
