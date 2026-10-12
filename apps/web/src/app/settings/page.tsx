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
import { Settings, User, Phone, CheckCircle2, Save, Globe, LogOut } from 'lucide-react';

interface MyProfile {
  id: string;
  username: string;
  display_name?: string;
  region?: string;
  country_code?: string;
  phone?: string;
}

function SettingsContent() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery<MyProfile>({
    queryKey: ['me-settings'],
    queryFn: () => apiClient<MyProfile>('/profile/me'),
  });

  const [displayName, setDisplayName] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
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
        body: JSON.stringify({ displayName, region, country_code: region, phone }),
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

            {/* Country / Nationality */}
            <div className="space-y-2">
              <CountrySelect
                value={region}
                onChange={(c) => setRegion(c.code)}
                label="Country / Nationality (for National & Regional Cups)"
                placeholder="Select your nationality..."
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Mobile Number (for KYC & 2FA Security)
              </label>
              <Input
                type="tel"
                placeholder="+1 555 123 4567 or +44 7911 123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-xs font-mono"
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
