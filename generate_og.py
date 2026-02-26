#!/usr/bin/env python3
"""Generate og-image.png for Sillage — 1200×630px"""

import io
import math
from PIL import Image, ImageDraw, ImageFilter
import cairosvg

# ── Canvas ──────────────────────────────────────────────────────────────────
W, H = 1200, 630
BG_COLOR = (10, 9, 9)   # near-black

canvas = Image.new("RGBA", (W, H), (*BG_COLOR, 255))

# ── Icon (icon-burgundy.png — real engraved tendril icon) ───────────────────
ICON_SIZE = 380          # final rendered size on the canvas

icon_src = Image.open("../sillage/assets/branding/icon-burgundy.png").convert("RGBA")
icon_src = icon_src.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)

# favicon-512.png already has a clean squircle alpha — composite directly
# Place icon centred vertically, left-aligned with generous margin
icon_x = 90
icon_y = (H - ICON_SIZE) // 2

# Create a dark-backed tile the same size so anti-aliased edge pixels
# composite against the correct dark colour (not white)
icon_bg = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (*BG_COLOR, 255))
icon_bg.alpha_composite(icon_src, (0, 0))

# Now paste the pre-composited tile onto the canvas (no mask needed — fully opaque)
canvas.paste(icon_bg.convert("RGB"), (icon_x, icon_y))

# ── Wordmark SVG → PNG ───────────────────────────────────────────────────────
WORDMARK_H = 110          # rendered height (was ~70-ish previously)

svg_data = open("wordmark-ivory.svg", "rb").read()

# Compute width to preserve aspect ratio: SVG viewBox is 817×268
SVG_W, SVG_H = 817, 268
wordmark_w = int(WORDMARK_H * SVG_W / SVG_H)

wm_png_data = cairosvg.svg2png(
    bytestring=svg_data,
    output_width=wordmark_w,
    output_height=WORDMARK_H,
)
wordmark = Image.open(io.BytesIO(wm_png_data)).convert("RGBA")

# ── Tagline text ─────────────────────────────────────────────────────────────
# We'll render tagline as SVG text using cairosvg for quality,
# then composite. Font: use a serif font via a small SVG snippet.
TAGLINE = "The scent trail left behind."
TAGLINE_SIZE = 34           # px
TAGLINE_COLOR = "#C8BFB3"   # warm off-white/cream

tagline_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="700" height="60">
  <text
    x="0" y="42"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="{TAGLINE_SIZE}"
    fill="{TAGLINE_COLOR}"
    letter-spacing="0.5"
  >{TAGLINE}</text>
</svg>"""

tagline_png = cairosvg.svg2png(bytestring=tagline_svg.encode(), scale=2)
tagline_img = Image.open(io.BytesIO(tagline_png)).convert("RGBA")
# Scale back down (we rendered @2x for crispness)
tagline_img = tagline_img.resize(
    (tagline_img.width // 2, tagline_img.height // 2), Image.LANCZOS
)

# ── Layout: text block centred vertically next to icon ───────────────────────
text_x = icon_x + ICON_SIZE + 80   # left edge of text block

# Total height of text block = wordmark + gap + tagline
GAP = 24
text_block_h = WORDMARK_H + GAP + tagline_img.height
text_y_start = (H - text_block_h) // 2

# Composite wordmark
canvas.alpha_composite(wordmark, (text_x, text_y_start))

# Composite tagline
tagline_y = text_y_start + WORDMARK_H + GAP
canvas.alpha_composite(tagline_img, (text_x, tagline_y))

# ── Save ─────────────────────────────────────────────────────────────────────
out = canvas.convert("RGB")
out.save("og-image.png", "PNG", optimize=True)
print(f"Saved og-image.png — {W}×{H}px")
print(f"  icon: {ICON_SIZE}×{ICON_SIZE}px at ({icon_x},{icon_y})")
print(f"  wordmark: {wordmark_w}×{WORDMARK_H}px")
print(f"  tagline rendered at {tagline_img.size}")
