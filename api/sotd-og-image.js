/**
 * /api/sotd-og-image?id=:sotdId
 * Returns a 1200×630 PNG card for SOTD Open Graph sharing.
 * Rendered via @vercel/og (Satori).
 */

const { supaFetch } = require('./_supabase');

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing id');
  }

  try {
    // ── Fetch data ─────────────────────────────────────────────
    const [sotds, layers] = await Promise.all([
      supaFetch(
        `sotd?id=eq.${encodeURIComponent(id)}&select=id,user_id,fragrance_id,photo_url,note,worn_date`,
      ),
      supaFetch(
        `sotd_fragrances?sotd_id=eq.${encodeURIComponent(id)}&select=position,is_primary,fragrance:fragrances(id,brand,name,image_url)&order=position.asc`,
      ),
    ]);

    if (!sotds || sotds.length === 0) {
      return res.status(404).send('Not found');
    }

    const sotd = sotds[0];

    const [users, primaryFrags] = await Promise.all([
      supaFetch(`users?id=eq.${encodeURIComponent(sotd.user_id)}&select=id,username,display_name,avatar_url`),
      sotd.fragrance_id
        ? supaFetch(`fragrances?id=eq.${encodeURIComponent(sotd.fragrance_id)}&select=id,brand,name,image_url`)
        : Promise.resolve(null),
    ]);

    const user = users?.[0] || null;
    const primaryFrag = primaryFrags?.[0] || null;
    const fragranceLayers = (layers || []).filter((l) => l.fragrance);

    const frag = fragranceLayers[0]?.fragrance || primaryFrag;
    const fragName = frag?.name || 'Unknown Fragrance';
    const brand = frag?.brand || '';
    const displayName = user?.display_name || user?.username || 'Someone';
    const handle = user?.username ? `@${user.username}` : '';
    const dateLabel = formatDate(sotd.worn_date);
    const caption = truncate(sotd.note, 120);
    const photoUrl = sotd.photo_url || null;
    const fragImgUrl = frag?.image_url || null;

    // ── Load fonts ─────────────────────────────────────────────
    const [cormorantRes, interRes] = await Promise.all([
      fetch('https://fonts.gstatic.com/s/cormorantgaramond/v22/co3WmX5slCNuHLi8bLeY9MK7whWMhyjornFLsS6V7w.woff'),
      fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'),
    ]);

    const [cormorantFont, interFont] = await Promise.all([
      cormorantRes.arrayBuffer(),
      interRes.arrayBuffer(),
    ]);

    // ── Dynamic import @vercel/og ──────────────────────────────
    const { ImageResponse } = await import('@vercel/og');

    // ── Layout constants ───────────────────────────────────────
    const W = 1200;
    const H = 630;
    const hasPhoto = !!photoUrl;
    const photoW = hasPhoto ? 460 : 0;
    const contentX = photoW;
    const contentW = W - photoW;

    // ── Build React element tree ───────────────────────────────
    // (Using React.createElement since this is CJS)
    const { createElement: h } = await import('react');

    const layerBadges = fragranceLayers.length > 1
      ? fragranceLayers.map((l, i) =>
          h('div', {
            key: i,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: i < fragranceLayers.length - 1 ? '6px' : '0',
            },
          },
            h('span', {
              style: {
                fontFamily: 'Cormorant Garamond',
                fontSize: '13px',
                color: '#D4AF6A',
                opacity: 0.6,
                width: '18px',
              },
            }, `${i + 1}`),
            h('div', { style: { display: 'flex', flexDirection: 'column' } },
              h('span', {
                style: { fontFamily: 'Cormorant Garamond', fontSize: '20px', color: '#EDE7DC', lineHeight: '1.1' },
              }, l.fragrance.name),
              h('span', {
                style: { fontFamily: 'Inter', fontSize: '11px', color: '#554E48', letterSpacing: '0.08em', textTransform: 'uppercase' },
              }, l.fragrance.brand),
            ),
          )
        )
      : null;

    const card = h('div', {
      style: {
        display: 'flex',
        width: `${W}px`,
        height: `${H}px`,
        background: '#141110',
        fontFamily: 'Inter',
        position: 'relative',
      },
    },
      // ── Left: SOTD Photo ───────────────────────────────────
      hasPhoto && h('div', {
        style: {
          display: 'flex',
          width: `${photoW}px`,
          height: `${H}px`,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        },
      },
        h('img', {
          src: photoUrl,
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          },
        }),
        // Gradient overlay on right edge for smooth blending
        h('div', {
          style: {
            position: 'absolute',
            top: 0,
            right: 0,
            width: '80px',
            height: '100%',
            background: 'linear-gradient(to right, transparent, #141110)',
          },
        }),
      ),

      // ── Right: Content ──────────────────────────────────────
      h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: `48px ${hasPhoto ? 48 : 64}px`,
          justifyContent: 'space-between',
        },
      },
        // Top: wordmark
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        },
          h('span', {
            style: {
              fontFamily: 'Cormorant Garamond',
              fontSize: '22px',
              fontWeight: 400,
              color: '#8B2C4A',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            },
          }, 'Sillage'),
          h('span', {
            style: {
              fontFamily: 'Inter',
              fontSize: '11px',
              fontWeight: 400,
              color: '#554E48',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            },
          }, 'Scent of the Day'),
        ),

        // Gold divider
        h('div', {
          style: {
            width: '40px',
            height: '1px',
            background: '#D4AF6A',
            opacity: 0.4,
            marginTop: '24px',
            marginBottom: '24px',
          },
        }),

        // Middle: fragrance info
        h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' } },
          // Fragrance image (if no SOTD photo but frag has image)
          !hasPhoto && fragImgUrl && h('img', {
            src: fragImgUrl,
            style: {
              width: '64px',
              height: '64px',
              borderRadius: '4px',
              objectFit: 'cover',
              marginBottom: '20px',
              border: '1px solid #221C18',
            },
          }),

          // Layer badges or primary frag
          layerBadges
            ? h('div', { style: { display: 'flex', flexDirection: 'column', marginBottom: '16px' } }, ...layerBadges)
            : h('div', { style: { display: 'flex', flexDirection: 'column', marginBottom: '16px' } },
                h('span', {
                  style: {
                    fontFamily: 'Cormorant Garamond',
                    fontSize: hasPhoto ? '42px' : '52px',
                    fontWeight: 400,
                    color: '#EDE7DC',
                    lineHeight: 1.1,
                    letterSpacing: '0.01em',
                  },
                }, truncate(fragName, 40)),
                brand && h('span', {
                  style: {
                    fontFamily: 'Inter',
                    fontSize: '13px',
                    fontWeight: 400,
                    color: '#554E48',
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    marginTop: '6px',
                  },
                }, brand),
              ),

          // Caption
          caption && h('div', {
            style: {
              display: 'flex',
              marginTop: '16px',
              padding: '14px 16px',
              background: '#1C1815',
              border: '1px solid #221C18',
              borderRadius: '3px',
            },
          },
            h('span', {
              style: {
                fontFamily: 'Cormorant Garamond',
                fontSize: '18px',
                fontStyle: 'italic',
                color: '#8A7E74',
                lineHeight: 1.5,
              },
            }, `"${caption}"`),
          ),
        ),

        // Bottom: user + date
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid #221C18',
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            user?.avatar_url
              ? h('img', {
                  src: user.avatar_url,
                  style: { width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' },
                })
              : h('div', {
                  style: {
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#8B2C4A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                },
                  h('span', {
                    style: { fontFamily: 'Cormorant Garamond', fontSize: '16px', color: '#EDE7DC' },
                  }, displayName.slice(0, 1).toUpperCase()),
                ),
            h('div', { style: { display: 'flex', flexDirection: 'column' } },
              h('span', {
                style: { fontFamily: 'Cormorant Garamond', fontSize: '17px', color: '#EDE7DC', lineHeight: 1.2 },
              }, displayName),
              handle && h('span', {
                style: { fontFamily: 'Inter', fontSize: '11px', color: '#554E48', marginTop: '1px' },
              }, handle),
            ),
          ),
          dateLabel && h('span', {
            style: {
              fontFamily: 'Inter',
              fontSize: '11px',
              fontWeight: 500,
              color: '#554E48',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            },
          }, dateLabel),
        ),
      ),
    );

    const imageResponse = new ImageResponse(card, {
      width: W,
      height: H,
      fonts: [
        { name: 'Cormorant Garamond', data: cormorantFont, style: 'normal', weight: 400 },
        { name: 'Inter', data: interFont, style: 'normal', weight: 400 },
      ],
    });

    // ImageResponse extends Response (Web API) — read as buffer
    const buf = Buffer.from(await imageResponse.arrayBuffer());

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(buf);

  } catch (err) {
    console.error('sotd-og-image error:', err);
    res.status(500).send('Error generating image');
  }
};
