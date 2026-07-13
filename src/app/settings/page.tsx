"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { BackupControls } from "@/components/settings/BackupControls";

function SettingsScreen() {
  return (
    <MobileAppShell header={<MobileHeader title="הגדרות" backHref="/profiles" />}>
      <div className="flex flex-col gap-8 p-4">
        <BackupControls />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-text">שינוי סיסמה</span>
          <ChangePasswordForm />
        </div>
      </div>
    </MobileAppShell>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsScreen />
    </RequireAuth>
  );
}
