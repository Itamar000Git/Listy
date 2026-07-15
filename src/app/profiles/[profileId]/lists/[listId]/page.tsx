"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { BulletinBoard } from "@/components/board/BulletinBoard";
import { TaskImageCard } from "@/components/board/TaskImageCard";
import { TaskReorderList } from "@/components/board/TaskReorderList";
import { TaskProgress } from "@/components/board/TaskProgress";
import { BunnyCarrotProgress } from "@/components/board/BunnyCarrotProgress";
import { VictoryOverlay } from "@/components/celebration/VictoryOverlay";
import { StickyListActions } from "@/components/actions/StickyListActions";
import { StickyBottomBar } from "@/components/shell/StickyBottomBar";
import { SoundToggle } from "@/components/settings/SoundToggle";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { callApi } from "@/lib/auth/get-auth-header";
import { subscribeToList } from "@/lib/firestore/lists";
import { subscribeToActiveTasks } from "@/lib/firestore/tasks";
import { soundManager } from "@/lib/audio/sound-manager";
import { useOnlineStatus } from "@/lib/use-online-status";
import { useOverdueResetCheck } from "@/lib/reset/use-overdue-reset-check";
import { errorMessageForStatus } from "@/lib/api/error-messages";
import type { ListWithId, TaskWithId } from "@/lib/types/domain";

function TaskBoardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ profileId: string; listId: string }>();
  const { profileId, listId } = params;

  const [list, setList] = useState<ListWithId | null | undefined>(undefined);
  const [tasks, setTasks] = useState<TaskWithId[] | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, boolean>>({});
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [showVictory, setShowVictory] = useState(false);
  const [listenerError, setListenerError] = useState(false);
  const [completionEventId, setCompletionEventId] = useState(0);
  const [reorderMode, setReorderMode] = useState(false);
  const [stagedOrder, setStagedOrder] = useState<TaskWithId[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToList(user.uid, profileId, listId, setList, () =>
      setListenerError(true),
    );
    return unsubscribe;
  }, [user, profileId, listId]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToActiveTasks(user.uid, profileId, listId, setTasks, () =>
      setListenerError(true),
    );
    return unsubscribe;
  }, [user, profileId, listId]);

  // Lazy reset check (specification §19): fire-and-forget on open — the
  // list listener above will pick up any resulting reset live.
  useEffect(() => {
    if (!user || !isOnline) return;
    callApi("/api/lists/check-reset", { body: { profileId, listId } }).catch(() => {});
  }, [user, profileId, listId, isOnline]);

  // Additional overdue-only check that also re-runs on tab focus /
  // visibility return (e.g. the board was left open overnight) — the
  // effect above only fires once when the board is first opened.
  const resettableLists = useMemo(
    () => (list ? [{ id: list.id, profileId, nextResetAt: list.nextResetAt }] : []),
    [list, profileId],
  );
  useOverdueResetCheck(isOnline, resettableLists);

  // Each task's override is set to the server-confirmed value on success
  // and removed on failure (see handleToggle), so it always matches
  // reality for taps made on this device. If a different device changes
  // the same task while an override lingers here, the next tap on this
  // device self-corrects (the transaction response is authoritative) at
  // the cost of one extra tap — an acceptable tradeoff at family scale.
  const effectiveTasks = useMemo(() => {
    if (!tasks || !list) return [];
    return tasks.map((task) => ({
      ...task,
      effectiveCompleted: optimisticOverrides[task.id] ?? task.completedCycle === list.currentCycle,
    }));
  }, [tasks, list, optimisticOverrides]);

  const completedCount = effectiveTasks.filter((t) => t.effectiveCompleted).length;
  const taskCount = effectiveTasks.length;

  async function handleToggle(task: TaskWithId) {
    if (pendingTaskIds.has(task.id)) return;

    // Offline: never show an optimistic heart, never attempt the write,
    // never play a success sound for something that wasn't saved.
    if (!isOnline) {
      setToggleError("אין חיבור לאינטרנט. אי אפשר לשמור שינויים כרגע.");
      return;
    }

    setToggleError(null);
    setPendingTaskIds((current) => new Set(current).add(task.id));

    const wasCompleted = optimisticOverrides[task.id] ?? (list && task.completedCycle === list.currentCycle);
    setOptimisticOverrides((current) => ({ ...current, [task.id]: !wasCompleted }));

    try {
      const response = await callApi("/api/tasks/toggle-completion", {
        body: { profileId, listId, taskId: task.id },
      });
      if (!response.ok) {
        setToggleError(errorMessageForStatus(response.status));
        throw new Error("toggle_failed");
      }

      const data = await response.json();
      setOptimisticOverrides((current) => ({ ...current, [task.id]: data.completed }));

      if (data.completed) {
        soundManager.playTaskCompleted();
        setCompletionEventId((current) => current + 1);
      }
      if (data.celebrationTriggered) setShowVictory(true);
    } catch {
      setOptimisticOverrides((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
      setToggleError((current) => current ?? "לא ניתן היה לשמור את השינוי. נסו שוב.");
    } finally {
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
    }
  }

  function enterReorderMode() {
    setStagedOrder(tasks ? [...tasks].sort((a, b) => a.displayOrder - b.displayOrder) : []);
    setReorderError(null);
    setReorderMode(true);
  }

  function cancelReorder() {
    setReorderMode(false);
    setStagedOrder(null);
    setReorderError(null);
  }

  function moveStagedTask(taskId: string, direction: -1 | 1) {
    setStagedOrder((current) => {
      if (!current) return current;
      const index = current.findIndex((t) => t.id === taskId);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  async function saveReorder() {
    if (!stagedOrder || !isOnline) return;
    setSavingOrder(true);
    setReorderError(null);
    try {
      const response = await callApi("/api/tasks/reorder", {
        body: { profileId, listId, orderedTaskIds: stagedOrder.map((t) => t.id) },
      });
      if (!response.ok) {
        setReorderError(errorMessageForStatus(response.status));
        return;
      }
      setReorderMode(false);
      setStagedOrder(null);
    } catch {
      setReorderError("לא ניתן היה לשמור את הסדר. נסו שוב.");
    } finally {
      setSavingOrder(false);
    }
  }

  if (listenerError) {
    return (
      <ErrorState
        message="אין אפשרות להתחבר לשרת כרגע. בדקו את החיבור לאינטרנט ונסו שוב."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (list === undefined || (list && tasks === null)) return <LoadingState />;
  if (list === null) {
    return <ErrorState message="הרשימה לא נמצאה." onRetry={() => router.push(`/profiles/${profileId}`)} />;
  }

  return (
    <MobileAppShell
      header={
        <MobileHeader
          title={list.name}
          backHref={`/profiles/${profileId}`}
          end={
            <>
              <SoundToggle />
              <Link
                href={`/profiles/${profileId}/lists/${listId}/edit`}
                aria-label="עריכת רשימה"
                className="flex h-11 w-11 items-center justify-center rounded-full text-text active:bg-lavender/20"
              >
                <EditIcon />
              </Link>
            </>
          }
        />
      }
      footer={
        reorderMode ? (
          <StickyBottomBar>
            <div className="flex flex-col gap-2">
              {reorderError ? <p className="text-center text-sm text-danger">{reorderError}</p> : null}
              <Button onClick={saveReorder} disabled={savingOrder || !isOnline} fullWidth>
                {savingOrder ? "שומרים..." : "שמירת סדר"}
              </Button>
              <Button variant="secondary" onClick={cancelReorder} disabled={savingOrder} fullWidth>
                ביטול
              </Button>
            </div>
          </StickyBottomBar>
        ) : (
          <StickyListActions
            taskCount={taskCount}
            completedCount={completedCount}
            onFinish={() => {
              soundManager.playListCompleted();
              router.push(`/profiles/${profileId}`);
            }}
            onExitWithoutFinishing={() => router.push(`/profiles/${profileId}`)}
          />
        )
      }
    >
      {reorderMode ? null : (
        <>
          <TaskProgress completedCount={completedCount} taskCount={taskCount} />
          <div className="px-4 pb-2">
            <BunnyCarrotProgress
              taskCount={taskCount}
              completedCount={completedCount}
              completionEventId={completionEventId}
            />
          </div>
        </>
      )}

      {toggleError && !reorderMode ? <p className="px-4 text-sm text-danger">{toggleError}</p> : null}

      {effectiveTasks.length === 0 ? (
        <EmptyState
          emoji="🗒️"
          message="עדיין אין משימות ברשימה הזאת."
          action={
            <Button onClick={() => router.push(`/profiles/${profileId}/lists/${listId}/tasks/new`)}>
              הוספת משימה
            </Button>
          }
        />
      ) : reorderMode && stagedOrder ? (
        <TaskReorderList tasks={stagedOrder} onMoveUp={(id) => moveStagedTask(id, -1)} onMoveDown={(id) => moveStagedTask(id, 1)} />
      ) : (
        <>
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={enterReorderMode}
              disabled={!isOnline || effectiveTasks.length < 2}
              className="text-sm font-bold text-text-muted underline disabled:opacity-40"
            >
              סידור משימות
            </button>
          </div>
          <BulletinBoard>
            {effectiveTasks.map((task) => (
              <TaskImageCard
                key={task.id}
                taskId={task.id}
                title={task.title}
                description={task.description}
                imageKey={task.imageKey}
                isCompleted={task.effectiveCompleted}
                isPending={pendingTaskIds.has(task.id) || !isOnline}
                onToggle={() => handleToggle(task)}
                editHref={`/profiles/${profileId}/lists/${listId}/tasks/${task.id}/edit`}
              />
            ))}
          </BulletinBoard>

          <div className="px-4 pb-4">
            <Link
              href={`/profiles/${profileId}/lists/${listId}/tasks/new`}
              className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-dashed border-border text-base font-bold text-text-muted"
            >
              הוספת משימה
            </Link>
          </div>
        </>
      )}

      {showVictory ? <VictoryOverlay onDismiss={() => setShowVictory(false)} /> : null}
    </MobileAppShell>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

export default function TaskBoardPage() {
  return (
    <RequireAuth>
      <TaskBoardScreen />
    </RequireAuth>
  );
}
