import React from 'react';

/**
 * NeonCard Component
 * Cyberpunk Neon Rebellion Design
 * - Glowing neon borders
 * - Hover effects with glow intensification
 * - Supports multiple neon color variants
 * - Asymmetric positioning support
 */

interface NeonCardProps {
  children: React.ReactNode;
  variant?: 'magenta' | 'cyan' | 'gold' | 'lime';
  className?: string;
  onClick?: () => void;
}

export default function NeonCard({
  children,
  variant = 'magenta',
  className = '',
  onClick,
}: NeonCardProps) {
  const variantClasses = {
    magenta: 'border-neon-magenta hover-glow-magenta',
    cyan: 'border-neon-cyan hover-glow-cyan',
    gold: 'border-neon-gold hover-glow-gold',
    lime: 'border-neon-lime hover-glow-lime',
  };

  return (
    <div
      className={`
        border-2 ${variantClasses[variant]}
        bg-dark-purple/50
        p-6 rounded-sm
        transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
