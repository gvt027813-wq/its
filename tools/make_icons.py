#!/usr/bin/env python3
"""Generate FunLab's original PNG brand assets (app icons + OG cover).

Usage:  python3 tools/make_icons.py   (requires Pillow; run from repo root)
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "assets", "icons")
OG = os.path.join(ROOT, "assets", "og")
os.makedirs(ICONS, exist_ok=True)
os.makedirs(OG, exist_ok=True)

VIOLET = (124, 92, 255)
CORAL = (255, 107, 107)
AMBER = (255, 209, 102)
TEAL = (23, 183, 155)
PINK = (244, 93, 157)
SKY = (63, 157, 245)
WHITE = (255, 255, 255)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def diag_gradient(size, c1, c2):
    """Smooth diagonal two-colour gradient."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    denom = 2 * (size - 1)
    for y in range(size):
        for x in range(size):
            t = (x + y) / denom
            px[x, y] = (
                int(c1[0] + (c2[0] - c1[0]) * t),
                int(c1[1] + (c2[1] - c1[1]) * t),
                int(c1[2] + (c2[2] - c1[2]) * t),
            )
    return img


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def draw_flask(draw, x, y, s, color=WHITE, bubble_color=None):
    """Draw the FunLab flask glyph with its top-left corner at (x, y); s = size."""
    u = s / 512.0
    neck_w = 40 * u
    cx = x + s * 0.5
    flare = 138 * u
    body_top = y + 210 * u
    base = y + 408 * u
    # neck
    draw.rectangle([cx - neck_w / 2, y + 95 * u, cx + neck_w / 2, body_top], fill=color)
    # lip
    draw.rounded_rectangle([cx - 55 * u, y + 62 * u, cx + 55 * u, y + 100 * u], radius=18 * u, fill=color)
    # body (trapezoid + rounded base)
    draw.polygon([
        (cx - neck_w / 2, body_top - 10 * u),
        (cx + neck_w / 2, body_top - 10 * u),
        (cx + flare, base - 20 * u),
        (cx - flare, base - 20 * u),
    ], fill=color)
    draw.ellipse([cx - flare, base - 70 * u, cx + flare, base + 22 * u], fill=color)
    # bubbles punched in the brand colour suggest liquid inside
    if bubble_color:
        draw.ellipse([cx - 44 * u, y + 300 * u, cx - 10 * u, y + 334 * u], fill=bubble_color)
        draw.ellipse([cx + 4 * u, y + 252 * u, cx + 26 * u, y + 274 * u], fill=bubble_color)


def make_icon(size, path, maskable=False, full_bleed=False):
    grad = diag_gradient(size, VIOLET, CORAL)
    if not full_bleed:
        radius = int(size * 0.2)
        mask = rounded_mask(size, radius)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(grad, (0, 0), mask)
    else:
        out = grad.convert("RGBA")
    draw = ImageDraw.Draw(out)
    glyph = int(size * (0.62 if maskable else 0.74))
    gx = (size - glyph) // 2
    gy = (size - glyph) // 2
    # bubbles in the local gradient colour read as "liquid" cut-outs
    bubble = VIOLET if gx < size // 2 else CORAL
    draw_flask(draw, gx, gy, glyph, bubble_color=bubble)
    out.save(path, "PNG")
    print("wrote", os.path.relpath(path, ROOT))


def make_favicon_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#ff6b6b"/>
</linearGradient></defs>
<rect x="0" y="0" width="32" height="32" rx="9" fill="url(#g)"/>
<path d="M13.2 6.4h5.6M14.4 6.4v4.9c0 .6-.17 1.2-.5 1.7l-3.6 5.9c-1.3 2.2.24 5 2.8 5h5.8c2.56 0 4.1-2.8 2.8-5l-3.6-5.9a3.3 3.3 0 0 1-.5-1.7V6.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="14.6" cy="18.6" r="1.15" fill="#fff"/>
<circle cx="17.9" cy="15.9" r=".85" fill="#fff"/>
</svg>
'''
    path = os.path.join(ICONS, "favicon.svg")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg)
    print("wrote", os.path.relpath(path, ROOT))


def make_og_cover():
    W, H = 1200, 630
    img = diag_gradient(W, VIOLET, CORAL).convert("RGB")
    # subtle third colour wash in the corner
    wash = diag_gradient(H, TEAL, CORAL).resize((W, H))
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([W * 0.55, -H * 0.5, W * 1.4, H * 0.9], fill=90)
    img = Image.composite(wash, img, mask)

    draw = ImageDraw.Draw(img)
    # floating bubbles for depth
    for (bx, by, br, col) in [(1020, 120, 90, AMBER), (880, 420, 46, SKY), (1120, 330, 30, PINK), (980, 540, 18, WHITE)]:
        draw.ellipse([bx - br, by - br, bx + br, by + br], outline=col, width=10)

    # flask mark
    draw_flask(draw, 108, 96, 150)

    f_title = ImageFont.truetype(FONT_BOLD, 128)
    f_tag = ImageFont.truetype(FONT_REG, 46)
    f_small = ImageFont.truetype(FONT_REG, 30)
    draw.text((104, 300), "FunLab", font=f_title, fill=WHITE)
    draw.text((110, 452), "Tiny experiments. Big smiles.", font=f_tag, fill=(255, 244, 235))
    draw.text((110, 540), "10 free web experiments · no ads · works offline", font=f_small, fill=(255, 235, 225))

    img.save(os.path.join(OG, "og-cover.png"), "PNG", optimize=True)
    print("wrote assets/og/og-cover.png")


if __name__ == "__main__":
    make_icon(512, os.path.join(ICONS, "icon-512.png"))
    make_icon(192, os.path.join(ICONS, "icon-192.png"))
    make_icon(512, os.path.join(ICONS, "icon-maskable-512.png"), maskable=True, full_bleed=True)
    make_icon(192, os.path.join(ICONS, "icon-maskable-192.png"), maskable=True, full_bleed=True)
    make_icon(180, os.path.join(ICONS, "apple-touch-icon.png"), full_bleed=True)
    make_favicon_svg()
    make_og_cover()
    print("done.")
