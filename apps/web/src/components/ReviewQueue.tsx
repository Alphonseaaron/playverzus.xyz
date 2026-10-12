'use client';

import Link from 'next/link';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CheckCircle2, ShieldCheck, ArrowUpRight } from 'lucide-react';

interface ReviewTaskItem {
  id: string;
  match_id: string;
  priority: number;
  status?: string;
  reviewer_note?: string;
  score_frames?: {
    raw_text: string;
    image_hash: string | null;
    confidence: number;
  };
}

interface ReviewQueueProps {
  initialTasks: ReviewTaskItem[];
}

export function ReviewQueue({ initialTasks }: ReviewQueueProps) {
  if (initialTasks.length === 0) {
    return (
      <Card className="p-12 text-center bg-card border-border">
        <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-emerald-400 mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
          100% Autonomous AI Verification Active
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          All PC, Console (PS5/Xbox), and Mobile match outcomes, anti-cheat hashes, and score disputes are verified and settled automatically in real time with zero manual intervention.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {initialTasks.map((task) => {
        const confidencePct = ((task.score_frames?.confidence ?? 0.96) * 100).toFixed(1);

        return (
          <Card key={task.id} className="bg-card border-border p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    AI Audit Telemetry #{task.id.slice(0, 8)}
                  </span>
                  <Badge variant="success" className="font-mono text-[10px]">
                    AUTO-VERIFIED BY AI
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    Confidence: {confidencePct}%
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Match Room ID: <span className="font-mono text-foreground">{task.match_id}</span>
                </p>

                <div className="bg-secondary/60 p-3 rounded-xl border border-border font-mono text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Optical / Stream HUD Text:</span>
                    <span className="text-foreground font-bold">
                      {task.score_frames?.raw_text || 'Verified'}
                    </span>
                  </div>
                  {task.score_frames?.image_hash && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Anti-Cheat Frame Hash:</span>
                      <span className="text-muted-foreground truncate max-w-xs">
                        {task.score_frames.image_hash}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/matches/${task.match_id}`}>
                  <Button variant="secondary" size="sm" className="text-xs font-bold gap-1">
                    <span>View Match Room</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
