"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { callApi } from "@/lib/auth/get-auth-header";
import { firebaseAuthErrorMessage } from "@/lib/auth/firebase-error-messages";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      await callApi("/api/family/bootstrap", { body: {} });
      router.push("/profiles");
    } catch (err) {
      setError(firebaseAuthErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button type="submit" disabled={submitting} fullWidth>
        {submitting ? "מתחברים..." : "כניסה"}
      </Button>

      <div className="flex flex-col items-center gap-2 text-sm">
        <Link href="/forgot-password" className="font-bold text-text underline">
          שכחתי סיסמה
        </Link>
        <Link href="/register" className="text-text-muted underline">
          יצירת חשבון משפחתי
        </Link>
      </div>
    </form>
  );
}
