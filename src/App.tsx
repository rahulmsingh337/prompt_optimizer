// App.tsx — updated to add:
//   1. /p/:shareId route → SharedPromptView (no auth required)
//   2. FreeTrialBanner on landing page (try 3 optimizations without sign-in)
// All existing logic (Google auth, session check, routing) is unchanged.
import { useState, useEffect } from "react";
import SignInPage from "./components/SignInPage";
import LandingPage from "./components/LandingPage";
import OptimizerApp from "./components/OptimizerApp";
import PlexusBackground from "./components/PlexusBackground";
import FreeTrialBanner from "./components/FreeTrialBanner";
import SharedPromptView from "./components/SharedPromptView";
import { User } from "./types";
import { auth, googleProvider, signInWithPopup } from "./firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";

// Detect if this is a shared prompt URL: /p/<shareId>
function getShareIdFromPath(): string | null {
  const match = window.location.pathname.match(/^\/p\/([a-z0-9]{8,})$/i);
  return match ? match[1] : null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoute, setCurrentRoute] = useState<"landing" | "sign-in" | "app" | "shared">(
    getShareIdFromPath() ? "shared" :
    window.location.pathname === "/sign-in" ? "sign-in" :
    window.location.pathname === "/app" ? "app" : "landing"
  );
  const [shareId] = useState<string | null>(getShareIdFromPath());
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  useEffect(() => {
    // If we're on a shared prompt page, skip auth check for faster render
    if (currentRoute === "shared") {
      setSessionChecked(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser: User = {
          id: firebaseUser.uid,
          login: firebaseUser.email || "google-user",
          name: firebaseUser.displayName || firebaseUser.email || "Google User",
          avatar_url: firebaseUser.photoURL || undefined,
          provider: "google",
        };
        setUser(mappedUser);
        setCurrentRoute("app");
        window.history.replaceState({}, "", "/app");
      } else {
        setUser(null);
        // Only redirect to sign-in if already in app — landing users stay on landing
        if (currentRoute === "app") {
          setCurrentRoute("sign-in");
          window.history.replaceState({}, "", "/sign-in");
        }
      }
      setSessionChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const sid = getShareIdFromPath();
      if (sid) { return; } // let shared pages stay as-is on back
      if (auth.currentUser) {
        setCurrentRoute("app");
        window.history.replaceState({}, "", "/app");
      } else {
        setCurrentRoute("sign-in");
        window.history.replaceState({}, "", "/sign-in");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (route: "landing" | "sign-in" | "app") => {
    setCurrentRoute(route);
    window.history.pushState({}, "", `/${route}`);
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      if (firebaseUser) {
        const mappedUser: User = {
          id: firebaseUser.uid,
          login: firebaseUser.email || "google-user",
          name: firebaseUser.displayName || firebaseUser.email || "Google User",
          avatar_url: firebaseUser.photoURL || undefined,
          provider: "google",
        };
        setUser(mappedUser);
        navigateTo("app");
      }
    } catch (err) {
      console.error("Google Auth login process failed:", err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      navigateTo("sign-in");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  // ── Shared prompt view — no auth, no session check needed ─────────────────
  if (currentRoute === "shared" && shareId) {
    return (
      <SharedPromptView
        shareId={shareId}
        onGetStarted={() => navigateTo("landing")}
      />
    );
  }

  if (!sessionChecked) return null;

  // ── Landing page — inject FreeTrialBanner above the fold ─────────────────
  if (currentRoute === "landing") {
    return (
      <>
        <LandingPage onGetStarted={() => navigateTo("sign-in")} />
        {/* FreeTrialBanner is injected via a portal-like wrapper below the landing hero.
            LandingPage itself is unchanged — the banner appears as a new section. */}
        <div
          id="prompify-trial-section"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: "linear-gradient(to top, rgba(10,10,10,0.98) 60%, transparent)",
            padding: "24px 16px 16px",
          }}
        >
          <div className="max-w-xl mx-auto">
            <QuickTryBar onSignIn={() => navigateTo("sign-in")} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PlexusBackground />
      {currentRoute === "sign-in" ? (
        <SignInPage
          onGoogleSignIn={handleGoogleSignIn}
          isLoading={isAuthenticating}
        />
      ) : (
        <OptimizerApp user={user!} onSignOut={handleSignOut} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuickTryBar — compact bottom bar on landing page with live optimizer CTA.
// Shows trial counter. On click, opens a modal with FreeTrialBanner.
// ─────────────────────────────────────────────────────────────────────────────
import { Sparkles, X } from "lucide-react";
import { useEffect as useE, useState as useS } from "react";

function QuickTryBar({ onSignIn }: { onSignIn: () => void }) {
  const [open, setOpen] = useS(false);
  const [trialsLeft, setTrialsLeft] = useS<number>(3);

  useE(() => {
    const token = sessionStorage.getItem("prompify_trial_token");
    if (!token) return;
    fetch(`/api/trial-status?sessionToken=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => setTrialsLeft(Math.max(0, 3 - (d.count || 0))))
      .catch(() => {});
  }, []);

  return (
    <>
      {!open && (
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-700/50 rounded-2xl px-5 py-3 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < (3 - trialsLeft) ? "bg-sky-500" : "bg-slate-700"}`} />
              ))}
            </div>
            <span className="text-sm text-slate-300">
              {trialsLeft > 0
                ? <><span className="text-white font-semibold">{trialsLeft} free</span> optimization{trialsLeft !== 1 ? "s" : ""} — no sign in</>
                : "Sign in to continue optimizing"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Try it now
          </button>
        </div>
      )}

      {/* Slide-up modal with FreeTrialBanner */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-2xl bg-[#0a0a0f] border border-slate-800/60 rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-semibold text-white">Prompify — free trial</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <FreeTrialBanner onSignIn={() => { setOpen(false); onSignIn(); }} />
          </div>
        </div>
      )}
    </>
  );
}
