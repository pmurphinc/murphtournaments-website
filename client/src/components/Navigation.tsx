import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Navigation Component
 * Cyberpunk Neon Rebellion Design
 * - Asymmetric layout with neon accents
 * - Glowing borders on hover
 * - Primary colors: magenta, cyan, gold
 */

interface NavItem {
  label: string;
  href: string;
  submenu?: NavItem[];
  isDropdownOnly?: boolean;
}

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout, loading } = useAuth();
  const isDiscordUser = user?.loginMethod === "discord";
  const displayName = user?.discordDisplayName || user?.name || "Discord user";
  const username = user?.discordUsername;

  const navItems: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "Map RNG", href: "/maprng" },
    { label: "Weapon Archive", href: "/balance-archive" },
    {
      label: "Tournament",
      href: "/tournaments/june-2026",
      submenu: [
        { label: "June", href: "/tournaments/june-2026" },
        { label: "Roster", href: "/tournaments/june-2026/roster" },
      ],
    },
    {
      label: "History",
      href: "/tournaments",
      submenu: [
        { label: "Tournament History", href: "/tournaments" },
        { label: "Player Archive", href: "/players" },
        { label: "Patch Notes", href: "/patchnotes" },
        // { label: 'Loadout Tracker', href: '/loadout-tracker' }, // Temporarily hidden for direct URL testing
      ],
    },
    // {
    //   label: 'Bracket',
    //   href: '#',
    //   isDropdownOnly: true,
    //   submenu: [
    //     { label: 'Murph Tournament Community', href: '/bracket' },
    //     { label: '7th Circle', href: '/bracket2' },
    //   ]
    // },
    { label: "About", href: "/about" },
    { label: "Watch", href: "/watch" },
  ];

  const closeMobileMenu = () => {
    setIsOpen(false);
    setBracketOpen(false);
    setHistoryOpen(false);
    setTournamentOpen(false);
  };

  const isRouteActive = (href: string) => location === href;
  const isItemActive = (item: NavItem) =>
    isRouteActive(item.href) ||
    item.submenu?.some(subitem => isRouteActive(subitem.href));

  const getTopLevelClassName = (active: boolean) =>
    `text-sm font-mono uppercase tracking-widest ${active ? "text-neon-magenta" : "text-white/80"} hover:text-neon-magenta transition-colors hover-glow-magenta px-3 py-2 flex items-center gap-1`;

  const getMobileItemClassName = (active: boolean) =>
    `flex w-full items-center justify-between px-3 py-2 text-left font-mono text-sm uppercase tracking-widest ${active ? "text-neon-magenta" : "text-white/80"} transition-colors hover:text-neon-magenta`;

  const getSubmenuClassName = (active: boolean, mobile = false) =>
    mobile
      ? `cursor-pointer px-3 py-2 font-mono text-xs ${active ? "text-neon-magenta" : "text-white/70"} transition-all duration-200 hover:bg-neon-magenta/10 hover:font-bold hover:text-neon-magenta hover:glow-magenta`
      : `block w-full px-4 py-3 text-sm font-mono ${active ? "text-neon-magenta" : "text-white/80"} hover:text-neon-magenta hover:font-bold hover:bg-neon-magenta/20 transition-all duration-200 cursor-pointer first:rounded-t last:rounded-b border-b border-neon-magenta/30 last:border-b-0 hover:border-b-neon-magenta/50 hover:glow-magenta`;

  const toggleDropdown = (label: string) => {
    if (label === "Bracket") {
      setBracketOpen(open => !open);
      setHistoryOpen(false);
      setTournamentOpen(false);
    }

    if (label === "History") {
      setHistoryOpen(open => !open);
      setBracketOpen(false);
      setTournamentOpen(false);
    }

    if (label === "Tournament") {
      setTournamentOpen(open => !open);
      setBracketOpen(false);
      setHistoryOpen(false);
    }
  };

  const accountMenu =
    isDiscordUser && user ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-10 min-h-10 min-w-10 flex-none shrink-0 items-center gap-2 rounded-full border border-yellow-400/40 bg-black/60 px-1.5 py-1 text-left transition hover:border-yellow-400 hover:bg-yellow-400/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 2xl:px-2"
            aria-label="Open Discord account menu"
          >
            <img
              src={user.discordAvatarUrl || undefined}
              alt=""
              className="h-8 w-8 min-w-8 flex-none shrink-0 rounded-full border border-neon-cyan/40 bg-dark-purple object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="hidden max-w-36 truncate font-mono text-xs font-bold text-white 2xl:inline">
              {displayName}
            </span>
            <ChevronDown
              size={14}
              className="flex-none shrink-0 text-yellow-400"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="w-[min(18rem,calc(100vw-1.5rem))] border-yellow-400/40 bg-black text-white shadow-[0_0_28px_rgba(250,204,21,0.18)]"
        >
          <DropdownMenuLabel className="font-mono">
            <div className="flex min-w-0 flex-none shrink-0 items-center gap-2 sm:gap-3">
              <img
                src={user.discordAvatarUrl || undefined}
                alt=""
                className="h-10 w-10 rounded-full border border-neon-cyan/40 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{displayName}</p>
                {username ? (
                  <p className="truncate text-xs text-white/55">@{username}</p>
                ) : null}
              </div>
            </div>
            <p className="mt-3 rounded border border-neon-cyan/25 bg-neon-cyan/10 px-2 py-1 text-[11px] uppercase tracking-widest text-neon-cyan">
              Signed in with Discord
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-yellow-400/25" />
          <DropdownMenuItem
            asChild
            className="cursor-pointer font-mono text-white focus:bg-yellow-400/15 focus:text-yellow-200"
          >
            <Link href="/team-finder">My Listings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="cursor-pointer font-mono text-white focus:bg-yellow-400/15 focus:text-yellow-200"
          >
            <Link href="/team-finder?post=1">Post Listing</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-yellow-400/25" />
          <DropdownMenuItem
            asChild
            className="cursor-pointer font-mono text-white focus:bg-yellow-400/15 focus:text-yellow-200"
          >
            <Link href="/teams">Team Management</Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="font-mono text-white/45">
            <span className="flex w-full items-center justify-between">
              Tournament Signups{" "}
              <span className="text-[10px] uppercase text-yellow-400/70">
                Coming soon
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-yellow-400/25" />
          <DropdownMenuItem
            onClick={() => void logout()}
            disabled={loading}
            className="cursor-pointer font-mono text-neon-magenta focus:bg-neon-magenta/15 focus:text-neon-magenta"
          >
            <LogOut size={14} /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e27] border-b border-neon-magenta/30">
      <div className="container flex items-center justify-between h-16">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          <Link
            href="/"
            aria-label="Murph Tournaments home"
            className="flex h-14 shrink-0 items-center"
          >
            <img
              src="/images/Murph%20Tournaments_logo.png"
              alt="Murph Tournaments"
              className="block h-full w-auto shrink-0 cursor-pointer object-contain transition-opacity hover:opacity-80"
            />
          </Link>
        </div>

        <div className="hidden xl:flex items-center gap-8">
          {navItems.map(item => {
            const active = Boolean(isItemActive(item));
            const expanded =
              (bracketOpen && item.label === "Bracket") ||
              (historyOpen && item.label === "History") ||
              (tournamentOpen && item.label === "Tournament");

            return (
              <div key={item.label} className="relative">
                {item.submenu ? (
                  <button
                    type="button"
                    className={`${getTopLevelClassName(active)} cursor-pointer`}
                    aria-expanded={expanded}
                    aria-haspopup="true"
                    onClick={() => toggleDropdown(item.label)}
                  >
                    {item.label}
                    <ChevronDown size={14} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`${getTopLevelClassName(active)} cursor-pointer`}
                  >
                    {item.label}
                  </Link>
                )}
                {item.submenu && (
                  <div
                    className={`absolute left-0 mt-0 w-56 overflow-hidden rounded border-2 border-neon-magenta bg-black shadow-lg z-50 ${expanded ? "block" : "hidden"}`}
                  >
                    {item.submenu.map(subitem => {
                      const subitemActive = isRouteActive(subitem.href);
                      return (
                        <Link
                          key={subitem.href}
                          href={subitem.href}
                          aria-current={subitemActive ? "page" : undefined}
                          className={getSubmenuClassName(subitemActive)}
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
          {accountMenu}
          <button
            onClick={() => (isOpen ? closeMobileMenu() : setIsOpen(true))}
            className="flex h-10 w-10 flex-none shrink-0 items-center justify-center text-neon-cyan transition-colors hover:text-neon-magenta xl:hidden"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute right-4 top-16 w-[min(20rem,calc(100vw-2rem))] border border-neon-magenta/40 bg-[#0a0e27] shadow-[0_12px_28px_rgba(0,0,0,0.55)] xl:hidden sm:right-6 lg:right-8">
          <div className="flex max-h-[calc(100vh-5rem)] flex-col gap-1 overflow-y-auto p-2">
            {navItems.map(item => {
              const active = Boolean(isItemActive(item));
              const expanded =
                (bracketOpen && item.label === "Bracket") ||
                (historyOpen && item.label === "History") ||
                (tournamentOpen && item.label === "Tournament");

              return (
                <div key={item.label}>
                  {item.submenu ? (
                    <button
                      type="button"
                      className={getMobileItemClassName(active)}
                      aria-expanded={expanded}
                      onClick={() => toggleDropdown(item.label)}
                    >
                      {item.label}
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={getMobileItemClassName(active)}
                      onClick={closeMobileMenu}
                    >
                      {item.label}
                    </Link>
                  )}
                  {item.submenu && expanded && (
                    <div className="ml-3 mt-1 flex flex-col gap-0 border-l-2 border-neon-magenta/50 pl-3">
                      {item.submenu.map(subitem => {
                        const subitemActive = isRouteActive(subitem.href);
                        return (
                          <Link
                            key={subitem.href}
                            href={subitem.href}
                            aria-current={subitemActive ? "page" : undefined}
                            className={getSubmenuClassName(subitemActive, true)}
                            onClick={closeMobileMenu}
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
        </div>
      )}
    </nav>
  );
}
