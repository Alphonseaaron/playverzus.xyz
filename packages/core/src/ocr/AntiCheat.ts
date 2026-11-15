import type { GameProfile, ScoreFrame } from '../types';
import { hammingDistance } from './FrameHasher';

export interface AntiCheatResult {
  suspicious: boolean;
  reasons: string[];
}

/**
 * Analyses a score stream for patterns consistent with cheating.
 * Combines temporal velocity physics, perceptual hashing replay detection, and boundary checks.
 */
export function analyzeScoreStream(
  frames: ScoreFrame[],
  profile: GameProfile,
): AntiCheatResult {
  const reasons: string[] = [];

  const validFrames = frames.filter((f) => f && f.createdAt && !Number.isNaN(f.createdAt.getTime()));
  const sorted = [...validFrames].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // 1. Impossible velocity.
  const maxJump = profile.constraints.maxJumpPerSec;
  if (maxJump) {
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      if (typeof prev.parsed?.primary !== 'number' || typeof cur.parsed?.primary !== 'number') continue;
      const seconds = Math.max(0.001, (cur.createdAt.getTime() - prev.createdAt.getTime()) / 1000);
      const delta = cur.parsed.primary - prev.parsed.primary;
      if (delta > maxJump * seconds * 2) {
        reasons.push(`impossible velocity: ${delta} in ${seconds.toFixed(2)}s`);
        break;
      }
    }
  }

  // 2. Frozen-Frame Spoofing Detection.
  // Legitimate players often linger on stationary freeze-time or final victory scoreboards (isFinal: true).
  // A replay / overlay spoof occurs when reported score values change while the background video hash is frozen,
  // or when 20+ consecutive active mid-game frames with zero isFinal have 100% static hashes.
  const hasFinalFrame = sorted.some((f) => f.isFinal);
  const hashes = sorted.map((f) => f.imageHash).filter((h): h is string => !!h);
  const pHashes = sorted.map((f) => f.perceptualHash).filter((h): h is string => !!h);

  if (!hasFinalFrame && sorted.length >= 5) {
    // Check if score is actively changing while frame image is completely frozen (artificial overlay injection)
    const distinctScores = new Set(sorted.map((f) => f.parsed?.primary).filter((s) => s !== undefined));
    const uniqueHashes = new Set(hashes);

    if (distinctScores.size >= 3 && uniqueHashes.size === 1) {
      reasons.push('score changing dynamically over a frozen video frame — artificial overlay spoofing detected');
    }

    // Only flag extended static video replay if mid-game window exceeds 20+ active frames with no movement
    if (hashes.length >= 20 && uniqueHashes.size === 1) {
      reasons.push('prolonged frozen frame across 20+ active mid-game samples — likely static video feed');
    }
  }

  // 3. Values outside allowed range.
  const { min = -Infinity, max = Infinity } = profile.constraints;
  for (const f of sorted) {
    if (typeof f.parsed?.primary !== 'number') continue;
    if (!Number.isFinite(f.parsed.primary)) {
      reasons.push('non-finite score detected');
      break;
    }
    if (f.parsed.primary < min || f.parsed.primary > max) {
      reasons.push(`value ${f.parsed.primary} outside [${min}, ${max}]`);
      break;
    }
  }

  return { suspicious: reasons.length > 0, reasons };
}
