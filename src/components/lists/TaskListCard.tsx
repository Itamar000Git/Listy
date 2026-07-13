import Link from "next/link";
import type { ListWithId } from "@/lib/types/domain";

const RESET_TYPE_LABEL: Record<ListWithId["resetType"], string> = {
  daily: "איפוס יומי",
  weekly: "איפוס שבועי",
  never: "ללא איפוס",
};

type TaskListCardProps = {
  profileId: string;
  list: ListWithId;
};

/** The card's primary tap target opens the visual task board (specification §12). */
export function TaskListCard({ profileId, list }: TaskListCardProps) {
  const progressLabel =
    list.taskCount > 0
      ? `${list.completedCount} מתוך ${list.taskCount} משימות הושלמו`
      : "עדיין אין משימות ברשימה הזאת";

  return (
    <div className="relative">
      <Link
        href={`/profiles/${profileId}/lists/${list.id}`}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 pe-11 text-start shadow-sm transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-base font-bold text-text">{list.name}</span>
          <span className="shrink-0 rounded-full bg-light-blue/60 px-3 py-1 text-xs font-bold text-text">
            {RESET_TYPE_LABEL[list.resetType]}
          </span>
        </div>

        {list.taskCount > 0 ? (
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-pink"
              style={{ width: `${Math.round((list.completedCount / list.taskCount) * 100)}%` }}
            />
          </div>
        ) : null}

        <span className="text-sm text-text-muted">{progressLabel}</span>
      </Link>

      <Link
        href={`/profiles/${profileId}/lists/${list.id}/edit`}
        aria-label={`עריכת הרשימה ${list.name}`}
        className="absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-text-muted active:bg-lavender/20"
      >
        <EditIcon />
      </Link>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}
