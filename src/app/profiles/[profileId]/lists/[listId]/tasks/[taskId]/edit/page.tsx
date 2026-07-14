"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TaskForm, type TaskFormValues } from "@/components/tasks/TaskForm";
import { ConfirmationDialog } from "@/components/actions/ConfirmationDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { callApi } from "@/lib/auth/get-auth-header";
import { subscribeToTask } from "@/lib/firestore/tasks";
import { isGenericTaskImageKey } from "@/lib/images/generic-task-images";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { TaskWithId } from "@/lib/types/domain";

function EditTaskScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ profileId: string; listId: string; taskId: string }>();
  const { profileId, listId, taskId } = params;

  const [task, setTask] = useState<TaskWithId | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToTask(user.uid, profileId, listId, taskId, setTask);
    return unsubscribe;
  }, [user, profileId, listId, taskId]);

  const boardHref = `/profiles/${profileId}/lists/${listId}`;

  async function handleSubmit(values: TaskFormValues) {
    setError(null);
    setSubmitting(true);

    try {
      const response = await callApi("/api/tasks/update", {
        body: { profileId, listId, taskId, ...values },
      });
      if (!response.ok) {
        setError("לא ניתן היה לשמור את השינויים. נסו שוב.");
        setSubmitting(false);
        return;
      }
      router.push(boardHref);
    } catch {
      setError("אירעה שגיאה. נסו שוב.");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await callApi("/api/tasks/delete", { body: { profileId, listId, taskId } });
      router.push(boardHref);
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
      setError("לא ניתן היה למחוק את המשימה. נסו שוב.");
    }
  }

  if (task === undefined) return <LoadingState />;
  if (task === null) {
    return <ErrorState message="המשימה לא נמצאה." onRetry={() => router.push(boardHref)} />;
  }

  return (
    <MobileAppShell header={<MobileHeader title="עריכת משימה" backHref={boardHref} />}>
      <div className="flex flex-col gap-6 p-4">
        <TaskForm
          initialValues={{
            title: task.title,
            description: task.description ?? "",
            imageKey: isGenericTaskImageKey(task.imageKey) ? task.imageKey : "generic",
          }}
          submitLabel="שמירה"
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />

        <Button variant="danger" onClick={() => setConfirmingDelete(true)} disabled={!isOnline}>
          מחיקת משימה
        </Button>
      </div>

      <ConfirmationDialog
        open={confirmingDelete}
        title={`למחוק את "${task.title}"?`}
        description="המשימה תוסתר, אך ניתן יהיה לשחזר אותה בעתיד."
        confirmLabel="מחיקה"
        destructive
        confirming={deleting || !isOnline}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </MobileAppShell>
  );
}

export default function EditTaskPage() {
  return (
    <RequireAuth>
      <EditTaskScreen />
    </RequireAuth>
  );
}
