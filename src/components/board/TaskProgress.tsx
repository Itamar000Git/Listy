type TaskProgressProps = {
  completedCount: number;
  taskCount: number;
};

export function TaskProgress({ completedCount, taskCount }: TaskProgressProps) {
  const percent = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-1 px-4 pb-2 pt-3">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-pink transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-sm text-text-muted">
        {completedCount} מתוך {taskCount} משימות הושלמו
      </span>
    </div>
  );
}
