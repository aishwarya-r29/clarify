// Supabase client singleton
// Uses global `supabase` from CDN

const SUPABASE_URL = "https://fbacjnespsbgkqjuhpyx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiYWNqbmVzcHNiZ2txanVocHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODMxMDUsImV4cCI6MjA4OTA1OTEwNX0.7Pp47QzL-JJjWRHZWVziuZ-Kf70qTU7jXb890T7Q_qY";

if (!window.supabase) {
  console.error(
    "Supabase CDN library not loaded. Make sure to include it before supabaseClient.js."
  );
}

const { createClient } = window.supabase || {};

export const supabase = createClient
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Helper: ensure user is authenticated, otherwise redirect to login
export async function requireAuth() {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "./login.html";
    return null;
  }
  return session;
}

// Helper: only allow verified emails
export function ensureVerified(session) {
  const user = session?.user;
  const emailConfirmed =
    user?.email_confirmed_at || user?.confirmed_at || user?.confirmed;
  if (!emailConfirmed) {
    alert(
      "Please verify your PSG Tech email address from the verification mail before accessing Clarify."
    );
    supabase.auth.signOut();
    window.location.href = "./login.html";
    return false;
  }
  return true;
}

