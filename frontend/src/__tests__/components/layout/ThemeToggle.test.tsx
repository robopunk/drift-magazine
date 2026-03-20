import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

describe("ThemeToggle", () => {
  it("renders a button", () => {
    render(<ThemeToggle initialTheme="light" />);
    expect(screen.getByRole("button", { name: /theme/i })).toBeInTheDocument();
  });

  it("toggles between light and dark icons on click", async () => {
    render(<ThemeToggle initialTheme="light" />);
    const button = screen.getByRole("button", { name: /theme/i });
    const initialText = button.textContent;
    await userEvent.click(button);
    expect(button.textContent).not.toBe(initialText);
  });
});
