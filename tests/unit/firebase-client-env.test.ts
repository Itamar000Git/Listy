import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initializeApp = vi.fn(() => ({ name: "fake-app" }));
const getApps = vi.fn(() => []);
const getAuth = vi.fn(() => ({}));
const setPersistence = vi.fn().mockResolvedValue(undefined);
const getFirestore = vi.fn(() => ({}));

vi.mock("firebase/app", () => ({ initializeApp, getApps }));
vi.mock("firebase/auth", () => ({
  getAuth,
  setPersistence,
  browserLocalPersistence: "LOCAL",
}));
vi.mock("firebase/firestore", () => ({ getFirestore }));

const PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
] as const;

function clearPublicEnv() {
  for (const key of PUBLIC_ENV_KEYS) vi.stubEnv(key, "");
}

function setValidPublicEnv() {
  for (const key of PUBLIC_ENV_KEYS) vi.stubEnv(key, `test-${key}`);
}

beforeEach(() => {
  vi.resetModules();
  initializeApp.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Firebase client env validation", () => {
  it("throws a clear Hebrew error when required NEXT_PUBLIC_* vars are missing", async () => {
    clearPublicEnv();

    await expect(import("@/lib/firebase/client")).rejects.toThrow(/חסרים משתני סביבה/);
  });

  it("initializes normally once all required NEXT_PUBLIC_* vars are present", async () => {
    setValidPublicEnv();

    await expect(import("@/lib/firebase/client")).resolves.toBeDefined();
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });
});
