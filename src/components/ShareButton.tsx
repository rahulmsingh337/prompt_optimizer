// ─────────────────────────────────────────────────────────────────────────────
// ShareButton.tsx
// Drop-in share button for OptimizerApp's output panel.
// Import it and place next to the existing Copy button — no other changes needed.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Share2, Check, X } from "lucide-react";
import { OptimizedResponse, QueryState } from "../types";

interface ShareButtonProps {
  result: OptimizedResponse;
  queryState: QueryState;
  className?: string;
}

export default function ShareButton({ result, queryState, className = "" }: ShareButtonProps) {
  const [state, setState] = useState<"idle" | "sharing" | "done" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleShare = async () => {
    if (state === "sharing" || !result.optimizedPrompt) return;
    setState("sharing");

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optimizedPrompt: result.optimizedPrompt,
          roughRequest: queryState.roughRequest,
          domain: queryState.domain,
          targetAI: queryState.targetAI,
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
        await navigator.clipboard.writeText(fullUrl).catch(() => {});
        setState("done");
        setTimeout(() => setState("idle"), 4000);
      } else {
        setState("error");
        setTimeout(() => setState("idle"), 3000);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <div className={`relative inline-flex flex-col items-end ${className}`}>
      <button
        type="button"
        onClick={handleShare}
        disabled={state === "sharing"}
        title="Share this optimized prompt"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200
          ${state === "done"
            ? "border-green-500/40 bg-green-500/10 text-green-400"
            : state === "error"
            ? "border-red-500/40 bg-red-500/10 text-red-400"
            : "border-slate-700/60 bg-slate-900/40 text-slate-300 hover:text-white hover:border-slate-600"
          } disabled:opacity-50`}
      >
        {state === "sharing" && (
          <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
        )}
        {state === "done" && <Check className="w-3.5 h-3.5" />}
        {state === "error" && <X className="w-3.5 h-3.5" />}
        {state === "idle" && <Share2 className="w-3.5 h-3.5" />}
        {state === "idle" && "Share"}
        {state === "sharing" && "Sharing..."}
        {state === "done" && "Link copied!"}
        {state === "error" && "Failed"}
      </button>

      {/* Tooltip showing the URL */}
      {state === "done" && shareUrl && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
          <p className="text-xs text-slate-400 mb-0.5">Share link (copied):</p>
          <p className="text-xs font-mono text-sky-400 max-w-xs truncate">{shareUrl}</p>
        </div>
      )}
    </div>
  );
}
