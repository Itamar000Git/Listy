"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useOnlineStatus } from "@/lib/use-online-status";
import { useOverdueResetCheck } from "@/lib/reset/use-overdue-reset-check";
import type { ListWithId, ProfileWithId } from "@/lib/types/domain";

function ProfileHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ profileId: string }>();
  const profileId = params.profileId;

  const [profile, setProfile] = useState<ProfileWithId | null | undefined>(undefined);
  const [lists, setLists] = useState<ListWithId[] | null>(null);
  const isOnline = useOnlineStatus();

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

  // The list-overview cards show completedCount/taskCount directly from
  // Firestore (specification §11.6) — without this, a list that became
  // overdue since it was last opened would keep showing yesterday's
  // stale progress here indefinitely, since nothing else visits this
  // screen's lists individually until a card is tapped.
  const resettableLists = useMemo(
    () => (lists ?? []).map((list) => ({ id: list.id, profileId, nextResetAt: list.nextResetAt })),
    [lists, profileId],
  );
  useOverdueResetCheck(isOnline, resettableLists);

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
