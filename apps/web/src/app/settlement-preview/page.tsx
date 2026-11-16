'use client';

import { useState } from 'react';
import { ProofOfVictoryCard } from '../../components/ProofOfVictoryCard';
import { Button } from '../../components/ui/button';

export default function SettlementPreviewPage() {
  const [winner, setWinner] = useState<'A' | 'B'>('A');
  const [mode, setMode] = useState<'1v1' | 'tournament_round' | 'tournament_final'>('1v1');

  return (
    <div className="min-h-screen bg-[#06070a] text-white p-6 sm:p-12 space-y-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Institutional Settlement Card Preview</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              YesWeHack-Inspired Cyber Architecture • Zero Emojis • Strict Brand Outline on Winner Only
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={winner === 'A' ? 'default' : 'outline'}
              onClick={() => setWinner('A')}
              className="font-mono text-xs font-bold"
            >
              Winner: @ApexStriker (Host)
            </Button>
            <Button
              size="sm"
              variant={winner === 'B' ? 'default' : 'outline'}
              onClick={() => setWinner('B')}
              className="font-mono text-xs font-bold"
            >
              Winner: @VortexPro (Challenger)
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={mode === '1v1' ? 'secondary' : 'ghost'}
            onClick={() => setMode('1v1')}
            className="font-mono text-xs"
          >
            1v1 Skill Duel ($47.50 Payout / $25 Stake)
          </Button>
          <Button
            size="sm"
            variant={mode === 'tournament_round' ? 'secondary' : 'ghost'}
            onClick={() => setMode('tournament_round')}
            className="font-mono text-xs"
          >
            Tournament Semi-Final (Progressing / Eliminated)
          </Button>
          <Button
            size="sm"
            variant={mode === 'tournament_final' ? 'secondary' : 'ghost'}
            onClick={() => setMode('tournament_final')}
            className="font-mono text-xs"
          >
            Tournament Grand Final ($100 Prize Purse)
          </Button>
        </div>

        <div className="pt-6">
          <ProofOfVictoryCard
            matchId="m_fc27_neural_settle_998"
            gameName="EA Sports FC 27"
            gamePlatform="PS5 · PC"
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
            winnerId={winner === 'A' ? 'user_apex' : 'user_vortex'}
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
