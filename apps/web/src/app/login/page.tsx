'use client';

import { useState, useEffect, Suspense, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient, syncAuthCookie } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { LogIn, AlertCircle, Loader2, Sparkles } from 'lucide-react';

function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Safely extract redirect destination, preventing open redirect vulnerabilities
  const redirectParam = searchParams.get('redirect') || searchParams.get('next') || searchParams.get('returnUrl');
  const target =
    redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : '/dashboard';

  // If already authenticated, forward to destination or dashboard
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user && data.session?.access_token) {
        syncAuthCookie(data.session.access_token);
        window.location.href = target;
      }
    });
  }, [target]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanIdentifier = identifier.trim();
      if (!cleanIdentifier) {
        throw new Error('Please enter your email address or username.');
      }
      if (!password) {
        throw new Error('Please enter your password.');
      }

      // 1. Resolve email if user entered a username
      let targetEmail = cleanIdentifier.toLowerCase();
      if (!cleanIdentifier.includes('@')) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanIdentifier }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.email) {
          throw new Error(data.error || `Could not find an account with username "${cleanIdentifier}".`);
        }
        targetEmail = data.email.toLowerCase();
      }

      // 2. Authenticate with Supabase
      const supabase = getSupabaseClient();
      let { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      // 3. Auto-confirm if pending
      if (authError && authError.message.toLowerCase().includes('email not confirmed')) {
        await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail }),
        });

        const retry = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });
        signInData = retry.data;
        authError = retry.error;
      }

      if (authError) {
        if (authError.message.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid email/username or password. Please verify your credentials.');
        }
        throw authError;
      }

      if (signInData?.session?.access_token) {
        syncAuthCookie(signInData.session.access_token);
      }

      // Use full browser navigation to ensure Edge Middleware receives the cookie synchronously
      window.location.href = target;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setLoading(false);
    }
  };

  const handleDemoFill = (emailValue: string, passValue: string) => {
    setIdentifier(emailValue);
    setPassword(passValue);
    setError(null);
  };

  const signupLink = redirectParam
    ? `/signup?redirect=${encodeURIComponent(redirectParam)}`
    : '/signup';

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
            Sign In to Arena
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {redirectParam ? (
              <span className="text-primary font-medium">
                Authentication required to access this arena area.
              </span>
            ) : (
              'Access your esports wallet, active matches, and tournaments.'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <div className="mb-5 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Email Address or Username
              </label>
              <Input
                type="text"
                required
                placeholder="player@example.com or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="text-xs"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Password</label>
              </div>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="default"
              size="lg"
              className="w-full font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20 gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-5 p-3 bg-secondary/50 border border-border rounded-xl">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground">Quick Test Credentials</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@playverzus.xyz', 'PlayVerzus2026!')}
                className="text-left px-2.5 py-1.5 bg-background hover:bg-primary/10 border border-border rounded-lg text-[10px] text-muted-foreground hover:text-foreground transition"
              >
                <div className="font-bold text-foreground">Admin</div>
                <div className="truncate">admin@playverzus.xyz</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('player1@playverzus.xyz', 'PlayVerzus2026!')}
                className="text-left px-2.5 py-1.5 bg-background hover:bg-primary/10 border border-border rounded-lg text-[10px] text-muted-foreground hover:text-foreground transition"
              >
                <div className="font-bold text-foreground">Player 1</div>
                <div className="truncate">player1@playverzus.xyz</div>
              </button>
            </div>
          </div>

          <div className="text-center mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Don't have a competitor account?{' '}
              <Link href={signupLink} className="text-primary hover:underline font-bold">
                Create one in 30 seconds
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
