import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..", "..", "src");

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectFiles(fullPath, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(fullPath);
    }
  }
  return out;
}

const allFiles = collectFiles(SRC_ROOT);

describe("client/server module boundaries", () => {
  it("no app/api route imports the client-only Firebase module", () => {
    const apiFiles = allFiles.filter((f) => f.includes(join("app", "api")));
    const offenders = apiFiles.filter((f) =>
      readFileSync(f, "utf8").includes("@/lib/firebase/client"),
    );
    expect(offenders).toEqual([]);
  });

  it("no file marked \"use client\" imports the server-only Firebase Admin module", () => {
    const offenders = allFiles.filter((f) => {
      const content = readFileSync(f, "utf8");
      const isClientComponent = content.trimStart().startsWith('"use client"');
      return isClientComponent && content.includes("@/lib/firebase/admin");
    });
    expect(offenders).toEqual([]);
  });

  it("lib/firebase/client.ts declares itself client-only", () => {
    const content = readFileSync(join(SRC_ROOT, "lib", "firebase", "client.ts"), "utf8");
    expect(content).toContain('import "client-only"');
  });

  it("lib/firebase/admin.ts declares itself server-only", () => {
    const content = readFileSync(join(SRC_ROOT, "lib", "firebase", "admin.ts"), "utf8");
    expect(content).toContain('import "server-only"');
  });
});
