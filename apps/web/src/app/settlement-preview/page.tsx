'use client';

import { useState } from 'react';
import { ProofOfVictoryCard } from '../../components/ProofOfVictoryCard';
import { Button } from '../../components/ui/button';

export default function SettlementPreviewPage() {
  const [winner, setWinner] = useState<'A' | 'B'>('A');
  const [mode, setMode] = useState<'1v1' | 'tournament_round' | 'tournament_final'>('1v1');
  const [perspective, setPerspective] = useState<'winner' | 'loser' | 'spectator'>('winner');

  const winnerId = winner === 'A' ? 'user_apex' : 'user_vortex';
  const loserId = winner === 'A' ? 'user_vortex' : 'user_apex';

  const perspectiveUserId =
    perspective === 'winner'
      ? winnerId
      : perspective === 'loser'
      ? loserId
      : null;

  return (
    <div className="min-h-screen bg-[#06070a] text-white p-6 sm:p-12 space-y-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Institutional Settlement Card Preview</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              YesWeHack Cyber Aesthetic • Blurred Game Banner Background • Official Game Logo • Relative Payout
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={winner === 'A' ? 'default' : 'outline'}
              onClick={() => setWinner('A')}
              className="font-mono text-xs font-bold h-9"
            >
              Winner: @ApexStriker (Host)
            </Button>
            <Button
              size="sm"
              variant={winner === 'B' ? 'default' : 'outline'}
              onClick={() => setWinner('B')}
              className="font-mono text-xs font-bold h-9"
            >
              Winner: @VortexPro (Challenger)
            </Button>
          </div>
        </div>

        {/* Perspective and Mode Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0e1320]/80 border border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono font-bold uppercase text-[11px]">Viewing As:</span>
            <Button
              size="sm"
              variant={perspective === 'winner' ? 'default' : 'ghost'}
              onClick={() => setPerspective('winner')}
              className="h-7 text-xs font-mono font-bold"
            >
              Winner (Won +$47.50)
            </Button>
            <Button
              size="sm"
              variant={perspective === 'loser' ? 'destructive' : 'ghost'}
              onClick={() => setPerspective('loser')}
              className="h-7 text-xs font-mono font-bold"
            >
              Loser (Lost -$25.00)
            </Button>
            <Button
              size="sm"
              variant={perspective === 'spectator' ? 'secondary' : 'ghost'}
              onClick={() => setPerspective('spectator')}
              className="h-7 text-xs font-mono"
            >
              Spectator
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={mode === '1v1' ? 'secondary' : 'ghost'}
              onClick={() => setMode('1v1')}
              className="h-7 text-xs font-mono"
            >
              1v1 Duel
            </Button>
            <Button
              size="sm"
              variant={mode === 'tournament_round' ? 'secondary' : 'ghost'}
              onClick={() => setMode('tournament_round')}
              className="h-7 text-xs font-mono"
            >
              Tournament Semi-Final
            </Button>
            <Button
              size="sm"
              variant={mode === 'tournament_final' ? 'secondary' : 'ghost'}
              onClick={() => setMode('tournament_final')}
              className="h-7 text-xs font-mono"
            >
              Grand Final
            </Button>
          </div>
        </div>

        {/* Live Proof of Victory Card */}
        <div className="pt-2">
          <ProofOfVictoryCard
            matchId="m_fc27_neural_settle_998"
            gameName="EA Sports FC 27"
            gamePlatform="PS5 · PC"
            gameBannerUrl="/fc27_banner.jpg"
            gamePosterUrl="/fc27_poster.jpg"
            perspectiveUserId={perspectiveUserId}
            playerAId="user_apex"
            playerAName="ApexStriker"
            playerAGamertag="ApexStriker_PSN"
            playerACountry="US"
            playerAScore={winner === 'A' ? 3 : 1}
            playerBId="user_vortex"
            playerBName="VortexPro"
            playerBGamertag="VortexPro_EA"
            playerBCountry="GB"
            playerBScore={winner === 'A' ? 1 : 2}
            winnerId={winnerId}
            entryFee={25}
            prizeAmount={mode === 'tournament_final' ? 100 : 47.50}
            confidence={0.998}
            isTournament={mode !== '1v1'}
            tournamentRound={mode === 'tournament_final' ? 'GRAND FINAL' : 'SEMI-FINAL'}
            isTournamentFinal={mode === 'tournament_final'}
            tournamentPrizePool={100}
            completedAt={new Date().toISOString()}
          />
        </div>
      </div>
    </div>
  );
}
