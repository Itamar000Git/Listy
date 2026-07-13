"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { ProfileForm, type ProfileFormValues } from "@/components/profiles/ProfileForm";
import { ConfirmationDialog } from "@/components/actions/ConfirmationDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { callApi } from "@/lib/auth/get-auth-header";
import { subscribeToProfile } from "@/lib/firestore/profiles";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { ProfileWithId } from "@/lib/types/domain";

function EditProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ profileId: string }>();
  const profileId = params.profileId;

  const [profile, setProfile] = useState<ProfileWithId | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToProfile(user.uid, profileId, setProfile);
    return unsubscribe;
  }, [user, profileId]);

  async function handleSubmit(values: ProfileFormValues) {
    setError(null);
    setSubmitting(true);

    try {
      const response = await callApi("/api/profiles/update", {
        body: { profileId, ...values },
      });
      if (!response.ok) {
        setError("לא ניתן היה לשמור את השינויים. נסו שוב.");
        setSubmitting(false);
        return;
      }
      router.push("/profiles");
    } catch {
      setError("אירעה שגיאה. נסו שוב.");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await callApi("/api/profiles/delete", { body: { profileId } });
      router.push("/profiles");
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
      setError("לא ניתן היה למחוק את המשתמש. נסו שוב.");
    }
  }

  if (profile === undefined) return <LoadingState />;
  if (profile === null) {
    return <ErrorState message="המשתמש לא נמצא." onRetry={() => router.push("/profiles")} />;
  }

  return (
    <MobileAppShell header={<MobileHeader title="עריכת משתמש" backHref="/profiles" />}>
      <div className="flex flex-col gap-6 p-4">
        <ProfileForm
          initialValues={{ name: profile.name, avatar: profile.avatar ?? "🙂", themeColor: profile.themeColor as ProfileFormValues["themeColor"] }}
          submitLabel="שמירה"
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />

        <Button variant="danger" onClick={() => setConfirmingDelete(true)} disabled={!isOnline}>
          מחיקת משתמש
        </Button>
      </div>

      <ConfirmationDialog
        open={confirmingDelete}
        title={`למחוק את ${profile.name}?`}
        description="המשתמש יוסתר, אך הרשימות והמשימות שלו יישמרו וניתן יהיה לשחזר אותו בעתיד."
        confirmLabel="מחיקה"
        destructive
        confirming={deleting || !isOnline}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </MobileAppShell>
  );
}

export default function EditProfilePage() {
  return (
    <RequireAuth>
      <EditProfileScreen />
    </RequireAuth>
  );
}
