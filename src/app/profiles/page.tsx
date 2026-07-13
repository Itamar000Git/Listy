"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { subscribeToActiveProfiles } from "@/lib/firestore/profiles";
import { setSelectedProfileId } from "@/lib/profile-selection";
import type { ProfileWithId } from "@/lib/types/domain";

function ProfileSelectionScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileWithId[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToActiveProfiles(user.uid, setProfiles);
    return unsubscribe;
  }, [user]);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <MobileAppShell
      header={
        <MobileHeader
          title="בחירת משתמש"
          end={
            <>
              <Link
                href="/settings"
                aria-label="הגדרות"
                className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-text-muted active:bg-lavender/20"
              >
                ⚙️
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-bold text-text-muted"
              >
                יציאה
              </button>
            </>
          }
        />
      }
    >
      <EmailVerificationBanner />

      {profiles === null ? (
        <LoadingState />
      ) : profiles.length === 0 ? (
        <EmptyState
          emoji="👨‍👩‍👧‍👦"
          message="עדיין אין משתמשים. בואו ניצור את המשתמש הראשון."
          action={
            <Button onClick={() => router.push("/profiles/new")}>הוספת משתמש</Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onSelect={() => {
                  setSelectedProfileId(profile.id);
                  router.push(`/profiles/${profile.id}`);
                }}
              />
            ))}
          </div>

          <Link
            href="/profiles/new"
            className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-dashed border-border text-base font-bold text-text-muted"
          >
            הוספת משתמש
          </Link>
        </div>
      )}
    </MobileAppShell>
  );
}

export default function ProfilesPage() {
  return (
    <RequireAuth>
      <ProfileSelectionScreen />
    </RequireAuth>
  );
}
