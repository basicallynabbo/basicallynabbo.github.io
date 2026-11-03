"""Link-preview card (1200x630) for the PIK3CA thesis page, in the site's paper colours and fonts.

    python3 scripts/make_og.py --fonts DIR

DIR holds Fraunces.ttf (variable) and PlexMono-Regular.ttf / PlexMono-Medium.ttf from github.com/google/fonts.
Writes assets/images/projects/pik3ca/og.png; the page points at it with `image:` in its front matter.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 630
PAPER, INK, INK_SOFT, SEAL, LINE = (247, 243, 236), (21, 18, 14), (87, 81, 69), (154, 47, 34), (196, 187, 169)


def fraunces(fonts, size, weight, opsz=144):
    f = ImageFont.truetype(str(fonts / 'Fraunces.ttf'), size)
    f.set_variation_by_axes([opsz, weight, 0, 0])  # opsz, wght, SOFT, WONK
    return f


def wrap(draw, text, font, width):
    lines, line = [], ''
    for word in text.split():
        trial = (line + ' ' + word).strip()
        if draw.textlength(trial, font=font) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line]


def figure(box_w, box_h):
    im = Image.open(ROOT / 'assets/images/projects/pik3ca/mutation-map.webp').convert('RGB')
    ImageDraw.Draw(im).rectangle([770, 70, im.width, 280], fill='white')  # drop the domain legend; the page has its own
    im.thumbnail((box_w, box_h), Image.LANCZOS)
    # Multiply onto paper so the figure's white background becomes the card's.
    return ImageChops.multiply(im, Image.new('RGB', im.size, PAPER))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fonts', type=Path, required=True)
    fonts = ap.parse_args().fonts
    mono = ImageFont.truetype(str(fonts / 'PlexMono-Regular.ttf'), 19)
    mono_md = ImageFont.truetype(str(fonts / 'PlexMono-Medium.ttf'), 19)
    title = fraunces(fonts, 54, 480)
    dek = fraunces(fonts, 24, 380, opsz=24)

    card = Image.new('RGB', (W, H), PAPER)
    fig = figure(470, 560)
    card.paste(fig, (W - fig.width - 48, (H - fig.height) // 2))
    d = ImageDraw.Draw(card)

    x, text_w = 72, 540
    d.text((x, 92), "MASTER'S THESIS  ·  2025–26", font=mono_md, fill=SEAL)
    y = 138
    for line in wrap(d, 'Benchmarking AI Tools for Mutation-Aware PIK3CA Recognition', title, text_w):
        d.text((x, y), line, font=title, fill=INK)
        y += 64
    y += 18
    for line in wrap(d, '300 drug–variant pairs. Affinity ranking works; every pose tool misses the allosteric pocket.', dek, text_w):
        d.text((x, y), line, font=dek, fill=INK_SOFT)
        y += 36
    d.line([(x, 520), (x + text_w, 520)], fill=LINE, width=1)
    d.text((x, 538), 'nabajitb.github.io/projects/pik3ca-benchmark', font=mono, fill=INK_SOFT)

    out = ROOT / 'assets/images/projects/pik3ca/og.png'
    card.save(out, optimize=True)
    print(out)


if __name__ == '__main__':
    main()
