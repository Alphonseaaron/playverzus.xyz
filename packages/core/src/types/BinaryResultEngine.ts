import type { TypeEngine } from './TypeEngine';

import type { GameProfile, MatchContext, ParsedResult, ValidationResult, WinnerDecision } from '../types';
import type { MatchFormat } from '../constants';

const WIN_KEYWORDS = ['victory', 'win', 'won', 'winner', 'you win'];
const LOSE_KEYWORDS = ['defeat', 'lose', 'lost', 'you lose'];

/** BINARY_RESULT — detect WIN/LOSS keyword from end screen. */
export class BinaryResultEngine implements TypeEngine {
  readonly type = 'BINARY_RESULT' as const;

  parse(rawText: string, profile: GameProfile): ParsedResult | null {
    const lower = rawText.toLowerCase();
    const keywords = profile.endKeywords.length > 0
      ? profile.endKeywords.map((k) => k.toLowerCase())
      : [...WIN_KEYWORDS, ...LOSE_KEYWORDS];

    const hasWin = WIN_KEYWORDS.some((w) => lower.includes(w));
    const hasLoss = LOSE_KEYWORDS.some((w) => lower.includes(w));

    if (hasWin && hasLoss) {
      // Ambiguous OCR text containing conflicting keywords
      const isWin = lower.includes('victory') && !lower.includes('you lose');
      return {
        primary: isWin ? 'WIN' : 'LOSS',
        raw: rawText,
        confidence: 0.6, // Flags for arbitration
      };
    }

    if (hasWin) {
      return {
        primary: 'WIN',
        raw: rawText,
        confidence: 0.98,
      };
    }

    if (hasLoss) {
      return {
        primary: 'LOSS',
        raw: rawText,
        confidence: 0.98,
      };
    }

    for (const kw of keywords) {
      if (lower.includes(kw)) {
        const isLossKw = LOSE_KEYWORDS.some((l) => kw.includes(l));
        return {
          primary: isLossKw ? 'LOSS' : 'WIN',
          raw: rawText,
          confidence: 0.95,
        };
      }
    }
    return null;
  }

  validate(parsed: ParsedResult, _ctx: MatchContext): ValidationResult {
    const ok = parsed.primary === 'WIN' || parsed.primary === 'LOSS';
    return { ok, confidence: parsed.confidence, errors: ok ? [] : ['unknown result value'] };
  }

  compare(a: ParsedResult, b: ParsedResult, _format: MatchFormat): WinnerDecision {
    if (a.primary === 'WIN' && b.primary === 'LOSS') return { winnerId: 'A', reason: 'A won' };
    if (b.primary === 'WIN' && a.primary === 'LOSS') return { winnerId: 'B', reason: 'B won' };
    return { winnerId: null, reason: 'conflicting or missing result' };
  }

  detectEnd(rawText: string, profile: GameProfile): boolean {
    const lower = rawText.toLowerCase();
    return profile.endKeywords.some((kw) => lower.includes(kw.toLowerCase()));
  }
}
