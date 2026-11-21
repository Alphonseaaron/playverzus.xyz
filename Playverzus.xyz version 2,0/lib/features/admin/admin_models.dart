import 'package:flutter/cupertino.dart';

/// All 10 official Playverzus Staff Operations Desks (1:1 parity with v1.0 `/admin/*`).
enum AdminModule {
  overview,
  security,
  treasury,
  support,
  polls,
  review,
  profiles,
  users,
  seasons,
  sponsors,
}

class AdminModuleMeta {
  final AdminModule module;
  final String route;
  final String label;
  final String shortLabel;
  final String description;
  final IconData icon;

  const AdminModuleMeta({
    required this.module,
    required this.route,
    required this.label,
    required this.shortLabel,
    required this.description,
    required this.icon,
  });
}

const List<AdminModuleMeta> allAdminModules = [
  AdminModuleMeta(
    module: AdminModule.overview,
    route: '/admin',
    label: 'Overview',
    shortLabel: 'Overview',
    description: 'Platform KPIs, quick desk navigation, and mail diagnostics.',
    icon: CupertinoIcons.chart_bar_square,
  ),
  AdminModuleMeta(
    module: AdminModule.security,
    route: '/admin/security',
    label: 'Security & Anti-Cheat',
    shortLabel: 'Security',
    description: 'Threat level, settlement halt, match freeze/void, locks, and events.',
    icon: CupertinoIcons.shield_lefthalf_fill,
  ),
  AdminModuleMeta(
    module: AdminModule.treasury,
    route: '/admin/treasury',
    label: 'Treasury & Gateway',
    shortLabel: 'Treasury',
    description: 'M-PESA / Crossmint rail switch, reserves, income books, and withdrawals.',
    icon: CupertinoIcons.creditcard,
  ),
  AdminModuleMeta(
    module: AdminModule.support,
    route: '/admin/support',
    label: 'Support Desk',
    shortLabel: 'Support',
    description: 'Player tickets, internal staff notes, status triage, and staff delegation.',
    icon: CupertinoIcons.headphones,
  ),
  AdminModuleMeta(
    module: AdminModule.polls,
    route: '/admin/polls',
    label: 'Polls & Roadmap',
    shortLabel: 'Polls',
    description: 'Review player suggestions, publish community polls, and update roadmap status.',
    icon: CupertinoIcons.checkmark_rectangle,
  ),
  AdminModuleMeta(
    module: AdminModule.review,
    route: '/admin/review',
    label: 'Review Queue',
    shortLabel: 'Reviews',
    description: 'Approve, reject, or correct contested match scores and OCR proofs.',
    icon: CupertinoIcons.exclamationmark_triangle,
  ),
  AdminModuleMeta(
    module: AdminModule.profiles,
    route: '/admin/profiles',
    label: 'Game Profiles',
    shortLabel: 'Profiles',
    description: 'Approve submitted games, calibrate HUD ROI regions, and launch calibrator.',
    icon: CupertinoIcons.game_controller,
  ),
  AdminModuleMeta(
    module: AdminModule.users,
    route: '/admin/users',
    label: 'Users & Staff',
    shortLabel: 'Users',
    description: 'Search members, assign all 9 staff roles, verify KYC, and ban/unban accounts.',
    icon: CupertinoIcons.person_3,
  ),
  AdminModuleMeta(
    module: AdminModule.seasons,
    route: '/admin/seasons',
    label: 'Seasons',
    shortLabel: 'Seasons',
    description: 'Configure competitive season windows and leaderboard cycles.',
    icon: CupertinoIcons.rosette,
  ),
  AdminModuleMeta(
    module: AdminModule.sponsors,
    route: '/admin/sponsors',
    label: 'Sponsors',
    shortLabel: 'Sponsors',
    description: 'Register commercial brand sponsors and track prize pool funding.',
    icon: CupertinoIcons.star,
  ),
];

const List<String> allPlayverzusRoles = [
  'PLAYER',
  'SUPPORT',
  'REVIEWER',
  'TOURNAMENT_ADMIN',
  'FINANCE_AUDITOR',
  'COMMUNITY_MANAGER',
  'SECURITY_ENGINEER',
  'ADMIN',
  'SUPER_ADMIN',
];

/// Exact per-role operational scope matching apps/web/src/app/admin/layout.tsx.
List<AdminModuleMeta> allowedAdminModulesForRole(String rawRole) {
  final role = rawRole.toUpperCase();
  final Set<AdminModule> allowed = switch (role) {
    'SUPER_ADMIN' || 'ADMIN' => AdminModule.values.toSet(),
    'SECURITY_ENGINEER' => {AdminModule.security, AdminModule.review},
    'REVIEWER' => {AdminModule.review},
    'SUPPORT' => {AdminModule.support, AdminModule.polls},
    'TOURNAMENT_ADMIN' => {AdminModule.seasons, AdminModule.profiles},
    'FINANCE_AUDITOR' => {AdminModule.treasury},
    'COMMUNITY_MANAGER' => {AdminModule.polls, AdminModule.sponsors},
    _ => <AdminModule>{},
  };
  return allAdminModules.where((m) => allowed.contains(m.module)).toList();
}

AdminModule adminModuleFromPath(String path) {
  for (final m in allAdminModules) {
    if (m.route != '/admin' && path.startsWith(m.route)) {
      return m.module;
    }
  }
  return AdminModule.overview;
}

String defaultAdminRouteForRole(String rawRole) {
  final allowed = allowedAdminModulesForRole(rawRole);
  if (allowed.isEmpty) return '/dashboard';
  return allowed.first.route;
}

bool canRoleAccessAdminPath(String rawRole, String path) {
  final role = rawRole.toUpperCase();
  if (path == '/games/new') {
    return const ['ADMIN', 'SUPER_ADMIN', 'TOURNAMENT_ADMIN'].contains(role);
  }
  if (path == '/settings' ||
      path == '/privacy' ||
      path == '/terms' ||
      path == '/responsible-gaming' ||
      path == '/download') {
    return true;
  }
  final allowed = allowedAdminModulesForRole(role);
  if (allowed.isEmpty) return false;
  final target = adminModuleFromPath(path);
  return allowed.any((m) => m.module == target);
}
