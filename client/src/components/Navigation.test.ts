import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Discord avatar header control", () => {
  const source = readFileSync(
    new URL("./Navigation.tsx", import.meta.url),
    "utf8"
  );

  it("does not lose its minimum size at responsive breakpoints", () => {
    expect(source).toContain("h-10 min-h-10 min-w-10 flex-none shrink-0");
    expect(source).toContain("h-8 w-8 min-w-8 flex-none shrink-0");
    expect(source).toContain("2xl:inline");
  });

  it("uses xl navigation breakpoint so avatar and hamburger do not overlap", () => {
    expect(source).toContain("hidden xl:flex");
    expect(source).toContain("xl:hidden");
  });

  it("links Team Management while keeping Tournament Signups disabled", () => {
    expect(source).toContain('href="/teams"');
    expect(source).toContain("Tournament Signups");
    expect(source).toContain("Coming soon");
  });
});

describe("Navigation active state and dropdown behavior", () => {
  const source = readFileSync(
    new URL("./Navigation.tsx", import.meta.url),
    "utf8"
  );

  it("uses Wouter location for active navigation state", () => {
    expect(source).toContain('import { Link, useLocation } from "wouter";');
    expect(source).toContain("const [location] = useLocation();");
    expect(source).toContain(
      "const isRouteActive = (href: string) => location === href;"
    );
    expect(source).toContain("const isItemActive = (item: NavItem) =>");
  });

  it("uses an opaque fixed header and compact mobile panel without backdrop blur", () => {
    expect(source).toContain(
      'className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e27] border-b border-neon-magenta/30"'
    );
    expect(source).toContain(
      "absolute right-4 top-16 w-[min(20rem,calc(100vw-2rem))]"
    );
    expect(source).toContain("bg-[#0a0e27]");
    expect(source).not.toMatch(/<nav[^>]*bg-[^\s"]+\/\d+/);
    expect(source).not.toMatch(/<nav[^>]*opacity-/);
    expect(source).not.toContain("backdrop-blur");
    expect(source).not.toContain("backdrop-filter");
  });

  it("keeps the mobile menu hidden at the xl desktop breakpoint", () => {
    expect(source).toContain("xl:hidden");
  });

  it("renders submenu parent labels as buttons instead of navigation links", () => {
    expect(source).toContain("{item.submenu ? (");
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-haspopup="true"');
    expect(source).not.toContain(
      "<Link href={item.href}>\n                    <div"
    );
  });

  it("keeps desktop dropdown visibility click-driven without hover classes", () => {
    expect(source).toContain("const toggleDropdown = (label: string) =>");
    expect(source).toContain('${expanded ? "block" : "hidden"}');
    expect(source).not.toContain("group-hover:block");
    expect(source).not.toContain("group-focus-within:block");
    expect(source).not.toContain('className="relative group"');
  });

  it("stacks desktop submenu links as full-width rows", () => {
    expect(source).toContain("block w-full px-4 py-3 text-sm font-mono");
  });

  it("uses the mobile close handler for direct links and submenu selections", () => {
    expect(source).toContain("const closeMobileMenu = () => {");
    expect(source).toContain("setHistoryOpen(false);");
    expect(source).toContain("setTournamentOpen(false);");
    expect(source).toContain("onClick={closeMobileMenu}");
    expect(
      source.match(/onClick=\{closeMobileMenu\}/g)?.length
    ).toBeGreaterThanOrEqual(2);
  });
});
