// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const usePrefersReducedMotion = vi.fn(() => false);
vi.mock("@/lib/use-prefers-reduced-motion", () => ({ usePrefersReducedMotion }));

const { BunnyCarrotProgress, computeRemainingCarrotRatio } = await import(
  "@/components/board/BunnyCarrotProgress"
);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  usePrefersReducedMotion.mockReturnValue(false);
});

function getRoot(container: HTMLElement) {
  return container.querySelector('[aria-hidden="true"][dir="ltr"]') as HTMLElement | null;
}

function getBunnyImg(container: HTMLElement) {
  return container.querySelector("img") as HTMLImageElement | null;
}

function getClipDiv(container: HTMLElement) {
  // The clip wrapper is the div carrying the clip-path style, nested
  // inside the flex-1 overflow-hidden wrapper.
  return container.querySelector('.absolute.inset-0[style*="clip"]') as HTMLElement | null;
}

describe("computeRemainingCarrotRatio", () => {
  it("returns 1 (full carrot) for taskCount 0 without dividing by zero", () => {
    expect(computeRemainingCarrotRatio(0, 0)).toBe(1);
    expect(Number.isFinite(computeRemainingCarrotRatio(0, 0))).toBe(true);
  });

  it("returns 1 for zero completed", () => {
    expect(computeRemainingCarrotRatio(4, 0)).toBe(1);
  });

  it("returns the correct fraction for each of 0/4..4/4", () => {
    expect(computeRemainingCarrotRatio(4, 0)).toBe(1);
    expect(computeRemainingCarrotRatio(4, 1)).toBeCloseTo(0.75);
    expect(computeRemainingCarrotRatio(4, 2)).toBeCloseTo(0.5);
    expect(computeRemainingCarrotRatio(4, 3)).toBeCloseTo(0.25);
    expect(computeRemainingCarrotRatio(4, 4)).toBe(0);
  });

  it("clamps completedCount greater than taskCount to 0 (never negative)", () => {
    expect(computeRemainingCarrotRatio(4, 999)).toBe(0);
  });

  it("clamps a negative completedCount to at most 1", () => {
    expect(computeRemainingCarrotRatio(4, -5)).toBe(1);
  });
});

describe("BunnyCarrotProgress — assets and rendering", () => {
  it("uses the exact approved asset paths", () => {
    const { container } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={0} completionEventId={0} />,
    );
    const imgs = Array.from(container.querySelectorAll("img")).map((img) => img.getAttribute("src"));
    expect(imgs).toContain("/images/brand/listy-bunny.png");
    expect(imgs).toContain("/images/brand/listy-carrot.png");
  });

  it("renders nothing for taskCount === 0 (no invalid CSS, no crash)", () => {
    const { container } = render(
      <BunnyCarrotProgress taskCount={0} completedCount={0} completionEventId={0} />,
    );
    expect(getRoot(container)).toBeNull();
  });

  it("shows the full carrot (0% eaten) when nothing is completed", () => {
    const { container } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={0} completionEventId={0} />,
    );
    const clip = getClipDiv(container);
    expect(clip?.style.clipPath).toContain("0%");
  });

  it("shows the correct remaining ratio for partial completion", () => {
    const { container } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={1} completionEventId={0} />,
    );
    const clip = getClipDiv(container);
    // 1/4 completed -> 25% eaten -> clip-path hides the left 25%.
    expect(clip?.style.clipPath).toContain("25%");
  });

  it("hides the carrot entirely (100% eaten) when all tasks are completed", () => {
    const { container } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={4} completionEventId={0} />,
    );
    const clip = getClipDiv(container);
    expect(clip?.style.clipPath).toContain("100%");
  });

  it("clamps an inconsistent temporary completedCount safely", () => {
    const { container } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={999} completionEventId={0} />,
    );
    const clip = getClipDiv(container);
    expect(clip?.style.clipPath).toContain("100%");
  });

  it("keeps rendering the composition alongside — the numeric progress is a separate sibling and is untouched", () => {
    const { container } = render(
      <>
        <p>0 מתוך 4 משימות הושלמו</p>
        <BunnyCarrotProgress taskCount={4} completedCount={0} completionEventId={0} />
      </>,
    );
    expect(container.textContent).toContain("0 מתוך 4 משימות הושלמו");
    expect(getRoot(container)).not.toBeNull();
  });
});

describe("BunnyCarrotProgress — bite animation triggering", () => {
  it("does not bite on initial mount, even with a non-zero starting completionEventId", () => {
    const { container } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={2} completionEventId={7} />,
    );
    const bunny = getBunnyImg(container);
    expect(bunny?.className).not.toContain("animate-bunny-bite");
  });

  it("triggers exactly one bite when completionEventId changes (a confirmed new completion)", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={0} completionEventId={0} />,
    );
    expect(getBunnyImg(container)?.className).not.toContain("animate-bunny-bite");

    rerender(<BunnyCarrotProgress taskCount={4} completedCount={1} completionEventId={1} />);
    expect(getBunnyImg(container)?.className).toContain("animate-bunny-bite");

    // Bite clears itself after its duration.
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(getBunnyImg(container)?.className).not.toContain("animate-bunny-bite");
  });

  it("does not bite when completedCount changes but completionEventId does not (marking a task incomplete)", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={2} completionEventId={3} />,
    );

    // Task marked incomplete: completedCount drops, completionEventId is
    // untouched by the caller (see the prop's contract).
    rerender(<BunnyCarrotProgress taskCount={4} completedCount={1} completionEventId={3} />);
    expect(getBunnyImg(container)?.className).not.toContain("animate-bunny-bite");
  });

  it("restores the correct carrot portion when a task is marked incomplete, without a bite", () => {
    const { container, rerender } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={2} completionEventId={3} />,
    );
    expect(getClipDiv(container)?.style.clipPath).toContain("50%");

    rerender(<BunnyCarrotProgress taskCount={4} completedCount={1} completionEventId={3} />);
    expect(getClipDiv(container)?.style.clipPath).toContain("25%");
    expect(getBunnyImg(container)?.className).not.toContain("animate-bunny-bite");
  });

  it("does not bite or change the carrot when props are unchanged (failed/offline mutation — caller never updates props)", () => {
    const { container, rerender } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={1} completionEventId={2} />,
    );
    const before = getClipDiv(container)?.style.clipPath;

    rerender(<BunnyCarrotProgress taskCount={4} completedCount={1} completionEventId={2} />);
    expect(getClipDiv(container)?.style.clipPath).toBe(before);
    expect(getBunnyImg(container)?.className).not.toContain("animate-bunny-bite");
  });

  it("re-triggers a new bite when a task is completed again after being uncompleted", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={2} completionEventId={3} />,
    );

    rerender(<BunnyCarrotProgress taskCount={4} completedCount={1} completionEventId={3} />);
    expect(getBunnyImg(container)?.className).not.toContain("animate-bunny-bite");

    rerender(<BunnyCarrotProgress taskCount={4} completedCount={2} completionEventId={4} />);
    expect(getBunnyImg(container)?.className).toContain("animate-bunny-bite");
  });

  it("cleans up its bite timeout on unmount without throwing", () => {
    vi.useFakeTimers();
    const { unmount, rerender, container } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={0} completionEventId={0} />,
    );
    rerender(<BunnyCarrotProgress taskCount={4} completedCount={1} completionEventId={1} />);
    expect(getBunnyImg(container)?.className).toContain("animate-bunny-bite");

    expect(() => unmount()).not.toThrow();
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
  });
});

describe("BunnyCarrotProgress — reduced motion", () => {
  it("never adds the bite class when reduced motion is enabled, even on a confirmed new completion", () => {
    usePrefersReducedMotion.mockReturnValue(true);
    vi.useFakeTimers();
    const { container, rerender } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={0} completionEventId={0} />,
    );

    rerender(<BunnyCarrotProgress taskCount={4} completedCount={1} completionEventId={1} />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(getBunnyImg(container)?.className).not.toContain("animate-bunny-bite");
  });

  it("still updates the visible carrot amount under reduced motion, just without an animated transition", () => {
    usePrefersReducedMotion.mockReturnValue(true);
    const { container, rerender } = render(
      <BunnyCarrotProgress taskCount={4} completedCount={0} completionEventId={0} />,
    );
    expect(getClipDiv(container)?.style.transition).toBe("none");

    rerender(<BunnyCarrotProgress taskCount={4} completedCount={2} completionEventId={1} />);
    expect(getClipDiv(container)?.style.clipPath).toContain("50%");
    expect(getClipDiv(container)?.style.transition).toBe("none");
  });
});
