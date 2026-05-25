import { useState, useEffect, lazy, Suspense } from "react";
import { auth, googleProvider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { User } from "./types";

// Lazy load heavy components — they only download when actually needed
// This shaves ~300KB from the initial bundle on the sign-in page
const SignInPage = lazy(() => import("./components/SignInPage"));
const OptimizerApp = lazy(() => import("./components/OptimizerApp"));
const PlexusBackground = lazy(() => import("./components/PlexusBackground"));

// Minimal inline fallback — skeleton already shown via index.html
function PageLoader() {
  return null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoute, setCurrentRoute] = useState<"sign-in" | "app">("sign-in");
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

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

  const navigateTo = (route: "sign-in" | "app") => {
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
      console.error("Google Auth login process failed: ", err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      navigateTo("sign-in");
    } catch (err) {
      console.error("Sign out failed: ", err);
    }
  };

  if (!sessionChecked) return null;

  return (
    <Suspense fallback={<PageLoader />}>
      <PlexusBackground />
      {currentRoute === "sign-in" ? (
        <SignInPage
          onGoogleSignIn={handleGoogleSignIn}
          isAuthenticating={isAuthenticating}
        />
      ) : (
        <OptimizerApp user={user!} onSignOut={handleSignOut} />
      )}
    </Suspense>
  );
}
