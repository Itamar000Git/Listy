import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <MobileAppShell header={<MobileHeader title="שחזור סיסמה" backHref="/login" />}>
      <div className="p-4">
        <ForgotPasswordForm />
      </div>
    </MobileAppShell>
  );
}
