/**
 * /api/sotd-og-image?id=:sotdId
 * Returns a 1200×630 OG image card for a Scent of the Day entry.
 * Uses @vercel/og (Satori) for server-side rendering.
 */

const { ImageResponse } = require('@vercel/og');
const { supaFetch } = require('./_supabase');

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

module.exports = async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send('Missing id');

  const sotds = await supaFetch(
    `sotd?id=eq.${encodeURIComponent(id)}&select=id,user_id,photo_url,note,worn_date`,
  );
  if (!sotds || sotds.length === 0) return res.status(404).send('Not found');
  const sotd = sotds[0];

  const users = await supaFetch(
    `users?id=eq.${encodeURIComponent(sotd.user_id)}&select=display_name,username`,
  );
  const user = users?.[0] || null;
  const displayName = user?.display_name || user?.username || 'Someone';
  const username = user?.username || null;

  const layers = await supaFetch(
    `sotd_fragrances?sotd_id=eq.${encodeURIComponent(id)}&is_primary=eq.true&select=fragrance:fragrances(name,brand)&limit=1`,
  );
  const fragrance = layers?.[0]?.fragrance || null;
  const fragName = fragrance?.name || 'a fragrance';
  const brand = fragrance?.brand || '';
  const dateLabel = formatDate(sotd.worn_date);
  const photoUrl = sotd.photo_url || null;

  const imageResponse = new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px', height: '630px', display: 'flex',
          background: '#141110', fontFamily: 'serif',
          position: 'relative', overflow: 'hidden',
        },
        children: [
          photoUrl ? {
            type: 'img',
            props: {
              src: photoUrl,
              style: { position: 'absolute', left: 0, top: 0, width: '420px', height: '630px', objectFit: 'cover', opacity: 0.85 },
            },
          } : null,
          photoUrl ? {
            type: 'div',
            props: {
              style: { position: 'absolute', left: 0, top: 0, width: '480px', height: '630px', background: 'linear-gradient(to right, transparent 300px, #141110 480px)' },
            },
          } : null,
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', left: photoUrl ? '440px' : '60px', top: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                padding: '60px 60px 60px 40px',
              },
              children: [
                { type: 'div', props: { style: { fontSize: '14px', letterSpacing: '6px', color: '#8b7355', textTransform: 'uppercase', marginBottom: '28px' }, children: 'SILLAGE' } },
                { type: 'div', props: { style: { fontSize: '13px', letterSpacing: '3px', color: '#6b5e4e', textTransform: 'uppercase', marginBottom: '16px' }, children: 'Scent of the Day' } },
                { type: 'div', props: { style: { fontSize: '42px', color: '#f5ede3', fontFamily: 'serif', lineHeight: 1.15, marginBottom: '10px', fontWeight: 'normal' }, children: fragName } },
                brand ? { type: 'div', props: { style: { fontSize: '20px', color: '#9e8a76', marginBottom: '32px', fontStyle: 'italic' }, children: brand } } : null,
                { type: 'div', props: { style: { width: '48px', height: '1px', background: '#3a3028', marginBottom: '28px' } } },
                { type: 'div', props: { style: { fontSize: '16px', color: '#c4aa8f', marginBottom: '6px' }, children: displayName + (username ? ` · @${username}` : '') } },
                dateLabel ? { type: 'div', props: { style: { fontSize: '14px', color: '#6b5e4e' }, children: dateLabel } } : null,
              ].filter(Boolean),
            },
          },
        ].filter(Boolean),
      },
    },
    { width: 1200, height: 630 },
  );

  const arrayBuffer = await imageResponse.arrayBuffer();
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send(Buffer.from(arrayBuffer));
};
