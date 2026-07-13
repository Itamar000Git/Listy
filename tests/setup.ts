import { vi } from "vitest";

// The `server-only` / `client-only` marker packages throw based on
// webpack/Turbopack's "react-server" resolve condition, which Vitest's
// plain Node environment does not set either way. Rather than picking a
// condition that would make one package silent and the other throw, treat
// both as no-ops here — the real client/server boundary is verified
// separately by tests/security/module-boundaries.test.ts (source-level
// import scanning) and by the production build's bundle-content check.
vi.mock("server-only", () => ({}));
vi.mock("client-only", () => ({}));
