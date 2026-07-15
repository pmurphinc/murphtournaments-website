import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./Navigation.tsx", import.meta.url),
  "utf8"
);

describe("Discord avatar header control", () => {
  it("does not lose its minimum size at responsive breakpoints", () => {
    expect(source).toContain("h-10 min-h-10 min-w-10 flex-none shrink-0");
    expect(source).toContain("h-8 w-8 min-w-8 flex-none shrink-0");
    expect(source).toContain("2xl:inline");
  });

  it("uses the lg navigation breakpoint so avatar and hamburger do not overlap", () => {
    expect(source).toContain("hidden items-center gap-1 lg:flex");
    expect(source).toContain("lg:hidden");
  });

  it("links the account menu to Team Finder without listing/post duplicates", () => {
    expect(source).toContain('<Link href="/team-finder">Team Finder</Link>');
    expect(source).not.toContain("My Listings");
    expect(source).not.toContain("Post Listing");
    expect(source).not.toContain("/team-finder?post=1");
  });

  it("keeps management links, TCR, and the admin-only control room link", () => {
    expect(source).toContain('href="/teams"');
    expect(source).toContain('href="/TCR"');
    expect(source).toContain('href="/admin/tournaments/control"');
    expect(source).toContain("MTC Discord TCR");
    expect(source).not.toContain("Tournament Signups");
    expect(source).not.toContain("Coming soon");
  });

  it("only shows the MTC Discord TCR menu link to admin users", () => {
    expect(source).toContain(
      'const canSeeTournamentControl = user?.role === "admin";'
    );
    expect(source).toContain("{canSeeTournamentControl && (");
  });

  it("themes the portaled account dropdown content independently of the current route", () => {
    // DropdownMenuContent renders via a Radix Portal to document.body, outside
    // the .public-theme-scoped <main>, so it must carry the scope class
    // itself to pick up the gold palette consistently everywhere it opens
    // (including on /admin and /TCR, where <main> intentionally does not).
    expect(source).toMatch(
      /DropdownMenuContent[\s\S]*?className="public-theme/
    );
  });
});

describe("Navigation identity and active-state behavior", () => {
  it("uses Wouter location for active navigation state", () => {
    expect(source).toContain('import { Link, useLocation } from "wouter";');
    expect(source).toContain("const [location] = useLocation();");
    expect(source).toContain(
      "const isRouteActive = (href: string) => location === href;"
    );
    expect(source).toContain("const isItemActive = (item: NavItem) =>");
  });

  it("uses an opaque black fixed header without backdrop blur or glow", () => {
    expect(source).toContain(
      'className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--mt-steel-line)] bg-[var(--mt-black)]"'
    );
    expect(source).not.toMatch(/<nav[^>]*bg[^\s"]+\/\d+/);
    expect(source).not.toMatch(/<nav[^>]*opacity-/);
    expect(source).not.toContain("backdrop-blur");
    expect(source).not.toContain("backdrop-filter");
  });

  it("renders submenu parent labels as buttons instead of navigation links", () => {
    expect(source).toContain("{item.submenu ? (");
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-haspopup="true"');
  });

  it("keeps desktop dropdown visibility click-driven without hover classes", () => {
    expect(source).toMatch(
      /setOpenSubmenu\(open =>\s*open === item\.label \? null : item\.label\s*\)/
    );
    expect(source).toMatch(/expanded\s*\?\s*"block"\s*:\s*"hidden"/);
    expect(source).not.toContain("group-hover:block");
    expect(source).not.toContain("group-focus-within:block");
    expect(source).not.toContain('className="relative group"');
  });

  it("stacks desktop submenu links as full-width rows", () => {
    expect(source).toContain(
      "block w-full border-b border-[var(--mt-steel-line)] px-4 py-3"
    );
  });

  it("closes the desktop submenu from an outside pointer interaction", () => {
    expect(source).toContain(
      "const navRef = useRef<HTMLElement | null>(null);"
    );
    expect(source).toContain(
      'document.addEventListener("pointerdown", handleDocumentPointerDown);'
    );
    expect(source).toContain(
      'document.removeEventListener("pointerdown", handleDocumentPointerDown);'
    );
    expect(source).toContain("navRef.current?.contains(target)");
    expect(source).toContain("setOpenSubmenu(null)");
  });

  it("closes desktop submenu selections without affecting the Radix account menu", () => {
    expect(source).toContain("<DropdownMenu>");
    expect(source).toContain("<DropdownMenuTrigger asChild>");
    expect(source).toMatch(
      /subitem\.href[\s\S]*?onClick=\{\(\) => setOpenSubmenu\(null\)\}/
    );
  });
});

describe("Mobile navigation uses a Radix Sheet", () => {
  it("imports and renders the Sheet primitives instead of a hand-rolled panel", () => {
    expect(source).toContain(
      'import {\n  Sheet,\n  SheetClose,\n  SheetContent,\n  SheetHeader,\n  SheetTitle,\n  SheetTrigger,\n} from "@/components/ui/sheet";'
    );
    expect(source).toContain(
      "<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>"
    );
    expect(source).toContain("<SheetTrigger asChild>");
    expect(source).toContain("<SheetContent");
  });

  it("themes the portaled sheet content independently of the current route", () => {
    expect(source).toMatch(/<SheetContent[\s\S]*?className="public-theme/);
  });

  it("wraps every direct mobile link and submenu link in SheetClose so selecting a link closes the menu", () => {
    const closeCount = (source.match(/<SheetClose asChild/g) ?? []).length;
    expect(closeCount).toBeGreaterThanOrEqual(2);
  });

  it("gives the mobile hamburger and Discord CTA real accessible names", () => {
    expect(source).toContain('aria-label="Open navigation menu"');
    expect(source).toContain('aria-label="Open Discord account menu"');
  });
});
