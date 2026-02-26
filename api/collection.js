/**
 * /api/collection?id=:collectionId
 * Renders a collection preview page with Open Graph meta tags.
 */

const { supaFetch } = require('./_supabase');
const { renderPage, esc } = require('./_html');

// Human-readable labels for system collection types
const TYPE_LABELS = {
  system_owned:    'Cabinet · Owned',
  system_tried:    'Cabinet · Tried',
  system_wishlist: 'Cabinet · Wishlist',
  custom:          'Collection',
  list:            'Ranked List',
};

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.redirect(302, '/');
  }

  // ── Fetch collection ─────────────────────────────────────
  const collections = await supaFetch(
    `collections?id=eq.${encodeURIComponent(id)}&select=id,name,description,user_id,collection_type,is_public,is_ordered`,
  );

  if (!collections || collections.length === 0) {
    return res.redirect(302, '/');
  }

  const collection = collections[0];

  // Only show public collections
  if (collection.is_public === false) {
    return res.redirect(302, '/');
  }

  // ── Fetch owner ───────────────────────────────────────────
  const ownerResult = await supaFetch(
    `users?id=eq.${encodeURIComponent(collection.user_id)}&select=id,username,display_name,avatar_url`,
  );
  const owner = ownerResult?.[0] || null;
  const ownerName = owner?.display_name || owner?.username || 'Someone';

  // ── Fetch collection items (first 10 with fragrance data) ─
  const items = await supaFetch(
    `collection_items?collection_id=eq.${encodeURIComponent(id)}&select=id,position,fragrance:fragrances(id,brand,name,image_url)&order=position.asc.nullslast,added_at.desc&limit=10`,
  );

  const fragrances = (items || [])
    .map((item) => item.fragrance)
    .filter(Boolean);

  // ── Build OG content ──────────────────────────────────────
  const collectionName = collection.name || 'Collection';
  const typeLabel = TYPE_LABELS[collection.collection_type] || 'Collection';
  const count = fragrances.length;

  const topNames = fragrances
    .slice(0, 3)
    .map((f) => f.name)
    .join(', ');

  const ogTitle = `${collectionName} — ${ownerName}'s Sillage`;
  const ogDescription = count > 0
    ? `${count}+ fragrances${topNames ? ` including ${topNames}` : ''}. ${typeLabel} by ${ownerName} on Sillage.`
    : `${ownerName}'s ${collectionName} on Sillage — the fragrance journal.`;

  // Use first fragrance image as OG image
  const leadImage = fragrances.find((f) => f.image_url)?.image_url || null;
  const ogUrl = `https://sillageapp.com/collection/${id}`;
  const deepLink = `sillage://collection/${id}`;

  // ── Build body HTML ───────────────────────────────────────
  const ownerAvatarHtml = owner?.avatar_url
    ? `<img src="${esc(owner.avatar_url)}" alt="${esc(ownerName)}" style="width:100%;height:100%;object-fit:cover;">`
    : `<span style="font-family:var(--font-d);font-size:14px;color:var(--text-1);">${esc(ownerName.slice(0, 1).toUpperCase())}</span>`;

  const fragItemsHtml = fragrances.map((f, i) => `
    <div class="frag-item">
      ${collection.is_ordered ? `<span class="frag-num">${i + 1}</span>` : ''}
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
    <!-- Collection header card -->
    <div class="card">
      <div class="card-body" style="padding-bottom: 16px;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px;">
          <div>
            <span class="type-badge">${esc(typeLabel)}</span>
          </div>
          ${count > 0 ? `<span class="meta-text">${count} fragrance${count !== 1 ? 's' : ''}</span>` : ''}
        </div>
        <h1 class="display">${esc(collectionName)}</h1>
        ${collection.description ? `<p class="body-text" style="margin-top:10px;">${esc(collection.description)}</p>` : ''}
        <div style="display:flex; align-items:center; gap:8px; margin-top:14px;">
          <div class="avatar" style="width:28px;height:28px;font-size:12px;">${ownerAvatarHtml}</div>
          <span class="meta-text">by ${esc(ownerName)}</span>
        </div>
      </div>

      ${fragrances.length > 0 ? `
      <div class="divider"></div>
      ${fragItemsHtml}
      ` : `
      <div class="divider"></div>
      <p class="note-text">This collection is empty.</p>
      `}
    </div>
  `;

  // ── Send response ─────────────────────────────────────────
  const html = renderPage({
    title: ogTitle,
    ogTitle,
    ogDescription,
    ogImage: leadImage,
    ogType: 'website',
    ogUrl,
    deepLink,
    body,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  res.status(200).send(html);
};
