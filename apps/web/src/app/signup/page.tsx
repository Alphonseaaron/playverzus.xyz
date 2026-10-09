'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../lib/supabase';
import { CountrySelect } from '../../components/CountrySelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { UserPlus, Gift, AlertCircle, ShieldCheck } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!countryCode) {
      setError('Please select your country / nationality for tournament eligibility.');
      return;
    }

    if (!ageConfirmed) {
      setError('You must confirm your age and agree to the Verzus competitive rules.');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim().toLowerCase(),
            display_name: username.trim(),
            country_code: countryCode,
          },
        },
      });

      if (authError) throw authError;
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 space-y-4">
      <Card className="bg-card border-border shadow-2xl">
        <CardHeader className="text-center pb-4 border-b border-border">
          <Link href="/" className="inline-block mx-auto mb-2">
            <Image
              src="/images/logo.png"
              alt="playverzus.xyz"
              width={180}
              height={40}
              className="h-10 w-auto object-contain mx-auto"
              priority
            />
          </Link>
          <CardTitle className="text-2xl font-black tracking-tight text-foreground">
            Create Arena Account
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            The Global Competitive Esports & Skill-Gaming Arena
          </CardDescription>

          <div className="mt-3 p-2.5 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center gap-2">
            <Gift className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs text-primary font-bold">
              10,000 Free Demo POINTS credited upon signup
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <div className="mb-5 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Gamer Tag / Username <span className="text-primary">*</span>
              </label>
              <Input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. s1mple, ace_sniper"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Email Address <span className="text-primary">*</span>
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Password <span className="text-primary">*</span>
              </label>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="text-xs"
              />
            </div>

            {/* Country & Nationality */}
            <div className="space-y-2">
              <CountrySelect
                value={countryCode}
                onChange={(c) => setCountryCode(c.code)}
                label="Country / Nationality (for Regional & National Ladders)"
                placeholder="Select your country..."
                required
              />
            </div>

            {/* Age & Terms Compliance */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-border bg-secondary text-primary focus:ring-primary h-4 w-4 accent-primary"
                />
                <span>
                  I confirm I am at least <strong className="text-foreground">13 years old</strong> (18+ for cash EUR competitions) and agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-primary hover:underline font-bold">
                    Terms of Service
                  </Link>{' '}
                  &{' '}
                  <Link href="/privacy" target="_blank" className="text-primary hover:underline font-bold">
                    Privacy Policy
                  </Link>.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="default"
              size="lg"
              className="w-full font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20 gap-2 mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Creating account...' : 'Create Account & Play'}</span>
            </Button>
          </form>

          <div className="text-center mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-bold">
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
