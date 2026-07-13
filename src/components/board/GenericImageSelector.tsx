import {
  GENERIC_TASK_IMAGE_KEYS,
  GENERIC_TASK_IMAGE_LABELS_HE,
  resolveTaskImagePath,
  type GenericTaskImageKey,
} from "@/lib/images/generic-task-images";

type GenericImageSelectorProps = {
  value: GenericTaskImageKey;
  onChange: (key: GenericTaskImageKey) => void;
};

/**
 * Built-in illustration picker (specification §9). Never opens a file
 * picker or the phone gallery — selection is limited to the bundled
 * generic set.
 */
export function GenericImageSelector({ value, onChange }: GenericImageSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-text">תמונה</span>
      <div className="grid grid-cols-4 gap-2">
        {GENERIC_TASK_IMAGE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={value === key}
            aria-label={GENERIC_TASK_IMAGE_LABELS_HE[key]}
            className={[
              "flex flex-col items-center gap-1 rounded-2xl border-2 p-2",
              value === key ? "border-pink bg-pink/20" : "border-border bg-surface",
            ].join(" ")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny bundled static SVG icons, no benefit from next/image */}
            <img src={resolveTaskImagePath(key)} alt="" width={48} height={48} className="h-12 w-12" />
            <span className="w-full truncate text-center text-xs text-text-muted">
              {GENERIC_TASK_IMAGE_LABELS_HE[key]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
