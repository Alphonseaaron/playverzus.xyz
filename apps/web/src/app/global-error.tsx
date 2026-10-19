'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('PlayVerzus Global Fatal Exception Captured:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B0C10] text-[#E0E2EC] flex items-center justify-center p-4 font-sans selection:bg-[#C86228] selection:text-white">
        <div className="max-w-md w-full bg-[#16181F] border border-[#262833] rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 mx-auto flex items-center justify-center text-2xl font-bold">
            ⚠
          </div>

          <div className="space-y-2">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#1E202B] border border-[#2E3142] text-[10px] font-mono font-bold text-gray-400">
              RECOVERY MODE ACTIVE
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Playverzus.xyz
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed">
              An unexpected layout error occurred. Your game progress and balance data are safely persisted.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-xl bg-[#C86228] hover:bg-[#D87238] text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-[#C86228]/20"
            >
              Retry Connection
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#1E202B] hover:bg-[#282B3A] text-gray-300 text-xs font-bold uppercase tracking-wider transition border border-[#2E3142]"
            >
              Reload Platform
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
