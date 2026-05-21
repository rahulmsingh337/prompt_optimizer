import { useState } from "react";
import { HelpCircle, Key, Network } from "lucide-react";
import SwimlaneWorkflow from "./SwimlaneWorkflow";

interface SignInPageProps {
  onGoogleSignIn: () => void;
  isLoading: boolean;
}

export default function SignInPage({ onGoogleSignIn, isLoading }: SignInPageProps) {
  const [showDocs, setShowDocs] = useState<boolean>(false);
  const [showWorkflow, setShowWorkflow] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col justify-between overflow-x-hidden relative">
      {/* Aesthetic background lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-sky-500/5 rounded-full blur-[130px] pointer-events-none"></div>

      {/* Landing Back Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-end relative z-10">
        <span className="text-xs font-mono text-slate-500 hover:text-slate-400">
          NEXA Gatekeeper
        </span>
      </header>

      {/* Main card box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 flex-col gap-6">
        <div className="max-w-md w-full bg-slate-950/45 border border-slate-900/60 rounded-2xl p-8 shadow-2xl text-center backdrop-blur-lg">
          
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 mx-auto mb-6">
            <Key className="w-6 h-6 text-white" />
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-white mb-2">
            Enter NEXA Workspace
          </h1>
          <p className="text-xs text-slate-400 mb-8 max-w-sm mx-auto">
            Review live optimizations, execute multi-step 4-D prompt engineering, and configure target parameters.
          </p>

          <div className="space-y-4">
            {/* Real Google login */}
            <button
              type="button"
              disabled={isLoading}
              onClick={onGoogleSignIn}
              className="w-full py-3 px-5 rounded-xl bg-[#0d1222]/40 hover:bg-[#151c33]/60 border border-slate-800/50 hover:border-sky-500/40 text-white text-sm font-semibold flex items-center justify-center gap-3 transition-all duration-300 group disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-500/5 hover:shadow-indigo-500/10 backdrop-blur-sm"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.97 1 12 1 7.35 1 3.4 3.68 1.45 7.6l3.86 3C6.27 7.78 8.87 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.88 3.75-8.49z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.31 14.6c-.23-.68-.36-1.42-.36-2.18s.13-1.5.36-2.18L1.45 7.6C.52 9.47 0 11.58 0 13.8s.52 4.33 1.45 6.2l3.86-3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.51 1.18-4.3 1.18-3.13 0-5.73-2.74-6.69-5.56l-3.86 3C3.4 20.32 7.35 23 12 23z"
                />
              </svg>
              {isLoading ? "Validating status..." : "Sign in with Google Account"}
            </button>
            
            <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto pt-2">
              Sync credentials seamlessly through Google Sign-In to secure your prompt engineering database.
            </p>
          </div>

          {/* Quick instructions toggle */}
          <div className="mt-8 pt-6 border-t border-slate-900/60 text-left">
            <button
              type="button"
              onClick={() => setShowDocs(!showDocs)}
              className="text-xs font-mono text-sky-400/85 hover:text-sky-300 flex items-center gap-1.5 transition-colors cursor-pointer select-none"
            >
              <HelpCircle className="w-4 h-4" /> System Integration Status (Firebase)
            </button>

            {showDocs && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900/35 border border-slate-850/50 backdrop-blur-md font-mono text-[10px] leading-relaxed text-slate-400 space-y-3 max-h-48 overflow-y-auto">
                <p className="font-semibold text-slate-200 uppercase">1. Live Connection:</p>
                <div className="bg-slate-950/40 p-2 rounded text-slate-300 text-[9px] space-y-1 border border-slate-900/30">
                  <div>Database: Firestore Enterprise</div>
                  <div>Sync Mode: Attribute-Based Access Controls</div>
                  <div>Provider: google.com Popup auth</div>
                </div>

                <p className="font-semibold text-slate-200 uppercase mt-4">2. Security Rules:</p>
                <p>Protected client requests are authorized inside individual user storage structures:</p>
                <div className="text-slate-500 text-[9px]">
                  All reads and writes are gated against user token signatures. Only verified accounts are eligible to submit prompt histories or logging parameters.
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Workflow collapse/expand container */}
        <div className="w-full max-w-5xl z-10">
          <div className="flex items-center justify-between mb-3 px-2">
            <button
              type="button"
              onClick={() => setShowWorkflow(!showWorkflow)}
              className="text-xs font-mono text-slate-400 hover:text-indigo-400 flex items-center gap-1.5 transition-colors cursor-pointer select-none"
            >
              <Network className="w-4 h-4 text-indigo-400" /> 
              <span>{showWorkflow ? "Hide System Delivery & Swimlane Workflow" : "Reveal System Delivery & Swimlane Workflow"}</span>
            </button>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">DevOps Topology Blueprint</span>
          </div>
          
          {showWorkflow && (
            <div className="transition-all duration-300">
              <SwimlaneWorkflow />
            </div>
          )}
        </div>

      </main>

      {/* Tiny footer info */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto px-6 py-6 text-center text-slate-600 text-[10px]">
        Protected by standard modern cryptographic signatures. Your secrets, requests, and optimized models are compiled entirely stateless and are never saved to database.
      </footer>
    </div>
  );
}
