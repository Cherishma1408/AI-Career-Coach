import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.'
    );
  }

  return createBrowserClient(
    supabaseUrl || 'https://lxwjllcoqkyqpktkiyxo.supabase.co',
    supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4d2psbGNvcWt5cXBrdGtpeXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODcxNDksImV4cCI6MjEwNTU2MzE0OX0._BnaHlRYqlJxNcPaA5oypLsbLpbZPwKiCi6IbSC5rDU'
  );
}
