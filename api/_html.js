/**
 * Shared HTML template for Sillage deep-link preview pages.
 * Generates full HTML with OG meta tags, back button, and Open-in-App CTA.
 */

// Set to a real cover PNG once one is created; null = no fallback image meta tag
const FALLBACK_OG_IMAGE = null;
const SITE_URL = 'https://sillageapp.com';

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string|null|undefined} str
 */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render a full HTML page.
 *
 * @param {object} opts
 * @param {string}  opts.title          — <title> content
 * @param {string}  opts.ogTitle        — og:title
 * @param {string}  opts.ogDescription  — og:description
 * @param {string}  [opts.ogImage]      — og:image URL (fallback to cover)
 * @param {string}  [opts.ogType]       — og:type (default "website")
 * @param {string}  opts.ogUrl          — og:url (canonical)
 * @param {string}  [opts.deepLink]     — sillage:// deep link to open in app
 * @param {string}  opts.body           — HTML body content (inner html, NOT full page)
 */
function renderPage({
  title,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  ogUrl,
  deepLink,
  body,
}) {
  const image = ogImage || FALLBACK_OG_IMAGE;
  const imageTag = image
    ? `\n  <meta property="og:image"       content="${esc(image)}" />\n  <meta name="twitter:image"       content="${esc(image)}" />`
    : '';

  const deepLinkScript = deepLink
    ? `
  <script>
    // Try to open the native app. If it fails (app not installed),
    // stay on this page (which already has a download CTA).
    function openInApp() {
      const appUrl = ${JSON.stringify(deepLink)};
      // Short delay to detect if the app opened (heuristic)
      let didNavigate = false;
      const t = setTimeout(() => {
        if (!didNavigate && !document.hidden) {
          // App not installed — show the install prompt
          const btn = document.getElementById('open-app-btn');
          if (btn) {
            btn.textContent = 'Get Sillage';
            btn.href = 'https://apps.apple.com/app/sillage/id6744213613';
          }
        }
      }, 1500);
      window.addEventListener('blur', () => {
        didNavigate = true;
        clearTimeout(t);
      }, { once: true });
      window.location.href = appUrl;
    }

    // Auto-open on page load (optional – uncomment to auto-redirect)
    // window.addEventListener('DOMContentLoaded', openInApp);
  </script>`
    : '';

  const openAppBtn = deepLink
    ? `<a id="open-app-btn" class="open-btn" href="${esc(deepLink)}" onclick="openInApp(); return false;">Open in Sillage</a>`
    : `<a class="open-btn" href="https://apps.apple.com/app/sillage/id6744213613">Get Sillage</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>

  <!-- Open Graph -->
  <meta property="og:title"       content="${esc(ogTitle)}" />
  <meta property="og:description" content="${esc(ogDescription)}" />
  <meta property="og:type"        content="${esc(ogType)}" />
  <meta property="og:url"         content="${esc(ogUrl)}" />
  <meta property="og:site_name"   content="Sillage" />${imageTag}

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="${image ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title"       content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDescription)}" />

  <!-- Canonical -->
  <link rel="canonical" href="${esc(ogUrl)}" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    img { display: block; max-width: 100%; }
    a { text-decoration: none; }

    :root {
      --bg:          #141110;
      --bg-surface:  #1C1815;
      --bg-elevated: #252018;
      --burgundy:    #8B2C4A;
      --gold:        #D4AF6A;
      --gold-muted:  #9A7D4A;
      --text-1:      #EDE7DC;
      --text-2:      #8A7E74;
      --text-3:      #554E48;
      --border:      #221C18;
      --border-mid:  #30271F;
      --font-d:      'Cormorant Garamond', Georgia, serif;
      --font-b:      'Inter', system-ui, sans-serif;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--text-1);
      font-family: var(--font-b);
      font-size: 16px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }

    /* ── Top bar ── */
    .topbar {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: rgba(20, 17, 16, 0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-2);
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 0.02em;
      cursor: pointer;
      border: none;
      background: none;
      padding: 6px 0;
      transition: color 0.2s;
    }
    .back-btn:hover { color: var(--text-1); }
    .back-btn svg { flex-shrink: 0; }

    .open-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      background: var(--burgundy);
      border-radius: 2px;
      color: var(--text-1);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.10em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .open-btn:hover { background: #A0334F; }

    /* ── Content wrapper ── */
    .content {
      max-width: 640px;
      margin: 0 auto;
      padding: 40px 20px 80px;
    }

    /* ── Cards ── */
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
    }
    .card + .card { margin-top: 16px; }

    .card-header {
      padding: 20px 20px 0;
    }
    .card-body {
      padding: 20px;
    }

    /* ── Typography ── */
    .display {
      font-family: var(--font-d);
      font-weight: 400;
      font-size: clamp(24px, 5vw, 36px);
      color: var(--text-1);
      line-height: 1.15;
      letter-spacing: 0.01em;
    }
    .display.italic { font-style: italic; }

    .label {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--gold-muted);
    }

    .body-text {
      font-size: 15px;
      font-weight: 300;
      color: var(--text-2);
      line-height: 1.8;
    }

    .meta-text {
      font-size: 13px;
      font-weight: 400;
      color: var(--text-3);
    }

    /* ── Avatar ── */
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--burgundy);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-d);
      font-size: 24px;
      font-weight: 400;
      color: var(--text-1);
      overflow: hidden;
      flex-shrink: 0;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }

    /* ── Profile row ── */
    .profile-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 20px;
    }
    .profile-info { flex: 1; min-width: 0; }
    .profile-name {
      font-family: var(--font-d);
      font-size: 26px;
      font-weight: 400;
      color: var(--text-1);
      line-height: 1.2;
    }
    .profile-handle {
      font-size: 13px;
      color: var(--text-3);
      margin-top: 2px;
    }
    .profile-bio {
      font-size: 14px;
      font-weight: 300;
      color: var(--text-2);
      line-height: 1.7;
      padding: 0 20px 20px;
    }

    /* ── Divider ── */
    .divider {
      height: 1px;
      background: var(--border);
      margin: 0 20px;
    }

    /* ── Fragrance list item ── */
    .frag-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s;
    }
    .frag-item:last-child { border-bottom: none; }
    .frag-item:hover { background: var(--bg-elevated); }

    .frag-num {
      font-family: var(--font-d);
      font-size: 18px;
      font-weight: 300;
      color: var(--gold);
      opacity: 0.5;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
    }

    .frag-img {
      width: 44px;
      height: 44px;
      border-radius: 4px;
      background: var(--bg-elevated);
      object-fit: cover;
      flex-shrink: 0;
    }
    .frag-img-placeholder {
      width: 44px;
      height: 44px;
      border-radius: 4px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-mid);
      flex-shrink: 0;
    }

    .frag-info { flex: 1; min-width: 0; }
    .frag-name {
      font-family: var(--font-d);
      font-size: 17px;
      font-weight: 400;
      color: var(--text-1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .frag-brand {
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-3);
      margin-top: 1px;
    }

    /* ── More items chip ── */
    .more-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      font-size: 13px;
      color: var(--text-3);
      font-style: italic;
      font-family: var(--font-d);
    }

    /* ── SOTD photo ── */
    .sotd-photo {
      width: 100%;
      max-height: 360px;
      object-fit: cover;
    }

    /* ── Mood tag ── */
    .mood-tag {
      display: inline-block;
      padding: 3px 10px;
      border: 1px solid var(--border-mid);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.08em;
      color: var(--gold-muted);
    }

    /* ── Date label ── */
    .date-label {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--text-3);
    }

    /* ── Download CTA ── */
    .download-cta {
      margin-top: 32px;
      padding: 24px 20px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      text-align: center;
    }
    .download-cta .cta-title {
      font-family: var(--font-d);
      font-size: 22px;
      font-weight: 400;
      color: var(--text-1);
      margin-bottom: 8px;
    }
    .download-cta .cta-sub {
      font-size: 14px;
      font-weight: 300;
      color: var(--text-2);
      margin-bottom: 20px;
    }
    .download-cta .cta-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 32px;
      background: var(--burgundy);
      border-radius: 2px;
      color: var(--text-1);
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }
    .download-cta .cta-btn:hover { background: #A0334F; }

    /* ── Collection type badge ── */
    .type-badge {
      display: inline-block;
      padding: 2px 8px;
      background: rgba(212,175,106,0.1);
      border: 1px solid rgba(212,175,106,0.2);
      border-radius: 2px;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--gold-muted);
    }

    /* ── Note / caption ── */
    .note-text {
      font-size: 15px;
      font-weight: 300;
      color: var(--text-2);
      line-height: 1.8;
      font-style: italic;
      padding: 16px 20px;
    }

    /* ── Responsive ── */
    @media (max-width: 480px) {
      .content { padding: 24px 16px 60px; }
      .topbar { padding: 12px 16px; }
      .open-btn { padding: 7px 14px; font-size: 11px; }
      .back-btn { font-size: 13px; }
    }
  </style>
  ${deepLinkScript}
</head>
<body>

  <!-- Top bar with back + open-in-app -->
  <div class="topbar">
    <button class="back-btn" onclick="if(history.length > 1 && document.referrer) { history.back(); } else { location.href = '${SITE_URL}'; }" aria-label="Go back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Back
    </button>
    ${openAppBtn}
  </div>

  <!-- Page content -->
  <div class="content">
    ${body}

    <!-- Download CTA -->
    <div class="download-cta">
      <p class="cta-title">The fragrance journal.</p>
      <p class="cta-sub">Log daily. Write real reviews. Find people who share your taste.</p>
      <a class="cta-btn" href="https://apps.apple.com/app/sillage/id6744213613">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-1.26.72-2.1 2.01-2.07 3.45.04 1.76 1.04 3.28 2.44 3.97a11.87 11.87 0 0 1-.42 1.2zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        Download on the App Store
      </a>
    </div>
  </div>

</body>
</html>`;
}

module.exports = { renderPage, esc };
