// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeAudio {
  src: string;
  preload = "";
  currentTime = 0;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();

  constructor(src: string) {
    this.src = src;
    instances.push(this);
  }
}

let instances: FakeAudio[] = [];

beforeEach(() => {
  vi.resetModules();
  instances = [];
  vi.stubGlobal("Audio", FakeAudio);
  window.localStorage.clear();
});

describe("soundManager", () => {
  it("plays mark_task.mp3 (and only that file) when a task is completed", async () => {
    const { soundManager } = await import("@/lib/audio/sound-manager");
    soundManager.setMuted(false);

    soundManager.playTaskCompleted();

    const markTask = instances.find((el) => el.src.includes("mark_task.mp3"));
    const endList = instances.find((el) => el.src.includes("end_list.mp3"));
    expect(markTask?.play).toHaveBeenCalledTimes(1);
    expect(endList?.play).not.toHaveBeenCalled();
  });

  it("plays end_list.mp3 (and only that file) when the list is completed", async () => {
    const { soundManager } = await import("@/lib/audio/sound-manager");
    soundManager.setMuted(false);

    soundManager.playListCompleted();

    const markTask = instances.find((el) => el.src.includes("mark_task.mp3"));
    const endList = instances.find((el) => el.src.includes("end_list.mp3"));
    expect(endList?.play).toHaveBeenCalledTimes(1);
    expect(markTask?.play).not.toHaveBeenCalled();
  });

  it("does not play anything while muted", async () => {
    const { soundManager } = await import("@/lib/audio/sound-manager");
    soundManager.setMuted(true);

    soundManager.playTaskCompleted();
    soundManager.playListCompleted();

    for (const el of instances) {
      expect(el.play).not.toHaveBeenCalled();
    }
  });

  it("persists the mute preference across module reloads", async () => {
    const first = await import("@/lib/audio/sound-manager");
    first.soundManager.setMuted(true);

    vi.resetModules();
    const second = await import("@/lib/audio/sound-manager");
    expect(second.soundManager.isMuted()).toBe(true);
  });
});
