// ─────────────────────────────────────────────────────────────────────────────
// SharedPromptView.tsx
// Rendered when a user visits /p/:shareId — no auth required.
// Purely additive. Added as a new route in App.tsx.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Sparkles } from "lucide-react";

interface SharedPrompt {
  shareId: string;
  optimizedPrompt: string;
  roughRequest: string;
  domain: string;
  targetAI: string;
  modeUsed: "BASIC" | "DETAIL";
  improvements: string[];
  techniquesApplied: string[];
  proTip: string | null;
  createdAt: number;
}

interface SharedPromptViewProps {
  shareId: string;
  onGetStarted: () => void;
}

export default function SharedPromptView({ shareId, onGetStarted }: SharedPromptViewProps) {
  const [data, setData] = useState<SharedPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${shareId}`)
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 410) throw new Error("This shared prompt has expired (30 days).");
          if (res.status === 404) throw new Error("Shared prompt not found.");
          throw new Error(err.message || "Failed to load shared prompt.");
        }
        return res.json();
      })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [shareId]);

  const handleCopy = () => {
    if (!data?.optimizedPrompt) return;
    navigator.clipboard.writeText(data.optimizedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Prompify</span>
            <span className="text-slate-600 text-xs">/ shared prompt</span>
          </div>
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all"
          >
            Try Prompify <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-8 text-center">
            <p className="text-red-400 font-semibold mb-2">Couldn't load this prompt</p>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <button
              type="button"
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all"
            >
              Create your own prompt <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Meta */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {data.modeUsed}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {data.targetAI}
                  </span>
                  {data.domain && data.domain !== "General" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {data.domain}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">Shared on {formatDate(data.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-all flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy prompt"}
              </button>
            </div>

            {/* Original input */}
            {data.roughRequest && (
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Original rough idea</p>
                <p className="text-sm text-slate-400 leading-relaxed">{data.roughRequest}</p>
              </div>
            )}

            {/* Optimized prompt */}
            <div className="rounded-xl border border-sky-500/15 bg-slate-900/40 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800/60 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-semibold text-slate-200">Optimized prompt</span>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed font-mono p-5 max-h-[500px] overflow-y-auto">
                {data.optimizedPrompt}
              </pre>
            </div>

            {/* Improvements */}
            {data.improvements && data.improvements.length > 0 && (
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">What was improved</p>
                <ul className="space-y-2">
                  {data.improvements.map((imp, i) => (
                    <li key={i} className="text-sm text-slate-400 flex gap-2">
                      <span className="text-sky-500 mt-0.5 flex-shrink-0">›</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Techniques */}
            {data.techniquesApplied && data.techniquesApplied.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.techniquesApplied.map((t, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Pro tip */}
            {data.proTip && (
              <div className="rounded-xl border border-amber-500/15 bg-amber-950/10 p-5">
                <p className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-2">Pro tip</p>
                <p className="text-sm text-slate-300 leading-relaxed">{data.proTip}</p>
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-8 text-center">
              <p className="text-lg font-bold text-white mb-2">Optimize your own prompts</p>
              <p className="text-sm text-slate-400 mb-6">
                3 free optimizations, no sign in required. Then sign in for 500k tokens daily.
              </p>
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all"
              >
                Try Prompify free <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
