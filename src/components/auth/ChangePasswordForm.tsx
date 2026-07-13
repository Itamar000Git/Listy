"use client";

import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { isPasswordValid, PASSWORD_HINT_HE } from "@/lib/auth/password-policy";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";

/**
 * In-app password change (specification §7.9), independent of the
 * forgot-password flow. Requires re-authentication because Firebase
 * rejects sensitive account changes without a recent sign-in.
 */
export function ChangePasswordForm() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!user?.email) return;

    if (!isPasswordValid(newPassword)) {
      setError(`הסיסמה החדשה חייבת להכיל ${PASSWORD_HINT_HE}.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("הסיסמאות אינן תואמות.");
      return;
    }

    setSubmitting(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (
        err instanceof FirebaseError &&
        (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential")
      ) {
        setError("הסיסמה הנוכחית שגויה.");
      } else {
        setError("אירעה שגיאה. נסו שוב.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PasswordField
        label="סיסמה נוכחית"
        autoComplete="current-password"
        value={currentPassword}
        onChange={setCurrentPassword}
      />
      <PasswordField
        label="סיסמה חדשה"
        autoComplete="new-password"
        value={newPassword}
        onChange={setNewPassword}
        hint={PASSWORD_HINT_HE}
      />
      <PasswordField
        label="אימות סיסמה חדשה"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {success ? <p className="text-sm text-text">הסיסמה עודכנה בהצלחה.</p> : null}

      <Button type="submit" disabled={submitting} fullWidth>
        {submitting ? "מעדכנים..." : "שינוי סיסמה"}
      </Button>
    </form>
  );
}
