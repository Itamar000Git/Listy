/**
 * Firestore Security Rules simulator tests (specification §3 — security
 * hardening pass). These run against the real `firestore.rules` file via
 * the Firebase Emulator Suite, NOT against mocks — that's the point:
 * they catch rule regressions the application-code tests can't see.
 *
 * Requires:
 *   - Java (the Firestore emulator runs on the JVM)
 *   - `firebase-tools` (available here via `npx firebase-tools`)
 *
 * Run with:
 *   npx firebase-tools emulators:exec --only firestore \
 *     "npx vitest run tests/security/firestore-rules.test.ts"
 *
 * NOTE: this environment does not have Java installed, so this suite
 * could not actually be executed here — `describe.skipIf` below makes
 * it a no-op (not a false pass) under `npm test`/`npm run test` unless
 * FIRESTORE_EMULATOR_HOST is set, which only happens inside
 * `emulators:exec`. Do not report this suite as "passing" without
 * having actually run it against a real emulator.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const EMULATOR_AVAILABLE = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!EMULATOR_AVAILABLE)("Firestore Security Rules", () => {
  let testEnv: RulesTestEnvironment;

  const FAMILY_A = "family-a-uid";
  const FAMILY_B = "family-b-uid";

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "listy-rules-test",
      firestore: {
        rules: readFileSync(join(__dirname, "..", "..", "firestore.rules"), "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it("denies an unauthenticated read of any family document", async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(unauthed.firestore().doc(`families/${FAMILY_A}`).get());
  });

  it("allows a family to read its own family document", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`families/${FAMILY_A}`).set({ name: "Family A", timezone: "Asia/Jerusalem" });
    });

    const asFamilyA = testEnv.authenticatedContext(FAMILY_A);
    await assertSucceeds(asFamilyA.firestore().doc(`families/${FAMILY_A}`).get());
  });

  it("denies Family A reading Family B's family document", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`families/${FAMILY_B}`).set({ name: "Family B", timezone: "Asia/Jerusalem" });
    });

    const asFamilyA = testEnv.authenticatedContext(FAMILY_A);
    await assertFails(asFamilyA.firestore().doc(`families/${FAMILY_B}`).get());
  });

  it("denies Family A reading Family B's profiles subcollection", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .doc(`families/${FAMILY_B}/profiles/some-profile`)
        .set({ name: "Danah", isDeleted: false });
    });

    const asFamilyA = testEnv.authenticatedContext(FAMILY_A);
    await assertFails(
      asFamilyA.firestore().doc(`families/${FAMILY_B}/profiles/some-profile`).get(),
    );
  });

  it("denies any direct browser write, even from the document's own family", async () => {
    const asFamilyA = testEnv.authenticatedContext(FAMILY_A);
    await assertFails(
      asFamilyA.firestore().doc(`families/${FAMILY_A}`).set({ name: "Hacked" }),
    );
  });

  it("denies any direct browser write to a nested profile/list/task", async () => {
    const asFamilyA = testEnv.authenticatedContext(FAMILY_A);
    await assertFails(
      asFamilyA
        .firestore()
        .doc(`families/${FAMILY_A}/profiles/p1/lists/l1/tasks/t1`)
        .set({ title: "Hacked", completedCycle: 999 }),
    );
  });
});
