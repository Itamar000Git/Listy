"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TaskListForm, type TaskListFormValues } from "@/components/lists/TaskListForm";
import { ConfirmationDialog } from "@/components/actions/ConfirmationDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { callApi } from "@/lib/auth/get-auth-header";
import { subscribeToList } from "@/lib/firestore/lists";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { ListWithId } from "@/lib/types/domain";

function EditListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ profileId: string; listId: string }>();
  const { profileId, listId } = params;

  const [list, setList] = useState<ListWithId | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToList(user.uid, profileId, listId, setList);
    return unsubscribe;
  }, [user, profileId, listId]);

  async function handleSubmit(values: TaskListFormValues) {
    setError(null);
    setSubmitting(true);

    try {
      const response = await callApi("/api/lists/update", {
        body: { profileId, listId, ...values },
      });
      if (!response.ok) {
        setError("לא ניתן היה לשמור את השינויים. נסו שוב.");
        setSubmitting(false);
        return;
      }
      router.push(`/profiles/${profileId}`);
    } catch {
      setError("אירעה שגיאה. נסו שוב.");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await callApi("/api/lists/delete", { body: { profileId, listId } });
      router.push(`/profiles/${profileId}`);
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
      setError("לא ניתן היה למחוק את הרשימה. נסו שוב.");
    }
  }

  if (list === undefined) return <LoadingState />;
  if (list === null) {
    return (
      <ErrorState message="הרשימה לא נמצאה." onRetry={() => router.push(`/profiles/${profileId}`)} />
    );
  }

  return (
    <MobileAppShell header={<MobileHeader title="עריכת רשימה" backHref={`/profiles/${profileId}`} />}>
      <div className="flex flex-col gap-6 p-4">
        <TaskListForm
          initialValues={{
            name: list.name,
            resetType: list.resetType,
            resetTime: list.resetTime ?? "04:00",
            weeklyResetDay: list.weeklyResetDay ?? 0,
          }}
          submitLabel="שמירה"
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />

        <Button variant="danger" onClick={() => setConfirmingDelete(true)} disabled={!isOnline}>
          מחיקת רשימה
        </Button>
      </div>

      <ConfirmationDialog
        open={confirmingDelete}
        title={`למחוק את "${list.name}"?`}
        description="הרשימה תוסתר, אך המשימות שבה יישמרו וניתן יהיה לשחזר אותה בעתיד."
        confirmLabel="מחיקה"
        destructive
        confirming={deleting || !isOnline}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </MobileAppShell>
  );
}

export default function EditListPage() {
  return (
    <RequireAuth>
      <EditListScreen />
    </RequireAuth>
  );
}
