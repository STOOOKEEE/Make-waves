"""Erase the baked-in caption from the chimp template, then write ours.

The supplied image was a finished meme (someone else's joke already on it). The background is a flat
214 grey, so the old text lifts out cleanly and what's left is the bare template.
"""
from PIL import Image, ImageDraw, ImageFont

SCALE = 2
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
TEXT = "no thanks i have a feeling"
ERASE = (0, 52, 492, 196)  # the old caption, left of the chimp
BOX = (28, 66, 470, 186)  # where ours goes
BG = (214, 214, 214)

im = Image.open("chimp_src.png").convert("RGB")
ImageDraw.Draw(im).rectangle(ERASE, fill=BG)
im = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS)

x0, y0, x1, y1 = (v * SCALE for v in BOX)
bw, bh = x1 - x0, y1 - y0
d = ImageDraw.Draw(im)


def wrap(text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if d.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


for size in range(140, 14, -1):
    font = ImageFont.truetype(FONT, size)
    lines = wrap(TEXT, font, bw)
    lh = int(size * 1.1)
    if len(lines) * lh <= bh and all(d.textlength(l, font=font) <= bw for l in lines):
        break

y = y0 + (bh - len(lines) * lh) / 2
for line in lines:
    d.text((x0, y), line, font=font, fill=(10, 10, 10))
    y += lh

im.save("tide_meme_feeling.png")
print("ok", im.size, "font", size, lines)
