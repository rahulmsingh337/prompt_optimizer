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
    <>
      <PlexusBackground />
      <SignInPage
        onGoogleSignIn={handleGoogleSignIn}
        isLoading={isAuthenticating}
      />
    </>
  );
}
