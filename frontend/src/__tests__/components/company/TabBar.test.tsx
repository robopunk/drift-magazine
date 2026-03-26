import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabBar } from "@/components/company/TabBar";

describe("TabBar", () => {
  const counts = { objectives: 6, proved: 1, buried: 3, evidence: 42 };

  it("renders all five tab labels", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText(/Objectives/)).toBeInTheDocument();
    expect(screen.getByText(/Proved/)).toBeInTheDocument();
    expect(screen.getByText(/Buried/)).toBeInTheDocument();
    expect(screen.getByText(/Evidence/)).toBeInTheDocument();
  });

  it("shows counts next to tab labels", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("calls onTabChange when clicking a tab", async () => {
    const onTabChange = vi.fn();
    render(<TabBar activeTab="timeline" onTabChange={onTabChange} counts={counts} />);
    await userEvent.click(screen.getByText(/Proved/));
    expect(onTabChange).toHaveBeenCalledWith("proved");
  });

  it("uses top-16 sticky offset to clear the taller masthead", () => {
    const { container } = render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    const stickyEl = container.querySelector(".sticky");
    expect(stickyEl).toHaveClass("top-16");
  });

  it("marks active tab with green underline class", () => {
    render(<TabBar activeTab="proved" onTabChange={() => {}} counts={counts} />);
    const provedTab = screen.getByText(/Proved/).closest("button");
    expect(provedTab?.className).toContain("border-primary");
  });

  it("styles proved count badge with emerald tint when count > 0", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    const provedBadge = screen.getByText("1");
    expect(provedBadge.className).toContain("text-primary");
  });

  it("styles buried count badge with destructive tint when count > 0", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    const buriedBadge = screen.getByText("3");
    expect(buriedBadge.className).toContain("text-destructive");
  });
});
