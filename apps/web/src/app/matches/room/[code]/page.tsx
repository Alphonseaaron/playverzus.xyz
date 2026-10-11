'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api';
import { AuthGuard } from '../../../../components/AuthGuard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function JoinByRoomCodeContent() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const match = await apiClient<{ id: string }>(`/matches/room/${code}/join`, {
          method: 'POST',
        });
        router.push(`/matches/${match.id}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
    })();
  }, [code, router]);

  return (
    <div className="max-w-md mx-auto my-16 space-y-4">
      <Card className="bg-card border-border shadow-2xl p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Badge variant="copper" className="font-mono text-[10px]">
            ROOM CODE #{code}
          </Badge>
        </div>
        <CardTitle className="text-xl font-black text-foreground">
          Entering Private Arena
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          Synchronizing match state and establishing peer connectivity...
        </CardDescription>

        <CardContent className="pt-6">
          {error ? (
            <div className="space-y-4">
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <Link href="/challenges">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Challenges</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs font-mono text-muted-foreground">Validating credentials...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function JoinByRoomCodePage() {
  return (
    <AuthGuard>
      <JoinByRoomCodeContent />
    </AuthGuard>
  );
}
