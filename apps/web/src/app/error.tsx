'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception safely to diagnostics
    console.error('PlayVerzus Client Runtime Error Captured:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 max-w-xl mx-auto">
      <Card className="w-full border-border bg-card shadow-2xl text-center p-6 sm:p-8 space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mx-auto flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
            STATE RECOVERY ACTIVE {error?.digest ? `· #${error.digest.slice(0, 8)}` : ''}
          </Badge>
          <CardTitle className="text-2xl font-black tracking-tight text-foreground">
            Arena Encountered an Issue
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
            The workspace encountered an unexpected client state. Your account ledger and match progress remain securely preserved on the network.
          </CardDescription>
        </div>

        {error?.message && process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-muted/60 border border-border rounded-xl text-left font-mono text-[11px] text-destructive overflow-x-auto max-h-32">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="default"
            size="default"
            onClick={() => reset()}
            className="w-full sm:w-auto font-bold text-xs uppercase tracking-wider gap-2 shadow-md shadow-primary/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Arena</span>
          </Button>
          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="default"
              className="w-full font-bold text-xs uppercase tracking-wider gap-2"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return Home</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
