import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { RegisterFamilyForm } from "@/components/auth/RegisterFamilyForm";

export default function RegisterPage() {
  return (
    <MobileAppShell header={<MobileHeader title="יצירת חשבון משפחתי" backHref="/login" />}>
      <div className="p-4">
        <RegisterFamilyForm />
      </div>
    </MobileAppShell>
  );
}
