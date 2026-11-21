import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import 'admin_models.dart';

class AdminConsoleState {
  final bool loading;
  final String? error;
  final Map<String, dynamic> stats;
  final Map<String, dynamic> treasury;
  final Map<String, dynamic> securityOverview;
  final Map<String, dynamic> mailInfo;
  final List<Map<String, dynamic>> securityEvents;
  final List<Map<String, dynamic>> users;
  final List<Map<String, dynamic>> reviewQueue;
  final List<Map<String, dynamic>> tickets;
  final List<Map<String, dynamic>> staffList;
  final List<Map<String, dynamic>> suggestions;
  final List<Map<String, dynamic>> polls;
  final List<Map<String, dynamic>> gameProfiles;
  final List<Map<String, dynamic>> seasons;
  final List<Map<String, dynamic>> sponsors;

  const AdminConsoleState({
    this.loading = false,
    this.error,
    this.stats = const {},
    this.treasury = const {},
    this.securityOverview = const {},
    this.mailInfo = const {},
    this.securityEvents = const [],
    this.users = const [],
    this.reviewQueue = const [],
    this.tickets = const [],
    this.staffList = const [],
    this.suggestions = const [],
    this.polls = const [],
    this.gameProfiles = const [],
    this.seasons = const [],
    this.sponsors = const [],
  });

  AdminConsoleState copyWith({
    bool? loading,
    String? error,
    bool clearError = false,
    Map<String, dynamic>? stats,
    Map<String, dynamic>? treasury,
    Map<String, dynamic>? securityOverview,
    Map<String, dynamic>? mailInfo,
    List<Map<String, dynamic>>? securityEvents,
    List<Map<String, dynamic>>? users,
    List<Map<String, dynamic>>? reviewQueue,
    List<Map<String, dynamic>>? tickets,
    List<Map<String, dynamic>>? staffList,
    List<Map<String, dynamic>>? suggestions,
    List<Map<String, dynamic>>? polls,
    List<Map<String, dynamic>>? gameProfiles,
    List<Map<String, dynamic>>? seasons,
    List<Map<String, dynamic>>? sponsors,
  }) {
    return AdminConsoleState(
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
      stats: stats ?? this.stats,
      treasury: treasury ?? this.treasury,
      securityOverview: securityOverview ?? this.securityOverview,
      mailInfo: mailInfo ?? this.mailInfo,
      securityEvents: securityEvents ?? this.securityEvents,
      users: users ?? this.users,
      reviewQueue: reviewQueue ?? this.reviewQueue,
      tickets: tickets ?? this.tickets,
      staffList: staffList ?? this.staffList,
      suggestions: suggestions ?? this.suggestions,
      polls: polls ?? this.polls,
      gameProfiles: gameProfiles ?? this.gameProfiles,
      seasons: seasons ?? this.seasons,
      sponsors: sponsors ?? this.sponsors,
    );
  }
}

class AdminConsoleNotifier extends StateNotifier<AdminConsoleState> {
  final Ref _ref;

  AdminConsoleNotifier(this._ref) : super(const AdminConsoleState()) {
    // Wipe admin cache whenever user signs out or switches account
    _ref.listen<PlayerSession>(playerSessionProvider, (prev, next) {
      if (prev?.userId != next.userId || !next.isAdmin) {
        state = const AdminConsoleState();
      }
    });
  }

  List<Map<String, dynamic>> _extractList(dynamic res, [String? key]) {
    if (res is List) {
      return res.whereType<Map<String, dynamic>>().toList();
    }
    if (res is Map && key != null && res[key] is List) {
      return (res[key] as List).whereType<Map<String, dynamic>>().toList();
    }
    return const [];
  }

  /// Refreshes data specifically for the active AdminModule (and overview stats)
  /// respecting the staff user's exact role clearance so unauthorized endpoints are never spammed.
  Future<void> refreshModule(AdminModule module) async {
    final session = _ref.read(playerSessionProvider);
    if (!session.isAdmin) return;

    state = state.copyWith(loading: true, clearError: true);

    final hasJwt =
        session.accessToken != null && session.accessToken!.isNotEmpty;
    final errors = <String>[];

    // Public-readable registries work even without JWT (games, seasons, polls, mail info)
    if (module == AdminModule.overview) {
      try {
        final m = await ApiClient.get('/mail/info');
        if (m is Map<String, dynamic>) state = state.copyWith(mailInfo: m);
      } on ApiException catch (e) {
        errors.add(e.message);
      }
    }
    if (module == AdminModule.profiles || module == AdminModule.overview) {
      try {
        final g = await ApiClient.get('/games');
        state = state.copyWith(gameProfiles: _extractList(g));
      } on ApiException catch (e) {
        errors.add(e.message);
      }
    }
    if (module == AdminModule.seasons) {
      try {
        final s = await ApiClient.get('/seasons');
        state = state.copyWith(seasons: _extractList(s));
      } on ApiException catch (e) {
        errors.add(e.message);
      }
    }
    if (module == AdminModule.polls) {
      try {
        final p = await ApiClient.get('/polls');
        state = state.copyWith(polls: _extractList(p));
      } on ApiException catch (e) {
        errors.add(e.message);
      }
    }

    if (!hasJwt) {
      state = state.copyWith(
        loading: false,
        error:
            'Local QA Admin preview has no live backend JWT. Sign in with a real Staff/Admin account to load and mutate protected records.',
      );
      return;
    }

    final allowed =
        allowedAdminModulesForRole(session.role).map((m) => m.module).toSet();

    Future<void> safeRun(Future<void> Function() task) async {
      try {
        await task();
      } on ApiException catch (e) {
        errors.add(e.message);
      } catch (e) {
        errors.add(e.toString());
      }
    }

    if (module == AdminModule.overview &&
        allowed.contains(AdminModule.overview)) {
      await Future.wait([
        safeRun(() async {
          final r = await ApiClient.get('/admin/stats');
          if (r is Map<String, dynamic>) state = state.copyWith(stats: r);
        }),
        safeRun(() async {
          final r = await ApiClient.get('/review/queue');
          state = state.copyWith(reviewQueue: _extractList(r));
        }),
      ]);
    } else if (module == AdminModule.security &&
        allowed.contains(AdminModule.security)) {
      await Future.wait([
        safeRun(() async {
          final r = await ApiClient.get('/admin/security/overview');
          if (r is Map<String, dynamic>) {
            state = state.copyWith(securityOverview: r);
          }
        }),
        safeRun(() async {
          final r = await ApiClient.get('/admin/security/events?limit=75');
          state = state.copyWith(securityEvents: _extractList(r));
        }),
      ]);
    } else if (module == AdminModule.treasury &&
        allowed.contains(AdminModule.treasury)) {
      await safeRun(() async {
        final r = await ApiClient.get('/admin/treasury');
        if (r is Map<String, dynamic>) state = state.copyWith(treasury: r);
      });
    } else if (module == AdminModule.support &&
        allowed.contains(AdminModule.support)) {
      await Future.wait([
        safeRun(() async {
          final r = await ApiClient.get('/support/admin/tickets');
          state = state.copyWith(tickets: _extractList(r, 'tickets'));
        }),
        safeRun(() async {
          final r = await ApiClient.get('/support/admin/staff');
          state = state.copyWith(staffList: _extractList(r));
        }),
      ]);
    } else if (module == AdminModule.polls &&
        allowed.contains(AdminModule.polls)) {
      await safeRun(() async {
        final r = await ApiClient.get('/polls/admin/suggestions');
        state = state.copyWith(suggestions: _extractList(r));
      });
    } else if (module == AdminModule.review &&
        allowed.contains(AdminModule.review)) {
      await safeRun(() async {
        final r = await ApiClient.get('/review/queue');
        state = state.copyWith(reviewQueue: _extractList(r));
      });
    } else if (module == AdminModule.users &&
        allowed.contains(AdminModule.users)) {
      await safeRun(() async {
        final r = await ApiClient.get('/admin/users?limit=100');
        state = state.copyWith(users: _extractList(r, 'users'));
      });
    } else if (module == AdminModule.sponsors &&
        allowed.contains(AdminModule.sponsors)) {
      await safeRun(() async {
        final r = await ApiClient.get('/admin/sponsors');
        state = state.copyWith(sponsors: _extractList(r));
      });
    }

    state = state.copyWith(
      loading: false,
      error: errors.isNotEmpty ? errors.first : null,
    );
  }

  // ─── SECURITY & ANTI-CHEAT ACTIONS ────────────────────────────────────────
  Future<String?> toggleSettlementHalt(bool enabled, String reason) async {
    try {
      await ApiClient.post('/admin/security/settlement-halt', data: {
        'enabled': enabled,
        'reason': reason.isEmpty ? 'Admin security console action' : reason,
      });
      await refreshModule(AdminModule.security);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> freezeMatch(String matchId, String reason) async {
    if (matchId.trim().isEmpty) return 'Enter a match ID.';
    try {
      await ApiClient.post('/admin/security/freeze/${matchId.trim()}', data: {
        'reason': reason.trim().isEmpty ? 'Flagged for security audit' : reason.trim(),
      });
      await refreshModule(AdminModule.security);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> voidMatch(String matchId, String reason) async {
    if (matchId.trim().isEmpty) return 'Enter a match ID.';
    try {
      await ApiClient.post('/admin/security/void/${matchId.trim()}', data: {
        'reason': reason.trim().isEmpty ? 'Voided due to confirmed exploit' : reason.trim(),
      });
      await refreshModule(AdminModule.security);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> clearSettlementLock(String lockKey) async {
    try {
      await ApiClient.post('/admin/security/clear-lock', data: {'lockKey': lockKey});
      await refreshModule(AdminModule.security);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  // ─── TREASURY ACTIONS ─────────────────────────────────────────────────────
  Future<String?> withdrawTreasury({
    required double amount,
    required String mode,
    String? destinationAddress,
    String? note,
  }) async {
    if (amount <= 0) return 'Enter a valid withdrawal amount.';
    try {
      await ApiClient.post('/admin/treasury/withdraw', data: {
        'amount': amount,
        'mode': mode,
        if (destinationAddress != null && destinationAddress.trim().isNotEmpty)
          'destinationAddress': destinationAddress.trim(),
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      });
      await refreshModule(AdminModule.treasury);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  // ─── SUPPORT DESK ACTIONS ─────────────────────────────────────────────────
  Future<Map<String, dynamic>?> fetchTicketDetail(String ticketId) async {
    try {
      final res = await ApiClient.get('/support/tickets/$ticketId');
      return res is Map<String, dynamic> ? res : null;
    } catch (_) {
      return null;
    }
  }

  Future<String?> replyToTicket(
    String ticketId,
    String message, {
    bool isInternalNote = false,
  }) async {
    if (message.trim().isEmpty) return 'Enter a reply message.';
    try {
      await ApiClient.post('/support/tickets/$ticketId/reply', data: {
        'message': message.trim(),
        'isInternalNote': isInternalNote,
      });
      await refreshModule(AdminModule.support);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> updateTicketStatus(
    String ticketId, {
    required String status,
    String? priority,
  }) async {
    try {
      await ApiClient.patch('/support/admin/tickets/$ticketId/status', data: {
        'status': status,
        if (priority != null) 'priority': priority,
      });
      await refreshModule(AdminModule.support);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> delegateTicket(String ticketId, String? staffId) async {
    try {
      await ApiClient.patch('/support/admin/tickets/$ticketId/delegate', data: {
        'staffId': staffId,
      });
      await refreshModule(AdminModule.support);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  // ─── POLLS & ROADMAP ACTIONS ──────────────────────────────────────────────
  Future<String?> createOfficialPoll({
    required String title,
    required String description,
    required String category,
    required List<String> options,
    String? suggestedBy,
    String? suggestedByName,
  }) async {
    if (title.trim().isEmpty || options.length < 2) {
      return 'Provide a poll title and at least 2 options.';
    }
    try {
      await ApiClient.post('/polls/admin/create-poll', data: {
        'title': title.trim(),
        'description': description.trim(),
        'category': category,
        'options': options,
        if (suggestedBy != null && suggestedBy.isNotEmpty)
          'suggestedBy': suggestedBy,
        if (suggestedByName != null && suggestedByName.isNotEmpty)
          'suggestedByName': suggestedByName,
      });
      await refreshModule(AdminModule.polls);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> updatePollStatus(String pollId, String status) async {
    try {
      await ApiClient.patch('/polls/admin/$pollId/status', data: {
        'status': status,
      });
      await refreshModule(AdminModule.polls);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  // ─── REVIEW & DISPUTE ACTIONS ─────────────────────────────────────────────
  Future<String?> approveReview(String taskId, {String? note}) async {
    try {
      await ApiClient.post('/review/$taskId/approve', data: {'note': note});
      await refreshModule(AdminModule.review);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> rejectReview(String taskId, {String? note}) async {
    try {
      await ApiClient.post('/review/$taskId/reject', data: {'note': note});
      await refreshModule(AdminModule.review);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> correctReview(
    String taskId, {
    required String correctedValue,
    String? note,
  }) async {
    if (correctedValue.trim().isEmpty) return 'Enter the corrected score value.';
    try {
      await ApiClient.post('/review/$taskId/correct', data: {
        'correctedValue': correctedValue.trim(),
        'note': note,
      });
      await refreshModule(AdminModule.review);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  // ─── GAME PROFILES & CALIBRATION ACTIONS ──────────────────────────────────
  Future<String?> approveGameProfile(String profileId) async {
    try {
      await ApiClient.post('/games/$profileId/approve');
      await refreshModule(AdminModule.profiles);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> calibrateGameProfile(
    String profileId, {
    required double x,
    required double y,
    required double width,
    required double height,
  }) async {
    try {
      await ApiClient.post('/games/$profileId/calibrate', data: {
        'roi': {'x': x, 'y': y, 'width': width, 'height': height},
      });
      await refreshModule(AdminModule.profiles);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  // ─── USERS, KYC & ROLE MANAGEMENT ACTIONS ─────────────────────────────────
  Future<String?> updateUserRole(String userId, String role) async {
    try {
      await ApiClient.post('/admin/users/$userId/role', data: {'role': role});
      await refreshModule(AdminModule.users);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> updateUserKyc(String userId, String status) async {
    try {
      await ApiClient.post('/admin/users/$userId/kyc', data: {'status': status});
      await refreshModule(AdminModule.users);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> banUser(String userId, String reason) async {
    try {
      await ApiClient.post('/admin/users/$userId/ban', data: {
        'reason': reason.trim().isEmpty ? 'Policy violation' : reason.trim(),
      });
      await refreshModule(AdminModule.users);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> unbanUser(String userId) async {
    try {
      await ApiClient.post('/admin/users/$userId/unban');
      await refreshModule(AdminModule.users);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  // ─── SEASONS & SPONSORS & MAIL ACTIONS ────────────────────────────────────
  Future<String?> createSeason({
    required String name,
    required DateTime startsAt,
    required DateTime endsAt,
  }) async {
    if (name.trim().isEmpty) return 'Enter a season title.';
    try {
      await ApiClient.post('/seasons', data: {
        'name': name.trim(),
        'startsAt': startsAt.toUtc().toIso8601String(),
        'endsAt': endsAt.toUtc().toIso8601String(),
      });
      await refreshModule(AdminModule.seasons);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> createSponsor({
    required String name,
    String? websiteUrl,
    required double fundedAmount,
  }) async {
    if (name.trim().isEmpty) return 'Enter a sponsor name.';
    try {
      await ApiClient.post('/admin/sponsors', data: {
        'name': name.trim(),
        if (websiteUrl != null && websiteUrl.trim().isNotEmpty)
          'websiteUrl': websiteUrl.trim(),
        'fundedAmount': fundedAmount,
      });
      await refreshModule(AdminModule.sponsors);
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> sendTestEmail(String to) async {
    if (!to.contains('@')) return 'Enter a valid email address.';
    try {
      await ApiClient.post('/mail/test', data: {'to': to.trim()});
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }
}

final adminConsoleProvider =
    StateNotifierProvider<AdminConsoleNotifier, AdminConsoleState>((ref) {
  return AdminConsoleNotifier(ref);
});
