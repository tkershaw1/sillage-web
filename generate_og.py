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

def remove_white_bg(img: Image.Image, threshold: int = 20) -> Image.Image:
    """Flood-fill from all four corners to make the white background transparent.

    Only pixels connected (8-connected BFS) to the corners that are near-white
    (all channels >= 255 - threshold) are made transparent. Interior light
    pixels (e.g. engraved tendrils) are left untouched because they are not
    reachable from the corners without passing through the burgundy icon body.
    """
    import numpy as np
    from collections import deque

    arr = img.convert("RGBA")
    data = list(arr.getdata())  # flat list of (R,G,B,A) tuples
    w, h = arr.size

    lo = 255 - threshold  # minimum channel value to count as "near-white"

    def is_near_white(idx):
        r, g, b, a = data[idx]
        return r >= lo and g >= lo and b >= lo

    visited = bytearray(w * h)  # 0 = unvisited

    queue = deque()

    # Seed from all four corners (and their immediate neighbours to handle
    # tiny sub-pixel anti-aliasing at the very edge)
    seeds = []
    for row in range(h):
        seeds.append(row * w + 0)
        seeds.append(row * w + (w - 1))
    for col in range(w):
        seeds.append(0 * w + col)
        seeds.append((h - 1) * w + col)

    for idx in seeds:
        if not visited[idx] and is_near_white(idx):
            visited[idx] = 1
            queue.append(idx)

    # 8-connected BFS
    while queue:
        idx = queue.popleft()
        r_i = idx // w
        c_i = idx % w
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r_i + dr, c_i + dc
                if 0 <= nr < h and 0 <= nc < w:
                    ni = nr * w + nc
                    if not visited[ni] and is_near_white(ni):
                        visited[ni] = 1
                        queue.append(ni)

    # Make all flood-filled pixels fully transparent
    new_data = []
    for idx, px in enumerate(data):
        if visited[idx]:
            new_data.append((px[0], px[1], px[2], 0))
        else:
            new_data.append(px)

    result = Image.new("RGBA", (w, h))
    result.putdata(new_data)
    return result


icon_src = Image.open("../sillage/assets/branding/icon-burgundy.png")
icon_src = remove_white_bg(icon_src, threshold=20)
icon_src = icon_src.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)

# Place icon centred vertically, left-aligned with generous margin
icon_x = 90
icon_y = (H - ICON_SIZE) // 2

# Composite icon (now with transparent background) directly onto the canvas
canvas.alpha_composite(icon_src, (icon_x, icon_y))

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
