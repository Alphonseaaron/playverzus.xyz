import React from 'react';

interface CrossmintLogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function CrossmintLogo({ className = 'w-4 h-4', showWordmark = false }: CrossmintLogoProps) {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Crossmint Logo"
      >
        <rect width="32" height="32" rx="7" fill="#021C14" />
        <path
          d="M16 6L25 11.2V20.8L16 26L7 20.8V11.2L16 6Z"
          stroke="#00D287"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M16 11L21.5 14.2V17.8L16 21L10.5 17.8V14.2L16 11Z"
          fill="#00D287"
        />
      </svg>
      {showWordmark && (
        <span className="font-sans font-black tracking-tight text-foreground text-xs">
          cross<span className="text-[#00D287]">mint</span>
        </span>
      )}
    </span>
  );
}
