/**
 * Supabase REST API helper for Vercel serverless functions.
 * Uses the anon key — only fetches public data (RLS enforced on Supabase side).
 */

const SUPABASE_URL = 'https://iuqgndfcgerwyrfmczpd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cWduZGZjZ2Vyd3lyZm1jenBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjE5MDAsImV4cCI6MjA4NjgzNzkwMH0.DA1WdpDMpvOJV9n8uw1d313x-cncbHJYMJah3DgZ3u8';

/**
 * Fetch from Supabase REST API.
 * @param {string} path  e.g. "users?id=eq.abc123&select=id,username"
 * @returns {Promise<any[]|null>}
 */
async function supaFetch(path) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

module.exports = { supaFetch, SUPABASE_URL };
