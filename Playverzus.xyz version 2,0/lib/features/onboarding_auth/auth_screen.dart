import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/countries.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/brand_logo.dart';
import '../../design_system/widgets/country_flag.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../admin/admin_models.dart';

/// Exact v1.0 Login & Sign Up form parity:
/// - Sign In: Email Address or Username + Password (Admin/Staff roles are detected
///   exclusively from the database profile upon authentication — never exposed in UI).
/// - Sign Up: Gamer Tag / Username, Full Legal Name, Email Address, Password,
///   Country / Nationality, Date of Birth, Mobile Number (2FA), Age & Terms checkbox.
class AuthScreen extends ConsumerStatefulWidget {
  final bool isSignUp;
  final bool initialDeveloper;
  const AuthScreen({
    super.key,
    this.isSignUp = false,
    this.initialDeveloper = false,
  });

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _identifierCtrl = TextEditingController();
  final _usernameCtrl = TextEditingController();
  final _fullNameCtrl = TextEditingController();
  final _studioNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _dobCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _referralCodeCtrl = TextEditingController();

  late bool _registerAsDeveloper;
  String _countryCode = '';
  bool _ageConfirmed = false;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _registerAsDeveloper = widget.initialDeveloper;
    final refFromUrl = Uri.base.queryParameters['ref'] ?? '';
    if (refFromUrl.trim().isNotEmpty) {
      _referralCodeCtrl.text = refFromUrl.trim().toUpperCase();
    }
  }

  @override
  void dispose() {
    _identifierCtrl.dispose();
    _usernameCtrl.dispose();
    _fullNameCtrl.dispose();
    _studioNameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _dobCtrl.dispose();
    _phoneCtrl.dispose();
    _referralCodeCtrl.dispose();
    super.dispose();
  }

  String _countryLabel(String code) {
    if (code.isEmpty) return 'Select your country...';
    final c = findCountryByCode(code);
    return c != null ? '${c.name} (${c.code})' : code;
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
            final filtered = searchOfficialCountries(
              query,
              region: selectedRegion,
            );

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

  Future<void> _pickDateOfBirth() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 20, 1, 1),
      firstDate: DateTime(1940),
      lastDate: DateTime(now.year - 13, now.month, now.day),
    );
    if (picked != null && mounted) {
      final y = picked.year.toString().padLeft(4, '0');
      final m = picked.month.toString().padLeft(2, '0');
      final d = picked.day.toString().padLeft(2, '0');
      setState(() => _dobCtrl.text = '$y-$m-$d');
    }
  }

  Future<void> _submit() async {
    setState(() => _error = null);

    if (widget.isSignUp) {
      if (_registerAsDeveloper && _studioNameCtrl.text.trim().length < 2) {
        setState(() => _error =
            'Enter your Studio or Developer Name (at least 2 characters).');
        return;
      }
      if (_countryCode.isEmpty) {
        setState(() => _error =
            'Please select your country / nationality for tournament eligibility.');
        return;
      }
      if (!_ageConfirmed) {
        setState(() => _error =
            'You must confirm your age and agree to the Terms of Service & Privacy Policy.');
        return;
      }
    }

    setState(() => _loading = true);

    final notifier = ref.read(playerSessionProvider.notifier);
    final String? err = widget.isSignUp
        ? await notifier.registerWithBackend(
            email: _emailCtrl.text,
            password: _passwordCtrl.text,
            username: _usernameCtrl.text,
            fullName: _fullNameCtrl.text,
            dateOfBirth: _dobCtrl.text,
            phone: _phoneCtrl.text,
            countryCode: _countryCode,
            asDeveloper: _registerAsDeveloper,
            studioName: _registerAsDeveloper ? _studioNameCtrl.text : null,
            referralCode: _referralCodeCtrl.text,
          )
        : await notifier.signInWithBackend(
            _identifierCtrl.text,
            _passwordCtrl.text,
          );

    if (!mounted) return;
    setState(() => _loading = false);

    if (err != null) {
      setState(() => _error = err);
      return;
    }

    final session = ref.read(playerSessionProvider);
    if (session.isAdmin) {
      context.go(defaultAdminRouteForRole(session.role));
    } else if (session.isDeveloper) {
      context.go('/developer');
    } else {
      context.go('/dashboard');
    }
  }

  Widget _fieldLabel(String label, {bool requiredField = false, String? hint}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: RichText(
        text: TextSpan(
          text: label,
          style: HigTypography.footnote(color: HigColors.labelPrimary)
              .copyWith(fontWeight: FontWeight.w600),
          children: [
            if (requiredField)
              const TextSpan(
                text: ' *',
                style: TextStyle(color: HigColors.brandBright),
              ),
            if (hint != null)
              TextSpan(
                text: ' $hint',
                style: HigTypography.caption(),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HigColors.canvas,
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 460),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Top Return Link
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          CupertinoButton(
                            padding: EdgeInsets.zero,
                            onPressed: () => context.go('/'),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  CupertinoIcons.chevron_left,
                                  size: 14,
                                  color: HigColors.labelSecondary,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Back',
                                  style: HigTypography.footnote(
                                      color: HigColors.labelSecondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      GlassCard(
                        radius: 18,
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Center(
                              child: GestureDetector(
                                onTap: () => context.go('/'),
                                child: const BrandLogo.full(height: 30),
                              ),
                            ),
                            const SizedBox(height: 18),
                            Text(
                              widget.isSignUp
                                  ? (_registerAsDeveloper
                                      ? 'Create Developer Account'
                                      : 'Create Account')
                                  : 'Sign In',
                              textAlign: TextAlign.center,
                              style: HigTypography.title2(),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              widget.isSignUp
                                  ? (_registerAsDeveloper
                                      ? 'Connect your platform Stats APIs (PC, Console, Mobile, Web) and launch your games on Playverzus.'
                                      : '10,000 free practice points credited upon signup.')
                                  : 'Access your wallet, matches, tournaments, or developer studio.',
                              textAlign: TextAlign.center,
                              style: HigTypography.caption(),
                            ),
                            const SizedBox(height: 16),

                            if (widget.isSignUp) ...[
                              HigSegmentedControl<bool>(
                                backgroundColor: HigColors.surfaceGrouped,
                                groupValue: _registerAsDeveloper,
                                onChanged: (v) =>
                                    setState(() => _registerAsDeveloper = v),
                                segments: const {
                                  false: 'Player Account',
                                  true: 'Game Developer',
                                },
                              ),
                              const SizedBox(height: 16),
                            ],

                            if (_error != null) ...[
                              HigErrorBanner(message: _error!),
                              const SizedBox(height: 14),
                            ],

                            if (!widget.isSignUp) ...[
                              // ── SIGN IN FORM (Exact v1.0 fields) ──
                              _fieldLabel('Email Address or Username',
                                  requiredField: true),
                              HigTextField(
                                controller: _identifierCtrl,
                                placeholder: 'Email or username',
                                prefixIcon: CupertinoIcons.person,
                                keyboardType: TextInputType.emailAddress,
                              ),
                              const SizedBox(height: 14),
                              _fieldLabel('Password', requiredField: true),
                              HigTextField(
                                controller: _passwordCtrl,
                                placeholder: '••••••••',
                                prefixIcon: CupertinoIcons.lock,
                                obscureText: true,
                              ),
                            ] else ...[
                              // ── SIGN UP FORM (Player & Game Developer) ──
                              if (_registerAsDeveloper) ...[
                                _fieldLabel(
                                  'Studio / Game Developer Name',
                                  requiredField: true,
                                ),
                                HigTextField(
                                  controller: _studioNameCtrl,
                                  placeholder: 'e.g. Neon Pixel Studios',
                                  prefixIcon: CupertinoIcons.gear_solid,
                                ),
                                const SizedBox(height: 12),
                              ],

                              _fieldLabel('Gamer Tag / Username',
                                  requiredField: true),
                              HigTextField(
                                controller: _usernameCtrl,
                                placeholder: 'e.g. s1mple, ace_sniper',
                                prefixIcon: CupertinoIcons.person,
                              ),
                              const SizedBox(height: 12),

                              _fieldLabel(
                                'Full Legal Name',
                                hint: '(for Cash Payouts)',
                              ),
                              HigTextField(
                                controller: _fullNameCtrl,
                                placeholder: 'e.g. Alexander Vance',
                                prefixIcon: CupertinoIcons.doc_person,
                              ),
                              const SizedBox(height: 12),

                              _fieldLabel('Email Address', requiredField: true),
                              HigTextField(
                                controller: _emailCtrl,
                                placeholder: 'you@example.com',
                                prefixIcon: CupertinoIcons.mail,
                                keyboardType: TextInputType.emailAddress,
                              ),
                              const SizedBox(height: 12),

                              _fieldLabel('Password', requiredField: true),
                              HigTextField(
                                controller: _passwordCtrl,
                                placeholder: 'Minimum 6 characters',
                                prefixIcon: CupertinoIcons.lock,
                                obscureText: true,
                              ),
                              const SizedBox(height: 12),

                              _fieldLabel(
                                'Country / Nationality',
                                requiredField: true,
                                hint: '(for Regional & National Ladders)',
                              ),
                              GestureDetector(
                                onTap: _pickCountry,
                                child: Container(
                                  height: HigSpacing.inputHeight,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14),
                                  decoration: BoxDecoration(
                                    color: HigColors.surfaceGrouped,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                        color: HigColors.glassBorder,
                                        width: 0.75),
                                  ),
                                  child: Row(
                                    children: [
                                      if (_countryCode.isNotEmpty)
                                        CountryFlag(
                                          code: _countryCode,
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
                                          _countryLabel(_countryCode),
                                          style: HigTypography.body(
                                            color: _countryCode.isEmpty
                                                ? HigColors.labelTertiary
                                                : HigColors.labelPrimary,
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

                              LayoutBuilder(
                                builder: (context, constraints) {
                                  final dobField = Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      _fieldLabel('Date of Birth',
                                          hint: '(18+ Cash)'),
                                      GestureDetector(
                                        onTap: _pickDateOfBirth,
                                        child: AbsorbPointer(
                                          child: HigTextField(
                                            controller: _dobCtrl,
                                            placeholder: 'YYYY-MM-DD',
                                            prefixIcon: CupertinoIcons.calendar,
                                          ),
                                        ),
                                      ),
                                    ],
                                  );
                                  final phoneField = Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      _fieldLabel('Mobile Number',
                                          hint: '(for 2FA)'),
                                      HigTextField(
                                        controller: _phoneCtrl,
                                        placeholder: '+254 712 345 678',
                                        prefixIcon: CupertinoIcons.phone,
                                        keyboardType: TextInputType.phone,
                                      ),
                                    ],
                                  );
                                  if (constraints.maxWidth >= 380) {
                                    return Row(
                                      children: [
                                        Expanded(child: dobField),
                                        const SizedBox(width: 10),
                                        Expanded(child: phoneField),
                                      ],
                                    );
                                  }
                                  return Column(
                                    children: [
                                      dobField,
                                      const SizedBox(height: 12),
                                      phoneField,
                                    ],
                                  );
                                },
                              ),
                              const SizedBox(height: 12),

                              _fieldLabel(
                                'Agent / Referral Code',
                                hint: '(Optional · e.g. PVZ-KE-KEVIN)',
                              ),
                              HigTextField(
                                controller: _referralCodeCtrl,
                                placeholder: 'Enter Field Agent referral code if invited',
                                prefixIcon: CupertinoIcons.tag,
                              ),
                              const SizedBox(height: 14),

                              // Age & Terms Checkbox
                              GestureDetector(
                                onTap: () => setState(
                                    () => _ageConfirmed = !_ageConfirmed),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      width: 20,
                                      height: 20,
                                      margin: const EdgeInsets.only(top: 2),
                                      decoration: BoxDecoration(
                                        color: _ageConfirmed
                                            ? HigColors.brand
                                            : HigColors.surfaceGrouped,
                                        borderRadius: BorderRadius.circular(5),
                                        border: Border.all(
                                          color: _ageConfirmed
                                              ? HigColors.brand
                                              : HigColors.separator,
                                        ),
                                      ),
                                      child: _ageConfirmed
                                          ? const Icon(
                                              CupertinoIcons.checkmark_alt,
                                              size: 14,
                                              color: Colors.white,
                                            )
                                          : null,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Wrap(
                                        children: [
                                          Text(
                                            'I confirm I am at least 13 years old (18+ for cash competitions) and agree to the ',
                                            style: HigTypography.caption(),
                                          ),
                                          GestureDetector(
                                            onTap: () => context.go('/terms'),
                                            child: Text(
                                              'Terms of Service',
                                              style: HigTypography.caption(
                                                  color: HigColors.brandBright),
                                            ),
                                          ),
                                          Text(' & ',
                                              style: HigTypography.caption()),
                                          GestureDetector(
                                            onTap: () => context.go('/privacy'),
                                            child: Text(
                                              'Privacy Policy',
                                              style: HigTypography.caption(
                                                  color: HigColors.brandBright),
                                            ),
                                          ),
                                          Text('.',
                                              style: HigTypography.caption()),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],

                            const SizedBox(height: 20),

                            HigButton(
                              label: widget.isSignUp
                                  ? (_registerAsDeveloper
                                      ? 'Create Developer Account'
                                      : 'Create Account & Play')
                                  : 'Sign In',
                              size: HigButtonSize.large,
                              fullWidth: true,
                              loading: _loading,
                              onPressed: _submit,
                            ),

                            const SizedBox(height: 16),
                            const Divider(height: 1),
                            const SizedBox(height: 14),
                            Center(
                              child: CupertinoButton(
                                padding: EdgeInsets.zero,
                                onPressed: () => context.go(
                                  widget.isSignUp ? '/login' : '/signup',
                                ),
                                child: Text(
                                  widget.isSignUp
                                      ? 'Already have an account? Sign In'
                                      : 'Don\'t have an account? Create one',
                                  style: HigTypography.footnote(
                                    color: HigColors.brandBright,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const FrostedToastOverlay(),
          ],
        ),
      ),
    );
  }
}
