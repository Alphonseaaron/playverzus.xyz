'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { getSupabaseClient } from '../../lib/supabase';
import { CountrySelect } from '../../components/CountrySelect';
import { CountryFlag } from '../../components/CountryFlag';
import { AuthGuard } from '../../components/AuthGuard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
import { Settings, User, Phone, CheckCircle2, Save, Globe, LogOut, ShieldCheck, ShieldAlert, Clock, Shield } from 'lucide-react';

interface MyProfile {
  id: string;
  username: string;
  display_name?: string;
  full_name?: string;
  date_of_birth?: string;
  address?: string;
  region?: string;
  country_code?: string;
  phone?: string;
  kyc_status?: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  kyc_provider_ref?: string;
}

function SettingsContent() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery<MyProfile>({
    queryKey: ['me-settings'],
    queryFn: () => apiClient<MyProfile>('/profile/me'),
  });

  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setFullName(profile.full_name || '');
      setDateOfBirth(profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : '');
      setAddress(profile.address || '');
      setRegion(profile.country_code || profile.region || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient('/profile/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, fullName, dateOfBirth, address, region, country_code: region, phone }),
      });
      await queryClient.invalidateQueries({ queryKey: ['me-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['header-me'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      queryClient.clear();
      window.location.href = '/?view=landing';
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <div className="max-w-xl mx-auto my-8 space-y-6">
      <Card className="bg-card border-border shadow-2xl">
        <CardHeader className="border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-secondary border border-border flex items-center justify-center text-primary shadow-sm flex-shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Badge variant="copper">PREFERENCES</Badge>
                {profile?.username && (
                  <Badge variant="secondary" className="font-mono text-[10px] flex items-center gap-1.5">
                    <CountryFlag
                      code={region || profile.country_code || profile.region}
                      fallbackSeed={profile.username}
                      size="xs"
                    />
                    <span>@{profile.username}</span>
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-black tracking-tight text-foreground">
                Account Settings
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Manage gamer identity, regional ladder nationality, and payment verification.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {saved && (
            <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Profile settings updated successfully.</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Display Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Display Gamer Tag
                </label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. AceGamer"
                  className="text-xs"
                />
              </div>

              {/* Full Legal Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Full Legal Name <span className="text-muted-foreground font-normal">(for Crossmint Payouts)</span>
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alexander Vance"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date of Birth */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Date of Birth <span className="text-muted-foreground font-normal">(18+ for Cash)</span>
                </label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Mobile Number (for 2FA & Security)
                </label>
                <Input
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Country / Nationality */}
            <div className="space-y-2">
              <CountrySelect
                value={region}
                onChange={(c) => setRegion(c.code)}
                label="Country / Nationality (for National & Regional Cups)"
                placeholder="Select your nationality..."
              />
            </div>

            {/* Residential Address */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Residential Street Address & City
              </label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 124 Esports Way, Suite 4B, Austin, TX"
                className="text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              variant="default"
              size="lg"
              className="w-full font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20 gap-2 mt-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Settings'}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Identity & Compliance Verification (KYC) Card */}
      <Card className="bg-card border-border shadow-2xl">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-secondary border border-border flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Identity & Compliance Verification
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Regulatory compliance, age verification (18+ cash / 13+ free), and financial protection.
                </CardDescription>
              </div>
            </div>
            {profile?.kyc_status === 'VERIFIED' ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold gap-1 text-[11px] py-1 px-2.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                VERIFIED
              </Badge>
            ) : profile?.kyc_status === 'PENDING' ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold gap-1 text-[11px] py-1 px-2.5">
                <Clock className="w-3.5 h-3.5" />
                UNDER REVIEW
              </Badge>
            ) : profile?.kyc_status === 'REJECTED' ? (
              <Badge variant="destructive" className="font-bold gap-1 text-[11px] py-1 px-2.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                REJECTED
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-bold gap-1 text-[11px] py-1 px-2.5">
                <Shield className="w-3.5 h-3.5" />
                LEVEL 1 ACTIVE
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="p-3.5 bg-secondary/40 border border-border rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>Account Verification Status</span>
              <span className="font-mono text-primary text-[11px]">
                {profile?.kyc_status === 'VERIFIED'
                  ? 'Full Cash & Crypto Access'
                  : 'Automated Tier 1 (Progressive via Crossmint)'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              All payment transactions are regulated through Crossmint and licensed banking institutions. Progressive identity checks are automatically triggered upon depositing or withdrawing cash.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-card border border-border rounded-xl">
              <div className="font-bold text-foreground text-[11px] mb-1">Tier 1: Casual & Free Play</div>
              <p className="text-[10px] text-muted-foreground leading-normal">
                Requires gamer tag, confirmed country & mobile number. Unlimited free tournaments & ranked ladder play.
              </p>
            </div>
            <div className="p-3 bg-card border border-border rounded-xl">
              <div className="font-bold text-foreground text-[11px] mb-1">Tier 2: Real-Cash & Wagers</div>
              <p className="text-[10px] text-muted-foreground leading-normal">
                Enforced by Crossmint (government photo ID + liveness) for transactions over $1,000 or high-frequency payouts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session & Sign Out Card */}
      <Card className="bg-card border-border shadow-2xl">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-sm font-bold text-foreground">
            Session & Platform Navigation
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Manage your active session or visit the public marketing landing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-foreground">Public Landing Page</div>
              <div className="text-[11px] text-muted-foreground">
                Browse the public platform overview while keeping your session active.
              </div>
            </div>
            <Link href="/?view=landing">
              <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 flex-shrink-0">
                <Globe className="w-3.5 h-3.5" />
                <span>Visit Landing</span>
              </Button>
            </Link>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-foreground">Sign Out of Arena</div>
              <div className="text-[11px] text-muted-foreground">
                Safely end your current session on this device.
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="text-xs font-bold gap-1.5 flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
