'use client';

import { useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CountryFlag } from './CountryFlag';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  ExternalLink,
  Share2,
  XCircle,
  Trophy,
} from 'lucide-react';

export interface ProofOfVictoryProps {
  matchId: string;
  gameName: string;
  gamePlatform?: string;
  gameBannerUrl?: string;
  gamePosterUrl?: string;
  gameLogoUrl?: string;
  perspectiveUserId?: string | null;
  playerAId: string;
  playerAName: string;
  playerAGamertag?: string;
  playerACountry?: string;
  playerAScore?: number | string | null;
  playerBId: string;
  playerBName: string;
  playerBGamertag?: string;
  playerBCountry?: string;
  playerBScore?: number | string | null;
  winnerId: string;
  scoreText?: string | null;
  entryFee?: number | null;
  prizeAmount?: number | null;
  confidence?: number | null;
  isTournament?: boolean;
  tournamentRound?: string | null;
  isTournamentFinal?: boolean;
  tournamentPrizePool?: number | null;
  runnerUpPrize?: number | null;
  completedAt?: string | null;
}

export function ProofOfVictoryCard({
  matchId,
  gameName,
  gamePlatform = 'UNIVERSAL',
  gameBannerUrl,
  gamePosterUrl,
  gameLogoUrl,
  perspectiveUserId,
  playerAId,
  playerAName,
  playerAGamertag,
  playerACountry,
  playerAScore,
  playerBId,
  playerBName,
  playerBGamertag,
  playerBCountry,
  playerBScore,
  winnerId,
  scoreText,
  entryFee = 25,
  prizeAmount = 47.5,
  confidence = 0.998,
  isTournament = false,
  tournamentRound = 'MATCH',
  isTournamentFinal = false,
  tournamentPrizePool = 100,
  runnerUpPrize,
  completedAt,
}: ProofOfVictoryProps) {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isWinnerA = winnerId === playerAId;
  const isWinnerB = winnerId === playerBId;
  const winnerName = isWinnerA ? playerAName : playerBName;
  const loserName = isWinnerA ? playerBName : playerAName;

  // Relative perspective logic:
  // If perspectiveUserId is provided, determine if viewing user is winner or loser
  // Default to winner's perspective if unauthenticated or spectator
  const isViewerWinner = perspectiveUserId ? perspectiveUserId === winnerId : true;
  const isViewerLoser = perspectiveUserId
    ? (perspectiveUserId === playerAId || perspectiveUserId === playerBId) && !isViewerWinner
    : false;

  const matchUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/matches/${matchId}`
      : `https://playverzus.xyz/matches/${matchId}`;

  // Parse scores if not explicitly provided
  let scoreA = playerAScore;
  let scoreB = playerBScore;
  if ((scoreA === undefined || scoreA === null) && scoreText) {
    const parts = scoreText.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (parts) {
      scoreA = parts[1];
      scoreB = parts[2];
    }
  }

  // Calculate clean display values for amounts won and lost
  const stakeValue = entryFee && entryFee > 0 ? entryFee : 25;
  const wonValue = prizeAmount && prizeAmount > 0 ? prizeAmount : stakeValue * 1.9;
  const lostValue = stakeValue;

  const formattedDate = completedAt
    ? new Date(completedAt).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).toUpperCase()
    : new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).toUpperCase();

  // Official Logo Detection
  const isEAFCOfficial =
    gameName.toLowerCase().includes('fc 27') ||
    gameName.toLowerCase().includes('ea sports fc') ||
    gameName.toLowerCase().includes('eafc') ||
    gameName.toLowerCase().includes('fifa');
  const isFCMobile = gameName.toLowerCase().includes('mobile') || gameName.toLowerCase().includes('fcm');

  // Background artwork fallback: high quality game poster or banner
  const ambientBackground =
    gameBannerUrl ||
    gamePosterUrl ||
    (isFCMobile ? '/eafcm_poster.jpg' : isEAFCOfficial ? '/fc27_poster.jpg' : '/fc27_banner.jpg');

  // Clean, zero-emoji institutional brag snippet
  const cleanSnippet = [
    `PLAYVERZUS VERIFIED MATCH SETTLEMENT`,
    `MATCH ID: #${matchId.slice(0, 12)}`,
    `GAME: ${gameName} (${gamePlatform})`,
    `DATE: ${formattedDate}`,
    `--------------------------------------`,
    `WINNER: @${winnerName} [${scoreA ?? 'WIN'} - ${scoreB ?? 'LOSS'}] @${loserName}`,
    isTournament
      ? isTournamentFinal
        ? `CHAMPIONSHIP PURSE: $${wonValue.toFixed(2)} USDC`
        : `TOURNAMENT STATUS: @${winnerName} PROGRESSING | @${loserName} ELIMINATED`
      : isViewerLoser
      ? `AMOUNT LOST: -$${lostValue.toFixed(2)} USDC`
      : `AMOUNT WON: +$${wonValue.toFixed(2)} USDC`,
    `AUDIT URL: ${matchUrl}`,
  ].join('\n');

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(cleanSnippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(matchUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* 1. PRISTINE YESWEHACK-INSPIRED CYBER SETTLEMENT CARD (Screenshot / Social Ready) */}
      <div className="relative rounded-3xl overflow-hidden border border-border/80 bg-[#090b11] shadow-[0_25px_60px_rgba(0,0,0,0.90)] p-6 sm:p-10 text-foreground space-y-8 select-none">
        {/* Layer 1: Blurred Game Poster/Banner Ambient Artwork */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={ambientBackground}
            alt=""
            className="w-full h-full object-cover filter blur-2xl scale-125 opacity-25 brightness-75 transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#090b11]/80 via-[#090b11]/92 to-[#090b11]" />
        </div>

        {/* Layer 2: Subtle Cyber Geometric Facets & Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[90px] pointer-events-none" />

        {/* 1. TOP HEADER BAR: Winner Profile & Official Game Logo */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          {/* Winner Profile Chip */}
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-[#131722] border-2 border-primary flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.45)]">
                <CountryFlag
                  code={isWinnerA ? playerACountry : playerBCountry}
                  fallbackSeed={winnerName}
                  size="md"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shadow-md border-2 border-[#090b11]">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                  {winnerName}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 text-[9px] font-mono font-bold uppercase tracking-wider">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                MATCH WINNER • {gamePlatform}
              </p>
            </div>
          </div>

          {/* Right Header: Official Game Logo + Status Stamp (No % CV clutter) */}
          <div className="flex items-center gap-4 self-start sm:self-center">
            {/* Official Logo Display */}
            {isEAFCOfficial ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                <img
                  src="/fcm_logo_hd_transparent.png"
                  alt="EA Sports FC"
                  className="h-6 sm:h-7 w-auto object-contain brightness-110"
                />
              </div>
            ) : gameLogoUrl ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                <img src={gameLogoUrl} alt={gameName} className="h-6 sm:h-7 w-auto object-contain" />
              </div>
            ) : (
              <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 font-black text-xs font-mono tracking-wider uppercase text-white">
                {gameName}
              </div>
            )}

            {/* Official Settlement Stamp */}
            <div className="text-right space-y-0.5">
              <div className="text-xs font-black font-mono uppercase tracking-wider text-emerald-400">
                SETTLED
              </div>
              <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                {formattedDate}
              </div>
            </div>
          </div>
        </div>

        {/* 2. CENTER HERO SECTION: Relative Payout Display (Never Show Both Won and Lost) */}
        <div className="relative z-10 text-center space-y-4 py-2">
          {/* Status / Rating Pill Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full border font-mono text-xs font-bold shadow-sm ${
              isViewerLoser
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            }`}
          >
            {isTournament ? (
              <span>{isTournamentFinal ? 'CHAMPIONSHIP CONCLUDED' : 'ADVANCING TO NEXT ROUND'}</span>
            ) : isViewerLoser ? (
              <>
                <span>MATCH CONCLUDED</span>
                <ArrowDownRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>+25 MMR</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </>
            )}
          </div>

          {/* HUGE Relative Display Typography */}
          <div className="space-y-1">
            {isTournament && !isTournamentFinal ? (
              <div className="text-4xl sm:text-6xl font-black tracking-tight text-white font-mono uppercase">
                ROUND ADVANCEMENT
              </div>
            ) : isViewerLoser ? (
              <div className="text-5xl sm:text-7xl font-black tracking-tight text-rose-400 font-mono drop-shadow-[0_4px_25px_rgba(244,63,94,0.25)]">
                -${lostValue.toFixed(2)}
              </div>
            ) : (
              <div className="text-5xl sm:text-7xl font-black tracking-tight text-white font-mono drop-shadow-[0_4px_25px_rgba(255,255,255,0.15)]">
                +${wonValue.toFixed(2)}
              </div>
            )}

            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              {isTournament
                ? isTournamentFinal
                  ? `1ST PLACE TOURNAMENT PRIZE PURSE (${gameName})`
                  : `POOL: $${(tournamentPrizePool ?? 100).toFixed(2)} • PAYS ON GRAND FINAL`
                : isViewerLoser
                ? `STAKE SETTLED IN ESCROW (${gameName})`
                : `1V1 SKILL DUEL SETTLEMENT (${gameName})`}
            </p>
          </div>

          {/* SINGLE Relative Status Chip (Only Won OR Lost Relative to Player, Never Both) */}
          <div className="flex items-center justify-center pt-1">
            {isTournament && !isTournamentFinal ? (
              isViewerWinner ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>@{winnerName}: PROGRESSING TO NEXT ROUND</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 font-mono text-xs font-bold">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>@{loserName}: ELIMINATED FROM TOURNAMENT</span>
                </div>
              )
            ) : isViewerLoser ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 font-mono text-xs font-bold shadow-sm">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>AMOUNT LOST: -${lostValue.toFixed(2)} USDC</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>AMOUNT WON: +${wonValue.toFixed(2)} USDC</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. HEAD-TO-HEAD COMPETITOR CARDS & SCORES */}
        {/* Strict brand color outline (#8B5CF6) on the winning side ONLY */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-7 gap-3 items-center pt-2">
          {/* Participant A (Host) */}
          <div
            className={`md:col-span-3 p-4 rounded-2xl transition-all duration-300 ${
              isWinnerA
                ? 'border-2 border-primary ring-2 ring-primary/40 shadow-[0_0_25px_rgba(139,92,246,0.30)] bg-primary/10 relative'
                : 'border border-border/60 bg-[#10131d]/60 opacity-80'
            }`}
          >
            {isWinnerA && (
              <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                <span>{isTournament ? 'PROGRESSING' : 'WINNER'}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#161a26] border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                  <CountryFlag code={playerACountry} fallbackSeed={playerAName} size="sm" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white truncate">@{playerAName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">(Host)</span>
                  </div>
                  {playerAGamertag && (
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      IGN: {playerAGamertag}
                    </p>
                  )}
                </div>
              </div>

              {/* Score Display */}
              <div className="text-xl sm:text-2xl font-black font-mono text-white bg-[#0e111a] px-3 py-1 rounded-xl border border-border/80">
                {scoreA ?? (isWinnerA ? 'W' : 'L')}
              </div>
            </div>
          </div>

          {/* Versus Center Divider */}
          <div className="md:col-span-1 text-center font-mono text-xs font-black uppercase tracking-widest text-muted-foreground py-1">
            VS
          </div>

          {/* Participant B (Challenger) */}
          <div
            className={`md:col-span-3 p-4 rounded-2xl transition-all duration-300 ${
              isWinnerB
                ? 'border-2 border-primary ring-2 ring-primary/40 shadow-[0_0_25px_rgba(139,92,246,0.30)] bg-primary/10 relative'
                : 'border border-border/60 bg-[#10131d]/60 opacity-80'
            }`}
          >
            {isWinnerB && (
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                <span>{isTournament ? 'PROGRESSING' : 'WINNER'}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 md:flex-row-reverse text-right">
              <div className="flex items-center gap-2.5 min-w-0 md:flex-row-reverse">
                <div className="w-10 h-10 rounded-full bg-[#161a26] border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                  <CountryFlag code={playerBCountry} fallbackSeed={playerBName} size="sm" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[10px] text-muted-foreground font-mono">(Challenger)</span>
                    <span className="font-bold text-sm text-white truncate">@{playerBName}</span>
                  </div>
                  {playerBGamertag && (
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      IGN: {playerBGamertag}
                    </p>
                  )}
                </div>
              </div>

              {/* Score Display */}
              <div className="text-xl sm:text-2xl font-black font-mono text-white bg-[#0e111a] px-3 py-1 rounded-xl border border-border/80">
                {scoreB ?? (isWinnerB ? 'W' : 'L')}
              </div>
            </div>
          </div>
        </div>

        {/* 4. PRISTINE CARD FOOTER: Clean Brand Watermark Only */}
        <div className="relative z-10 flex items-center justify-between border-t border-border/60 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-black text-xs text-white">
              P
            </div>
            <div>
              <span className="font-black text-sm uppercase tracking-wider text-white">
                PLAYVERZUS<span className="text-primary">.XYZ</span>
              </span>
              <p className="text-[10px] font-mono text-muted-foreground">
                Cryptographic Settlement Verification • #{matchId.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              ESCROW RELEASED ✓
            </span>
          </div>
        </div>
      </div>

      {/* 2. EXTERNAL ACTION DOCK (PLACED OUTSIDE THE CARD CONTAINER) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0c0f17]/90 backdrop-blur-xl border border-white/10 shadow-lg text-foreground">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-mono font-medium text-muted-foreground">
            Social Proof & Match Certificate Actions
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <Button
            onClick={handleCopySnippet}
            variant="default"
            size="sm"
            className="font-mono font-bold text-xs gap-1.5 h-10 px-4 bg-white text-black hover:bg-white/90 shadow-sm transition-all hover:scale-[1.02]"
          >
            {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSnippet ? 'SNIPPET COPIED!' : 'COPY BRAG SNIPPET'}</span>
          </Button>

          <Button
            onClick={handleCopyLink}
            variant="outline"
            size="sm"
            className="font-mono text-xs gap-1.5 h-10 px-4 border-border/80 bg-secondary/60 text-muted-foreground hover:text-white hover:bg-secondary transition-all"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'LINK COPIED' : 'SHARE PROOF LINK'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
