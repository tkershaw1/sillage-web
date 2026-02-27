/**
 * /api/waitlist
 * Accepts POST { email } and inserts into the waitlist table.
 * Uses the anon key — RLS allows anonymous inserts.
 */

const { SUPABASE_URL } = require('./_supabase');

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cWduZGZjZ2Vyd3lyZm1jenBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjE5MDAsImV4cCI6MjA4NjgzNzkwMH0.DA1WdpDMpvOJV9n8uw1d313x-cncbHJYMJah3DgZ3u8';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    // 409 = duplicate (email already on waitlist) — treat as success
    if (response.ok || response.status === 409) {
      return res.status(200).json({ success: true });
    }

    const errBody = await response.text();
    console.error('Supabase insert error:', response.status, errBody);
    return res.status(500).json({ error: 'Failed to join waitlist' });
  } catch (err) {
    console.error('Waitlist handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
