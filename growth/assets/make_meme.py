from PIL import Image, ImageDraw, ImageFont

SCALE = 3
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

# inner safe boxes measured on the 568x700 blank template (x0, y0, x1, y1)
BOXES = [(322, 40, 550, 140), (340, 272, 552, 362)]
LINES = ["you set a stop loss, right?", "yeah. then i closed the tab"]

im = Image.open("rock_template.jpg").convert("RGB")
im = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS)
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


for (x0, y0, x1, y1), text in zip(BOXES, LINES):
    x0, y0, x1, y1 = (v * SCALE for v in (x0, y0, x1, y1))
    bw, bh = x1 - x0, y1 - y0
    for size in range(90, 20, -1):
        font = ImageFont.truetype(FONT, size)
        lines = wrap(text, font, bw)
        lh = int(size * 1.18)
        if len(lines) * lh <= bh and all(d.textlength(l, font=font) <= bw for l in lines):
            break
    total = len(lines) * lh
    y = y0 + (bh - total) / 2
    for line in lines:
        w = d.textlength(line, font=font)
        d.text((x0 + (bw - w) / 2, y), line, font=font, fill=(0, 0, 0))
        y += lh

im.save("tide_meme_stoploss.png")
print("ok", im.size)
