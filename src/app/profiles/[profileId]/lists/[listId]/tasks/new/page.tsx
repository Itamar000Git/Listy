"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TaskForm, type TaskFormValues } from "@/components/tasks/TaskForm";
import { callApi } from "@/lib/auth/get-auth-header";

function AddTaskScreen() {
  const router = useRouter();
  const params = useParams<{ profileId: string; listId: string }>();
  const { profileId, listId } = params;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: TaskFormValues) {
    setError(null);
    setSubmitting(true);

    try {
      const response = await callApi("/api/tasks/create", {
        body: { profileId, listId, ...values },
      });
      if (!response.ok) {
        setError("לא ניתן היה להוסיף את המשימה. נסו שוב.");
        setSubmitting(false);
        return;
      }
      router.push(`/profiles/${profileId}/lists/${listId}`);
    } catch {
      setError("אירעה שגיאה. נסו שוב.");
      setSubmitting(false);
    }
  }

  return (
    <MobileAppShell
      header={<MobileHeader title="הוספת משימה" backHref={`/profiles/${profileId}/lists/${listId}`} />}
    >
      <div className="p-4">
        <TaskForm submitLabel="שמירה" submitting={submitting} error={error} onSubmit={handleSubmit} />
      </div>
    </MobileAppShell>
  );
}

export default function NewTaskPage() {
  return (
    <RequireAuth>
      <AddTaskScreen />
    </RequireAuth>
  );
}
