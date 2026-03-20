import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabBar } from "@/components/company/TabBar";

describe("TabBar", () => {
  const counts = { objectives: 6, buried: 3, evidence: 42 };

  it("renders all four tab labels", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText(/Objectives/)).toBeInTheDocument();
    expect(screen.getByText(/Buried/)).toBeInTheDocument();
    expect(screen.getByText(/Evidence/)).toBeInTheDocument();
  });

  it("shows counts next to tab labels", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("calls onTabChange when clicking a tab", async () => {
    const onTabChange = vi.fn();
    render(<TabBar activeTab="timeline" onTabChange={onTabChange} counts={counts} />);
    await userEvent.click(screen.getByText(/Objectives/));
    expect(onTabChange).toHaveBeenCalledWith("objectives");
  });

  it("marks active tab with green underline class", () => {
    render(<TabBar activeTab="buried" onTabChange={() => {}} counts={counts} />);
    const buriedTab = screen.getByText(/Buried/).closest("button");
    expect(buriedTab?.className).toContain("border-primary");
  });
});
