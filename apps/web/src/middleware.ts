import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Server-side Edge Middleware for Strict Authentication & Route Protection.
 * Unauthenticated users attempting to access competitor portals, cashier,
 * admin operations, or match creation are redirected to /login with redirect return targets.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const protectedPrefixes = [
    '/dashboard',
    '/cashier',
    '/settings',
    '/friends',
    '/matches/new',
    '/tournaments/new',
    '/admin',
  ];

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for presence of Supabase authentication session cookies
  // Supabase stores auth cookies matching `sb-*-auth-token` or `sb-auth-token`
  const allCookies = request.cookies.getAll();
  const hasAuthToken = allCookies.some((cookie) => {
    const name = cookie.name.toLowerCase();
    return (
      name.startsWith('sb-') && name.endsWith('-auth-token') ||
      name === 'sb-auth-token' ||
      name === 'supabase-auth-token' ||
      name === 'sb-token'
    );
  });

  if (!hasAuthToken) {
    const returnUrl = encodeURIComponent(`${pathname}${search}`);
    const loginUrl = new URL(`/login?redirect=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard',
    '/cashier/:path*',
    '/cashier',
    '/settings/:path*',
    '/settings',
    '/friends/:path*',
    '/friends',
    '/matches/new',
    '/tournaments/new',
    '/admin/:path*',
    '/admin',
  ],
};
