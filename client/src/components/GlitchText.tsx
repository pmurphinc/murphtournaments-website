import React from 'react';

/**
 * GlitchText Component
 * Cyberpunk Neon Rebellion Design
 * - Glitch effect on hover
 * - Neon color support
 * - Display typography
 */

interface GlitchTextProps {
  children: string;
  variant?: 'magenta' | 'cyan' | 'gold' | 'lime';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export default function GlitchText({
  children,
  variant = 'magenta',
  size = 'lg',
  className = '',
}: GlitchTextProps) {
  const sizeClasses = {
    sm: 'text-lg md:text-xl',
    md: 'text-xl md:text-2xl',
    lg: 'text-2xl md:text-4xl',
    xl: 'text-3xl md:text-5xl',
    '2xl': 'text-3xl md:text-6xl',
  };

  const colorClasses = {
    magenta: 'text-neon-magenta',
    cyan: 'text-neon-cyan',
    gold: 'text-neon-gold',
    lime: 'text-neon-lime',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${colorClasses[variant]}
        font-bold font-mono
        tracking-widest
        relative
        group
        ${className}
      `}
    >
      {/* Main text */}
      <span className="relative inline-block group-hover:glitch transition-all">
        {children}
      </span>

      {/* Glitch shadow layers (visible on hover) */}
      <span
        className="absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          color: 'rgb(255, 0, 255)',
          textShadow: '-2px 0 #00d9ff',
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
        }}
      >
        {children}
      </span>
      <span
        className="absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          color: 'rgb(0, 217, 255)',
          textShadow: '2px 0 #ff00ff',
          clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
        }}
      >
        {children}
      </span>
    </div>
  );
}
