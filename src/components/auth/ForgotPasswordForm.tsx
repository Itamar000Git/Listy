"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { getAuthActionCodeSettings } from "@/lib/auth/action-code-settings";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

const NEUTRAL_MESSAGE_HE = "אם קיימת כתובת מתאימה, נשלח אליה קישור לאיפוס הסיסמה.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setInvalidEmail(false);
    setSubmitting(true);

    try {
      await sendPasswordResetEmail(firebaseAuth, email, getAuthActionCodeSettings());
    } catch (err) {
      // Only distinguish a malformed email address (a format problem,
      // not account enumeration). Every other outcome — including
      // "no account with this email" — shows the same neutral message
      // (specification §7.5): never reveal whether an email is registered.
      if (err instanceof FirebaseError && err.code === "auth/invalid-email") {
        setInvalidEmail(true);
        setSubmitting(false);
        return;
      }
    }

    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-base text-text">{NEUTRAL_MESSAGE_HE}</p>
        <Link href="/login" className="text-center text-sm font-bold text-text underline">
          חזרה למסך הכניסה
        </Link>
      </div>
    );
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
        error={invalidEmail ? "כתובת האימייל אינה תקינה." : undefined}
      />

      <Button type="submit" disabled={submitting} fullWidth>
        {submitting ? "שולחים..." : "שליחת קישור לאיפוס"}
      </Button>

      <Link href="/login" className="text-center text-sm text-text-muted underline">
        חזרה למסך הכניסה
      </Link>
    </form>
  );
}
