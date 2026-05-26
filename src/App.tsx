import { useState, useEffect } from "react";
import SignInPage from "./components/SignInPage";
import OptimizerApp from "./components/OptimizerApp";
import PlexusBackground from "./components/PlexusBackground";
import { User } from "./types";
import { auth, googleProvider, signInWithRedirect, getRedirectResult } from "./firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoute, setCurrentRoute] = useState<"sign-in" | "app">("sign-in");
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Handle redirect result on page load (fires after Google redirects back)
  useEffect(() => {
    setIsAuthenticating(true);
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          const firebaseUser = result.user;
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
        }
      })
      .catch((err) => {
        console.error("Redirect result error:", err);
      })
      .finally(() => {
        setIsAuthenticating(false);
      });
  }, []);

  // Watch auth state (handles refresh / session restore)
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

  // signInWithRedirect — navigates to Google, then comes back to this page
  // No popup needed — works on all domains without Firebase domain whitelisting
  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      await signInWithRedirect(auth, googleProvider);
      // Page will redirect — code below this line won't execute
    } catch (err) {
      console.error("Google Auth redirect failed:", err);
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

  if (!sessionChecked) return null;

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
