'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@playverzus/ui';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
}

export function Sheet({ open, onOpenChange, children, side = 'left' }: SheetProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scrolling on mobile when sheet drawer is open
  React.useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Handle Escape key to close drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop with tap-to-dismiss */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Drawer Container: Guaranteed full viewport height with independent touch scroll */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed inset-y-0 z-[101] flex flex-col bg-card border-border text-foreground shadow-2xl transition-all duration-300 w-[85vw] max-w-xs sm:w-80 p-5 overflow-y-auto overscroll-contain',
          side === 'left'
            ? 'left-0 border-r animate-in slide-in-from-left'
            : 'right-0 border-l animate-in slide-in-from-right'
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3.5 top-3.5 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close navigation drawer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-left mb-4', className)}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-bold text-foreground', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
