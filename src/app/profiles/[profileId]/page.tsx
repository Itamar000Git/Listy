"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TaskListCard } from "@/components/lists/TaskListCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { subscribeToProfile } from "@/lib/firestore/profiles";
import { subscribeToActiveLists } from "@/lib/firestore/lists";
import type { ListWithId, ProfileWithId } from "@/lib/types/domain";

function ProfileHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ profileId: string }>();
  const profileId = params.profileId;

  const [profile, setProfile] = useState<ProfileWithId | null | undefined>(undefined);
  const [lists, setLists] = useState<ListWithId[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToProfile(user.uid, profileId, setProfile);
    return unsubscribe;
  }, [user, profileId]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToActiveLists(user.uid, profileId, setLists);
    return unsubscribe;
  }, [user, profileId]);

  if (profile === undefined || (profile && lists === null)) return <LoadingState />;
  if (profile === null) {
    return <ErrorState message="המשתמש לא נמצא." onRetry={() => router.push("/profiles")} />;
  }

  return (
    <MobileAppShell
      header={
        <MobileHeader
          title={profile.name}
          backHref="/profiles"
          end={
            <button
              type="button"
              onClick={() => router.push("/profiles")}
              className="text-sm font-bold text-text-muted"
            >
              החלפת משתמש
            </button>
          }
        />
      }
    >
      {!lists || lists.length === 0 ? (
        <EmptyState
          emoji="📋"
          message="עדיין אין רשימות משימות."
          action={
            <Button onClick={() => router.push(`/profiles/${profileId}/lists/new`)}>
              יצירת רשימה חדשה
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3">
            {lists.map((list) => (
              <TaskListCard key={list.id} profileId={profileId} list={list} />
            ))}
          </div>

          <Button
            variant="secondary"
            onClick={() => router.push(`/profiles/${profileId}/lists/new`)}
            fullWidth
          >
            יצירת רשימה חדשה
          </Button>
        </div>
      )}
    </MobileAppShell>
  );
}

export default function ProfileHomePage() {
  return (
    <RequireAuth>
      <ProfileHomeScreen />
    </RequireAuth>
  );
}
