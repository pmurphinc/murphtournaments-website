import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import CtaButton from "@/components/public/CtaButton";

/**
 * Murph Tournaments — global site navigation.
 * Black/charcoal/metallic-gold identity, shared across every public route
 * (and, as a small compatibility adjustment, the admin/TCR chrome too —
 * their page *content* is untouched, see index.css `.public-theme`).
 */

interface NavItem {
  label: string;
  href: string;
  submenu?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Tournaments",
    href: "/tournaments/june-2026",
    submenu: [
      { label: "Current Event", href: "/tournaments/june-2026" },
      { label: "Browse Tournaments", href: "/tournaments/community" },
      { label: "Results & Archive", href: "/tournaments" },
    ],
  },
  { label: "Players", href: "/players" },
  { label: "Watch", href: "/watch" },
  { label: "News", href: "/patchnotes" },
  { label: "Weapon Archive", href: "/balance-archive" },
  { label: "Map RNG", href: "/maprng" },
  { label: "About", href: "/about" },
];

const DISCORD_URL = "https://discord.gg/kcmdxmBgnC";

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(
    null
  );
  const [location] = useLocation();
  const { user, logout, loading } = useAuth();
  const isDiscordUser = user?.loginMethod === "discord";
  const canSeeTournamentControl = user?.role === "admin";
  const displayName = user?.discordDisplayName || user?.name || "Discord user";
  const username = user?.discordUsername;
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && navRef.current?.contains(target)) return;
      setOpenSubmenu(null);
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, []);

  const isRouteActive = (href: string) => location === href;
  const isItemActive = (item: NavItem) =>
    isRouteActive(item.href) ||
    Boolean(item.submenu?.some(subitem => isRouteActive(subitem.href)));

  const topLevelClass = (active: boolean) =>
    `flex items-center gap-1 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)] ${
      active
        ? "text-[var(--mt-gold-bright)]"
        : "text-[var(--mt-muted)] hover:text-[var(--mt-off-white)]"
    }`;

  const mobileItemClass = (active: boolean) =>
    `flex w-full items-center justify-between rounded-md px-3 py-3 text-left font-mono text-sm font-bold uppercase tracking-widest ${
      active
        ? "bg-[var(--mt-charcoal-raised)] text-[var(--mt-gold-bright)]"
        : "text-[var(--mt-muted)] hover:text-[var(--mt-off-white)]"
    }`;

  const accountMenu =
    isDiscordUser && user ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-10 min-h-10 min-w-10 flex-none shrink-0 items-center gap-2 rounded-full border border-[var(--mt-gold)]/40 bg-[var(--mt-black)]/60 px-1.5 py-1 text-left transition hover:border-[var(--mt-gold)] hover:bg-[var(--mt-gold)]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)] 2xl:px-2"
            aria-label="Open Discord account menu"
          >
            <img
              src={user.discordAvatarUrl || undefined}
              alt=""
              className="h-8 w-8 min-w-8 flex-none shrink-0 rounded-full border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="hidden max-w-36 truncate font-mono text-xs font-bold text-[var(--mt-off-white)] 2xl:inline">
              {displayName}
            </span>
            <ChevronDown
              size={14}
              className="flex-none shrink-0 text-[var(--mt-gold-bright)]"
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="public-theme w-[min(18rem,calc(100vw-1.5rem))] border-[var(--mt-gold)]/40 bg-[var(--mt-black)] text-[var(--mt-off-white)]"
        >
          <DropdownMenuLabel className="font-mono">
            <div className="flex min-w-0 flex-none shrink-0 items-center gap-2 sm:gap-3">
              <img
                src={user.discordAvatarUrl || undefined}
                alt=""
                className="h-10 w-10 rounded-full border border-[var(--mt-steel-line)] object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--mt-off-white)]">
                  {displayName}
                </p>
                {username ? (
                  <p className="truncate text-xs text-[var(--mt-muted)]">
                    @{username}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="mt-3 rounded border border-[var(--mt-gold)]/25 bg-[var(--mt-gold)]/10 px-2 py-1 text-[11px] uppercase tracking-widest text-[var(--mt-gold-bright)]">
              Signed in with Discord
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[var(--mt-gold)]/25" />
          <DropdownMenuItem asChild className="cursor-pointer font-mono">
            <Link href="/team-finder">Team Finder</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[var(--mt-gold)]/25" />
          <DropdownMenuItem asChild className="cursor-pointer font-mono">
            <Link href="/teams">Team Management</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer font-mono">
            <Link href="/TCR">TCR</Link>
          </DropdownMenuItem>
          {canSeeTournamentControl && (
            <DropdownMenuItem asChild className="cursor-pointer font-mono">
              <Link href="/admin/tournaments/control">MTC Discord TCR</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-[var(--mt-gold)]/25" />
          <DropdownMenuItem
            onClick={() => void logout()}
            disabled={loading}
            className="cursor-pointer font-mono text-[var(--mt-danger)] focus:text-[var(--mt-danger)]"
          >
            <LogOut size={14} aria-hidden="true" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <a
        href={getDiscordLoginUrl()}
        className="inline-flex h-10 flex-none shrink-0 items-center justify-center rounded-full border border-[#5865F2]/70 bg-gradient-to-r from-[#5865F2] to-[#3b45b8] px-3 font-mono text-[11px] font-black uppercase tracking-wider text-white transition hover:border-[var(--mt-gold)] hover:from-[#6875ff] hover:to-[#4b55c8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)] sm:px-4"
      >
        <span className="hidden sm:inline">Sign in with Discord</span>
        <span className="sm:hidden">Discord</span>
      </a>
    );

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--mt-steel-line)] bg-[var(--mt-black)]"
    >
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="Murph Tournaments home"
          className="flex h-12 shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)]"
        >
          <img
            src="/images/Murph%20Tournaments_logo.png"
            alt="Murph Tournaments"
            className="block h-full w-auto shrink-0 object-contain transition-opacity hover:opacity-80"
          />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map(item => {
            const active = isItemActive(item);
            const expanded = openSubmenu === item.label;

            return (
              <div key={item.label} className="relative">
                {item.submenu ? (
                  <button
                    type="button"
                    className={`${topLevelClass(active)} cursor-pointer`}
                    aria-expanded={expanded}
                    aria-haspopup="true"
                    onClick={() =>
                      setOpenSubmenu(open =>
                        open === item.label ? null : item.label
                      )
                    }
                  >
                    {item.label}
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={topLevelClass(active)}
                  >
                    {item.label}
                  </Link>
                )}
                {item.submenu && (
                  <div
                    className={`absolute left-0 top-full mt-1 w-56 overflow-hidden rounded-md border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] shadow-lg ${
                      expanded ? "block" : "hidden"
                    }`}
                  >
                    {item.submenu.map(subitem => {
                      const subitemActive = isRouteActive(subitem.href);
                      return (
                        <Link
                          key={subitem.href}
                          href={subitem.href}
                          aria-current={subitemActive ? "page" : undefined}
                          onClick={() => setOpenSubmenu(null)}
                          className={`block w-full border-b border-[var(--mt-steel-line)] px-4 py-3 font-mono text-sm last:border-b-0 ${
                            subitemActive
                              ? "text-[var(--mt-gold-bright)]"
                              : "text-[var(--mt-off-white)] hover:bg-[var(--mt-charcoal-raised)] hover:text-[var(--mt-gold-bright)]"
                          }`}
                        >
                          {subitem.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-none shrink-0 items-center gap-2 sm:gap-3">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block"
          >
            <CtaButton tone="gold" className="h-9 px-4 text-[11px]">
              Join Discord
            </CtaButton>
          </a>
          {accountMenu}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation menu"
                className="flex h-10 w-10 flex-none shrink-0 items-center justify-center text-[var(--mt-off-white)] transition-colors hover:text-[var(--mt-gold-bright)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)] lg:hidden"
              >
                <Menu size={22} aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="public-theme w-[min(20rem,85vw)] border-[var(--mt-steel-line)] bg-[var(--mt-black)] text-[var(--mt-off-white)]"
            >
              <SheetHeader>
                <SheetTitle className="font-mono uppercase tracking-widest text-[var(--mt-off-white)]">
                  Menu
                </SheetTitle>
              </SheetHeader>
              <nav
                aria-label="Mobile"
                className="flex flex-col gap-1 overflow-y-auto px-4 pb-6"
              >
                {NAV_ITEMS.map(item => {
                  const active = isItemActive(item);
                  const expanded = openMobileSubmenu === item.label;
                  return (
                    <div key={item.label}>
                      {item.submenu ? (
                        <button
                          type="button"
                          className={mobileItemClass(active)}
                          aria-expanded={expanded}
                          onClick={() =>
                            setOpenMobileSubmenu(open =>
                              open === item.label ? null : item.label
                            )
                          }
                        >
                          {item.label}
                          <ChevronDown
                            size={14}
                            aria-hidden="true"
                            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      ) : (
                        <SheetClose asChild>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={mobileItemClass(active)}
                          >
                            {item.label}
                          </Link>
                        </SheetClose>
                      )}
                      {item.submenu && expanded && (
                        <div className="ml-3 mt-1 flex flex-col gap-1 border-l-2 border-[var(--mt-gold)]/40 pl-3">
                          {item.submenu.map(subitem => {
                            const subitemActive = isRouteActive(subitem.href);
                            return (
                              <SheetClose asChild key={subitem.href}>
                                <Link
                                  href={subitem.href}
                                  aria-current={
                                    subitemActive ? "page" : undefined
                                  }
                                  className={`rounded-md px-3 py-2 font-mono text-sm ${
                                    subitemActive
                                      ? "text-[var(--mt-gold-bright)]"
                                      : "text-[var(--mt-muted)] hover:text-[var(--mt-off-white)]"
                                  }`}
                                >
                                  {subitem.label}
                                </Link>
                              </SheetClose>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4"
                >
                  <CtaButton tone="gold" className="w-full">
                    Join Discord
                  </CtaButton>
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
