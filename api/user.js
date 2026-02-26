/**
 * /api/user?id=:userId
 * Renders a user profile preview page with Open Graph meta tags.
 */

const { supaFetch } = require('./_supabase');
const { renderPage, esc } = require('./_html');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.redirect(302, '/');
  }

  // ── Fetch user ──────────────────────────────────────────
  const users = await supaFetch(
    `users?id=eq.${encodeURIComponent(id)}&select=id,username,display_name,bio,avatar_url`,
  );

  if (!users || users.length === 0) {
    return res.redirect(302, '/');
  }

  const user = users[0];
  const displayName = user.display_name || user.username || 'Sillage User';
  const username = user.username || '';

  // ── Build OG content ────────────────────────────────────
  const ogTitle = `${displayName} — Sillage`;
  const ogDescription = user.bio
    ? `${displayName}: "${user.bio}" — Fragrance journal on Sillage.`
    : `${displayName}'s fragrance journal on Sillage.`;
  const ogImage = user.avatar_url || null;
  const ogUrl = `https://sillageapp.com/user/${id}`;
  const deepLink = `sillage://user/${id}`;

  // ── Build body HTML ─────────────────────────────────────
  const avatarHtml = user.avatar_url
    ? `<img src="${esc(user.avatar_url)}" alt="${esc(displayName)}">`
    : `<span>${esc(displayName.slice(0, 1).toUpperCase())}</span>`;

  const body = `
    <div class="card">
      <div class="profile-row">
        <div class="avatar">${avatarHtml}</div>
        <div class="profile-info">
          <div class="profile-name">${esc(displayName)}</div>
          ${username ? `<div class="profile-handle">@${esc(username)}</div>` : ''}
        </div>
      </div>
      ${user.bio ? `<div class="divider"></div><p class="profile-bio">${esc(user.bio)}</p>` : ''}
    </div>

    <p style="margin-top: 24px; font-size: 14px; color: var(--text-3); font-family: var(--font-d); font-style: italic; text-align: center;">
      Open Sillage to see ${esc(displayName.split(' ')[0])}'s full profile, reviews, and taste match.
    </p>
  `;

  // ── Send response ───────────────────────────────────────
  const html = renderPage({
    title: ogTitle,
    ogTitle,
    ogDescription,
    ogImage,
    ogType: 'profile',
    ogUrl,
    deepLink,
    body,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
};
