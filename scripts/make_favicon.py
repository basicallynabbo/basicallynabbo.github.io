"""Favicon set: an "n_" monogram echoing the "nabbo_" site title, a Fraunces "n" with the red cursor underscore on an
ink tile (dark, so it reads on both light and dark browser tabs).

    python3 scripts/make_favicon.py --fonts DIR

DIR holds Fraunces.ttf (variable) from github.com/google/fonts. Writes assets/favicon.svg, assets/favicon-32.png and
assets/apple-touch-icon.png. The letter is drawn as an outline, since a favicon cannot load a web font.
"""
import argparse
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
INK, PAPER, SEAL = '#15120e', '#f7f3ec', '#c4412f'  # seal a touch brighter than the page's, to hold up at 16 px
# Layout in a 32-unit square. The "n" and the underscore are centred together; BAR is filled in by glyph().
TILE_R = 7
N_HEIGHT = 14.5          # x-height of the "n"
BASELINE = 22.5
GAP, BAR_W, BAR_H = 1.0, 5.6, 2.5
BAR = None


def glyph(fonts):
    font = instantiateVariableFont(TTFont(str(fonts / 'Fraunces.ttf')),
                                   {'opsz': 48, 'wght': 760, 'SOFT': 0, 'WONK': 0})
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord('n')]
    s = N_HEIGHT / font['OS/2'].sxHeight
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    x0, _, x1, _ = bp.bounds
    ink_w = (x1 - x0) * s
    left = (32 - (ink_w + GAP + BAR_W)) / 2
    global BAR
    BAR = (left + ink_w + GAP, BASELINE - BAR_H, BAR_W, BAR_H)
    # Font units are y-up; flip into SVG's y-down, with the baseline at BASELINE and the ink's left edge at `left`.
    pen = SVGPathPen(gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
    gs[name].draw(TransformPen(pen, (s, 0, 0, -s, left - x0 * s, BASELINE)))
    return pen.getCommands()


def svg(path_d):
    x, y, w, h = BAR
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">\n'
            f'  <rect width="32" height="32" rx="{TILE_R}" fill="{INK}"/>\n'
            f'  <path d="{path_d}" fill="{PAPER}"/>\n'
            f'  <rect x="{x:.2f}" y="{y:.2f}" width="{w}" height="{h}" rx="0.6" fill="{SEAL}"/>\n'
            f'</svg>\n')


def png(path_d, size, out, rounded=True):
    # Draw at 16x with PIL's polygon fill, then downsample, so the edges come out antialiased.
    from fontTools.svgLib.path import parse_path
    from fontTools.pens.recordingPen import RecordingPen
    k = size * 16 / 32
    big = Image.new('RGBA', (size * 16, size * 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    if rounded:
        d.rounded_rectangle([0, 0, size * 16 - 1, size * 16 - 1], radius=TILE_R * k, fill=INK)
    else:  # iOS rounds the corners itself
        d.rectangle([0, 0, size * 16, size * 16], fill=INK)
    rec = RecordingPen()
    parse_path(path_d, rec)
    for poly in polygons(rec.value):
        d.polygon([(px * k, py * k) for px, py in poly], fill=PAPER)
    x, y, w, h = BAR
    d.rounded_rectangle([x * k, y * k, (x + w) * k, (y + h) * k], radius=0.6 * k, fill=SEAL)
    big.resize((size, size), Image.LANCZOS).save(out, optimize=True)


def polygons(ops, steps=12):
    """Flatten pen operations into closed polygons. Fraunces' "n" has no counters, so plain fills are enough."""
    polys, cur, last = [], [], None
    for op, pts in ops:
        if op == 'moveTo':
            cur, last = [pts[0]], pts[0]
        elif op == 'lineTo':
            cur.append(pts[0]); last = pts[0]
        elif op == 'qCurveTo':
            # TrueType quadratics: implied on-curve points sit midway between consecutive off-curve points.
            offs, end = list(pts[:-1]), pts[-1]
            for i, c in enumerate(offs):
                e = end if i == len(offs) - 1 else ((c[0] + offs[i + 1][0]) / 2, (c[1] + offs[i + 1][1]) / 2)
                for t in range(1, steps + 1):
                    t /= steps
                    cur.append(((1 - t) ** 2 * last[0] + 2 * (1 - t) * t * c[0] + t * t * e[0],
                                (1 - t) ** 2 * last[1] + 2 * (1 - t) * t * c[1] + t * t * e[1]))
                last = e
        elif op == 'curveTo':
            c1, c2, e = pts
            for t in range(1, steps + 1):
                t /= steps
                cur.append(((1 - t) ** 3 * last[0] + 3 * (1 - t) ** 2 * t * c1[0] + 3 * (1 - t) * t * t * c2[0] + t ** 3 * e[0],
                            (1 - t) ** 3 * last[1] + 3 * (1 - t) ** 2 * t * c1[1] + 3 * (1 - t) * t * t * c2[1] + t ** 3 * e[1]))
            last = e
        elif op in ('closePath', 'endPath'):
            if cur:
                polys.append(cur)
            cur = []
    return polys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fonts', type=Path, required=True)
    path_d = glyph(ap.parse_args().fonts)
    (ROOT / 'assets/favicon.svg').write_text(svg(path_d))
    png(path_d, 32, ROOT / 'assets/favicon-32.png')
    png(path_d, 180, ROOT / 'assets/apple-touch-icon.png', rounded=False)
    print('wrote assets/favicon.svg, favicon-32.png, apple-touch-icon.png')


if __name__ == '__main__':
    main()
