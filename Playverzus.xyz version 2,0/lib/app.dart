import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router/app_router.dart';
import 'design_system/theme/hig_theme.dart';

class PlayverzusV2App extends ConsumerWidget {
  const PlayverzusV2App({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'playverzus.xyz',
      debugShowCheckedModeBanner: false,
      theme: PlayverzusTheme.darkTheme,
      darkTheme: PlayverzusTheme.darkTheme,
      themeMode: ThemeMode.dark,
      scrollBehavior: const HigScrollBehavior(),
      routerConfig: router,
    );
  }
}
