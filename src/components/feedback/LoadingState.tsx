export function LoadingState({ message = "טוען..." }: { message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-pink" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
