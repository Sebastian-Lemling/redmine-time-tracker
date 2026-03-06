import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileMenu } from "@/components/ui/ProfileMenu";
import { en } from "@/i18n/translations";

const defaultProps = {
  user: { firstname: "Max", lastname: "Muster", mail: "max@example.com" },
  redmineUrl: "https://redmine.example.com",
  themeMode: "system" as const,
  onThemeModeChange: vi.fn(),
  locale: "en" as const,
  locales: [
    { code: "de" as const, label: "Deutsch", flag: "🇩🇪" },
    { code: "en" as const, label: "English", flag: "🇬🇧" },
  ],
  onLocaleChange: vi.fn(),
  t: en,
};

describe("ProfileMenu", () => {
  it("shows user avatar with initials as trigger", () => {
    render(<ProfileMenu {...defaultProps} />);
    expect(screen.getByTitle("Max Muster")).toBeInTheDocument();
    expect(screen.getByText("MM")).toBeInTheDocument();
  });

  it("click opens dropdown", () => {
    render(<ProfileMenu {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Max Muster"));
    expect(screen.getByText("Max Muster", { selector: ".profile-menu__name" })).toBeInTheDocument();
  });

  it("shows user name and email", () => {
    render(<ProfileMenu {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Max Muster"));
    expect(screen.getByText("max@example.com")).toBeInTheDocument();
  });

  it("hides email when not available", () => {
    const props = {
      ...defaultProps,
      user: { firstname: "Max", lastname: "Muster" },
    };
    render(<ProfileMenu {...props} />);
    fireEvent.click(screen.getByTitle("Max Muster"));
    expect(screen.queryByText("max@example.com")).not.toBeInTheDocument();
  });

  it('theme buttons: click light → calls onThemeModeChange("light")', () => {
    const onThemeModeChange = vi.fn();
    render(<ProfileMenu {...defaultProps} onThemeModeChange={onThemeModeChange} />);
    fireEvent.click(screen.getByTitle("Max Muster"));
    fireEvent.click(screen.getByLabelText(en.lightMode));
    expect(onThemeModeChange).toHaveBeenCalledWith("light");
  });

  it('theme buttons: click dark → calls onThemeModeChange("dark")', () => {
    const onThemeModeChange = vi.fn();
    render(<ProfileMenu {...defaultProps} onThemeModeChange={onThemeModeChange} />);
    fireEvent.click(screen.getByTitle("Max Muster"));
    fireEvent.click(screen.getByLabelText(en.darkMode));
    expect(onThemeModeChange).toHaveBeenCalledWith("dark");
  });

  it('theme buttons: click system → calls onThemeModeChange("system")', () => {
    const onThemeModeChange = vi.fn();
    render(<ProfileMenu {...defaultProps} onThemeModeChange={onThemeModeChange} />);
    fireEvent.click(screen.getByTitle("Max Muster"));
    fireEvent.click(screen.getByLabelText(en.systemTheme));
    expect(onThemeModeChange).toHaveBeenCalledWith("system");
  });

  it("current theme button visually highlighted (aria-pressed)", () => {
    render(<ProfileMenu {...defaultProps} themeMode="dark" />);
    fireEvent.click(screen.getByTitle("Max Muster"));
    const darkBtn = screen.getByLabelText(en.darkMode);
    expect(darkBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("language buttons with flag icons", () => {
    render(<ProfileMenu {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Max Muster"));
    expect(screen.getByText("🇩🇪")).toBeInTheDocument();
    expect(screen.getByText("🇬🇧")).toBeInTheDocument();
  });

  it("click language → calls onLocaleChange", () => {
    const onLocaleChange = vi.fn();
    render(<ProfileMenu {...defaultProps} onLocaleChange={onLocaleChange} />);
    fireEvent.click(screen.getByTitle("Max Muster"));
    fireEvent.click(screen.getByText("English"));
    expect(onLocaleChange).toHaveBeenCalledWith("en");
  });

  it("Redmine link opens profile URL in new tab", () => {
    render(<ProfileMenu {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Max Muster"));
    const link = screen.getByText(en.redmineProfile).closest("a");
    expect(link).toHaveAttribute("href", "https://redmine.example.com/my/account");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
