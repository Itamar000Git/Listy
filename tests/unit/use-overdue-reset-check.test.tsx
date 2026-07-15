// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Timestamp } from "firebase/firestore";

const callApi = vi.fn();
vi.mock("@/lib/auth/get-auth-header", () => ({ callApi }));

const { useOverdueResetCheck } = await import("@/lib/reset/use-overdue-reset-check");

function fakeTimestamp(ms: number): Timestamp {
  return { toMillis: () => ms } as Timestamp;
}

function Probe({
  isOnline,
  lists,
}: {
  isOnline: boolean;
  lists: { id: string; profileId: string; nextResetAt: Timestamp | null }[];
}) {
  useOverdueResetCheck(isOnline, lists);
  return null;
}

afterEach(() => cleanup());

beforeEach(() => {
  callApi.mockReset();
  callApi.mockResolvedValue({ ok: true });
});

describe("useOverdueResetCheck", () => {
  it("calls check-reset for a list whose nextResetAt has already passed", async () => {
    const overdue = fakeTimestamp(Date.now() - 60_000);
    render(<Probe isOnline lists={[{ id: "l1", profileId: "p1", nextResetAt: overdue }]} />);

    await act(async () => {});
    expect(callApi).toHaveBeenCalledTimes(1);
    expect(callApi).toHaveBeenCalledWith("/api/lists/check-reset", {
      body: { profileId: "p1", listId: "l1" },
    });
  });

  it("does not call check-reset for a list whose nextResetAt is in the future", async () => {
    const future = fakeTimestamp(Date.now() + 60_000);
    render(<Probe isOnline lists={[{ id: "l1", profileId: "p1", nextResetAt: future }]} />);

    await act(async () => {});
    expect(callApi).not.toHaveBeenCalled();
  });

  it("does not call check-reset while offline", async () => {
    const overdue = fakeTimestamp(Date.now() - 60_000);
    render(<Probe isOnline={false} lists={[{ id: "l1", profileId: "p1", nextResetAt: overdue }]} />);

    await act(async () => {});
    expect(callApi).not.toHaveBeenCalled();
  });

  it("does not re-request the same (listId, nextResetAt) boundary on a visibility change", async () => {
    const overdue = fakeTimestamp(Date.now() - 60_000);
    render(<Probe isOnline lists={[{ id: "l1", profileId: "p1", nextResetAt: overdue }]} />);
    await act(async () => {});
    expect(callApi).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // Still overdue (same nextResetAt) — must not fire a second request.
    expect(callApi).toHaveBeenCalledTimes(1);
  });

  it("does request again once the list's nextResetAt has moved forward (a real reset happened) and later becomes overdue again", async () => {
    const overdue1 = fakeTimestamp(Date.now() - 60_000);
    const { rerender } = render(
      <Probe isOnline lists={[{ id: "l1", profileId: "p1", nextResetAt: overdue1 }]} />,
    );
    await act(async () => {});
    expect(callApi).toHaveBeenCalledTimes(1);

    // Simulate a later cycle's boundary also already overdue (a distinct
    // nextResetAt value) — should trigger a fresh check.
    const overdue2 = fakeTimestamp(Date.now() - 30_000);
    await act(async () => {
      rerender(<Probe isOnline lists={[{ id: "l1", profileId: "p1", nextResetAt: overdue2 }]} />);
    });
    expect(callApi).toHaveBeenCalledTimes(2);
  });

  it("retries on a later check after a failed request", async () => {
    callApi.mockRejectedValueOnce(new Error("network"));
    const overdue = fakeTimestamp(Date.now() - 60_000);
    render(<Probe isOnline lists={[{ id: "l1", profileId: "p1", nextResetAt: overdue }]} />);
    await act(async () => {});
    expect(callApi).toHaveBeenCalledTimes(1);

    callApi.mockResolvedValue({ ok: true });
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(callApi).toHaveBeenCalledTimes(2);
  });
});
