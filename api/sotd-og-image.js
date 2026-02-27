/**
 * /api/sotd-og-image?id=:sotdId
 * Returns a 1200×630 OG image card for a Scent of the Day entry.
 * Stable text-only version — no external font or image fetching.
 */

const { supaFetch } = require('./_supabase');

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function buildCard(fragName, brand, username, dateLabel) {
  return {
    type: 'div',
    props: {
      style: {
        width: '1200px', height: '630px', display: 'flex',
        flexDirection: 'column', background: '#141110',
        padding: '60px 80px', position: 'relative',
      },
      children: [
        // Top-left: SILLAGE wordmark as text
        {
          type: 'div',
          props: {
            style: { fontFamily: 'serif', fontSize: '28px', fontWeight: '700', color: '#fff', letterSpacing: '0.25em', marginBottom: '6px' },
            children: 'SILLAGE',
          },
        },
        {
          type: 'div',
          props: {
            style: { fontFamily: 'sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', marginBottom: '120px' },
            children: 'Scent of the Day',
          },
        },
        // Fragrance name — center
        {
          type: 'div',
          props: {
            style: { fontFamily: 'serif', fontSize: '72px', fontWeight: '700', color: '#F5F0EA', lineHeight: '1.05', marginBottom: '16px' },
            children: fragName,
          },
        },
        // Brand
        brand ? {
          type: 'div',
          props: {
            style: { fontFamily: 'sans-serif', fontSize: '24px', color: 'rgba(245,240,234,0.5)', marginBottom: '0' },
            children: brand,
          },
        } : null,
        // Spacer
        { type: 'div', props: { style: { flex: '1' }, children: '' } },
        // Bottom: username + date
        {
          type: 'div',
          props: {
            style: { display: 'flex', gap: '20px', fontFamily: 'sans-serif', fontSize: '16px', color: 'rgba(255,255,255,0.35)' },
            children: [
              username ? { type: 'span', props: { children: username } } : null,
              dateLabel ? { type: 'span', props: { children: dateLabel } } : null,
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

    const { id } = req.query;

    let fragName = 'a fragrance';
    let brand = '';
    let username = '';
    let dateLabel = '';

    if (id) {
      try {
        const sotds = await supaFetch(
          'sotd?id=eq.' + encodeURIComponent(id) + '&select=id,user_id,worn_date',
        );

        if (sotds && sotds.length > 0) {
          const sotd = sotds[0];
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

    const card = buildCard(fragName, brand, username, dateLabel);

    const imageResponse = new ImageResponse(card, { width: 1200, height: 630 });
    const arrayBuffer = await imageResponse.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    // Absolute fallback — never 500
    console.error('sotd-og-image error:', err);
    try {
      const { ImageResponse } = await import('@vercel/og');
      const fallback = {
        type: 'div',
        props: {
          style: { width: '1200px', height: '630px', background: '#141110', display: 'flex', alignItems: 'center', justifyContent: 'center' },
          children: [{ type: 'div', props: { style: { fontFamily: 'serif', fontSize: '48px', color: '#F5F0EA' }, children: 'SILLAGE' } }],
        },
      };
      const ir = new ImageResponse(fallback, { width: 1200, height: 630 });
      const ab = await ir.arrayBuffer();
      res.setHeader('Content-Type', 'image/png');
      return res.status(200).send(Buffer.from(ab));
    } catch (e2) {
      res.status(500).json({ error: 'og-image failed', detail: String(e2) });
    }
  }
};
