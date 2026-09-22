import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Support Vercel serverless forwarded host
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  let origin = new URL(request.url).origin;
  if (!isLocalEnv && forwardedHost) {
    origin = `https://${forwardedHost}`;
  }

  if (code) {
    const cookieStore = await cookies();
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lxwjllcoqkyqpktkiyxo.supabase.co';
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4d2psbGNvcWt5cXBrdGtpeXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODcxNDksImV4cCI6MjEwNTU2MzE0OX0._BnaHlRYqlJxNcPaA5oypLsbLpbZPwKiCi6IbSC5rDU';

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore if called from a route handler
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error('OAuth code exchange error:', error);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=OAuthFailed`);
}
