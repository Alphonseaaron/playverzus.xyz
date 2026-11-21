import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Playverzus v2.0 Edge Pass-Through Middleware.
 * Role-based access control (Guest / Player / Game Developer / Staff & Admin)
 * is enforced by the v2.0 GoRouter guard and NestJS JWT Guards.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
