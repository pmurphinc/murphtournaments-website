import { useState } from "react";
import { Link } from "wouter";
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
  const { user, logout, loading } = useAuth();
  const isDiscordUser = user?.loginMethod === "discord";
  const displayName = user?.discordDisplayName || user?.name || "Discord user";
  const username = user?.discordUsername;

  const accountMenu = isDiscordUser && user ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-yellow-400/40 bg-black/60 px-2 py-1 text-left transition hover:border-yellow-400 hover:bg-yellow-400/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
          aria-label="Open Discord account menu"
        >
          <img
            src={user.discordAvatarUrl || undefined}
            alt=""
            className="h-8 w-8 rounded-full border border-neon-cyan/40 bg-dark-purple object-cover"
            referrerPolicy="no-referrer"
          />
          <span className="hidden max-w-36 truncate font-mono text-xs font-bold text-white xl:inline">{displayName}</span>
          <ChevronDown size={14} className="text-yellow-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 border-yellow-400/40 bg-black text-white shadow-[0_0_28px_rgba(250,204,21,0.18)]">
        <DropdownMenuLabel className="font-mono">
          <div className="flex items-center gap-3">
            <img src={user.discordAvatarUrl || undefined} alt="" className="h-10 w-10 rounded-full border border-neon-cyan/40 object-cover" referrerPolicy="no-referrer" />
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{displayName}</p>
              {username ? <p className="truncate text-xs text-white/55">@{username}</p> : null}
            </div>
          </div>
          <p className="mt-3 rounded border border-neon-cyan/25 bg-neon-cyan/10 px-2 py-1 text-[11px] uppercase tracking-widest text-neon-cyan">Signed in with Discord</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-yellow-400/25" />
        <DropdownMenuItem asChild className="cursor-pointer font-mono text-white focus:bg-yellow-400/15 focus:text-yellow-200">
          <Link href="/team-finder">My Listings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer font-mono text-white focus:bg-yellow-400/15 focus:text-yellow-200">
          <Link href="/team-finder?post=1">Post Listing</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-yellow-400/25" />
        <DropdownMenuItem disabled className="font-mono text-white/45">
          <span className="flex w-full items-center justify-between">Team Management <span className="text-[10px] uppercase text-yellow-400/70">Coming soon</span></span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="font-mono text-white/45">
          <span className="flex w-full items-center justify-between">Tournament Signups <span className="text-[10px] uppercase text-yellow-400/70">Coming soon</span></span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-yellow-400/25" />
        <DropdownMenuItem onClick={() => void logout()} disabled={loading} className="cursor-pointer font-mono text-neon-magenta focus:bg-neon-magenta/15 focus:text-neon-magenta">
          <LogOut size={14} /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-charcoal border-b border-neon-magenta/30 backdrop-blur-sm">
      <div className="container flex items-center justify-between h-16">
        {/* Logo Section */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          {/* Murph Tournaments Logo - First */}
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

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          {navItems.map(item => (
            <div key={item.label} className="relative group">
              {item.isDropdownOnly ? (
                // Dropdown-only item (Bracket) - not clickable
                <div className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors hover-glow-magenta px-3 py-2 flex items-center gap-1">
                  {item.label}
                  {item.submenu && <ChevronDown size={14} />}
                </div>
              ) : (
                // Regular item or item with submenu
                <Link href={item.href}>
                  <div className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors hover-glow-magenta px-3 py-2 cursor-pointer flex items-center gap-1">
                    {item.label}
                    {item.submenu && <ChevronDown size={14} />}
                  </div>
                </Link>
              )}
              {item.submenu && (
                <div className="absolute left-0 mt-0 w-56 bg-black border-2 border-neon-magenta rounded hidden group-hover:block shadow-lg z-50 overflow-hidden">
                  {item.submenu.map(subitem => (
                    <Link key={subitem.href} href={subitem.href}>
                      <div className="px-4 py-3 text-sm font-mono text-white/80 hover:text-white hover:font-bold hover:bg-neon-magenta/20 transition-all duration-200 cursor-pointer first:rounded-t last:rounded-b border-b border-neon-magenta/30 last:border-b-0 hover:border-b-neon-magenta/50 hover:glow-magenta">
                        {subitem.label}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {accountMenu}
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden text-neon-cyan hover:text-neon-magenta transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden bg-dark-purple border-t border-neon-magenta/30">
          <div className="container py-4 flex flex-col gap-4">
            {navItems.map(item => (
              <div key={item.label}>
                {item.isDropdownOnly ? (
                  // Dropdown-only item (Bracket) - not clickable
                  <div
                    className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors py-2 cursor-pointer flex items-center justify-between"
                    onClick={() => setBracketOpen(!bracketOpen)}
                  >
                    {item.label}
                    {item.submenu && (
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${bracketOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </div>
                ) : (
                  // Regular item or item with submenu
                  <Link href={item.href}>
                    <div
                      className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors py-2 cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        if (!item.submenu) setIsOpen(false);
                        if (item.label === "History")
                          setHistoryOpen(!historyOpen);
                        if (item.label === "Tournament")
                          setTournamentOpen(!tournamentOpen);
                      }}
                    >
                      {item.label}
                      {item.submenu && (
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${
                            (historyOpen && item.label === "History") ||
                            (tournamentOpen && item.label === "Tournament")
                              ? "rotate-180"
                              : ""
                          }`}
                        />
                      )}
                    </div>
                  </Link>
                )}
                {item.submenu && item.label === "Bracket" && bracketOpen && (
                  <div className="pl-4 flex flex-col gap-1 mt-2 border-l-2 border-neon-magenta/50">
                    {item.submenu.map(subitem => (
                      <Link key={subitem.href} href={subitem.href}>
                        <div
                          className="text-xs font-mono text-white/70 hover:text-white hover:font-bold hover:bg-neon-magenta/10 hover:glow-magenta transition-all duration-200 py-2 px-3 cursor-pointer rounded"
                          onClick={() => setIsOpen(false)}
                        >
                          {subitem.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {item.submenu &&
                  item.label === "Tournament" &&
                  tournamentOpen && (
                    <div className="pl-4 flex flex-col gap-1 mt-2 border-l-2 border-neon-magenta/50">
                      {item.submenu.map(subitem => (
                        <Link key={subitem.href} href={subitem.href}>
                          <div
                            className="text-xs font-mono text-white/70 hover:text-white hover:font-bold hover:bg-neon-magenta/10 hover:glow-magenta transition-all duration-200 py-2 px-3 cursor-pointer rounded"
                            onClick={() => setIsOpen(false)}
                          >
                            {subitem.label}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                {item.submenu && item.label === "History" && historyOpen && (
                  <div className="pl-4 flex flex-col gap-1 mt-2 border-l-2 border-neon-magenta/50">
                    {item.submenu.map(subitem => (
                      <Link key={subitem.href} href={subitem.href}>
                        <div
                          className="text-xs font-mono text-white/70 hover:text-white hover:font-bold hover:bg-neon-magenta/10 hover:glow-magenta transition-all duration-200 py-2 px-3 cursor-pointer rounded"
                          onClick={() => setIsOpen(false)}
                        >
                          {subitem.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}