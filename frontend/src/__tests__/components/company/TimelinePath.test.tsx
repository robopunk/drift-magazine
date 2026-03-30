import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TimelinePath, toSmoothPath } from "@/components/company/TimelinePath";

const points = [
  { x: 10, y: 50 },
  { x: 100, y: 120 },
  { x: 200, y: 40 },
];

const defaultProps = {
  points,
  colour: "#22c55e",
  groundY: 100,
  id: "obj-abc123",
  canvasWidth: 800,
  canvasHeight: 650,
};

describe("toSmoothPath", () => {
  it("returns empty string for 0 points", () => {
    expect(toSmoothPath([])).toBe("");
  });

  it("returns empty string for 1 point", () => {
    expect(toSmoothPath([{ x: 10, y: 50 }])).toBe("");
  });

  it("returns straight line for 2 points (per D-04)", () => {
    expect(toSmoothPath([{ x: 10, y: 50 }, { x: 100, y: 120 }])).toBe(
      "M 10 50 L 100 120"
    );
  });

  it("returns path starting with M and containing C for 3+ points (Catmull-Rom cubic output)", () => {
    const result = toSmoothPath([
      { x: 10, y: 50 },
      { x: 100, y: 120 },
      { x: 200, y: 40 },
    ]);
    expect(result).toMatch(/^M 10 50/);
    expect(result).toContain("C");
  });
});

describe("TimelinePath", () => {
  it("renders without crashing with required props", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    expect(container.querySelector("g")).toBeInTheDocument();
  });

  it("renders two clipPath elements with IDs derived from the id prop", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const clipPaths = container.querySelectorAll("clipPath");
    expect(clipPaths).toHaveLength(2);
    expect(clipPaths[0]).toHaveAttribute("id", "above-obj-abc123");
    expect(clipPaths[1]).toHaveAttribute("id", "below-obj-abc123");
  });

  it("renders a fill path with var(--primary) for above-ground zone", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const paths = Array.from(container.querySelectorAll("path"));
    const primaryFill = paths.find((p) => p.getAttribute("fill") === "var(--primary)");
    expect(primaryFill).toBeDefined();
  });

  it("renders a fill path with var(--destructive) for below-ground zone", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const paths = Array.from(container.querySelectorAll("path"));
    const destructiveFill = paths.find((p) => p.getAttribute("fill") === "var(--destructive)");
    expect(destructiveFill).toBeDefined();
  });

  it("renders an above-ground stroke at strokeWidth 2.5 with no dasharray", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const paths = Array.from(container.querySelectorAll("path"));
    const aboveStroke = paths.find(
      (p) => p.getAttribute("fill") === "none" && p.getAttribute("stroke-width") === "2.5"
    );
    expect(aboveStroke).toBeDefined();
    expect(aboveStroke!.getAttribute("stroke-dasharray")).toBeNull();
  });

  it("renders a below-ground stroke with stroke-dasharray '6 4'", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const paths = Array.from(container.querySelectorAll("path"));
    const belowStroke = paths.find((p) => p.getAttribute("stroke-dasharray") === "6 4");
    expect(belowStroke).toBeDefined();
  });

  it("above clip rect has height equal to groundY + 1 (1px overlap at boundary)", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    // groundY is 100, so height should be 101
    const aboveRect = container.querySelector("clipPath#above-obj-abc123 rect");
    expect(aboveRect).not.toBeNull();
    expect(aboveRect!.getAttribute("height")).toBe("101");
  });

  it("below clip rect has y equal to groundY - 1 (1px overlap at boundary)", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    // groundY is 100, so y should be 99
    const belowRect = container.querySelector("clipPath#below-obj-abc123 rect");
    expect(belowRect).not.toBeNull();
    expect(belowRect!.getAttribute("y")).toBe("99");
  });

  it("clip rect widths use canvasWidth (not magic 10000)", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const aboveRect = container.querySelector("clipPath#above-obj-abc123 rect");
    const belowRect = container.querySelector("clipPath#below-obj-abc123 rect");
    expect(aboveRect!.getAttribute("width")).toBe("800");
    expect(belowRect!.getAttribute("width")).toBe("800");
  });

  it("below clip rect height uses canvasHeight (not magic 10000)", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const belowRect = container.querySelector("clipPath#below-obj-abc123 rect");
    expect(belowRect!.getAttribute("height")).toBe("650");
  });
});
