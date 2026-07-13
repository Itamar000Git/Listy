import Link from "next/link";
import { THEME_COLOR_BG_CLASS } from "@/lib/theme-colors";
import type { ProfileWithId } from "@/lib/types/domain";

type ProfileCardProps = {
  profile: ProfileWithId;
  onSelect: () => void;
};

export function ProfileCard({ profile, onSelect }: ProfileCardProps) {
  const bgClass = THEME_COLOR_BG_CLASS[profile.themeColor] ?? THEME_COLOR_BG_CLASS.lavender;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-transform active:scale-[0.98]"
      >
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl ${bgClass}`}
          aria-hidden
        >
          {profile.avatar || "🙂"}
        </span>
        <span className="max-w-full truncate text-base font-bold text-text">{profile.name}</span>
      </button>
      <Link
        href={`/profiles/${profile.id}/edit`}
        aria-label={`עריכת הפרופיל של ${profile.name}`}
        className="absolute end-1 top-1 flex h-9 w-9 items-center justify-center rounded-full text-text-muted active:bg-lavender/20"
      >
        <EditIcon />
      </Link>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}
