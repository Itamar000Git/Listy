"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { callApi } from "@/lib/auth/get-auth-header";
import { firebaseAuthErrorMessage } from "@/lib/auth/firebase-error-messages";
import { isPasswordValid, PASSWORD_HINT_HE } from "@/lib/auth/password-policy";
import { getAuthActionCodeSettings } from "@/lib/auth/action-code-settings";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";

const DEFAULT_TIMEZONE = "Asia/Jerusalem";

export function RegisterFamilyForm() {
  const router = useRouter();
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setError(`הסיסמה חייבת להכיל ${PASSWORD_HINT_HE}.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות.");
      return;
    }

    setSubmitting(true);

    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);

      // Non-blocking: registration continues even if the verification
      // email fails to send (specification §7.8).
      sendEmailVerification(credential.user, getAuthActionCodeSettings()).catch(() => {});

      const bootstrapResponse = await callApi("/api/family/bootstrap", {
        body: { name: familyName || undefined, timezone: DEFAULT_TIMEZONE },
      });
      if (!bootstrapResponse.ok) {
        setError("החשבון נוצר, אך אתחול המשפחה נכשל. נסו להתחבר שוב כדי לנסות פעם נוספת.");
        setSubmitting(false);
        return;
      }

      router.push("/profiles");
    } catch (err) {
      setError(firebaseAuthErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        label="שם המשפחה"
        type="text"
        required
        maxLength={40}
        value={familyName}
        onChange={(event) => setFamilyName(event.target.value)}
      />
      <TextField
        label="אימייל"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <PasswordField
        label="סיסמה"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        hint={PASSWORD_HINT_HE}
      />
      <PasswordField
        label="אימות סיסמה"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
      />

      <p className="text-sm text-text-muted">אזור זמן: ישראל (Asia/Jerusalem)</p>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button type="submit" disabled={submitting} fullWidth>
        {submitting ? "יוצרים חשבון..." : "יצירת חשבון"}
      </Button>
    </form>
  );
}
