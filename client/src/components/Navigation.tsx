import { useState } from 'react';
import { Link } from 'wouter';
import { Menu, X, ChevronDown } from 'lucide-react';

/**
 * Navigation Component
 * Cyberpunk Neon Rebellion Design
 * - Asymmetric layout with neon accents
 * - Mobile-first responsive design
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

  const navItems: NavItem[] = [
    { label: 'Home', href: '/' },
    { 
      label: 'History', 
      href: '/tournaments',
      submenu: [
        { label: 'Tournament History', href: '/tournaments' },
        { label: 'Player Archive', href: '/players' },
        { label: 'Patch Notes', href: '/patchnotes' },
        // { label: 'Loadout Tracker', href: '/loadout-tracker' }, // Temporarily hidden for direct URL testing
      ]
    },
    { 
      label: 'Bracket', 
      href: '#',
      isDropdownOnly: true,
      submenu: [
        { label: 'Murph Tournament Community', href: '/bracket' },
        { label: '7th Circle', href: '/bracket2' },
      ]
    },
    { label: 'Dev Division', href: '/dev-division' },
    // { label: 'App Alpha', href: '/app' }, // Hidden for now
    { label: 'About', href: '/about' },
    { label: 'Watch', href: '/watch' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-charcoal border-b border-neon-magenta/30 backdrop-blur-sm">
      <div className="container flex items-center justify-between h-16">
        {/* Logo Section */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          {/* Murph Tournaments Logo - First */}
          <Link href="/">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663462787524/GzitzUSk3snQMAtW4LnLnQ/MurphTournaments_logo_747bd67f.png" 
              alt="Murph Tournaments" 
              className="h-10 sm:h-12 md:h-14 lg:h-16 cursor-pointer hover:opacity-80 transition-opacity" style={{width: 'auto', objectFit: 'contain'}}
            />
          </Link>
          
          {/* DD Logo - Second */}
          <Link href="/">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663462787524/GzitzUSk3snQMAtW4LnLnQ/DD_logo-removebg-preview_07cba133.png" 
              alt="Development Division" 
              className="h-10 sm:h-12 md:h-14 lg:h-16 cursor-pointer hover:opacity-80 transition-opacity" style={{width: 'auto', objectFit: 'contain'}}
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <div key={item.label} className="relative group">
              {item.isDropdownOnly ? (
                // Dropdown-only item (Bracket) - not clickable
                <div className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors hover-glow-magenta px-3 py-2 flex items-center gap-1">
                  {item.label}
                  {item.submenu && <ChevronDown size={14} />}
                </div>
              ) : (
                // Regular item or item with submenu (Home, History, Dev Division, About, Watch)
                <Link href={item.href}>
                  <div className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors hover-glow-magenta px-3 py-2 cursor-pointer flex items-center gap-1">
                    {item.label}
                    {item.submenu && <ChevronDown size={14} />}
                  </div>
                </Link>
              )}
              {item.submenu && (
                <div className="absolute left-0 mt-0 w-56 bg-black border-2 border-neon-magenta rounded hidden group-hover:block shadow-lg z-50 overflow-hidden">
                  {item.submenu.map((subitem) => (
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

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-neon-cyan hover:text-neon-magenta transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-dark-purple border-t border-neon-magenta/30">
          <div className="container py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.isDropdownOnly ? (
                  // Dropdown-only item (Bracket) - not clickable
                  <div
                    className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors py-2 cursor-pointer flex items-center justify-between"
                    onClick={() => setBracketOpen(!bracketOpen)}
                  >
                    {item.label}
                    {item.submenu && <ChevronDown size={14} className={`transition-transform ${bracketOpen ? 'rotate-180' : ''}`} />}
                  </div>
                ) : (
                  // Regular item or item with submenu
                  <Link href={item.href}>
                    <div
                      className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors py-2 cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        if (!item.submenu) setIsOpen(false);
                        if (item.label === 'History') setHistoryOpen(!historyOpen);
                      }}
                    >
                      {item.label}
                      {item.submenu && <ChevronDown size={14} className={`transition-transform ${historyOpen && item.label === 'History' ? 'rotate-180' : ''}`} />}
                    </div>
                  </Link>
                )}
                {item.submenu && item.label === 'Bracket' && bracketOpen && (
                  <div className="pl-4 flex flex-col gap-1 mt-2 border-l-2 border-neon-magenta/50">
                    {item.submenu.map((subitem) => (
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
                {item.submenu && item.label === 'History' && historyOpen && (
                  <div className="pl-4 flex flex-col gap-1 mt-2 border-l-2 border-neon-magenta/50">
                    {item.submenu.map((subitem) => (
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
