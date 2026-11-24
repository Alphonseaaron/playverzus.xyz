import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/countries.dart';
import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../core/storage/app_update_provider.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/country_flag.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../games/installed_games_sheet.dart';
import '../matchroom/pre_match_permissions_sheet.dart';

/// Complete v1.0 Account Settings + v2.0 Device Binding & Console Sync (`/settings`).
/// Hydrates real identity & KYC status from `GET /profile/me` and persists via `PATCH /profile/me`.
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late TextEditingController _displayNameCtrl;
  late TextEditingController _fullNameCtrl;
  late TextEditingController _dobCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _streamCtrl;
  late TextEditingController _studioNameCtrl;

  String _countryCode = '';
  String _kycStatus = 'NONE';
  String _streamPlatform = 'TWITCH';
  bool _soundAlerts = true;
  bool _hapticFeedback = true;
  bool _loadingProfile = false;
  bool _savingProfile = false;
  bool _activatingDev = false;
  String? _profileError;
  String? _displayNameErr;
  String? _studioNameErr;

  @override
  void initState() {
    super.initState();
    final session = ref.read(playerSessionProvider);
    final machine = ref.read(machineAuthProvider);
    _displayNameCtrl = TextEditingController(text: session.username);
    _fullNameCtrl = TextEditingController();
    _dobCtrl = TextEditingController();
    _addressCtrl = TextEditingController();
    _phoneCtrl = TextEditingController();
    _studioNameCtrl = TextEditingController(text: session.studioName);
    _countryCode = session.countryCode;
    _streamPlatform = machine.consoleStreamPlatform;
    _streamCtrl = TextEditingController(text: machine.consoleStreamChannel);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadMyProfile());
  }

  @override
  void dispose() {
    _displayNameCtrl.dispose();
    _fullNameCtrl.dispose();
    _dobCtrl.dispose();
    _addressCtrl.dispose();
    _phoneCtrl.dispose();
    _streamCtrl.dispose();
    _studioNameCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMyProfile() async {
    final session = ref.read(playerSessionProvider);
    if (session.accessToken == null || session.accessToken!.isEmpty) return;
    setState(() {
      _loadingProfile = true;
      _profileError = null;
    });
    try {
      final res = await ApiClient.get('/profile/me');
      if (res is Map<String, dynamic> && mounted) {
        _displayNameCtrl.text =
            (res['display_name'] ?? res['username'] ?? session.username)
                .toString();
        _fullNameCtrl.text = (res['full_name'] ?? '').toString();
        final rawDob = (res['date_of_birth'] ?? '').toString();
        _dobCtrl.text = rawDob.length >= 10 ? rawDob.substring(0, 10) : rawDob;
        _addressCtrl.text = (res['address'] ?? '').toString();
        _phoneCtrl.text = (res['phone'] ?? '').toString();
        final cc = (res['country_code'] ?? res['region'] ?? '').toString();
        if (cc.isNotEmpty) _countryCode = cc;
        _kycStatus = (res['kyc_status'] ?? 'NONE').toString().toUpperCase();
      }
    } on ApiException catch (e) {
      _profileError = e.message;
    } catch (_) {}
    if (mounted) setState(() => _loadingProfile = false);
  }

  Future<void> _saveProfile() async {
    final session = ref.read(playerSessionProvider);
    if (_displayNameCtrl.text.trim().length < 3) {
      setState(() {
        _displayNameErr = 'Enter a display gamer tag with at least 3 characters.';
        _profileError = 'Please check the highlighted gamer tag field below.';
      });
      return;
    }
    setState(() {
      _savingProfile = true;
      _profileError = null;
      _displayNameErr = null;
    });
    try {
      if (session.accessToken != null && session.accessToken!.isNotEmpty) {
        await ApiClient.patch('/profile/me', data: {
          'displayName': _displayNameCtrl.text.trim(),
          'fullName': _fullNameCtrl.text.trim(),
          if (_dobCtrl.text.trim().isNotEmpty)
            'dateOfBirth': _dobCtrl.text.trim(),
          'address': _addressCtrl.text.trim(),
          if (_countryCode.isNotEmpty) 'region': _countryCode,
          if (_countryCode.isNotEmpty) 'country_code': _countryCode,
          'phone': _phoneCtrl.text.trim(),
        });
      }
      await ref.read(playerSessionProvider.notifier).refreshFromBackend();
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            'Profile settings updated',
            tone: ToastTone.success,
          );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _profileError = e.message);
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _pickCountry() async {
    String query = '';
    String selectedRegion = 'All';
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: HigColors.surfacePrimary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final filtered =
                searchOfficialCountries(query, region: selectedRegion);
            return SafeArea(
              child: SizedBox(
                height: 500,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Select Country / Nationality',
                          style: HigTypography.title3()),
                      const SizedBox(height: 12),
                      HigTextField(
                        placeholder: 'Search country by name or code...',
                        prefixIcon: CupertinoIcons.search,
                        onChanged: (v) => setSheetState(() => query = v),
                      ),
                      const SizedBox(height: 10),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: ['All', ...globalRegions].map((reg) {
                            final active = selectedRegion == reg;
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: GestureDetector(
                                onTap: () =>
                                    setSheetState(() => selectedRegion = reg),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: active
                                        ? HigColors.brand
                                        : HigColors.surfaceGrouped,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    reg,
                                    style: HigTypography.caption(
                                      color: active
                                          ? Colors.white
                                          : HigColors.labelSecondary,
                                    ).copyWith(fontWeight: FontWeight.w600),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Expanded(
                        child: ListView.separated(
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (_, i) {
                            final c = filtered[i];
                            final selected = c.code == _countryCode;
                            return ListTile(
                              leading: CountryFlag(
                                code: c.code,
                                width: 24,
                                height: 16,
                              ),
                              title: Text(c.name,
                                  style: HigTypography.headline()
                                      .copyWith(fontSize: 14)),
                              subtitle: Text(c.region,
                                  style: HigTypography.caption()),
                              trailing: selected
                                  ? const Icon(CupertinoIcons.checkmark_alt,
                                      color: HigColors.brand)
                                  : Text(c.code,
                                      style: HigTypography.mono(size: 12)),
                              onTap: () {
                                setState(() => _countryCode = c.code);
                                Navigator.of(ctx).pop();
                              },
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildKycBadge() {
    return switch (_kycStatus) {
      'VERIFIED' => const HigBadge(
          label: 'KYC VERIFIED',
          tone: HigBadgeTone.emerald,
          icon: CupertinoIcons.checkmark_shield_fill,
        ),
      'PENDING' => const HigBadge(
          label: 'KYC PENDING',
          tone: HigBadgeTone.copper,
          icon: CupertinoIcons.clock_fill,
        ),
      'REJECTED' => const HigBadge(
          label: 'KYC REJECTED',
          tone: HigBadgeTone.crimson,
          icon: CupertinoIcons.exclamationmark_shield_fill,
        ),
      _ => const HigBadge(
          label: 'KYC UNVERIFIED',
          tone: HigBadgeTone.neutral,
          icon: CupertinoIcons.shield,
        ),
    };
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(playerSessionProvider);
    final machine = ref.watch(machineAuthProvider);
    final selectedCountry = findCountryByCode(_countryCode);

    return RefreshIndicator(
      onRefresh: _loadMyProfile,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            maxWidth: 840,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_profileError != null) ...[
                  HigErrorBanner(
                    message: _profileError!,
                    onRetry: _loadMyProfile,
                  ),
                  const SizedBox(height: 14),
                ],

                // 1. Account, Identity & Real Database KYC Status
                GlassCard(
                  radius: 20,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 10,
                        runSpacing: 8,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Account & Profile Settings',
                                  style: HigTypography.title2()),
                              const SizedBox(height: 2),
                              Text(
                                '@${session.username} · ${session.email}',
                                style: HigTypography.caption(),
                              ),
                            ],
                          ),
                          _buildKycBadge(),
                        ],
                      ),
                      if (_loadingProfile) ...[
                        const SizedBox(height: 14),
                        const HigLoadingCard(
                            message: 'Loading your account details...'),
                      ] else ...[
                        const SizedBox(height: 16),
                        Text('Display Gamer Tag', style: HigTypography.caption()),
                        const SizedBox(height: 6),
                        HigTextField(
                          controller: _displayNameCtrl,
                          placeholder: 'Display gamer tag',
                          prefixIcon: CupertinoIcons.at,
                          errorText: _displayNameErr,
                          onChanged: (_) {
                            if (_displayNameErr != null) {
                              setState(() => _displayNameErr = null);
                            }
                          },
                        ),
                        const SizedBox(height: 12),
                        Text('Full Legal Name (for Payouts & KYC)',
                            style: HigTypography.caption()),
                        const SizedBox(height: 6),
                        HigTextField(
                          controller: _fullNameCtrl,
                          placeholder: 'Full legal name',
                          prefixIcon: CupertinoIcons.doc_person,
                        ),
                        const SizedBox(height: 12),
                        Text('Date of Birth (YYYY-MM-DD)',
                            style: HigTypography.caption()),
                        const SizedBox(height: 6),
                        HigTextField(
                          controller: _dobCtrl,
                          placeholder: 'YYYY-MM-DD',
                          prefixIcon: CupertinoIcons.calendar,
                        ),
                        const SizedBox(height: 12),
                        Text('Country / Nationality',
                            style: HigTypography.caption()),
                        const SizedBox(height: 6),
                        GestureDetector(
                          onTap: _pickCountry,
                          child: Container(
                            height: HigSpacing.inputHeight,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            decoration: BoxDecoration(
                              color: HigColors.surfaceGrouped,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: HigColors.glassBorder,
                                width: 0.75,
                              ),
                            ),
                            child: Row(
                              children: [
                                if (selectedCountry != null)
                                  CountryFlag(
                                    code: selectedCountry.code,
                                    width: 22,
                                    height: 15,
                                  )
                                else
                                  const Icon(
                                    CupertinoIcons.globe,
                                    size: 17,
                                    color: HigColors.labelTertiary,
                                  ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    selectedCountry != null
                                        ? '${selectedCountry.name} (${selectedCountry.code})'
                                        : 'Select country / nationality...',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: HigTypography.body(
                                      color: selectedCountry != null
                                          ? HigColors.labelPrimary
                                          : HigColors.labelTertiary,
                                    ),
                                  ),
                                ),
                                const Icon(
                                  CupertinoIcons.chevron_down,
                                  size: 14,
                                  color: HigColors.labelTertiary,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text('Street Address', style: HigTypography.caption()),
                        const SizedBox(height: 6),
                        HigTextField(
                          controller: _addressCtrl,
                          placeholder: 'City, street address',
                          prefixIcon: CupertinoIcons.location,
                        ),
                        const SizedBox(height: 12),
                        Text('M-PESA / Payout Phone Number',
                            style: HigTypography.caption()),
                        const SizedBox(height: 6),
                        HigTextField(
                          controller: _phoneCtrl,
                          placeholder: '+254 7XX XXX XXX',
                          prefixIcon: CupertinoIcons.phone_fill,
                          keyboardType: TextInputType.phone,
                        ),
                        const SizedBox(height: 16),
                        HigButton(
                          label: 'Save Profile Changes',
                          icon: CupertinoIcons.checkmark_alt,
                          fullWidth: true,
                          loading: _savingProfile,
                          onPressed: _saveProfile,
                        ),
                      ],
                    ],
                  ),
                ),

                if (!session.isAdmin) ...[
                  const SizedBox(height: 16),

                  // 2. Device Capture & Console Stream Auto-Sync (Player Only)
                  GlassCard(
                    radius: 20,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Device Fingerprint, Installed Games & Console Sync',
                            style: HigTypography.title3()),
                        const SizedBox(height: 4),
                        Text(
                          'Detected: ${machine.capabilities.osLabel} · ${machine.capabilities.modeTitle}',
                          style: HigTypography.footnote(),
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: HigColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: HigColors.emerald.withValues(alpha: 0.35),
                              width: 0.75,
                            ),
                          ),
                          child: Wrap(
                            alignment: WrapAlignment.spaceBetween,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 10,
                            runSpacing: 8,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Device ID: ${machine.deviceFingerprint}',
                                    style: HigTypography.mono(
                                      size: 12,
                                      color: HigColors.brandBright,
                                    ),
                                  ),
                                  Text(
                                    machine.canAutoScanGames
                                        ? '${machine.featuredInstalledGames.length} / 21 featured games detected on this device'
                                        : '${machine.featuredInstalledGames.length} / 21 featured games confirmed (${machine.capabilities.osLabel})',
                                    style: HigTypography.caption(),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'App Version: v${AppConfig.appVersion} (Build ${AppConfig.appBuildNumber})',
                                    style: HigTypography.caption(),
                                  ),
                                ],
                              ),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  HigButton(
                                    label: 'Check Updates',
                                    icon: CupertinoIcons.arrow_up_circle,
                                    size: HigButtonSize.small,
                                    variant: HigButtonVariant.secondary,
                                    onPressed: () async {
                                      final update = await ref
                                          .read(appUpdateProvider.notifier)
                                          .checkForUpdates(force: true);
                                      if (!context.mounted) return;
                                      if (update.hasPendingUpdate) {
                                        ref.read(toastProvider.notifier).show(
                                              'Update Available · v${update.latestVersion}',
                                              body:
                                                  'Tap Download App in Account Menu or Bell Notifications to install the latest release.',
                                              tone: ToastTone.info,
                                            );
                                      } else {
                                        ref.read(toastProvider.notifier).show(
                                              'Up to date · Playverzus v${AppConfig.appVersion}',
                                              tone: ToastTone.success,
                                            );
                                      }
                                    },
                                  ),
                                  HigButton(
                                    label:
                                        'Setup / Sync Games (${machine.featuredInstalledGames.length})',
                                    icon: CupertinoIcons.game_controller,
                                    size: HigButtonSize.small,
                                    variant: machine.needsGameSetup
                                        ? HigButtonVariant.emerald
                                        : HigButtonVariant.secondary,
                                    onPressed: () =>
                                        showInstalledGamesSetupSheet(context),
                                  ),
                                  if (machine.canAutoScanGames)
                                    HigButton(
                                      label: 'Re-Scan Device',
                                      icon: CupertinoIcons.refresh,
                                      size: HigButtonSize.small,
                                      variant: HigButtonVariant.secondary,
                                      onPressed: () async {
                                        final count = await ref
                                            .read(machineAuthProvider.notifier)
                                            .rescanInstalledGames();
                                        if (!context.mounted) return;
                                        ref.read(toastProvider.notifier).show(
                                              '$count featured games verified on this device',
                                              tone: ToastTone.success,
                                            );
                                      },
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                        HigSegmentedControl<String>(
                          backgroundColor: HigColors.surfaceGrouped,
                          groupValue: _streamPlatform,
                          onChanged: (v) => setState(() => _streamPlatform = v),
                          segments: const {
                            'TWITCH': 'Twitch (PS5 / Xbox)',
                            'YOUTUBE': 'YouTube Gaming',
                          },
                        ),
                        const SizedBox(height: 12),
                        HigTextField(
                          controller: _streamCtrl,
                          placeholder: '$_streamPlatform channel name',
                          prefixIcon: CupertinoIcons.tv_fill,
                        ),
                        const SizedBox(height: 12),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final saveBtn = HigButton(
                              label: 'Save Channel',
                              variant: HigButtonVariant.secondary,
                              fullWidth: true,
                              onPressed: () async {
                                await ref
                                    .read(machineAuthProvider.notifier)
                                    .setConsoleStream(
                                        _streamPlatform, _streamCtrl.text);
                                ref.read(toastProvider.notifier).show(
                                      'Console Stream Linked',
                                      body:
                                          'Auto-sync armed for $_streamPlatform.',
                                      tone: ToastTone.success,
                                    );
                              },
                            );
                            final authBtn = HigButton(
                              label: machine.isFullyReady
                                  ? 'Device Bound'
                                  : 'Bind Device',
                              variant: machine.isFullyReady
                                  ? HigButtonVariant.emerald
                                  : HigButtonVariant.primary,
                              fullWidth: true,
                              onPressed: () async {
                                final ok = await PreMatchPermissionsDialog
                                    .ensureAuthorized(
                                  context,
                                  ref,
                                  gameName: 'Playverzus Arena',
                                );
                                if (!ok || !mounted) return;
                                ref.read(toastProvider.notifier).show(
                                      'Device Bound',
                                      body:
                                          'Match alerts & fair-play protection verified.',
                                      tone: ToastTone.success,
                                    );
                              },
                            );
                            if (constraints.maxWidth < 400) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  saveBtn,
                                  const SizedBox(height: 10),
                                  authBtn,
                                ],
                              );
                            }
                            return Row(
                              children: [
                                Expanded(child: saveBtn),
                                const SizedBox(width: 10),
                                Expanded(child: authBtn),
                              ],
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ],

                // 2b. Game Developer Portal Card (Non-Admin users)
                if (!session.isAdmin) ...[
                  const SizedBox(height: 16),
                  GlassCard(
                    radius: 20,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            const HigBadge(
                              label: 'GAME DEVELOPER PORTAL',
                              tone: HigBadgeTone.copper,
                            ),
                            if (session.isDeveloper)
                              const HigBadge(
                                label: 'ACTIVE',
                                tone: HigBadgeTone.emerald,
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          session.isDeveloper
                              ? (session.studioName.isNotEmpty
                                  ? session.studioName
                                  : 'Developer Studio Active')
                              : 'Publish Your Games via Stats APIs',
                          style: HigTypography.title3(),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          session.isDeveloper
                              ? 'Manage your platform-specific Stats APIs (PC, Console, Mobile, Web) and test live fetches in Developer Studio.'
                              : 'Building a game? Enable Game Developer Studio on your account to add your titles by connecting your platform Stats APIs.',
                          style: HigTypography.caption(),
                        ),
                        const SizedBox(height: 14),
                        if (session.isDeveloper)
                          HigButton(
                            label: 'Open Developer Studio',
                            icon: CupertinoIcons.gear_solid,
                            onPressed: () => context.go('/developer'),
                          )
                        else ...[
                          HigTextField(
                            controller: _studioNameCtrl,
                            placeholder: 'Enter your Studio / Developer Name',
                            prefixIcon: CupertinoIcons.gear_solid,
                            errorText: _studioNameErr,
                            onChanged: (_) {
                              if (_studioNameErr != null) {
                                setState(() => _studioNameErr = null);
                              }
                            },
                          ),
                          const SizedBox(height: 10),
                          HigButton(
                            label: 'Enable Game Developer Studio',
                            icon: CupertinoIcons.gear_solid,
                            loading: _activatingDev,
                            onPressed: () async {
                              if (_studioNameCtrl.text.trim().length < 2) {
                                setState(() => _studioNameErr =
                                    'Enter your Studio or Developer Name (at least 2 letters).');
                                return;
                              }
                              setState(() {
                                _studioNameErr = null;
                                _activatingDev = true;
                              });
                              final err = await ref
                                  .read(playerSessionProvider.notifier)
                                  .enableDeveloperPortal(
                                    studioName: _studioNameCtrl.text,
                                  );
                              if (!context.mounted) return;
                              setState(() => _activatingDev = false);
                              if (err != null) {
                                setState(() => _studioNameErr = err);
                                ref.read(toastProvider.notifier).show(
                                      'Could Not Open Developer Studio',
                                      body: err,
                                      tone: ToastTone.error,
                                    );
                              } else {
                                ref.read(toastProvider.notifier).show(
                                      'Developer Studio Enabled',
                                      body:
                                          'You can now add & configure games via platform Stats APIs.',
                                      tone: ToastTone.success,
                                    );
                                context.go('/developer');
                              }
                            },
                          ),
                        ],
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 16),

                // 3. Alerts & Responsible Gaming
                GlassCard(
                  radius: 20,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Preferences', style: HigTypography.title3()),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Live Match Sound Alerts',
                              style: HigTypography.body()),
                          CupertinoSwitch(
                            value: _soundAlerts,
                            activeTrackColor: HigColors.emerald,
                            onChanged: (v) => setState(() => _soundAlerts = v),
                          ),
                        ],
                      ),
                      const Divider(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Tactile Haptics', style: HigTypography.body()),
                          CupertinoSwitch(
                            value: _hapticFeedback,
                            activeTrackColor: HigColors.emerald,
                            onChanged: (v) =>
                                setState(() => _hapticFeedback = v),
                          ),
                        ],
                      ),
                      if (!session.isAdmin) ...[
                        const Divider(height: 20),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: [
                            HigButton(
                              label: 'Responsible Gaming & Limits',
                              icon: CupertinoIcons.shield_lefthalf_fill,
                              variant: HigButtonVariant.secondary,
                              size: HigButtonSize.small,
                              onPressed: () =>
                                  context.push('/responsible-gaming'),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
