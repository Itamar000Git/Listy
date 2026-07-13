/**
 * Heart overlay for a completed task (specification §12). Positioned in
 * the card's leading corner (top-right in RTL) so it stays highly
 * visible without fully covering the illustration underneath.
 */
export function CompletionHeart() {
  return (
    <span
      className="animate-heart-pop-in absolute -top-2 end-1 text-4xl drop-shadow"
      aria-hidden
    >
      ❤️
    </span>
  );
}
