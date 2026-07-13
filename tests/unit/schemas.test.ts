import { describe, expect, it } from "vitest";
import {
  familyBootstrapSchema,
  listCreateSchema,
  listUpdateSchema,
  profileCreateSchema,
  profileNameSchema,
  resetTimeSchema,
} from "@/lib/validation/schemas";

describe("profileNameSchema", () => {
  it("rejects an empty name", () => {
    expect(profileNameSchema.safeParse("").success).toBe(false);
  });

  it("rejects a name longer than 20 characters", () => {
    expect(profileNameSchema.safeParse("a".repeat(21)).success).toBe(false);
  });

  it("accepts a valid Hebrew name", () => {
    expect(profileNameSchema.safeParse("דנה").success).toBe(true);
  });
});

describe("profileCreateSchema", () => {
  it("defaults themeColor to lavender when omitted", () => {
    const result = profileCreateSchema.parse({ name: "דנה" });
    expect(result.themeColor).toBe("lavender");
  });

  it("rejects an unknown themeColor", () => {
    expect(
      profileCreateSchema.safeParse({ name: "דנה", themeColor: "neon-green" }).success,
    ).toBe(false);
  });
});

describe("familyBootstrapSchema", () => {
  it("accepts an empty body (all fields optional)", () => {
    expect(familyBootstrapSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an invalid IANA timezone", () => {
    expect(
      familyBootstrapSchema.safeParse({ timezone: "Not/A_Real_Zone" }).success,
    ).toBe(false);
  });

  it("accepts a valid IANA timezone", () => {
    expect(
      familyBootstrapSchema.safeParse({ timezone: "Asia/Jerusalem" }).success,
    ).toBe(true);
  });
});

describe("resetTimeSchema", () => {
  it("accepts a valid HH:mm value", () => {
    expect(resetTimeSchema.safeParse("04:00").success).toBe(true);
    expect(resetTimeSchema.safeParse("23:59").success).toBe(true);
  });

  it("rejects an invalid time format", () => {
    expect(resetTimeSchema.safeParse("4:00").success).toBe(false);
    expect(resetTimeSchema.safeParse("25:00").success).toBe(false);
    expect(resetTimeSchema.safeParse("not-a-time").success).toBe(false);
  });
});

describe("listCreateSchema", () => {
  it("accepts a daily list without weeklyResetDay", () => {
    expect(
      listCreateSchema.safeParse({ profileId: "p1", name: "משימות בוקר", resetType: "daily" })
        .success,
    ).toBe(true);
  });

  it("accepts a never-reset list without resetTime", () => {
    expect(
      listCreateSchema.safeParse({ profileId: "p1", name: "רשימה קבועה", resetType: "never" })
        .success,
    ).toBe(true);
  });

  it("rejects a weekly list without weeklyResetDay", () => {
    const result = listCreateSchema.safeParse({
      profileId: "p1",
      name: "משימות שבועיות",
      resetType: "weekly",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a weekly list with weeklyResetDay", () => {
    expect(
      listCreateSchema.safeParse({
        profileId: "p1",
        name: "משימות שבועיות",
        resetType: "weekly",
        weeklyResetDay: 3,
      }).success,
    ).toBe(true);
  });

  it("rejects a list name longer than 40 characters", () => {
    expect(
      listCreateSchema.safeParse({
        profileId: "p1",
        name: "a".repeat(41),
        resetType: "daily",
      }).success,
    ).toBe(false);
  });
});

describe("listUpdateSchema", () => {
  it("allows a partial update that doesn't touch reset settings", () => {
    expect(listUpdateSchema.safeParse({ profileId: "p1", listId: "l1", name: "שם חדש" }).success).toBe(
      true,
    );
  });

  it("rejects switching to weekly without providing weeklyResetDay", () => {
    expect(
      listUpdateSchema.safeParse({ profileId: "p1", listId: "l1", resetType: "weekly" }).success,
    ).toBe(false);
  });
});
