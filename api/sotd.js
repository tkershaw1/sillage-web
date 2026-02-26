/**
 * /api/sotd?id=:sotdId
 * Renders a Scent-of-the-Day preview page with Open Graph meta tags.
 */

const { supaFetch } = require('./_supabase');
const { renderPage, esc } = require('./_html');

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

  // ── Fetch SOTD ────────────────────────────────────────────
  const sotds = await supaFetch(
    `sotd?id=eq.${encodeURIComponent(id)}&select=id,user_id,fragrance_id,photo_url,mood_tag,note,worn_date,created_at`,
  );

  if (!sotds || sotds.length === 0) {
    return res.redirect(302, '/');
  }

  const sotd = sotds[0];

  // ── Fetch user ────────────────────────────────────────────
  const users = await supaFetch(
    `users?id=eq.${encodeURIComponent(sotd.user_id)}&select=id,username,display_name,avatar_url`,
  );
  const user = users?.[0] || null;
  const displayName = user?.display_name || user?.username || 'Someone';

  // ── Fetch primary fragrance ───────────────────────────────
  let fragrance = null;
  if (sotd.fragrance_id) {
    const frags = await supaFetch(
      `fragrances?id=eq.${encodeURIComponent(sotd.fragrance_id)}&select=id,brand,name,image_url`,
    );
    fragrance = frags?.[0] || null;
  }

  // ── Fetch layered fragrances (if any) ─────────────────────
  const layers = await supaFetch(
    `sotd_fragrances?sotd_id=eq.${encodeURIComponent(id)}&select=position,is_primary,fragrance:fragrances(id,brand,name,image_url)&order=position.asc`,
  );
  const fragranceLayers = (layers || []).filter((l) => l.fragrance);

  // ── Build OG content ──────────────────────────────────────
  const fragName = fragrance?.name || fragranceLayers[0]?.fragrance?.name || 'a fragrance';
  const dateLabel = formatDate(sotd.worn_date);

  const ogTitle = `${displayName} wore ${fragName}${dateLabel ? ` on ${dateLabel}` : ''} — Sillage`;
  const ogDescription = sotd.note
    ? `"${sotd.note}" — ${displayName} on Sillage`
    : `${displayName}'s Scent of the Day on Sillage.`;

  // Prefer the SOTD photo, fall back to fragrance image
  const ogImage = sotd.photo_url || fragrance?.image_url || fragranceLayers[0]?.fragrance?.image_url || null;
  const ogUrl = `https://sillageapp.com/sotd/${id}`;
  const deepLink = `sillage://sotd/${id}`;

  // ── Build body HTML ───────────────────────────────────────
  const avatarHtml = user?.avatar_url
    ? `<img src="${esc(user.avatar_url)}" alt="${esc(displayName)}" style="width:100%;height:100%;object-fit:cover;">`
    : `<span style="font-family:var(--font-d);font-size:22px;color:var(--text-1);">${esc(displayName.slice(0, 1).toUpperCase())}</span>`;

  // Determine which fragrances to show in the list
  const fragsToShow = fragranceLayers.length > 0
    ? fragranceLayers.map((l) => l.fragrance)
    : fragrance ? [fragrance] : [];

  const fragListHtml = fragsToShow.map((f, i) => `
    <div class="frag-item">
      ${fragsToShow.length > 1 ? `<span class="frag-num">${i + 1}</span>` : ''}
      ${f.image_url
        ? `<img class="frag-img" src="${esc(f.image_url)}" alt="${esc(f.name)}" loading="lazy">`
        : `<div class="frag-img-placeholder"></div>`}
      <div class="frag-info">
        <div class="frag-name">${esc(f.name)}</div>
        <div class="frag-brand">${esc(f.brand)}</div>
      </div>
    </div>
  `).join('');

  const body = `
    <div class="card">
      <!-- SOTD photo (if any) -->
      ${sotd.photo_url ? `<img class="sotd-photo" src="${esc(sotd.photo_url)}" alt="SOTD photo" loading="lazy">` : ''}

      <!-- User + date header -->
      <div class="profile-row" style="padding:16px 20px;">
        <div class="avatar" style="width:44px;height:44px;font-size:18px;">${avatarHtml}</div>
        <div class="profile-info">
          <div class="profile-name" style="font-size:18px;">${esc(displayName)}</div>
          ${user?.username ? `<div class="profile-handle">@${esc(user.username)}</div>` : ''}
        </div>
        ${dateLabel ? `<span class="date-label">${esc(dateLabel)}</span>` : ''}
      </div>

      ${sotd.note || sotd.mood_tag ? `
      <div class="divider"></div>
      ${sotd.note ? `<p class="note-text">"${esc(sotd.note)}"</p>` : ''}
      ${sotd.mood_tag ? `<p style="padding: 0 20px 16px;"><span class="mood-tag">${esc(sotd.mood_tag)}</span></p>` : ''}
      ` : ''}

      ${fragsToShow.length > 0 ? `
      <div class="divider"></div>
      <p class="label" style="padding: 14px 20px 8px;">
        ${fragsToShow.length > 1 ? 'Wearing' : 'Scent of the Day'}
      </p>
      ${fragListHtml}
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
