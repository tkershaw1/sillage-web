/**
 * /api/review?id=:reviewId
 * Renders a review (log entry) preview page with Open Graph meta tags.
 * Reviews are stored in the `logs` table.
 */

const { supaFetch } = require('./_supabase');
const { renderPage, esc } = require('./_html');

const SENTIMENT_LABELS = {
  masterpiece: 'Masterpiece',
  love:        'Love',
  like:        'Like',
  mixed:       'Mixed',
  not_for_me:  'Not for Me',
};

const SENTIMENT_COLORS = {
  masterpiece: '#D4AF6A',
  love:        '#C97090',
  like:        '#8B9E7A',
  mixed:       '#8A7E74',
  not_for_me:  '#554E48',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.redirect(302, '/');
  }

  // ── Fetch log/review ──────────────────────────────────────
  const logs = await supaFetch(
    `logs?id=eq.${encodeURIComponent(id)}&select=id,user_id,fragrance_id,sentiment,notes,image_url,logged_at,occasion,mood`,
  );

  if (!logs || logs.length === 0) {
    return res.redirect(302, '/');
  }

  const log = logs[0];

  // ── Fetch user ────────────────────────────────────────────
  const users = await supaFetch(
    `users?id=eq.${encodeURIComponent(log.user_id)}&select=id,username,display_name,avatar_url`,
  );
  const user = users?.[0] || null;
  const displayName = user?.display_name || user?.username || 'Someone';

  // ── Fetch fragrance ───────────────────────────────────────
  let fragrance = null;
  if (log.fragrance_id) {
    const frags = await supaFetch(
      `fragrances?id=eq.${encodeURIComponent(log.fragrance_id)}&select=id,brand,name,image_url`,
    );
    fragrance = frags?.[0] || null;
  }

  // ── Build OG content ──────────────────────────────────────
  const fragName = fragrance?.name || 'a fragrance';
  const sentimentLabel = SENTIMENT_LABELS[log.sentiment] || '';
  const dateLabel = formatDate(log.logged_at);

  const ogTitle = sentimentLabel
    ? `${displayName}: "${sentimentLabel}" — ${fragName} on Sillage`
    : `${displayName} reviewed ${fragName} — Sillage`;

  const ogDescription = log.notes
    ? `"${log.notes.slice(0, 160)}"${log.notes.length > 160 ? '…' : ''} — ${displayName} on Sillage`
    : `${displayName}'s review of ${fragName} on Sillage.`;

  const ogImage = log.image_url || fragrance?.image_url || null;
  const ogUrl = `https://sillageapp.com/review/${id}`;
  const deepLink = `sillage://review/${id}`;

  // ── Build body HTML ───────────────────────────────────────
  const avatarHtml = user?.avatar_url
    ? `<img src="${esc(user.avatar_url)}" alt="${esc(displayName)}" style="width:100%;height:100%;object-fit:cover;">`
    : `<span style="font-family:var(--font-d);font-size:18px;color:var(--text-1);">${esc(displayName.slice(0, 1).toUpperCase())}</span>`;

  const sentimentColor = SENTIMENT_COLORS[log.sentiment] || 'var(--text-3)';
  const sentimentBadgeHtml = sentimentLabel
    ? `<span style="display:inline-block;padding:3px 10px;border:1px solid;border-color:${sentimentColor}33;border-radius:2px;font-size:11px;font-weight:500;letter-spacing:0.10em;text-transform:uppercase;color:${sentimentColor};">${esc(sentimentLabel)}</span>`
    : '';

  const tagPills = (arr) => (arr || [])
    .map((t) => `<span style="display:inline-block;padding:3px 10px;background:var(--bg-elevated);border:1px solid var(--border-mid);border-radius:20px;font-size:12px;color:var(--text-2);margin:3px;">${esc(t)}</span>`)
    .join('');

  const body = `
    <div class="card">
      ${log.image_url ? `<img src="${esc(log.image_url)}" alt="Review photo" style="width:100%;max-height:320px;object-fit:cover;" loading="lazy">` : ''}

      <!-- User header -->
      <div class="profile-row" style="padding:16px 20px;">
        <div class="avatar" style="width:44px;height:44px;font-size:18px;">${avatarHtml}</div>
        <div class="profile-info">
          <div class="profile-name" style="font-size:18px;">${esc(displayName)}</div>
          ${user?.username ? `<div class="profile-handle">@${esc(user.username)}</div>` : ''}
        </div>
        ${dateLabel ? `<span class="date-label">${esc(dateLabel)}</span>` : ''}
      </div>

      <!-- Fragrance info -->
      ${fragrance ? `
      <div class="divider"></div>
      <div class="frag-item" style="border-bottom:none;">
        ${fragrance.image_url
          ? `<img class="frag-img" src="${esc(fragrance.image_url)}" alt="${esc(fragrance.name)}" loading="lazy">`
          : `<div class="frag-img-placeholder"></div>`}
        <div class="frag-info">
          <div class="frag-name">${esc(fragrance.name)}</div>
          <div class="frag-brand">${esc(fragrance.brand)}</div>
        </div>
        ${sentimentBadgeHtml}
      </div>
      ` : sentimentBadgeHtml ? `<div class="divider"></div><div style="padding:12px 20px;">${sentimentBadgeHtml}</div>` : ''}

      <!-- Review text -->
      ${log.notes ? `
      <div class="divider"></div>
      <p class="note-text">"${esc(log.notes)}"</p>
      ` : ''}

      <!-- Tags -->
      ${(log.occasion?.length || log.mood?.length) ? `
      <div class="divider"></div>
      <div style="padding:12px 20px 16px;">
        ${log.occasion?.length ? `<div style="margin-bottom:8px;">${tagPills(log.occasion)}</div>` : ''}
        ${log.mood?.length ? `<div>${tagPills(log.mood)}</div>` : ''}
      </div>
      ` : ''}
    </div>
  `;

  // ── Send response ─────────────────────────────────────────
  const html = renderPage({
    title: ogTitle,
    ogTitle,
    ogDescription,
    ogImage,
    ogType: 'website',
    ogUrl,
    deepLink,
    body,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
};
