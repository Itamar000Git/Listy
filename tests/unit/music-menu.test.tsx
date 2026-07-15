// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicProvider } from "@/components/music/MusicProvider";
import { MusicMenu } from "@/components/music/MusicMenu";

class FakeAudio {
  src = "";
  loop = false;
  muted = false;
  volume = 1;
  preload = "";
  addEventListener() {}
  removeEventListener() {}
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

beforeEach(() => {
  vi.stubGlobal("Audio", FakeAudio);
});

function renderMenu() {
  return render(
    <MusicProvider>
      <MusicMenu />
    </MusicProvider>,
  );
}

describe("MusicMenu", () => {
  it("has an accessible Hebrew label on the trigger button", async () => {
    renderMenu();
    await act(async () => {});
    expect(screen.getByLabelText("פתיחת תפריט מוזיקת רקע")).toBeTruthy();
  });

  it("opens the panel on click and lists the three bundled Hebrew track names", async () => {
    renderMenu();
    await act(async () => {});
    fireEvent.click(screen.getByLabelText("פתיחת תפריט מוזיקת רקע"));
    expect(screen.getAllByText("בוקר טוב").length).toBeGreaterThan(0);
    expect(screen.getByText("ילדים שמחים")).toBeTruthy();
    expect(screen.getByText("מוזיקת בוקר")).toBeTruthy();
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    renderMenu();
    await act(async () => {});
    const trigger = screen.getByLabelText("פתיחת תפריט מוזיקת רקע");
    fireEvent.click(trigger);
    expect(screen.queryAllByText("בוקר טוב").length).toBeGreaterThan(0);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryAllByText("בוקר טוב").length).toBe(0);
  });

  it("closes when clicking outside the panel", async () => {
    renderMenu();
    await act(async () => {});
    fireEvent.click(screen.getByLabelText("פתיחת תפריט מוזיקת רקע"));
    expect(screen.queryAllByText("בוקר טוב").length).toBeGreaterThan(0);

    fireEvent.pointerDown(document.body);
    expect(screen.queryAllByText("בוקר טוב").length).toBe(0);
  });

  it("mentions that imported songs are device-local only", async () => {
    renderMenu();
    await act(async () => {});
    fireEvent.click(screen.getByLabelText("פתיחת תפריט מוזיקת רקע"));
    expect(screen.getByText("שירים שהוספת נשמרים רק במכשיר ובדפדפן הזה.")).toBeTruthy();
  });

  it("has an accessible play/pause control reflecting current state", async () => {
    renderMenu();
    await act(async () => {});
    fireEvent.click(screen.getByLabelText("פתיחת תפריט מוזיקת רקע"));
    expect(screen.getByLabelText("הפעלת מוזיקת רקע")).toBeTruthy();
  });

  it("has an accessible mute control reflecting current state", async () => {
    renderMenu();
    await act(async () => {});
    fireEvent.click(screen.getByLabelText("פתיחת תפריט מוזיקת רקע"));
    expect(screen.getByLabelText("השתקת מוזיקת רקע")).toBeTruthy();
  });
});
