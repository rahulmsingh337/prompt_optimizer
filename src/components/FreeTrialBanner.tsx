// ─────────────────────────────────────────────────────────────────────────────
// FreeTrialBanner.tsx
// Shown on the landing page. Allows unauthenticated users to try the real
// optimizer up to FREE_TRIAL_LIMIT times before being asked to sign in.
// Purely additive — does not modify LandingPage or OptimizerApp internals.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Lock } from "lucide-react";
import { OptimizedResponse, QueryState } from "../types";

const FREE_TRIAL_LIMIT = 3;
const SESSION_TOKEN_KEY = "prompify_trial_token";

function getOrCreateSessionToken(): string {
  let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

interface FreeTrialBannerProps {
  onSignIn: () => void;
}

export default function FreeTrialBanner({ onSignIn }: FreeTrialBannerProps) {
  const [roughRequest, setRoughRequest] = useState("");
  const [targetAI, setTargetAI] = useState("ChatGPT");
  const [trialsUsed, setTrialsUsed] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OptimizedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  // Load existing trial count on mount
  useEffect(() => {
    const token = getOrCreateSessionToken();
    fetch(`/api/trial-status?sessionToken=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => setTrialsUsed(d.count || 0))
      .catch(() => {});
  }, []);

  const trialsRemaining = Math.max(0, FREE_TRIAL_LIMIT - trialsUsed);
  const exhausted = trialsRemaining === 0;

  const handleOptimize = async () => {
    if (!roughRequest.trim() || isLoading || exhausted) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShareUrl(null);

    try {
      const token = getOrCreateSessionToken();
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roughRequest,
          targetAI,
          domain: "General",
          modePreference: "Auto",
          tone: "Professional",
          sessionToken: token,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "free_trial_exhausted") {
          setTrialsUsed(FREE_TRIAL_LIMIT);
          setError(`You've used all ${FREE_TRIAL_LIMIT} free optimizations. Sign in to continue.`);
          return;
        }
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      setResult(data);
      if (data.trialResult) {
        setTrialsUsed(data.trialResult.trialsUsed);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.optimizedPrompt) return;
    navigator.clipboard.writeText(result.optimizedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    if (!result?.optimizedPrompt || sharing) return;
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optimizedPrompt: result.optimizedPrompt,
          roughRequest,
          targetAI,
          modeUsed: result.modeUsed,
          improvements: result.improvements,
          techniquesApplied: result.techniquesApplied,
          proTip: result.proTip,
        }),
      });
      const data = await res.json();
      if (data.shareId) {
        const fullUrl = `${window.location.origin}/p/${data.shareId}`;
        setShareUrl(fullUrl);
        navigator.clipboard.writeText(fullUrl).catch(() => {});
      }
    } catch {
      // silently fail share
    } finally {
      setSharing(false);
    }
  };

  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      {/* Trial counter header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Try it now — no sign in required</h2>
          <p className="text-sm text-slate-400 mt-1">
            {exhausted
              ? "You've used all free optimizations. Sign in to unlock unlimited use."
              : `${trialsRemaining} free optimization${trialsRemaining !== 1 ? "s" : ""} remaining`}
          </p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-2">
          {Array.from({ length: FREE_TRIAL_LIMIT }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i < trialsUsed ? "bg-sky-500" : "bg-slate-700 border border-slate-600"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Trial exhausted state */}
      {exhausted ? (
        <div className="rounded-2xl border border-sky-500/20 bg-slate-950/60 p-8 text-center backdrop-blur-md">
          <Lock className="w-8 h-8 text-sky-400 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Sign in to keep optimizing</p>
          <p className="text-sm text-slate-400 mb-6">
            Free account gets 500,000 tokens daily. No credit card needed.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all"
          >
            Sign in with Google <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 backdrop-blur-md overflow-hidden">
          {/* Input area */}
          <div className="p-6 border-b border-slate-800/60">
            <div className="flex gap-3 mb-4">
              <select
                value={targetAI}
                onChange={e => setTargetAI(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:border-sky-500/50"
              >
                <option>ChatGPT</option>
                <option>Claude</option>
                <option>Gemini</option>
                <option>Llama</option>
                <option>Mistral</option>
              </select>
            </div>
            <textarea
              value={roughRequest}
              onChange={e => setRoughRequest(e.target.value)}
              placeholder="Type your rough prompt idea here... e.g. 'write me a cover letter for a software job'"
              className="w-full h-32 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-100 placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-sky-500/40 transition-colors"
            />
            <div className="flex justify-between items-center mt-4">
              <p className="text-xs text-slate-500">{roughRequest.length} characters</p>
              <button
                type="button"
                onClick={handleOptimize}
                disabled={!roughRequest.trim() || isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Optimize
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-6 py-4 bg-red-950/30 border-b border-red-900/30">
              <p className="text-sm text-red-400">{error}</p>
              {error.includes("Sign in") && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="mt-2 text-sm text-sky-400 hover:text-sky-300 underline"
                >
                  Sign in now →
                </button>
              )}
            </div>
          )}

          {/* Result */}
          {result?.optimizedPrompt && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {result.modeUsed}
                  </span>
                  <span className="text-xs text-slate-500">Optimized prompt</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-all"
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={sharing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-all disabled:opacity-40"
                  >
                    {sharing ? "Sharing..." : "Share link"}
                  </button>
                </div>
              </div>

              {shareUrl && (
                <div className="mb-3 p-2 rounded-lg bg-green-950/30 border border-green-800/30">
                  <p className="text-xs text-green-400">
                    Share link copied: <span className="font-mono">{shareUrl}</span>
                  </p>
                </div>
              )}

              <pre className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed font-mono bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 max-h-72 overflow-y-auto">
                {result.optimizedPrompt}
              </pre>

              {result.improvements && result.improvements.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">What improved</p>
                  <ul className="space-y-1">
                    {result.improvements.slice(0, 3).map((imp, i) => (
                      <li key={i} className="text-xs text-slate-500 flex gap-2">
                        <span className="text-sky-500 mt-0.5">›</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nudge to sign in after use */}
              <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {trialsRemaining > 0
                    ? `${trialsRemaining} free optimization${trialsRemaining !== 1 ? "s" : ""} left`
                    : "Sign in for unlimited optimizations"}
                </p>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="text-xs text-sky-400 hover:text-sky-300 font-semibold transition-colors"
                >
                  Sign in to save & get more →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Export the helper so App.tsx can pass a sessionToken to OptimizerApp if needed
export { getOrCreateSessionToken };
