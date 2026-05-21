import { useState, useEffect } from "react";
import { 
  Sparkles, 
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
  Network
} from "lucide-react";
import { User as UserType, OptimizedResponse, QueryState } from "../types";
import SwimlaneWorkflow from "./SwimlaneWorkflow";

interface OptimizerAppProps {
  user: UserType;
  onSignOut: () => void;
}

export default function OptimizerApp({ user, onSignOut }: OptimizerAppProps) {
  // Input configuration states
  const [targetAI, setTargetAI] = useState<string>("ChatGPT");
  const [modePreference, setModePreference] = useState<"Auto" | "BASIC" | "DETAIL">("Auto");
  const [domain, setDomain] = useState<string>("General");
  const [roughRequest, setRoughRequest] = useState<string>("");

  // Workflow dynamic states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Accumulated responses
  const [response, setResponse] = useState<OptimizedResponse | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Detail interactive questionnaire answers state
  const [questionAnswers, setQuestionAnswers] = useState<{ [qId: string]: { question: string; answer: string } }>({});

  // Welcome state modal / drawer to display welcome on "hello" button activation
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [showWorkflowModal, setShowWorkflowModal] = useState<boolean>(false);

  // Anonymous rating and feedback state variables
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(null);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [communityFeedbacks, setCommunityFeedbacks] = useState<any[]>([]);

  // Fetch anonymized feedback entries from active storage
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
          roughRequest
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Something went wrong during optimization.");
      }

      const data = await res.json();
      setResponse(data);
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
          answers: answersPayload
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to synthesize answers.");
      }

      const data = await res.json();
      setResponse(data);
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
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/40 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center">
            <span className="font-display font-black text-sm text-white">N</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base text-white tracking-tight">NEXA Workspace</span>
              <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">LIVE AGENT</span>
            </div>
          </div>
        </div>

        {/* User Badge Profile + Logout Control */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setShowWelcome(true)}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg border border-sky-500/20 text-sky-400 bg-slate-950 hover:bg-sky-500/10 transition-colors cursor-pointer select-none shrink-0"
            title="Open About NEXA system handbook"
          >
            About Us
          </button>

          <button
            type="button"
            onClick={() => setShowWorkflowModal(true)}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg border border-indigo-500/20 text-indigo-400 bg-slate-950 hover:bg-indigo-500/10 transition-colors cursor-pointer select-none flex items-center gap-1.5 shrink-0"
            title="Open interactive DevOps Swimlane Workflow"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Workflow</span>
          </button>

          <div className="flex items-center gap-3 bg-slate-950 p-1.5 px-3 rounded-xl border border-slate-900 shrink-0">
            {user.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name} 
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full border border-slate-800"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
              </div>
            )}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-200">{user.name}</div>
              <div className="text-[9px] font-mono text-slate-500 uppercase">{user.provider} credentials</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors cursor-pointer text-slate-400"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Primary Workspace Layout */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Original Rough Prompt</label>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[10px] font-mono text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                >
                  Clear Workspace
                </button>
              </div>
              <textarea
                value={roughRequest}
                onChange={(e) => setRoughRequest(e.target.value)}
                placeholder="Share your rough idea, tasks, or list here..."
                className="w-full h-40 bg-[#0c1222]/35 border border-slate-850/60 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 resize-none focus:border-sky-500 focus:outline-none leading-relaxed font-sans backdrop-blur-sm"
              />
            </div>

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
                disabled={isLoading || !roughRequest.trim()}
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
                  onClick={handleAnswerSubmit}
                  className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
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
                    onClick={() => setResponse(null)}
                    className="text-[10px] font-mono px-2 py-0.5 text-slate-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Close Result
                  </button>
                </div>
              </div>

              {/* Your Optimized Prompt Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold block">Your Optimized Prompt:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(response.optimizedPrompt || "")}
                    className="p-1 px-3 rounded bg-slate-900 border border-slate-850 hover:bg-slate-800 transition-colors text-[10px] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer font-mono"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Copied to Clipboard
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Prompt
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#030610]/40 border border-slate-950/50 text-xs text-slate-250 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-56 select-all select-none backdrop-blur-sm">
                  {response.optimizedPrompt}
                </pre>
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
        <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="max-w-lg w-full bg-slate-950/65 border border-slate-900/80 p-8 rounded-2xl shadow-2xl-strong text-left relative overflow-hidden backdrop-blur-xl">
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

      {/* WORKFLOW BLUEPRINT DIALOG OVERLAY */}
      {showWorkflowModal && (
        <div className="fixed inset-0 bg-[#000]/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full bg-slate-950/70 border border-[#1e293b]/60 p-5 md:p-6 rounded-2xl shadow-2xl relative overflow-hidden max-h-[95vh] overflow-y-auto backdrop-blur-xl">
            <div className="absolute top-4 right-4 z-20">
              <button
                type="button"
                onClick={() => setShowWorkflowModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-100 text-[10px] font-mono border border-slate-800 transition-colors cursor-pointer select-none"
              >
                Close View [x]
              </button>
            </div>
            <div className="pt-6">
              <SwimlaneWorkflow />
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
