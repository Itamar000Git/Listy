// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskImageCard } from "@/components/board/TaskImageCard";

afterEach(() => cleanup());

const baseProps = {
  taskId: "t1",
  title: "לצחצח שיניים",
  imageKey: "toothbrush",
  isCompleted: false,
  isPending: false,
  onToggle: vi.fn(),
  editHref: "/profiles/p1/lists/l1/tasks/t1/edit",
};

describe("TaskImageCard", () => {
  it("renders the description when one exists", () => {
    render(<TaskImageCard {...baseProps} description="לצחצח במשך שתי דקות" />);
    expect(screen.getByText("לצחצח במשך שתי דקות")).toBeTruthy();
    expect(screen.getByText("לצחצח שיניים")).toBeTruthy();
  });

  it("renders correctly for a task with no description field (pre-existing document)", () => {
    const { container } = render(<TaskImageCard {...baseProps} />);
    expect(screen.getByText("לצחצח שיניים")).toBeTruthy();
    expect(container.querySelector("span.text-text-muted")).toBeNull();
  });

  it("renders correctly when description is explicitly null", () => {
    render(<TaskImageCard {...baseProps} description={null} />);
    expect(screen.getByText("לצחצח שיניים")).toBeTruthy();
  });

  it("still toggles completion on tap when a description is present", () => {
    const onToggle = vi.fn();
    render(<TaskImageCard {...baseProps} description="הסבר" onToggle={onToggle} />);
    screen.getByRole("button").click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
