import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { SignInForm } from "@/components/auth/SignInForm";

export default function LoginPage() {
  return (
    <MobileAppShell>
      <div className="flex flex-col gap-6 p-4 pt-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-4xl" aria-hidden>
            🌈
          </span>
          <h1 className="text-2xl font-bold text-text">Listy</h1>
          <p className="text-base text-text-muted">לוח המשימות המשפחתי שלכם</p>
        </div>
        <SignInForm />
      </div>
    </MobileAppShell>
  );
}
