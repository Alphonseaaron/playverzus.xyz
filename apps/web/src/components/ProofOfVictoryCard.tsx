'use client';

import { useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CountryFlag } from './CountryFlag';
import {
  Trophy,
  Crown,
  Share2,
  Copy,
  Check,
  Twitter,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Flame,
  Zap,
} from 'lucide-react';

export interface ProofOfVictoryProps {
  matchId: string;
  gameName: string;
  gamePlatform?: string;
  playerAId: string;
  playerAName: string;
  playerAGamertag?: string;
  playerACountry?: string;
  playerBId: string;
  playerBName: string;
  playerBGamertag?: string;
  playerBCountry?: string;
  winnerId: string;
  scoreText?: string | null;
  prizeAmount?: number | null;
  confidence?: number | null;
}

export function ProofOfVictoryCard({
  matchId,
  gameName,
  gamePlatform = 'UNIVERSAL',
  playerAId,
  playerAName,
  playerAGamertag,
  playerACountry,
  playerBId,
  playerBName,
  playerBGamertag,
  playerBCountry,
  winnerId,
  scoreText,
  prizeAmount,
  confidence = 0.98,
}: ProofOfVictoryProps) {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isWinnerA = winnerId === playerAId;
  const isWinnerB = winnerId === playerBId;
  const winnerName = isWinnerA ? playerAName : playerBName;
  const loserName = isWinnerA ? playerBName : playerAName;

  const matchUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/matches/${matchId}`
    : `https://playverzus.xyz/matches/${matchId}`;

  const cleanScore = scoreText && scoreText.trim() ? scoreText.trim() : 'VICTORY';

  // Social Brag Snippet for Discord, X (Twitter), Telegram & WhatsApp
  const socialSnippetText = `🏆 VICTORY CLAIMED on @Playverzus!
━━━━━━━━━━━━━━━━━━━━━━
🎮 Game: ${gameName}
⚔️ @${winnerName} [${cleanScore}] @${loserName}
${prizeAmount && prizeAmount > 0 ? `💰 Bounty: +$${prizeAmount.toFixed(2)} USD Settled Instantly\n` : ''}⚡ Verified by: Playverzus Computer Vision Oracle (Zero Disputes)
━━━━━━━━━━━━━━━━━━━━━━
🔥 Think you can beat me? Challenge me now:
👉 ${matchUrl}`;

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(socialSnippetText);
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

  const handleShareTwitter = () => {
    const tweetText = encodeURIComponent(
      `Just won my 1v1 on @Playverzus in ${gameName} (${cleanScore})! 🏆⚡\nVerified automatically via Computer Vision — zero disputes.\n\nThink you can beat me? Challenge me:`
    );
    const tweetUrl = encodeURIComponent(matchUrl);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`, '_blank');
  };

  return (
    <Card className="p-6 bg-card border border-border shadow-2xl rounded-3xl space-y-6 relative overflow-hidden">
      {/* Background Neon Brand Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* 1. Header with Official Brand Watermark */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-md shadow-primary/30">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm uppercase tracking-wider text-foreground">
                PLAYVERZUS<span className="text-primary">.XYZ</span>
              </span>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/40 text-primary bg-primary/5 uppercase">
                Verified Match Proof
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Match #{matchId.length > 16 ? matchId.slice(0, 12) : matchId} • {gameName} ({gamePlatform})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-[10px] font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AI CV Verified ({((confidence ?? 0.98) * 100).toFixed(0)}%)</span>
          </Badge>
        </div>
      </div>

      {/* 2. Head-to-Head Competitor Matchup */}
      {/* Crucial Rule: The winning side has our brand color outline on the winning side ONLY */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
        {/* Participant A (Host) */}
        <div
          className={`md:col-span-3 p-4 rounded-2xl transition-all duration-300 ${
            isWinnerA
              ? 'border-2 border-primary ring-2 ring-primary/40 shadow-[0_0_25px_rgba(139,92,246,0.30)] bg-primary/10 relative'
              : 'border border-border/70 bg-secondary/30 opacity-75'
          }`}
        >
          {isWinnerA && (
            <div className="absolute -top-3 left-4 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Crown className="w-3 h-3" />
              <span>MATCH WINNER</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="relative">
              <CountryFlag code={playerACountry} fallbackSeed={playerAName} size="md" />
              {isWinnerA && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                  ✓
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-foreground truncate">@{playerAName}</span>
                <span className="text-[10px] text-muted-foreground font-mono">(Host)</span>
              </div>
              {playerAGamertag && (
                <div className="text-[11px] font-mono text-muted-foreground truncate">
                  IGN: <span className="text-foreground font-medium">{playerAGamertag}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Versus & Score */}
        <div className="md:col-span-1 flex flex-col items-center justify-center text-center py-2">
          <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1 font-mono">
            FINAL SCORE
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground bg-secondary/80 px-3 py-1 rounded-xl border border-border">
            {cleanScore}
          </div>
          {prizeAmount && prizeAmount > 0 && (
            <div className="text-[11px] font-bold text-emerald-400 font-mono mt-1">
              +${prizeAmount.toFixed(2)} USD
            </div>
          )}
        </div>

        {/* Participant B (Challenger) */}
        <div
          className={`md:col-span-3 p-4 rounded-2xl transition-all duration-300 ${
            isWinnerB
              ? 'border-2 border-primary ring-2 ring-primary/40 shadow-[0_0_25px_rgba(139,92,246,0.30)] bg-primary/10 relative'
              : 'border border-border/70 bg-secondary/30 opacity-75'
          }`}
        >
          {isWinnerB && (
            <div className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Crown className="w-3 h-3" />
              <span>MATCH WINNER</span>
            </div>
          )}

          <div className="flex items-center gap-3 justify-end md:flex-row-reverse text-right">
            <div className="relative">
              <CountryFlag code={playerBCountry} fallbackSeed={playerBName} size="md" />
              {isWinnerB && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                  ✓
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[10px] text-muted-foreground font-mono">(Challenger)</span>
                <span className="font-bold text-sm text-foreground truncate">@{playerBName}</span>
              </div>
              {playerBGamertag && (
                <div className="text-[11px] font-mono text-muted-foreground truncate">
                  IGN: <span className="text-foreground font-medium">{playerBGamertag}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Social Snippet Preview Box */}
      <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Social Brag & Discord Proof Snippet
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">Formatted for Discord, X & WhatsApp</span>
        </div>

        <pre className="p-3 rounded-xl bg-background border border-border text-[11px] font-mono text-muted-foreground whitespace-pre-wrap select-all leading-relaxed overflow-x-auto">
          {socialSnippetText}
        </pre>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between pt-1">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={handleCopySnippet}
            variant="default"
            size="sm"
            className="w-full sm:w-auto font-bold text-xs gap-1.5 h-9 shadow-md shadow-primary/20"
          >
            {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSnippet ? 'Snippet Copied!' : 'Copy Discord / X Snippet'}</span>
          </Button>

          <Button
            onClick={handleShareTwitter}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto font-bold text-xs gap-1.5 h-9 border-sky-500/40 text-sky-400 hover:bg-sky-500/10"
          >
            <Twitter className="w-3.5 h-3.5" />
            <span>Post on X</span>
          </Button>
        </div>

        <Button
          onClick={handleCopyLink}
          variant="ghost"
          size="sm"
          className="w-full sm:w-auto text-xs font-mono text-muted-foreground hover:text-foreground gap-1 h-9"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
          <span>{copiedLink ? 'Link Copied' : 'Copy Match Proof URL'}</span>
        </Button>
      </div>
    </Card>
  );
}
