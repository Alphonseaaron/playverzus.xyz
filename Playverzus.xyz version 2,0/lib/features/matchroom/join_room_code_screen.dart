import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/official_games.dart';
import '../../core/data/arena_repository.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';

/// Handles `/matches/room/:code` — Opponents enter a private Room Code (or open a code link)
/// and are automatically matched & routed straight into the Matchroom!
class JoinRoomCodeScreen extends ConsumerStatefulWidget {
  final String code;
  const JoinRoomCodeScreen({super.key, required this.code});

  @override
  ConsumerState<JoinRoomCodeScreen> createState() => _JoinRoomCodeScreenState();
}

class _JoinRoomCodeScreenState extends ConsumerState<JoinRoomCodeScreen> {
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_join);
  }

  Future<void> _join() async {
    final session = ref.read(playerSessionProvider);
    try {
      final match = await ref
          .read(arenaDataProvider.notifier)
          .acceptChallenge(widget.code, session.username);
      if (!mounted) return;

      if (match != null) {
        final game = findOfficialGameById(match.gameId);
        ref.read(activeGameProvider.notifier).selectGame(game);
        ref.read(toastProvider.notifier).show(
              'Joined Private Room ${match.roomCode}',
              body: 'Connected with @${match.hostName} in ${game.displayName}.',
              tone: ToastTone.success,
            );
        context.go('/matches/${match.id}');
      } else {
        setState(() {
          _error =
              'Room code "${widget.code.toUpperCase()}" was not found. Check the code or ask the host for their match link.';
        });
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: HigMaxWidthContainer(
        maxWidth: 480,
        child: GlassCard(
          radius: 22,
          padding: const EdgeInsets.all(26),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              HigBadge(
                label: 'ROOM CODE · ${widget.code.toUpperCase()}',
                tone: HigBadgeTone.copper,
              ),
              const SizedBox(height: 12),
              Text('Entering Private Arena', style: HigTypography.title2()),
              const SizedBox(height: 8),
              if (_error != null) ...[
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: HigTypography.footnote(color: HigColors.crimson),
                ),
                const SizedBox(height: 18),
                HigButton(
                  label: 'Back to Challenges',
                  icon: CupertinoIcons.chevron_left,
                  variant: HigButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: () => context.go('/challenges'),
                ),
              ] else ...[
                const SizedBox(height: 12),
                const CupertinoActivityIndicator(radius: 14),
                const SizedBox(height: 12),
                Text(
                  'Validating room credentials & connecting peer lobby...',
                  style: HigTypography.footnote(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
