"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { ProfileForm, type ProfileFormValues } from "@/components/profiles/ProfileForm";
import { callApi } from "@/lib/auth/get-auth-header";

function CreateProfileScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: ProfileFormValues) {
    setError(null);
    setSubmitting(true);

    try {
      const response = await callApi("/api/profiles/create", { body: values });
      if (!response.ok) {
        setError("לא ניתן היה ליצור את המשתמש. נסו שוב.");
        setSubmitting(false);
        return;
      }
      router.push("/profiles");
    } catch {
      setError("אירעה שגיאה. נסו שוב.");
      setSubmitting(false);
    }
  }

  return (
    <MobileAppShell header={<MobileHeader title="הוספת משתמש" backHref="/profiles" />}>
      <div className="p-4">
        <ProfileForm submitLabel="שמירה" submitting={submitting} error={error} onSubmit={handleSubmit} />
      </div>
    </MobileAppShell>
  );
}

export default function NewProfilePage() {
  return (
    <RequireAuth>
      <CreateProfileScreen />
    </RequireAuth>
  );
}
