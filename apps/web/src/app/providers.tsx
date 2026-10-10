'use client';

import { ReactNode, useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '../lib/queryClient';
import { initPushNotifications } from '../lib/pushManager';
import { getSupabaseClient } from '../lib/supabase';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  // Auto-initialise Web Push once a user session is confirmed
  useEffect(() => {
    const supabase = getSupabaseClient();
    let ignore = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!ignore && data.session?.user) {
        // Small delay to avoid competing with other startup tasks
        setTimeout(() => initPushNotifications(), 2000);
      }
    });

    // Also listen for sign-in events that happen after page load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setTimeout(() => initPushNotifications(), 2000);
      }
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
