// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicProvider, useMusic } from "@/components/music/MusicProvider";

class FakeAudio {
  src = "";
  loop = false;
  muted = false;
  volume = 1;
  preload = "";
  paused = true;
  playResult: "resolve" | "reject" = "resolve";
  listeners: Record<string, Array<() => void>> = {};

  addEventListener(type: string, handler: () => void) {
    (this.listeners[type] ??= []).push(handler);
  }
  removeEventListener(type: string, handler: () => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((h) => h !== handler);
  }
  dispatch(type: string) {
    (this.listeners[type] ?? []).forEach((h) => h());
  }

  play = vi.fn(() => {
    if (this.playResult === "reject") {
      return Promise.reject(new Error("NotAllowedError"));
    }
    this.paused = false;
    return Promise.resolve();
  });

  pause = vi.fn(() => {
    this.paused = true;
    this.dispatch("pause");
  });
}

let instances: FakeAudio[] = [];

function Probe() {
  const music = useMusic();
  return (
    <div>
      <span data-testid="selected">{music.selectedTrackId}</span>
      <span data-testid="playing">{String(music.isPlaying)}</span>
      <span data-testid="muted">{String(music.isMuted)}</span>
      <span data-testid="track-count">{music.tracks.length}</span>
      <button onClick={music.play}>play</button>
      <button onClick={music.pause}>pause</button>
      <button onClick={music.toggleMuted}>toggle-mute</button>
      <button onClick={() => music.selectTrack("happykids")}>select-happykids</button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

beforeEach(() => {
  instances = [];
  vi.stubGlobal(
    "Audio",
    class extends FakeAudio {
      constructor() {
        super();
        instances.push(this);
      }
    },
  );
});

describe("MusicProvider", () => {
  it("initially selects a bundled track and does not claim to be playing", async () => {
    render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId("selected").textContent).toBe("goodmorning");
    expect(screen.getByTestId("playing").textContent).toBe("false");
  });

  it("registers the three bundled tracks (plus any imported ones)", async () => {
    render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    expect(Number(screen.getByTestId("track-count").textContent)).toBeGreaterThanOrEqual(3);
  });

  it("only reports isPlaying: true after play() actually succeeds", async () => {
    render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    await act(async () => {
      screen.getByText("play").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("playing").textContent).toBe("true");
    expect(instances[0].loop).toBe(true);
  });

  it("stays in a safe paused state when autoplay/playback is rejected — never falsely claims playback", async () => {
    render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    instances.forEach((i) => (i.playResult = "reject"));
    await act(async () => {
      screen.getByText("play").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("playing").textContent).toBe("false");
  });

  it("selecting a bundled track changes the audio source", async () => {
    render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    await act(async () => {
      screen.getByText("select-happykids").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("selected").textContent).toBe("happykids");
    expect(instances[0].src).toContain("happykids.mp3");
  });

  it("never creates a second simultaneous Audio element when switching tracks", async () => {
    render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    await act(async () => {
      screen.getByText("select-happykids").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(instances).toHaveLength(1);
  });

  it("music mute does not affect any other preference (independent localStorage key)", async () => {
    render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    await act(async () => {
      screen.getByText("toggle-mute").click();
    });
    expect(screen.getByTestId("muted").textContent).toBe("true");
    expect(window.localStorage.getItem("listy:sound-muted")).toBeNull();
    expect(window.localStorage.getItem("listy:music-muted")).toBe("true");
  });

  it("persists the selected track and mute preference across a fresh mount (simulated reload)", async () => {
    const { unmount } = render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    await act(async () => {
      screen.getByText("select-happykids").click();
      screen.getByText("toggle-mute").click();
      await Promise.resolve();
    });
    unmount();

    render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId("selected").textContent).toBe("happykids");
    expect(screen.getByTestId("muted").textContent).toBe("true");
  });

  it("the sound-effects mute key does not affect the music mute state (independent preferences)", async () => {
    window.localStorage.setItem("listy:sound-muted", "true");
    render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId("muted").textContent).toBe("false");
  });

  it("does not restart or recreate the Audio element across re-renders (route changes)", async () => {
    const { rerender } = render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    await act(async () => {
      screen.getByText("play").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(instances).toHaveLength(1);

    rerender(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    // Re-rendering children (simulating navigation) must not tear down
    // and recreate the shared audio element — same provider instance.
    expect(instances).toHaveLength(1);
  });

  it("looping is enabled on the shared audio element", async () => {
    render(
      <MusicProvider>
        <Probe />
      </MusicProvider>,
    );
    await act(async () => {});
    expect(instances[0].loop).toBe(true);
  });
});
