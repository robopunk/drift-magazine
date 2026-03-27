import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Masthead } from "@/components/layout/Masthead";

describe("Masthead", () => {
  it("renders the green top rule", () => {
    render(<Masthead />);
    const rule = screen.getByTestId("masthead-rule");
    expect(rule).toBeInTheDocument();
  });

  it("renders logo at large size", () => {
    render(<Masthead />);
    const logo = screen.getByRole("link", { name: /drift/i });
    expect(logo).toHaveClass("text-4xl");
  });

  it("renders logo text as Drift.", () => {
    render(<Masthead />);
    expect(screen.getByRole("link", { name: /drift/i })).toHaveTextContent("Drift.");
  });

  it("renders all nav items", () => {
    render(<Masthead />);
    expect(screen.getByRole("link", { name: "Companies" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buried" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
  });

  it("logo links to home", () => {
    render(<Masthead />);
    expect(screen.getByRole("link", { name: /drift/i })).toHaveAttribute("href", "/");
  });
});
