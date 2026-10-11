'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

interface UseRequireAuthOptions {
  redirectTo?: string;
}

export function useRequireAuth(options?: UseRequireAuthOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentUser = data?.session?.user ?? null;

        if (!isMounted) return;

        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);

          // Build return destination including query parameters if present
          const queryStr = searchParams?.toString();
          const currentUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
          const target = options?.redirectTo || `/login?redirect=${encodeURIComponent(currentUrl)}`;

          router.replace(target);
        }
      } catch (err) {
        if (!isMounted) return;
        setIsAuthenticated(false);
        setIsLoading(false);
        const queryStr = searchParams?.toString();
        const currentUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
        router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      }
    };

    checkSession();

    // Listen for auth state changes (e.g. sign out or session termination)
    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        const currentUser = session?.user ?? null;
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          const queryStr = searchParams?.toString();
          const currentUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
          const target = options?.redirectTo || `/login?redirect=${encodeURIComponent(currentUrl)}`;
          router.replace(target);
        }
      }
    );

    return () => {
      isMounted = false;
      authSubscription?.subscription?.unsubscribe();
    };
  }, [router, pathname, searchParams, options?.redirectTo]);

  return { isLoading, isAuthenticated, user };
}
