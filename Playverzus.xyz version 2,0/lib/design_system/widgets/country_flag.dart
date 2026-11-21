import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../../core/catalog/countries.dart';
import '../tokens/hig_tokens.dart';

/// Crisp raster Country Flag renderer with same-origin proxy on localhost web
/// (eliminates CanvasKit CORS errors) + automatic ISO badge fallback.
class CountryFlag extends StatelessWidget {
  final String? code;
  final double width;
  final double height;
  final bool showName;
  final bool showCode;

  const CountryFlag({
    super.key,
    required this.code,
    this.width = 20,
    this.height = 14,
    this.showName = false,
    this.showCode = false,
  });

  static String _flagUrlFor(String isoLower) {
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host == 'localhost' || host == '127.0.0.1') {
        return '${Uri.base.origin}/flags/$isoLower.png';
      }
    }
    return 'https://flagcdn.com/w40/$isoLower.png';
  }

  @override
  Widget build(BuildContext context) {
    final country = findCountryByCode(code);
    if (country == null) return const SizedBox.shrink();

    final isoLower = country.code.toLowerCase();
    final isKnownIso =
        isoLower.length == 2 && isoLower != 'eu' && isoLower != 'gl';

    final flagBox = ClipRRect(
      borderRadius: BorderRadius.circular(3),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: HigColors.surfaceElevated,
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.16),
            width: 0.6,
          ),
          borderRadius: BorderRadius.circular(3),
        ),
        child: isKnownIso
            ? Image.network(
                _flagUrlFor(isoLower),
                width: width,
                height: height,
                fit: BoxFit.cover,
                filterQuality: FilterQuality.medium,
                errorBuilder: (_, __, ___) => Center(
                  child: Text(
                    country.code,
                    style: HigTypography.mono(
                      size: (height * 0.56).clamp(7.5, 10.5),
                      weight: FontWeight.w700,
                      color: HigColors.labelPrimary,
                    ),
                  ),
                ),
              )
            : Center(
                child: Text(
                  country.code,
                  style: HigTypography.mono(
                    size: (height * 0.56).clamp(7.5, 10.5),
                    weight: FontWeight.w700,
                    color: HigColors.labelPrimary,
                  ),
                ),
              ),
      ),
    );

    if (!showName && !showCode) {
      return Tooltip(
        message: '${country.name} (${country.code})',
        child: flagBox,
      );
    }

    return Tooltip(
      message: '${country.name} (${country.code})',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          flagBox,
          if (showName) ...[
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                country.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: HigTypography.footnote(color: HigColors.labelPrimary),
              ),
            ),
          ],
          if (showCode) ...[
            const SizedBox(width: 4),
            Text(
              '(${country.code})',
              style: HigTypography.mono(
                size: 10.5,
                color: HigColors.labelTertiary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Official Playverzus VX ELO Level 1–10 Badge (1:1 parity with v1.0 `EloBadge.tsx`).
class EloLevelBadge extends StatelessWidget {
  final int elo;
  final bool showNumeric;
  final double size;

  const EloLevelBadge({
    super.key,
    required this.elo,
    this.showNumeric = false,
    this.size = 24,
  });

  static ({int level, String label, Color bg, Color fg}) infoFor(int elo) {
    if (elo >= 2001) {
      return (
        level: 10,
        label: 'Level 10 (Master)',
        bg: const Color(0xFFDC2626),
        fg: Colors.white,
      );
    }
    if (elo >= 1851) {
      return (
        level: 9,
        label: 'Level 9',
        bg: const Color(0xFFEF4444),
        fg: Colors.white,
      );
    }
    if (elo >= 1701) {
      return (
        level: 8,
        label: 'Level 8',
        bg: const Color(0xFF7C3AED),
        fg: Colors.white,
      );
    }
    if (elo >= 1551) {
      return (
        level: 7,
        label: 'Level 7',
        bg: const Color(0xFF8B5CF6),
        fg: Colors.white,
      );
    }
    if (elo >= 1401) {
      return (
        level: 6,
        label: 'Level 6',
        bg: const Color(0xFFD97706),
        fg: Colors.white,
      );
    }
    if (elo >= 1251) {
      return (
        level: 5,
        label: 'Level 5',
        bg: const Color(0xFFEAB308),
        fg: Colors.black,
      );
    }
    if (elo >= 1101) {
      return (
        level: 4,
        label: 'Level 4',
        bg: const Color(0xFFCA8A04),
        fg: Colors.white,
      );
    }
    if (elo >= 951) {
      return (
        level: 3,
        label: 'Level 3',
        bg: const Color(0xFF059669),
        fg: Colors.white,
      );
    }
    if (elo >= 801) {
      return (
        level: 2,
        label: 'Level 2',
        bg: const Color(0xFF047857),
        fg: Colors.white,
      );
    }
    return (
      level: 1,
      label: 'Level 1',
      bg: const Color(0xFF4B5563),
      fg: Colors.white,
    );
  }

  @override
  Widget build(BuildContext context) {
    final info = infoFor(elo);
    return Tooltip(
      message: '${info.label} ($elo Rating)',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: info.bg,
              borderRadius: BorderRadius.circular(6),
            ),
            alignment: Alignment.center,
            child: Text(
              '${info.level}',
              style: HigTypography.mono(
                size: size * 0.48,
                weight: FontWeight.w800,
                color: info.fg,
              ),
            ),
          ),
          if (showNumeric) ...[
            const SizedBox(width: 6),
            Text(
              '$elo',
              style: HigTypography.mono(
                size: 12.5,
                weight: FontWeight.w700,
                color: HigColors.labelPrimary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
