"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingState } from "@/components/feedback/LoadingState";

/**
 * Client-side route guard. Firebase Auth sessions live in the browser
 * (no server session cookie in this architecture), so gating happens
 * after the initial auth-state check resolves rather than in
 * middleware.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <LoadingState />;
  }

  return <>{children}</>;
}
