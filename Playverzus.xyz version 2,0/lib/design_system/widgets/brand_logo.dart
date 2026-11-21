import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../core/catalog/official_games.dart';
import '../tokens/hig_tokens.dart';

/// STRICT LOGO-FIRST BRAND COMPONENT
/// Enforces the mandatory Playverzus v2.0 rule:
/// NEVER type brand names ("Playverzus.xyz", "Crossmint") in logo slots —
/// ALWAYS render our official raster/vector logo assets.
class BrandLogo extends StatelessWidget {
  final double height;
  final _BrandLogoVariant _variant;
  final OfficialGame? _game;

  const BrandLogo.full({super.key, this.height = 30})
      : _variant = _BrandLogoVariant.playverzusFull,
        _game = null;

  const BrandLogo.mark({super.key, this.height = 28})
      : _variant = _BrandLogoVariant.playverzusMark,
        _game = null;

  const BrandLogo.crossmint({super.key, this.height = 22})
      : _variant = _BrandLogoVariant.crossmint,
        _game = null;

  const BrandLogo.crossmintMark({super.key, this.height = 22})
      : _variant = _BrandLogoVariant.crossmintMark,
        _game = null;

  const BrandLogo.kopokopo({super.key, this.height = 24})
      : _variant = _BrandLogoVariant.kopokopo,
        _game = null;

  const BrandLogo.game(OfficialGame game, {super.key, this.height = 28})
      : _variant = _BrandLogoVariant.game,
        _game = game;

  @override
  Widget build(BuildContext context) {
    switch (_variant) {
      case _BrandLogoVariant.playverzusFull:
        return Image.asset(
          'assets/branding/playverzus_logo_transparent.png',
          height: height,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          semanticLabel: 'Playverzus Logo',
        );
      case _BrandLogoVariant.playverzusMark:
        return Image.asset(
          'assets/branding/playverzus_mark_transparent.png',
          height: height,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          semanticLabel: 'Playverzus Mark',
        );
      case _BrandLogoVariant.crossmint:
        return Image.asset(
          'assets/branding/crossmint_logo.png',
          height: height,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          semanticLabel: 'Crossmint Logo',
        );
      case _BrandLogoVariant.crossmintMark:
        return Image.asset(
          'assets/branding/crossmint_icon.png',
          height: height,
          width: height,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          semanticLabel: 'Crossmint Icon',
        );
      case _BrandLogoVariant.kopokopo:
        return _KopoKopoMpesaLogoBadge(height: height);
      case _BrandLogoVariant.game:
        final g = _game!;
        if (g.transparentLogoAsset != null) {
          return Image.asset(
            g.transparentLogoAsset!,
            height: height,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.high,
            semanticLabel: g.displayName,
          );
        }
        // Render crisp official poster emblem badge (never raw text-only title)
        return ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(
            height: height,
            width: height * 1.5,
            child: g.bannerAsset != null
                ? Image.asset(g.bannerAsset!, fit: BoxFit.cover)
                : g.bannerNetworkUrl != null
                    ? Image.network(g.bannerNetworkUrl!, fit: BoxFit.cover)
                    : Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: g.gradientColors),
                        ),
                        alignment: Alignment.center,
                        child: const Icon(
                          CupertinoIcons.game_controller_solid,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
          ),
        );
    }
  }
}

enum _BrandLogoVariant {
  playverzusFull,
  playverzusMark,
  crossmint,
  crossmintMark,
  kopokopo,
  game,
}

/// Crisp vector-rendered M-PESA emblem badge for mobile money settlements.
class _KopoKopoMpesaLogoBadge extends StatelessWidget {
  final double height;
  const _KopoKopoMpesaLogoBadge({required this.height});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      padding: EdgeInsets.symmetric(horizontal: height * 0.38),
      decoration: ShapeDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF16A34A), Color(0xFF059669)],
        ),
        shape: ContinuousRectangleBorder(
          borderRadius: BorderRadius.circular(height * 0.55),
          side: const BorderSide(color: Color(0x40FFFFFF), width: 0.5),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            CupertinoIcons.device_phone_portrait,
            size: height * 0.58,
            color: Colors.white,
          ),
          SizedBox(width: height * 0.22),
          Text(
            'M-PESA',
            style: HigTypography.mono(
              size: height * 0.44,
              weight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}
