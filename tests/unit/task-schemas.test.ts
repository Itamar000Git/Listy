import { describe, expect, it } from "vitest";
import {
  taskCreateSchema,
  taskDescriptionSchema,
  taskReorderSchema,
  taskUpdateSchema,
} from "@/lib/validation/schemas";
import { GENERIC_TASK_IMAGE_KEYS } from "@/lib/images/generic-task-images";

describe("taskReorderSchema", () => {
  it("accepts a valid ordered list of task IDs", () => {
    const result = taskReorderSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      orderedTaskIds: ["t1", "t2", "t3"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects duplicate task IDs", () => {
    const result = taskReorderSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      orderedTaskIds: ["t1", "t2", "t1"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty array", () => {
    const result = taskReorderSchema.safeParse({ profileId: "p1", listId: "l1", orderedTaskIds: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a task ID containing a slash (path-injection guard)", () => {
    const result = taskReorderSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      orderedTaskIds: ["t1", "a/b"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unbounded payload beyond the max size", () => {
    const result = taskReorderSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      orderedTaskIds: Array.from({ length: 201 }, (_, i) => `t${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("ignores an unexpected familyId field in the payload (familyId always comes from the verified token)", () => {
    const result = taskReorderSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      orderedTaskIds: ["t1"],
      familyId: "someone-elses-family",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("familyId");
    }
  });
});

describe("taskDescriptionSchema", () => {
  it("accepts undefined (field omitted)", () => {
    const result = taskDescriptionSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it("accepts explicit null", () => {
    const result = taskDescriptionSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    const result = taskDescriptionSchema.safeParse("  לצחצח היטב  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("לצחצח היטב");
  });

  it("normalizes a whitespace-only value to null", () => {
    const result = taskDescriptionSchema.safeParse("   ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });

  it("normalizes an empty string to null", () => {
    const result = taskDescriptionSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });

  it("accepts a description at exactly 500 characters", () => {
    const result = taskDescriptionSchema.safeParse("א".repeat(500));
    expect(result.success).toBe(true);
  });

  it("rejects a description longer than 500 characters", () => {
    const result = taskDescriptionSchema.safeParse("א".repeat(501));
    expect(result.success).toBe(false);
  });

  it("rejects a non-string value", () => {
    expect(taskDescriptionSchema.safeParse(123).success).toBe(false);
    expect(taskDescriptionSchema.safeParse({}).success).toBe(false);
    expect(taskDescriptionSchema.safeParse(["x"]).success).toBe(false);
  });
});

describe("taskCreateSchema", () => {
  it("accepts a task without a description", () => {
    const result = taskCreateSchema.safeParse({ profileId: "p1", listId: "l1", title: "משימה" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeUndefined();
  });

  it("accepts a task with a trimmed description", () => {
    const result = taskCreateSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      title: "לצחצח שיניים",
      description: "  לצחצח במשך שתי דקות  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe("לצחצח במשך שתי דקות");
  });

  it("still requires a title", () => {
    const result = taskCreateSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      title: "",
      description: "תיאור",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an overlong description", () => {
    const result = taskCreateSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      title: "משימה",
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("taskUpdateSchema", () => {
  it("allows clearing an existing description by sending null", () => {
    const result = taskUpdateSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      taskId: "t1",
      description: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeNull();
  });

  it("leaves the description untouched when the field is omitted", () => {
    const result = taskUpdateSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      taskId: "t1",
      title: "שם חדש",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeUndefined();
  });
});

describe("GENERIC_TASK_IMAGE_KEYS additions", () => {
  const newKeys = [
    "toilet",
    "ponytail",
    "hairbrush",
    "wash-hands",
    "wash-face",
    "shoes",
    "pajamas",
    "snack",
    "coat",
  ] as const;

  it.each(newKeys)("includes the new image key %s", (key) => {
    expect(GENERIC_TASK_IMAGE_KEYS).toContain(key);
  });

  it.each(newKeys)("%s passes taskCreateSchema's imageKey validation", (key) => {
    const result = taskCreateSchema.safeParse({
      profileId: "p1",
      listId: "l1",
      title: "משימה",
      imageKey: key,
    });
    expect(result.success).toBe(true);
  });

  it("keeps every pre-existing image key valid", () => {
    const existingKeys = [
      "generic",
      "toothbrush",
      "shower",
      "clothes",
      "bed",
      "backpack",
      "homework",
      "toys",
      "meal",
      "water",
      "sleep",
      "clean-room",
      "reading",
      "exercise",
      "helping-home",
    ];
    for (const key of existingKeys) {
      expect(GENERIC_TASK_IMAGE_KEYS).toContain(key);
    }
  });
});
