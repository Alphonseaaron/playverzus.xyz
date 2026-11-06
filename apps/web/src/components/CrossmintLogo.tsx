import React from 'react';
import Image from 'next/image';

interface CrossmintLogoProps {
  className?: string;
  showWordmark?: boolean;
  variant?: 'icon' | 'full';
  alt?: string;
}

/**
 * Official Crossmint Brand Component
 * - variant="icon" or showWordmark=false: Renders the official 4-leaf emerald green Crossmint mark on transparent background.
 * - variant="full" or showWordmark=true: Renders the complete brandmark with green leaf icon and crisp white wordmark on transparent background.
 */
export function CrossmintLogo({
  className = 'w-4 h-4',
  showWordmark = false,
  variant,
  alt = 'Crossmint',
}: CrossmintLogoProps) {
  const isFull = variant === 'full' || showWordmark;

  if (isFull) {
    return (
      <span className="inline-flex items-center align-middle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/crossmint-logo.png"
          srcSet="/crossmint-logo.png 1x, /crossmint-logo-512.png 2x"
          alt={alt}
          className={`h-5 w-auto object-contain select-none ${className}`}
          loading="eager"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center align-middle">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/crossmint-icon.png"
        srcSet="/crossmint-icon.png 1x, /crossmint-icon-256.png 2x"
        alt={alt}
        className={`object-contain select-none ${className}`}
        loading="eager"
      />
    </span>
  );
}

export function CrossmintIcon({ className = 'w-4 h-4', alt = 'Crossmint' }: { className?: string; alt?: string }) {
  return <CrossmintLogo variant="icon" className={className} alt={alt} />;
}

export function CrossmintWordmark({ className = 'h-5 w-auto', alt = 'Crossmint' }: { className?: string; alt?: string }) {
  return <CrossmintLogo variant="full" className={className} alt={alt} />;
}
