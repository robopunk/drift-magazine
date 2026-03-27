import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "@/components/landing/SearchBar";

describe("SearchBar", () => {
  it("renders search input with placeholder", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/search companies/i)).toBeInTheDocument();
  });

  it("calls onChange with input value", async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole("searchbox"), "SDZ");
    expect(onChange).toHaveBeenCalled();
  });
});
