/**
 * /api/fragrance?id=:fragranceId
 * Renders a fragrance detail preview page with Open Graph meta tags.
 */

const { supaFetch } = require('./_supabase');
const { renderPage, esc } = require('./_html');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.redirect(302, '/');
  }

  // ── Fetch fragrance ───────────────────────────────────────
  const fragrances = await supaFetch(
    `fragrances?id=eq.${encodeURIComponent(id)}&select=id,brand,name,concentration,gender,year,family,description,image_url,top_notes,mid_notes,base_notes`,
  );

  if (!fragrances || fragrances.length === 0) {
    return res.redirect(302, '/');
  }

  const frag = fragrances[0];

  // ── Build OG content ──────────────────────────────────────
  const fragTitle = `${frag.name} by ${frag.brand}`;
  const ogTitle = `${fragTitle} — Sillage`;

  let descParts = [];
  if (frag.concentration) descParts.push(frag.concentration);
  if (frag.year) descParts.push(String(frag.year));
  if (frag.family) descParts.push(frag.family);
  const metaLine = descParts.join(' · ');

  const notesPreview = [
    ...(frag.top_notes || []).slice(0, 2),
    ...(frag.mid_notes || []).slice(0, 2),
    ...(frag.base_notes || []).slice(0, 1),
  ].join(', ');

  const ogDescription = frag.description
    ? frag.description.slice(0, 200)
    : notesPreview
      ? `${metaLine}. Notes: ${notesPreview}.`
      : `${fragTitle}${metaLine ? ` — ${metaLine}` : ''} on Sillage.`;

  const ogUrl = `https://sillageapp.com/fragrance/${id}`;
  const deepLink = `sillage://fragrance/${id}`;

  // ── Build notes section ───────────────────────────────────
  function notesPillsHtml(notes, label) {
    if (!notes || notes.length === 0) return '';
    const pills = notes
      .map((n) => `<span style="display:inline-block;padding:3px 10px;background:var(--bg-elevated);border:1px solid var(--border-mid);border-radius:20px;font-size:12px;color:var(--text-2);margin:3px;">${esc(n)}</span>`)
      .join('');
    return `
      <div style="margin-bottom:16px;">
        <p class="label" style="margin-bottom:8px;">${esc(label)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:0;">${pills}</div>
      </div>
    `;
  }

  const body = `
    <div class="card">
      ${frag.image_url ? `<img src="${esc(frag.image_url)}" alt="${esc(frag.name)}" style="width:100%;max-height:280px;object-fit:contain;background:var(--bg-elevated);padding:20px;" loading="lazy">` : ''}

      <div class="card-body">
        <h1 class="display">${esc(frag.name)}</h1>
        <p style="font-size:14px;font-weight:400;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-3);margin-top:4px;">${esc(frag.brand)}</p>

        ${metaLine ? `<p class="meta-text" style="margin-top:10px;">${esc(metaLine)}</p>` : ''}

        ${frag.description ? `<p class="body-text" style="margin-top:16px;">${esc(frag.description.slice(0, 300))}${frag.description.length > 300 ? '…' : ''}</p>` : ''}
      </div>

      ${(frag.top_notes?.length || frag.mid_notes?.length || frag.base_notes?.length) ? `
      <div class="divider"></div>
      <div class="card-body">
        ${notesPillsHtml(frag.top_notes, 'Top Notes')}
        ${notesPillsHtml(frag.mid_notes, 'Heart Notes')}
        ${notesPillsHtml(frag.base_notes, 'Base Notes')}
      </div>
      ` : ''}
    </div>
  `;

  // ── Send response ─────────────────────────────────────────
  const html = renderPage({
    title: ogTitle,
    ogTitle,
    ogDescription,
    ogImage: frag.image_url,
    ogType: 'website',
    ogUrl,
    deepLink,
    body,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
};
