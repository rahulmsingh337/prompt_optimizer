import { useState, useEffect } from "react";
import SignInPage from "./components/SignInPage";
import OptimizerApp from "./components/OptimizerApp";
import PlexusBackground from "./components/PlexusBackground";
import { User } from "./types";
import { auth, googleProvider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoute, setCurrentRoute] = useState<"sign-in" | "app">("sign-in");
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Synchronize client-side routing with Firebase Auth State change listener
  useEffect(() => {
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
        setCurrentRoute("sign-in");
        window.history.replaceState({}, "", "/sign-in");
      }
      setSessionChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // Handle address bar popstate navigation support
  useEffect(() => {
    const handlePopState = () => {
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

  // Navigate utility setting address bar
  const navigateTo = (route: "sign-in" | "app") => {
    if (auth.currentUser) {
      setCurrentRoute("app");
      window.history.pushState({}, "", "/app");
    } else {
      setCurrentRoute("sign-in");
      window.history.pushState({}, "", "/sign-in");
    }
  };

  // Google popup OAuth login handler
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
      console.error("Google Auth login process failed: ", err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Logout / Firebase Sign-out process
  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      navigateTo("sign-in");
    } catch (err) {
      console.error("Firebase SignOut error: ", err);
    }
  };


  // Prioritize showing beautiful dark loader before checking server session
  if (!sessionChecked) {
    return (
      <div className="relative min-h-screen text-slate-400 font-mono text-xs flex flex-col items-center justify-center">
        <PlexusBackground />
        <div className="relative mb-4 z-10">
          <div className="w-10 h-10 rounded-full border border-slate-800 border-t-sky-500 animate-spin"></div>
        </div>
        <span className="relative z-10">INITIALIZING SECURE NEXA CHANNELS...</span>
      </div>
    );
  }

  // Dynamic route dispatcher
  const renderRouteContent = () => {
    switch (currentRoute) {
      case "app":
        if (!user) {
          return (
            <SignInPage 
              onGoogleSignIn={handleGoogleSignIn}
              isLoading={isAuthenticating}
            />
          );
        }
        return (
          <OptimizerApp 
            user={user} 
            onSignOut={handleSignOut} 
          />
        );
      
      case "sign-in":
      default:
        return (
          <SignInPage 
            onGoogleSignIn={handleGoogleSignIn}
            isLoading={isAuthenticating}
          />
        );
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <PlexusBackground />
      <div className="relative z-10">
        {renderRouteContent()}
      </div>
    </div>
  );
}
