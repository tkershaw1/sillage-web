/**
 * /api/sotd-og-image?id=:sotdId
 * Returns a 1200×630 OG image card for a Scent of the Day entry.
 * Uses @vercel/og (Satori) for server-side rendering.
 *
 * NOTE: @vercel/og is ESM-only; must use dynamic import() in CJS handlers.
 */

const { supaFetch } = require('./_supabase');
const fs = require('fs');
const path = require('path');

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function buildCard({ fragName, brand, displayName, username, dateLabel, photoBase64, logoSrc }) {
  const byLine = (displayName || 'Someone') + (username ? ' · @' + username : '');

  if (photoBase64) {
    return {
      type: 'div',
      props: {
        style: { width: '1200px', height: '630px', display: 'flex', position: 'relative', overflow: 'hidden', fontFamily: 'Inter' },
        children: [
          { type: 'img', props: { src: photoBase64, style: { position: 'absolute', left: 0, top: 0, width: '1200px', height: '630px', objectFit: 'cover' } } },
          { type: 'div', props: { style: { position: 'absolute', left: 0, bottom: 0, width: '1200px', height: '378px', background: 'linear-gradient(to bottom, transparent, #000)' } } },
          logoSrc ? { type: 'img', props: { src: logoSrc, style: { position: 'absolute', top: '36px', left: '40px', width: '180px' } } } : null,
          {
            type: 'div',
            props: {
              style: { position: 'absolute', left: 0, bottom: 0, width: '1200px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 48px 40px 48px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column' },
                    children: [
                      { type: 'div', props: { style: { fontSize: '60px', fontFamily: 'Cormorant Garamond', fontWeight: 700, color: '#fff', lineHeight: 1.1 }, children: fragName } },
                      brand ? { type: 'div', props: { style: { fontSize: '22px', color: '#bbb', marginTop: '6px' }, children: brand } } : null,
                    ].filter(Boolean),
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
                    children: [
                      { type: 'div', props: { style: { fontSize: '16px', color: '#ddd' }, children: byLine } },
                      dateLabel ? { type: 'div', props: { style: { fontSize: '14px', color: '#aaa' }, children: dateLabel } } : null,
                    ].filter(Boolean),
                  },
                },
              ],
            },
          },
        ].filter(Boolean),
      },
    };
  }

  return {
    type: 'div',
    props: {
      style: { width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#141110', fontFamily: 'Inter' },
      children: [
        logoSrc ? { type: 'img', props: { src: logoSrc, style: { width: '220px', marginBottom: '40px' } } } : null,
        { type: 'div', props: { style: { width: '320px', height: '1px', background: '#8B2C4A', marginBottom: '36px' } } },
        { type: 'div', props: { style: { fontSize: '64px', fontFamily: 'Cormorant Garamond', fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.15, marginBottom: '12px', padding: '0 80px' }, children: fragName } },
        brand ? { type: 'div', props: { style: { fontSize: '24px', color: '#999', marginBottom: '40px' }, children: brand } } : null,
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
            children: [
              { type: 'div', props: { style: { fontSize: '16px', color: '#bbb' }, children: byLine } },
              dateLabel ? { type: 'div', props: { style: { fontSize: '14px', color: '#666' }, children: dateLabel } } : null,
            ].filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  };
}

module.exports = async function handler(req, res) {
  try {
    const { ImageResponse } = await import('@vercel/og');

    const cormorantData = fs.readFileSync(path.join(process.cwd(), 'public/fonts/CormorantGaramond-Bold.ttf'));
    const interData = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Inter-Regular.ttf'));

    let logoSrc = null;
    try {
      const logoBuffer = fs.readFileSync(path.join(process.cwd(), 'public/wordmark.png'));
      logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (_) {}

    const { id } = req.query;

    let fragName = 'a fragrance';
    let brand = '';
    let displayName = 'Someone';
    let username = null;
    let dateLabel = '';
    let photoBase64 = null;

    if (id) {
      try {
        const sotds = await supaFetch(
          'sotd?id=eq.' + encodeURIComponent(id) + '&select=id,user_id,photo_url,note,worn_date',
        );

        if (sotds && sotds.length > 0) {
          const sotd = sotds[0];
          dateLabel = formatDate(sotd.worn_date);

          if (sotd.photo_url) {
            try {
              const photoRes = await fetch(sotd.photo_url);
              const buf = Buffer.from(await photoRes.arrayBuffer()).toString('base64');
              photoBase64 = `data:image/jpeg;base64,${buf}`;
            } catch (_) {}
          }

          const users = await supaFetch(
            'users?id=eq.' + encodeURIComponent(sotd.user_id) + '&select=display_name,username',
          );
          const user = users?.[0] || null;
          displayName = user?.display_name || user?.username || 'Someone';
          username = user?.username || null;

          const layers = await supaFetch(
            'sotd_fragrances?sotd_id=eq.' + encodeURIComponent(id) + '&is_primary=eq.true&select=fragrance:fragrances(name,brand)&limit=1',
          );
          const fragrance = layers?.[0]?.fragrance || null;
          fragName = fragrance?.name || 'a fragrance';
          brand = fragrance?.brand || '';
        }
      } catch (_err) {
        // Fall through to fallback card
      }
    }

    const imageResponse = new ImageResponse(
      buildCard({ fragName, brand, displayName, username, dateLabel, photoBase64, logoSrc }),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: 'Cormorant Garamond', data: cormorantData, weight: 700 },
          { name: 'Inter', data: interData, weight: 400 },
        ],
      },
    );

    const arrayBuffer = await imageResponse.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('sotd-og-image error:', err);
    res.status(500).json({ error: 'Failed to generate image' });
  }
};
