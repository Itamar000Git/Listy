"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingState } from "@/components/feedback/LoadingState";
import { MobileAppShell } from "@/components/shell/MobileAppShell";

/**
 * Entry screen: checks for an existing Firebase session and redirects
 * straight to profile selection or sign-in — no content of its own.
 */
export default function EntryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/profiles" : "/login");
  }, [loading, user, router]);

  return (
    <MobileAppShell>
      <LoadingState />
    </MobileAppShell>
  );
}
