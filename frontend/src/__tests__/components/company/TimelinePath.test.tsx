import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TimelinePath } from "@/components/company/TimelinePath";

const points = [
  { x: 10, y: 50 },
  { x: 100, y: 120 },
  { x: 200, y: 40 },
];

const defaultProps = {
  points,
  colour: "#22c55e",
  isBelowGround: false,
  groundY: 100,
  id: "obj-abc123",
};

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
});
