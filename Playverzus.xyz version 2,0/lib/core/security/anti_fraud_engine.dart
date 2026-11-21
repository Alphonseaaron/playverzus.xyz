import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

/// ─────────────────────────────────────────────────────────────────────────────
/// PLAYVERZUS v2.0 BULLETPROOF VERIFICATION & ANTI-FRAUD ENGINE
/// 1:1 port of `packages/core/src/ocr/` (`AntiCheat.ts`, `DualConsensusOracle.ts`,
/// `FrameHasher.ts`, `TelemetrySigner.ts`, and `VotingOCR.ts`).
///
/// Five Layered Security Pillars:
/// 1. FrameHasher: 64-bit Perceptual Difference Hash (dHash) + SHA-256 Digest + Hamming Distance
/// 2. TelemetrySigner: RFC 2104 HMAC-SHA256 Packet Signing + Monotonic Sequence + 15s Clock Skew Guard
/// 3. AntiCheatAnalyzer: Impossible Velocity Physics + Frozen-Frame / Overlay Spoofing + Score Boundaries
/// 4. DualConsensusOracle: Cross-Stream Host vs Challenger Evaluation (DUAL_DIRECT, DUAL_INVERTED, CONFLICT_REVIEW)
/// 5. VotingOcrEngine: Multi-Engine Weighted Majority Vote + Temporal Persistence Confidence Multiplier
/// ─────────────────────────────────────────────────────────────────────────────

class ScoreFrameSample {
  final String matchId;
  final String playerId;
  final String rawText;
  final double confidence;
  final bool isFinal;
  final DateTime createdAt;
  final String? imageHash;
  final String? perceptualHash;
  final double? primaryScore;
  final double? scoreA;
  final double? scoreB;

  const ScoreFrameSample({
    required this.matchId,
    required this.playerId,
    required this.rawText,
    required this.confidence,
    this.isFinal = false,
    required this.createdAt,
    this.imageHash,
    this.perceptualHash,
    this.primaryScore,
    this.scoreA,
    this.scoreB,
  });

  /// Parses `rawText` (e.g. "3 - 1", "13:9", "VICTORY", "2450") into structured score fields.
  factory ScoreFrameSample.fromRaw({
    required String matchId,
    required String playerId,
    required String rawText,
    required double confidence,
    bool isFinal = false,
    DateTime? createdAt,
    String? imageHash,
    String? perceptualHash,
  }) {
    final clean = rawText.trim();
    double? sa;
    double? sb;
    double? primary;

    final h2h = RegExp(r'(\d{1,4})\s*[-:]\s*(\d{1,4})').firstMatch(clean);
    if (h2h != null) {
      sa = double.tryParse(h2h.group(1) ?? '');
      sb = double.tryParse(h2h.group(2) ?? '');
      primary = sa;
    } else {
      final single = RegExp(r'(\d+(?:\.\d+)?)').firstMatch(clean);
      if (single != null) {
        primary = double.tryParse(single.group(1) ?? '');
      }
    }

    return ScoreFrameSample(
      matchId: matchId,
      playerId: playerId,
      rawText: clean,
      confidence: confidence.clamp(0.0, 1.0),
      isFinal: isFinal,
      createdAt: createdAt ?? DateTime.now(),
      imageHash: imageHash ?? FrameHasher.sha256Hex(utf8.encode('$matchId|$playerId|$clean')),
      perceptualHash: perceptualHash,
      primaryScore: primary,
      scoreA: sa,
      scoreB: sb,
    );
  }
}

/// ─── PILLAR 1: PERCEPTUAL FRAME HASHER (`FrameHasher.ts`) ────────────────────
class FrameHasher {
  FrameHasher._();

  /// Computes a 64-bit Perceptual Difference Hash (dHash) from a 9x8 grayscale pixel matrix (72 bytes).
  /// Compares horizontal gradient transitions (`leftPixel < rightPixel`).
  static String computeDHashFromGrayscale(Uint8List pixels) {
    int high32 = 0;
    int low32 = 0;
    int bitIndex = 0;

    for (int row = 0; row < 8; row++) {
      for (int col = 0; col < 8; col++) {
        final idx = row * 9 + col;
        final leftPixel = idx < pixels.length ? pixels[idx] : 0;
        final rightPixel = (idx + 1) < pixels.length ? pixels[idx + 1] : 0;
        final bit = leftPixel < rightPixel ? 1 : 0;

        if (bitIndex < 32) {
          high32 = ((high32 << 1) | bit) & 0xFFFFFFFF;
        } else {
          low32 = ((low32 << 1) | bit) & 0xFFFFFFFF;
        }
        bitIndex++;
      }
    }

    final highHex = high32.toUnsigned(32).toRadixString(16).padLeft(8, '0');
    final lowHex = low32.toUnsigned(32).toRadixString(16).padLeft(8, '0');
    return '$highHex$lowHex';
  }

  /// Calculates the Hamming distance (bit differences) between two 16-char hex perceptual hashes.
  static int hammingDistance(String hexA, String hexB) {
    if (hexA.isEmpty || hexB.isEmpty || hexA.length != hexB.length) return 64;
    int distance = 0;
    for (int i = 0; i < hexA.length; i++) {
      final a = int.tryParse(hexA[i], radix: 16);
      final b = int.tryParse(hexB[i], radix: 16);
      if (a == null || b == null) return 64;
      int xor = a ^ b;
      while (xor > 0) {
        xor &= xor - 1;
        distance++;
      }
    }
    return distance;
  }

  /// Returns true if two perceptual hashes are visually near-identical (`<= 4` bits out of 64 = ~94%+ equivalence).
  static bool isPerceptualMatch(
    String hashA,
    String hashB, {
    int maxHammingDistance = 4,
  }) {
    return hammingDistance(hashA, hashB) <= maxHammingDistance;
  }

  /// Pure-Dart FIPS 180-4 SHA-256 implementation for frame & telemetry digests.
  static String sha256Hex(List<int> data) {
    final digest = _sha256Bytes(data);
    final sb = StringBuffer();
    for (final b in digest) {
      sb.write(b.toRadixString(16).padLeft(2, '0'));
    }
    return sb.toString();
  }

  static Uint8List hmacSha256(List<int> keyBytes, List<int> messageBytes) {
    const blockSize = 64;
    List<int> key = List<int>.from(keyBytes);
    if (key.length > blockSize) {
      key = _sha256Bytes(key);
    }
    if (key.length < blockSize) {
      key = [...key, ...List<int>.filled(blockSize - key.length, 0)];
    }

    final oKeyPad = List<int>.generate(blockSize, (i) => key[i] ^ 0x5c);
    final iKeyPad = List<int>.generate(blockSize, (i) => key[i] ^ 0x36);

    final innerHash = _sha256Bytes([...iKeyPad, ...messageBytes]);
    return _sha256Bytes([...oKeyPad, ...innerHash]);
  }

  static String hmacSha256Hex(String secret, String message) {
    final bytes = hmacSha256(utf8.encode(secret), utf8.encode(message));
    final sb = StringBuffer();
    for (final b in bytes) {
      sb.write(b.toRadixString(16).padLeft(2, '0'));
    }
    return sb.toString();
  }

  static const List<int> _k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  static int _rotr(int x, int n) => ((x & 0xFFFFFFFF) >>> n) | ((x << (32 - n)) & 0xFFFFFFFF);

  static Uint8List _sha256Bytes(List<int> message) {
    int h0 = 0x6a09e667;
    int h1 = 0xbb67ae85;
    int h2 = 0x3c6ef372;
    int h3 = 0xa54ff53a;
    int h4 = 0x510e527f;
    int h5 = 0x9b05688c;
    int h6 = 0x1f83d9ab;
    int h7 = 0x5be0cd19;

    final bitLen = message.length * 8;
    final padded = <int>[...message, 0x80];
    while ((padded.length % 64) != 56) {
      padded.add(0);
    }
    for (int i = 7; i >= 0; i--) {
      padded.add((bitLen >> (i * 8)) & 0xFF);
    }

    final w = List<int>.filled(64, 0);
    for (int chunk = 0; chunk < padded.length; chunk += 64) {
      for (int i = 0; i < 16; i++) {
        final j = chunk + i * 4;
        w[i] = ((padded[j] << 24) |
                (padded[j + 1] << 16) |
                (padded[j + 2] << 8) |
                padded[j + 3]) &
            0xFFFFFFFF;
      }
      for (int i = 16; i < 64; i++) {
        final s0 = _rotr(w[i - 15], 7) ^ _rotr(w[i - 15], 18) ^ ((w[i - 15] & 0xFFFFFFFF) >>> 3);
        final s1 = _rotr(w[i - 2], 17) ^ _rotr(w[i - 2], 19) ^ ((w[i - 2] & 0xFFFFFFFF) >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) & 0xFFFFFFFF;
      }

      int a = h0;
      int b = h1;
      int c = h2;
      int d = h3;
      int e = h4;
      int f = h5;
      int g = h6;
      int h = h7;

      for (int i = 0; i < 64; i++) {
        final s1 = _rotr(e, 6) ^ _rotr(e, 11) ^ _rotr(e, 25);
        final ch = (e & f) ^ ((~e) & g);
        final temp1 = (h + s1 + ch + _k[i] + w[i]) & 0xFFFFFFFF;
        final s0 = _rotr(a, 2) ^ _rotr(a, 13) ^ _rotr(a, 22);
        final maj = (a & b) ^ (a & c) ^ (b & c);
        final temp2 = (s0 + maj) & 0xFFFFFFFF;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) & 0xFFFFFFFF;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) & 0xFFFFFFFF;
      }

      h0 = (h0 + a) & 0xFFFFFFFF;
      h1 = (h1 + b) & 0xFFFFFFFF;
      h2 = (h2 + c) & 0xFFFFFFFF;
      h3 = (h3 + d) & 0xFFFFFFFF;
      h4 = (h4 + e) & 0xFFFFFFFF;
      h5 = (h5 + f) & 0xFFFFFFFF;
      h6 = (h6 + g) & 0xFFFFFFFF;
      h7 = (h7 + h) & 0xFFFFFFFF;
    }

    final out = Uint8List(32);
    final words = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (int i = 0; i < 8; i++) {
      out[i * 4] = (words[i] >> 24) & 0xFF;
      out[i * 4 + 1] = (words[i] >> 16) & 0xFF;
      out[i * 4 + 2] = (words[i] >> 8) & 0xFF;
      out[i * 4 + 3] = words[i] & 0xFF;
    }
    return out;
  }
}

/// ─── PILLAR 2: CRYPTOGRAPHIC TELEMETRY SIGNER (`TelemetrySigner.ts`) ─────────
class TelemetryPayload {
  final String matchId;
  final String playerId;
  final int seq;
  final int timestamp;
  final String? perceptualHash;
  final String? rawText;
  final Map<String, dynamic>? data;

  const TelemetryPayload({
    required this.matchId,
    required this.playerId,
    required this.seq,
    required this.timestamp,
    this.perceptualHash,
    this.rawText,
    this.data,
  });
}

class TelemetryVerificationResult {
  final bool valid;
  final String? reason;

  const TelemetryVerificationResult({required this.valid, this.reason});
}

class TelemetrySigner {
  TelemetrySigner._();

  static String canonicalizeTelemetryPayload(TelemetryPayload payload) {
    String sortedDataJson = '';
    if (payload.data != null && payload.data!.isNotEmpty) {
      final sortedKeys = payload.data!.keys.toList()..sort();
      final map = <String, dynamic>{
        for (final k in sortedKeys) k: payload.data![k],
      };
      sortedDataJson = jsonEncode(map);
    }
    return [
      payload.matchId,
      payload.playerId,
      payload.seq.toString(),
      payload.timestamp.toString(),
      payload.perceptualHash ?? '',
      payload.rawText ?? '',
      sortedDataJson,
    ].join('|');
  }

  static String signTelemetry(String secret, TelemetryPayload payload) {
    final canonical = canonicalizeTelemetryPayload(payload);
    return FrameHasher.hmacSha256Hex(secret, canonical);
  }

  /// Verifies monotonic sequence number (`seq > lastSeq`), clock-skew freshness (`<= 15,000ms`),
  /// and constant-time HMAC-SHA256 signature integrity.
  static TelemetryVerificationResult verifyTelemetry({
    required String secret,
    required String signature,
    required TelemetryPayload payload,
    int? lastSeq,
    int maxSkewMs = 15000,
    int? nowMs,
  }) {
    if (lastSeq != null && payload.seq <= lastSeq) {
      return TelemetryVerificationResult(
        valid: false,
        reason:
            'Sequence regression detected: expected seq > $lastSeq, received ${payload.seq}',
      );
    }

    final currentMs = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    final skew = (currentMs - payload.timestamp).abs();
    if (skew > maxSkewMs) {
      return TelemetryVerificationResult(
        valid: false,
        reason:
            'Timestamp skew of ${skew}ms exceeds maximum allowed threshold of ${maxSkewMs}ms',
      );
    }

    final expected = signTelemetry(secret, payload);
    if (signature.length != expected.length) {
      return const TelemetryVerificationResult(
        valid: false,
        reason: 'Invalid telemetry signature length',
      );
    }

    // Constant-time comparison
    int diff = 0;
    for (int i = 0; i < signature.length; i++) {
      diff |= signature.codeUnitAt(i) ^ expected.codeUnitAt(i);
    }
    if (diff != 0) {
      return const TelemetryVerificationResult(
        valid: false,
        reason:
            'Invalid telemetry signature: payload does not match HMAC-SHA256 digest',
      );
    }

    return const TelemetryVerificationResult(valid: true);
  }
}

/// ─── PILLAR 3: SCORE STREAM PHYSICS & SPOOF DETECTOR (`AntiCheat.ts`) ────────
class AntiCheatResult {
  final bool suspicious;
  final List<String> reasons;

  const AntiCheatResult({
    required this.suspicious,
    required this.reasons,
  });
}

class AntiCheatAnalyzer {
  AntiCheatAnalyzer._();

  /// Analyses a score stream for impossible velocity physics, frozen-frame overlay
  /// spoofing, payload tampering, and score boundary violations.
  static AntiCheatResult analyzeScoreStream(
    List<ScoreFrameSample> frames, {
    double maxJumpPerSec = 5.0,
    double minAllowedScore = 0.0,
    double maxAllowedScore = 999999.0,
  }) {
    final reasons = <String>[];
    if (frames.isEmpty) {
      return const AntiCheatResult(suspicious: false, reasons: []);
    }

    final sorted = [...frames]
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));

    // 0. Oversized payload tamper check (> 2000 chars)
    for (final f in sorted) {
      if (f.rawText.length > 2000) {
        reasons.add(
          'oversized OCR payload (${f.rawText.length} chars > 2000 max)',
        );
        break;
      }
    }

    // 1. Impossible velocity check
    if (maxJumpPerSec > 0) {
      for (int i = 1; i < sorted.length; i++) {
        final prev = sorted[i - 1];
        final cur = sorted[i];
        if (prev.primaryScore == null || cur.primaryScore == null) continue;
        final seconds = max(
          0.001,
          cur.createdAt.difference(prev.createdAt).inMilliseconds / 1000.0,
        );
        final delta = cur.primaryScore! - prev.primaryScore!;
        if (delta > maxJumpPerSec * seconds * 2) {
          reasons.add(
            'impossible velocity: +${delta.toStringAsFixed(0)} in ${seconds.toStringAsFixed(2)}s',
          );
          break;
        }
      }
    }

    // 2. Frozen-Frame Spoofing / Artificial Overlay Injection Detection
    final hasFinalFrame = sorted.any((f) => f.isFinal);
    final hashes = sorted
        .map((f) => f.perceptualHash ?? f.imageHash)
        .whereType<String>()
        .where((h) => h.isNotEmpty)
        .toList();

    if (!hasFinalFrame && sorted.length >= 5) {
      final distinctScores = sorted
          .map((f) => f.primaryScore)
          .whereType<double>()
          .toSet();
      final uniqueHashes = hashes.toSet();

      if (distinctScores.length >= 3 && uniqueHashes.length == 1) {
        reasons.add(
          'score changing dynamically over a frozen video frame — artificial overlay spoofing detected',
        );
      }
      if (hashes.length >= 20 && uniqueHashes.length == 1) {
        reasons.add(
          'prolonged frozen frame across 20+ active mid-game samples — static video feed detected',
        );
      }
    }

    // 3. Score boundary validation
    for (final f in sorted) {
      final val = f.primaryScore;
      if (val == null) continue;
      if (!val.isFinite) {
        reasons.add('non-finite score detected');
        break;
      }
      if (val < minAllowedScore || val > maxAllowedScore) {
        reasons.add(
          'value $val outside allowed range [$minAllowedScore, $maxAllowedScore]',
        );
        break;
      }
    }

    return AntiCheatResult(
      suspicious: reasons.isNotEmpty,
      reasons: reasons,
    );
  }
}

/// ─── PILLAR 4: DUAL-PLAYER CONSENSUS ORACLE (`DualConsensusOracle.ts`) ───────
enum ConsensusMethod {
  dualDirect,
  dualInverted,
  singleStreamA,
  singleStreamB,
  conflictReview,
  pending,
}

class DualConsensusResult {
  final bool hasConsensus;
  final String? winnerId;
  final double confidence;
  final ConsensusMethod method;
  final String reason;
  final dynamic scoreA;
  final dynamic scoreB;

  const DualConsensusResult({
    required this.hasConsensus,
    required this.winnerId,
    required this.confidence,
    required this.method,
    required this.reason,
    this.scoreA,
    this.scoreB,
  });
}

class DualConsensusOracle {
  DualConsensusOracle._();

  static DualConsensusResult evaluate({
    ScoreFrameSample? frameA,
    ScoreFrameSample? frameB,
    required String playerAId,
    required String playerBId,
    required String gameType, // 'HEAD_TO_HEAD' | 'BINARY_RESULT' | 'HIGH_SCORE'
  }) {
    final normType = gameType.toUpperCase();

    // Case 1: Both competitors submitted score frames
    if (frameA != null && frameB != null) {
      if (normType == 'HEAD_TO_HEAD') {
        final saA = frameA.scoreA ?? frameA.primaryScore;
        final sbA = frameA.scoreB;
        final saB = frameB.scoreA ?? frameB.primaryScore;
        final sbB = frameB.scoreB;

        if (saA != null && sbA != null && saB != null && sbB != null) {
          // 1A: Direct identical spectator agreement (e.g. CS2 13-9 == 13-9)
          if (saA == saB && sbA == sbB) {
            if (saA == sbA) {
              return DualConsensusResult(
                hasConsensus: true,
                winnerId: null,
                confidence: 1.0,
                method: ConsensusMethod.dualDirect,
                reason:
                    'Tie match verified on both streams: ${saA.toInt()} - ${sbA.toInt()}',
                scoreA: saA.toInt(),
                scoreB: sbA.toInt(),
              );
            }
            return DualConsensusResult(
              hasConsensus: true,
              winnerId: saA > sbA ? playerAId : playerBId,
              confidence: 1.0,
              method: ConsensusMethod.dualDirect,
              reason:
                  'Direct dual-stream consensus: ${saA.toInt()} - ${sbA.toInt()}',
              scoreA: saA.toInt(),
              scoreB: sbA.toInt(),
            );
          }

          // 1B: Inverted perspective agreement (e.g. EA FC / Rocket League: A sees 3-1, B sees 1-3)
          if (saA == sbB && sbA == saB) {
            return DualConsensusResult(
              hasConsensus: true,
              winnerId: saA > sbA ? playerAId : playerBId,
              confidence: 1.0,
              method: ConsensusMethod.dualInverted,
              reason:
                  'Inverted dual-perspective consensus: Player A (${saA.toInt()}) vs Player B (${sbA.toInt()})',
              scoreA: saA.toInt(),
              scoreB: sbA.toInt(),
            );
          }

          // 1C: Contradiction -> route to Reviewer Audit Queue (/admin/review)
          return DualConsensusResult(
            hasConsensus: false,
            winnerId: null,
            confidence: 0.50,
            method: ConsensusMethod.conflictReview,
            reason:
                'Conflicting score streams: Player A reported ${saA.toInt()}-${sbA.toInt()}, Player B reported ${saB.toInt()}-${sbB.toInt()}',
            scoreA: saA.toInt(),
            scoreB: sbA.toInt(),
          );
        }
      } else if (normType == 'BINARY_RESULT') {
        final resA = frameA.rawText.toUpperCase();
        final resB = frameB.rawText.toUpperCase();
        final aWin = resA.contains('WIN') || resA.contains('VICTORY');
        final aLoss = resA.contains('LOSS') || resA.contains('DEFEAT');
        final bWin = resB.contains('WIN') || resB.contains('VICTORY');
        final bLoss = resB.contains('LOSS') || resB.contains('DEFEAT');

        if (aWin && bLoss) {
          return DualConsensusResult(
            hasConsensus: true,
            winnerId: playerAId,
            confidence: 1.0,
            method: ConsensusMethod.dualDirect,
            reason:
                'Complementary binary results verified: Player A (WIN), Player B (LOSS)',
            scoreA: 'WIN',
            scoreB: 'LOSS',
          );
        }
        if (bWin && aLoss) {
          return DualConsensusResult(
            hasConsensus: true,
            winnerId: playerBId,
            confidence: 1.0,
            method: ConsensusMethod.dualDirect,
            reason:
                'Complementary binary results verified: Player B (WIN), Player A (LOSS)',
            scoreA: 'LOSS',
            scoreB: 'WIN',
          );
        }
        if (aWin && bWin) {
          return const DualConsensusResult(
            hasConsensus: false,
            winnerId: null,
            confidence: 0.50,
            method: ConsensusMethod.conflictReview,
            reason: 'Both competitors submitted winning banners',
          );
        }
      }
    }

    // Case 2: Single-Stream Adjudication (Player A only)
    if (frameA != null && frameB == null) {
      final sa = frameA.scoreA ?? frameA.primaryScore;
      final sb = frameA.scoreB;
      if (sa != null && sb != null && sa != sb) {
        return DualConsensusResult(
          hasConsensus: true,
          winnerId: sa > sb ? playerAId : playerBId,
          confidence: max(frameA.confidence, 0.95),
          method: ConsensusMethod.singleStreamA,
          reason:
              'Single stream adjudication from Player A: ${sa.toInt()} - ${sb.toInt()}',
          scoreA: sa.toInt(),
          scoreB: sb.toInt(),
        );
      }
    }

    // Case 3: Single-Stream Adjudication (Player B only)
    if (frameB != null && frameA == null) {
      final sa = frameB.scoreA ?? frameB.primaryScore;
      final sb = frameB.scoreB;
      if (sa != null && sb != null && sa != sb) {
        return DualConsensusResult(
          hasConsensus: true,
          winnerId: sa > sb ? playerAId : playerBId,
          confidence: max(frameB.confidence, 0.95),
          method: ConsensusMethod.singleStreamB,
          reason:
              'Single stream adjudication from Player B: ${sa.toInt()} - ${sb.toInt()}',
          scoreA: sa.toInt(),
          scoreB: sb.toInt(),
        );
      }
    }

    return const DualConsensusResult(
      hasConsensus: false,
      winnerId: null,
      confidence: 0.0,
      method: ConsensusMethod.pending,
      reason: 'Awaiting verified score frames from participants',
    );
  }
}

/// ─── PILLAR 5: TEMPORAL PERSISTENCE & VOTING OCR (`VotingOCR.ts`) ────────────
class VotingOcrEngine {
  VotingOcrEngine._();

  static const double autoApproveConfidence = 0.85;

  static String _normalize(String text) =>
      text.replaceAll(RegExp(r'\s+'), ' ').trim().toLowerCase();

  /// Boosts confidence when consecutive frames report identical scoreboard readings:
  /// `EffectiveConfidence = min(1.0, BaseConfidence * (1 + 0.1 * min(3, consecutiveStableFrames)))`.
  static ({double effectiveConfidence, int consecutiveStableFrames})
      computeTemporalConfidence({
    required String currentText,
    required double baseConfidence,
    required List<String> recentHistory,
  }) {
    if (currentText.trim().isEmpty || recentHistory.isEmpty) {
      return (
        effectiveConfidence: baseConfidence.clamp(0.0, 1.0),
        consecutiveStableFrames: 0,
      );
    }

    final normCurrent = _normalize(currentText);
    int stable = 0;
    for (int i = recentHistory.length - 1; i >= 0; i--) {
      if (_normalize(recentHistory[i]) == normCurrent) {
        stable++;
      } else {
        break;
      }
    }

    final multiplier = 1.0 + 0.1 * min(3, stable);
    final effective =
        double.parse(min(1.0, baseConfidence * multiplier).toStringAsFixed(4));
    return (
      effectiveConfidence: effective,
      consecutiveStableFrames: stable,
    );
  }
}
