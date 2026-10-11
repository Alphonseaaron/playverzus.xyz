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
      <div className="flex flex-col items-center justify-center min-h-[55vh] py-20 px-4">
        <Card className="max-w-md w-full p-8 bg-card border-border shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto text-primary animate-pulse">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Verifying Arena Credentials
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Securing competitor access and authenticating your account session...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 text-xs font-mono text-muted-foreground">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span>Redirecting to secure login if unauthenticated</span>
          </div>
        </Card>
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
          <div className="flex flex-col items-center justify-center min-h-[55vh] py-20 px-4">
            <Card className="max-w-md w-full p-8 bg-card border-border shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto text-primary animate-pulse">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Verifying Arena Credentials
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Securing competitor access and authenticating your account session...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2 text-xs font-mono text-muted-foreground">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span>Validating competitor session...</span>
              </div>
            </Card>
          </div>
        )
      }
    >
      <AuthGuardInner {...props} />
    </Suspense>
  );
}
