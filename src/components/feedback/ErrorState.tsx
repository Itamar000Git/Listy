import { Button } from "@/components/ui/Button";

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message = "אירעה שגיאה.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-4xl" aria-hidden>
        ⚠️
      </span>
      <p className="text-base text-text">{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          ניסיון חוזר
        </Button>
      ) : null}
    </div>
  );
}
