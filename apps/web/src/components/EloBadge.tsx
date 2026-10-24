'use client';

export interface LevelInfo {
  level: number;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export function getEloLevel(elo: number): LevelInfo {
  if (elo >= 2001) {
    return {
      level: 10,
      label: 'Level 10 (Master)',
      bgColor: 'bg-red-600',
      textColor: 'text-white',
      borderColor: 'border-red-400',
    };
  }
  if (elo >= 1851) {
    return {
      level: 9,
      label: 'Level 9',
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      borderColor: 'border-red-400',
    };
  }
  if (elo >= 1701) {
    return {
      level: 8,
      label: 'Level 8',
      bgColor: 'bg-[#7C3AED]',
      textColor: 'text-white',
      borderColor: 'border-[#8B5CF6]',
    };
  }
  if (elo >= 1551) {
    return {
      level: 7,
      label: 'Level 7',
      bgColor: 'bg-[#8B5CF6]',
      textColor: 'text-white',
      borderColor: 'border-[#A78BFA]',
    };
  }
  if (elo >= 1401) {
    return {
      level: 6,
      label: 'Level 6',
      bgColor: 'bg-amber-600',
      textColor: 'text-white',
      borderColor: 'border-amber-400',
    };
  }
  if (elo >= 1251) {
    return {
      level: 5,
      label: 'Level 5',
      bgColor: 'bg-yellow-500',
      textColor: 'text-black',
      borderColor: 'border-yellow-300',
    };
  }
  if (elo >= 1101) {
    return {
      level: 4,
      label: 'Level 4',
      bgColor: 'bg-yellow-600',
      textColor: 'text-white',
      borderColor: 'border-yellow-500',
    };
  }
  if (elo >= 951) {
    return {
      level: 3,
      label: 'Level 3',
      bgColor: 'bg-emerald-600',
      textColor: 'text-white',
      borderColor: 'border-emerald-400',
    };
  }
  if (elo >= 801) {
    return {
      level: 2,
      label: 'Level 2',
      bgColor: 'bg-emerald-700',
      textColor: 'text-white',
      borderColor: 'border-emerald-500',
    };
  }
  return {
    level: 1,
    label: 'Level 1',
    bgColor: 'bg-gray-600',
    textColor: 'text-white',
    borderColor: 'border-gray-500',
  };
}

interface EloBadgeProps {
  elo: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function EloBadge({ elo, size = 'md', showLabel = false }: EloBadgeProps) {
  const info = getEloLevel(elo);

  const sizeClasses = {
    sm: 'w-4 h-4 text-[9px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm font-black',
  };

  return (
    <div className="inline-flex items-center gap-1.5" title={`${info.label} (${elo} Elo)`}>
      <span
        className={`${sizeClasses[size]} ${info.bgColor} ${info.textColor} font-black font-mono rounded flex items-center justify-center shadow-sm select-none`}
      >
        {info.level}
      </span>
      {showLabel && (
        <span className="text-xs font-mono font-bold text-gray-300">
          {elo} <span className="text-[10px] text-gray-500 font-sans uppercase">Elo</span>
        </span>
      )}
    </div>
  );
}
