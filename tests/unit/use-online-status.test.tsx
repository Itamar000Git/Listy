// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useOnlineStatus } from "@/lib/use-online-status";

function StatusProbe() {
  const isOnline = useOnlineStatus();
  return <span data-testid="status">{isOnline ? "online" : "offline"}</span>;
}

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  cleanup();
  setNavigatorOnLine(true);
});

describe("useOnlineStatus", () => {
  it("reflects navigator.onLine on initial render", () => {
    setNavigatorOnLine(false);
    render(<StatusProbe />);
    expect(screen.getByTestId("status").textContent).toBe("offline");
  });

  it("switches to offline when the browser fires an 'offline' event", () => {
    render(<StatusProbe />);
    expect(screen.getByTestId("status").textContent).toBe("online");

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByTestId("status").textContent).toBe("offline");
  });

  it("switches back to online when the browser fires an 'online' event", () => {
    setNavigatorOnLine(false);
    render(<StatusProbe />);
    expect(screen.getByTestId("status").textContent).toBe("offline");

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.getByTestId("status").textContent).toBe("online");
  });
});
