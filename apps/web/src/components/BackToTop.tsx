'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling down 300px
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  // On pages with bottom PartyBar dock, raise button slightly so it never overlaps
  const isDefaultInApp =
    pathname !== '/' &&
    pathname !== '/privacy' &&
    pathname !== '/terms' &&
    pathname !== '/login' &&
    pathname !== '/signup' &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/matches/room/') &&
    !(pathname.startsWith('/matches/') && pathname !== '/matches/new');

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      className={`fixed ${
        isDefaultInApp ? 'bottom-24 right-5 sm:right-7' : 'bottom-6 right-5 sm:right-7'
      } z-40 p-2.5 sm:p-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-foreground border border-zinc-700/60 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-primary/50 animate-in fade-in slide-in-from-bottom-3`}
      title="Back to Top"
    >
      <ArrowUp className="w-4 h-4 text-primary group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
}
