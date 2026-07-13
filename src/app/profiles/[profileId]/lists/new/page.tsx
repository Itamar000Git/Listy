"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TaskListForm, type TaskListFormValues } from "@/components/lists/TaskListForm";
import { callApi } from "@/lib/auth/get-auth-header";

function CreateListScreen() {
  const router = useRouter();
  const params = useParams<{ profileId: string }>();
  const profileId = params.profileId;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: TaskListFormValues) {
    setError(null);
    setSubmitting(true);

    try {
      const response = await callApi("/api/lists/create", { body: { profileId, ...values } });
      if (!response.ok) {
        setError("לא ניתן היה ליצור את הרשימה. נסו שוב.");
        setSubmitting(false);
        return;
      }
      router.push(`/profiles/${profileId}`);
    } catch {
      setError("אירעה שגיאה. נסו שוב.");
      setSubmitting(false);
    }
  }

  return (
    <MobileAppShell
      header={<MobileHeader title="יצירת רשימה חדשה" backHref={`/profiles/${profileId}`} />}
    >
      <div className="p-4">
        <TaskListForm submitLabel="שמירה" submitting={submitting} error={error} onSubmit={handleSubmit} />
      </div>
    </MobileAppShell>
  );
}

export default function NewListPage() {
  return (
    <RequireAuth>
      <CreateListScreen />
    </RequireAuth>
  );
}
