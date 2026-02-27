/**
 * /api/sotd-og-image?id=:sotdId
 * Returns a 1200×630 OG image card for a Scent of the Day entry.
 * Uses @vercel/og (Satori) for server-side rendering.
 *
 * NOTE: @vercel/og is ESM-only; must use dynamic import() in CJS handlers.
 */

const { supaFetch } = require('./_supabase');

const WORDMARK_URL = 'https://sillageapp.com/wordmark.png';
const BURGUNDY = '#8B2C4A';
const CREAM = '#F5F0EA';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

module.exports = async function handler(req, res) {
  const { ImageResponse } = await import('@vercel/og');

  const { id } = req.query;

  let fragName = 'a fragrance';
  let brand = '';
  let username = '';
  let dateLabel = '';
  let photoUrl = null;

  if (id) {
    try {
      const sotds = await supaFetch(
        'sotd?id=eq.' + encodeURIComponent(id) + '&select=id,user_id,photo_url,worn_date',
      );

      if (sotds && sotds.length > 0) {
        const sotd = sotds[0];
        photoUrl = sotd.photo_url || null;
        dateLabel = formatDate(sotd.worn_date);

        const [users, layers] = await Promise.all([
          supaFetch('users?id=eq.' + encodeURIComponent(sotd.user_id) + '&select=display_name,username'),
          supaFetch('sotd_fragrances?sotd_id=eq.' + encodeURIComponent(id) + '&is_primary=eq.true&select=fragrance:fragrances(name,brand)&limit=1'),
        ]);

        const user = users?.[0] || null;
        username = user?.username ? '@' + user.username : '';

        const fragrance = layers?.[0]?.fragrance || null;
        fragName = fragrance?.name || 'a fragrance';
        brand = fragrance?.brand || '';
      }
    } catch (_err) {
      // Fall through to defaults
    }
  }

  // ── Load fonts ────────────────────────────────────────────
  const [cormorantData, interRegData, interMedData] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/cormorantgaramond/v16/co3YmX5slCNuHLi8bLeY9MK7whWMhyjYqXtK.woff').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2').then(r => r.arrayBuffer()),
  ]);

  // ── Build card element tree (Satori object syntax) ────────
  const card = photoUrl
    ? // ── WITH PHOTO ─────────────────────────────────────────
      {
        type: 'div',
        props: {
          style: {
            width: '1200px', height: '630px', display: 'flex',
            position: 'relative', overflow: 'hidden', background: '#000',
          },
          children: [
            // Background photo
            { type: 'img', props: { src: photoUrl, style: { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover' } } },
            // Gradient overlay
            { type: 'div', props: { style: { position: 'absolute', inset: '0', background: 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.04) 28%, rgba(0,0,0,0.72) 58%, rgba(0,0,0,0.97) 100%)' } } },
            // Wordmark — top left
            { type: 'img', props: { src: WORDMARK_URL, style: { position: 'absolute', top: '40px', left: '48px', width: '180px', opacity: '0.95' } } },
            // Bottom content
            {
              type: 'div',
              props: {
                style: { position: 'absolute', bottom: '0', left: '0', right: '0', padding: '0 52px 44px', display: 'flex', flexDirection: 'column' },
                children: [
                  // SOTD label
                  { type: 'div', props: { style: { fontFamily: 'Inter', fontSize: '13px', fontWeight: '500', letterSpacing: '0.2em', color: BURGUNDY, textTransform: 'uppercase', marginBottom: '10px' }, children: 'Scent of the Day' } },
                  // Fragrance name
                  { type: 'div', props: { style: { fontFamily: 'Cormorant Garamond', fontSize: '68px', fontWeight: '700', color: '#fff', lineHeight: '1.05', marginBottom: '8px' }, children: fragName } },
                  // Brand
                  brand ? { type: 'div', props: { style: { fontFamily: 'Inter', fontSize: '22px', fontWeight: '400', color: 'rgba(255,255,255,0.6)', marginBottom: '18px' }, children: brand } } : null,
                  // Username + date — right aligned
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', justifyContent: 'flex-end', gap: '16px', fontFamily: 'Inter', fontSize: '15px', color: 'rgba(255,255,255,0.45)' },
                      children: [
                        username ? { type: 'span', props: { children: username } } : null,
                        dateLabel ? { type: 'span', props: { children: dateLabel } } : null,
                      ].filter(Boolean),
                    },
                  },
                ].filter(Boolean),
              },
            },
          ],
        },
      }
    : // ── NO PHOTO ──────────────────────────────────────────
      {
        type: 'div',
        props: {
          style: {
            width: '1200px', height: '630px', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: '#141110', position: 'relative', padding: '60px 80px',
          },
          children: [
            // Wordmark centered
            { type: 'img', props: { src: WORDMARK_URL, style: { width: '220px', marginBottom: '48px', opacity: '0.92' } } },
            // SOTD label
            { type: 'div', props: { style: { fontFamily: 'Inter', fontSize: '12px', fontWeight: '500', letterSpacing: '0.22em', color: BURGUNDY, textTransform: 'uppercase', marginBottom: '16px' }, children: 'Scent of the Day' } },
            // Fragrance name
            { type: 'div', props: { style: { fontFamily: 'Cormorant Garamond', fontSize: '70px', fontWeight: '700', color: CREAM, textAlign: 'center', lineHeight: '1.05', marginBottom: '12px' }, children: fragName } },
            // Brand
            brand ? { type: 'div', props: { style: { fontFamily: 'Inter', fontSize: '20px', fontWeight: '400', color: 'rgba(245,240,234,0.5)', marginBottom: '34px' }, children: brand } } : { type: 'div', props: { style: { marginBottom: '34px' }, children: '' } },
            // Gold rule
            { type: 'div', props: { style: { width: '120px', height: '1px', background: BURGUNDY, marginBottom: '28px' } } },
            // Username + date
            {
              type: 'div',
              props: {
                style: { display: 'flex', gap: '14px', fontFamily: 'Inter', fontSize: '15px', color: 'rgba(245,240,234,0.38)' },
                children: [
                  username ? { type: 'span', props: { children: username } } : null,
                  dateLabel ? { type: 'span', props: { children: dateLabel } } : null,
                ].filter(Boolean),
              },
            },
          ].filter(Boolean),
        },
      };

  const imageResponse = new ImageResponse(card, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Cormorant Garamond', data: cormorantData, weight: 700, style: 'normal' },
      { name: 'Inter', data: interRegData, weight: 400, style: 'normal' },
      { name: 'Inter', data: interMedData, weight: 500, style: 'normal' },
    ],
  });

  const arrayBuffer = await imageResponse.arrayBuffer();
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send(Buffer.from(arrayBuffer));
};
