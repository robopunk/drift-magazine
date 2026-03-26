import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DeadlineFlag } from "@/components/company/DeadlineFlag";

function renderInSvg(ui: React.ReactElement) {
  return render(<svg viewBox="0 0 800 620">{ui}</svg>);
}

describe("DeadlineFlag", () => {
  it("renders a dashed vertical line at the given x position", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={200} canvasTop={30} canvasBottom={590} isOverdue={false} label="Dec 2025" />
    );
    const line = container.querySelector("line");
    expect(line).toBeInTheDocument();
    expect(line?.getAttribute("x1")).toBe("200");
    expect(line?.getAttribute("stroke-dasharray")).toBe("4,4");
  });

  it("uses amber colour when not overdue", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={200} canvasTop={30} canvasBottom={590} isOverdue={false} label="Dec 2025" />
    );
    const line = container.querySelector("line");
    expect(line?.getAttribute("stroke")).toBe("#f59e0b");
  });

  it("uses red colour when overdue", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={200} canvasTop={30} canvasBottom={590} isOverdue={true} label="Dec 2025" />
    );
    const line = container.querySelector("line");
    expect(line?.getAttribute("stroke")).toBe("#dc2626");
  });

  it("renders the flag triangle polygon", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={200} canvasTop={30} canvasBottom={590} isOverdue={false} label="Dec 2025" />
    );
    const polygon = container.querySelector("polygon");
    expect(polygon).toBeInTheDocument();
  });

  it("renders the date label text", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={200} canvasTop={30} canvasBottom={590} isOverdue={false} label="Dec 2025" />
    );
    const text = container.querySelector("text");
    expect(text?.textContent).toBe("Dec 2025");
  });

  it("does not render when x is 0", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={0} canvasTop={30} canvasBottom={590} isOverdue={false} label="Dec 2025" />
    );
    const g = container.querySelector("g[data-deadline-flag]");
    expect(g).not.toBeInTheDocument();
  });
});
