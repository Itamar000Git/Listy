"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { clearSelectedProfileId } from "@/lib/profile-selection";

type AuthContextValue = {
  user: User | null;
  /** True until the initial Firebase auth-state check resolves. */
  loading: boolean;
  emailVerified: boolean;
  /** Re-checks emailVerified via currentUser.reload() (specification §7.8). */
  refreshEmailVerified: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setEmailVerified(nextUser?.emailVerified ?? false);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshEmailVerified = useCallback(async () => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return;
    await currentUser.reload();
    // A verified email changes claims on the ID token, so force a fresh
    // one rather than letting a stale cached token linger for its
    // remaining lifetime.
    await currentUser.getIdToken(true);
    setEmailVerified(firebaseAuth.currentUser?.emailVerified ?? false);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(firebaseAuth);
    clearSelectedProfileId();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, emailVerified, refreshEmailVerified, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
