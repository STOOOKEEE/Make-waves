from PIL import Image, ImageDraw, ImageFont

SCALE = 2
ANGLE = 0  # the frame is drawn in perspective, a pure rotation over-corrects and reads worse
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

# safe rectangle inside the tilted photo frame, measured on the 1120x1432 blank
BOX = (398, 232, 654, 390)
TEXT = "your balance before you found leverage"

im = Image.open("grandpa_template.png").convert("RGB")
im = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS)

x0, y0, x1, y1 = (v * SCALE for v in BOX)
bw, bh = x1 - x0, y1 - y0

layer = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
d = ImageDraw.Draw(layer)


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


for size in range(90, 14, -1):
    font = ImageFont.truetype(FONT, size)
    lines = wrap(TEXT, font, bw)
    lh = int(size * 1.16)
    if len(lines) * lh <= bh and all(d.textlength(l, font=font) <= bw for l in lines):
        break

y = (bh - len(lines) * lh) / 2
for line in lines:
    w = d.textlength(line, font=font)
    d.text(((bw - w) / 2, y), line, font=font, fill=(20, 20, 20, 255))
    y += lh

layer = layer.rotate(ANGLE, resample=Image.BICUBIC, expand=True)
cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
im.paste(layer, (cx - layer.width // 2, cy - layer.height // 2), layer)

im.save("tide_meme_leverage.png")
print("ok", im.size, "font", size, "lines", lines)
