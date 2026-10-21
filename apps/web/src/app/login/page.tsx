'use client';

import { useState, useEffect, Suspense, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
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
      if (data.session?.user) {
        router.replace(target);
      }
    });
  }, [router, target]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      router.push(target);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
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
              <label className="text-xs font-bold text-foreground block">Email Address</label>
              <Input
                type="email"
                required
                placeholder="player@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs"
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
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </Button>
          </form>

          <div className="text-center mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Don't have a competitor account?{' '}
              <Link href={signupLink} className="text-primary hover:underline font-bold">
                Create Account
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
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
