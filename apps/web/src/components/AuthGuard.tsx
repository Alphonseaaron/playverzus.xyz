'use client';

import React, { Suspense } from 'react';
import { useRequireAuth } from '../lib/useRequireAuth';
import { Card } from './ui/card';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

function AuthGuardInner({ children, fallback, redirectTo }: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useRequireAuth({ redirectTo });

  if (isLoading || !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 px-4 text-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Verifying Arena Session...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthGuard(props: AuthGuardProps) {
  return (
    <Suspense
      fallback={
        props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 px-4 text-center">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Validating Session...
            </p>
          </div>
        )
      }
    >
      <AuthGuardInner {...props} />
    </Suspense>
  );
}
