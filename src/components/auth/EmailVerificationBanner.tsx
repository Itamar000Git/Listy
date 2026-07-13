"use client";

import { useEffect, useRef, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAuthActionCodeSettings } from "@/lib/auth/action-code-settings";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Non-blocking banner shown while the family email is unverified
 * (specification §7.8). Verification never gates any feature — this is
 * purely informational, with a rate-limited resend and a manual
 * "refresh status" action.
 */
export function EmailVerificationBanner() {
  const { user, emailVerified, loading, refreshEmailVerified } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (loading || !user || emailVerified) return null;

  async function handleResend() {
    if (!user || cooldown > 0) return;
    setStatus("sending");
    try {
      await sendEmailVerification(user, getAuthActionCodeSettings());
    } catch {
      // Neutral outcome regardless of failure, consistent with the
      // no-enumeration approach used for password reset (§7.5).
    }
    setStatus("sent");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-light-blue/40 px-4 py-3 text-sm">
      <p className="text-text">
        כתובת האימייל שלך עדיין לא אומתה. אמתו אותה כדי להבטיח שתוכלו לשחזר את הסיסמה בעתיד.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || status === "sending"}
          className="font-bold text-text underline disabled:text-text-muted disabled:no-underline"
        >
          {status === "sent"
            ? cooldown > 0
              ? `קישור האימות נשלח (ניתן לשלוח שוב בעוד ${cooldown} שניות)`
              : "שליחת קישור אימות מחדש"
            : "שליחת קישור אימות מחדש"}
        </button>
        <button type="button" onClick={refreshEmailVerified} className="text-text-muted underline">
          רענון סטטוס האימות
        </button>
      </div>
    </div>
  );
}
