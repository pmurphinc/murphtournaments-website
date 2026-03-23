import { useState } from 'react';
import { Link } from 'wouter';
import { Menu, X } from 'lucide-react';

/**
 * Navigation Component
 * Cyberpunk Neon Rebellion Design
 * - Asymmetric layout with neon accents
 * - Mobile-first responsive design
 * - Glowing borders on hover
 * - Primary colors: magenta, cyan, gold
 */

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'History', href: '/tournaments' },
    { label: 'Bracket', href: '/bracket' },
    { label: 'Dev Division', href: '/dev-division' },
    { label: 'About', href: '/about' },
    { label: 'Watch', href: '/watch' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-charcoal border-b border-neon-magenta/30 backdrop-blur-sm">
      <div className="container flex items-center justify-between h-40">
        {/* Logo */}
        <Link href="/">
          <img 
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663462787524/GzitzUSk3snQMAtW4LnLnQ/MurphTournaments_logo_747bd67f.png" 
            alt="Murph Tournaments" 
            className="h-32 cursor-pointer hover:opacity-80 transition-opacity"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors hover-glow-magenta px-3 py-2 cursor-pointer">
                {item.label}
              </div>
            </Link>
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
              <Link key={item.href} href={item.href}>
                <div
                  className="text-sm font-mono uppercase tracking-widest text-white/80 hover:text-neon-magenta transition-colors py-2 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
