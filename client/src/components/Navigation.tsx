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
}

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'History', href: '/tournaments' },
    { 
      label: 'Bracket', 
      href: '/bracket',
      submenu: [
        { label: 'Dev Division', href: '/bracket' },
        { label: '7th Circle', href: '/bracket2' },
        { label: 'Player Archive', href: '/players' },
      ]
    },
    { label: 'Dev Division', href: '/dev-division' },
    { label: 'About', href: '/about' },
    { label: 'Watch', href: '/watch' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-charcoal border-b border-neon-magenta/30 backdrop-blur-sm">
      <div className="container flex items-center justify-between h-16">
        {/* Logo Section */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* DD Logo */}
          <Link href="/">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663462787524/GzitzUSk3snQMAtW4LnLnQ/DD_logo-removebg-preview_07cba133.png" 
              alt="Development Division" 
              className="h-14 cursor-pointer hover:opacity-80 transition-opacity" style={{width: '100px', height: '96px', marginBottom: '-5px', objectFit: 'contain'}}
            />
          </Link>
          
          {/* Murph Tournaments Logo */}
          <Link href="/">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663462787524/GzitzUSk3snQMAtW4LnLnQ/MurphTournaments_logo_747bd67f.png" 
              alt="Murph Tournaments" 
              className="h-14 cursor-pointer hover:opacity-80 transition-opacity" style={{width: '180px', height: '121px', marginBottom: '-5px', marginTop: '7px', objectFit: 'contain'}}
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <div key={item.href} className="relative group">
              <Link href={item.href}>
                <div className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors hover-glow-magenta px-3 py-2 cursor-pointer flex items-center gap-1">
                  {item.label}
                  {item.submenu && <ChevronDown size={14} />}
                </div>
              </Link>
              {item.submenu && (
                <div className="absolute left-0 mt-0 w-48 bg-dark-charcoal border border-neon-magenta/50 rounded hidden group-hover:block shadow-lg">
                  {item.submenu.map((subitem) => (
                    <Link key={subitem.href} href={subitem.href}>
                      <div className="px-4 py-2 text-sm font-mono text-white/80 hover:text-neon-magenta hover:bg-neon-magenta/10 transition-colors cursor-pointer first:rounded-t last:rounded-b">
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
              <div key={item.href}>
                <Link href={item.href}>
                  <div
                    className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors py-2 cursor-pointer flex items-center justify-between"
                    onClick={() => {
                      if (!item.submenu) setIsOpen(false);
                      if (item.label === 'Bracket') setBracketOpen(!bracketOpen);
                    }}
                  >
                    {item.label}
                    {item.submenu && <ChevronDown size={14} className={`transition-transform ${bracketOpen && item.label === 'Bracket' ? 'rotate-180' : ''}`} />}
                  </div>
                </Link>
                {item.submenu && bracketOpen && item.label === 'Bracket' && (
                  <div className="pl-4 flex flex-col gap-2 mt-2 border-l border-neon-magenta/30">
                    {item.submenu.map((subitem) => (
                      <Link key={subitem.href} href={subitem.href}>
                        <div
                          className="text-xs font-mono text-white/70 hover:text-neon-magenta transition-colors py-1 cursor-pointer"
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
