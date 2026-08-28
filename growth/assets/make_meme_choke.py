from PIL import Image, ImageDraw, ImageFont

SCALE = 2
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
TEXT = "it's a long term hold now"
PAD = 26 * SCALE  # breathing room inside the caption bar

base = Image.open("ufc_template.png").convert("RGB")
base = base.resize((base.width * SCALE, base.height * SCALE), Image.LANCZOS)
W = base.width

probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
size = 90 * SCALE
while size > 10:
    font = ImageFont.truetype(FONT, size)
    if probe.textlength(TEXT, font=font) <= W - 2 * PAD:
        break
    size -= 1

asc, desc = font.getmetrics()
bar_h = asc + desc + 2 * PAD

out = Image.new("RGB", (W, base.height + bar_h), (255, 255, 255))
out.paste(base, (0, bar_h))
d = ImageDraw.Draw(out)
tw = d.textlength(TEXT, font=font)
d.text(((W - tw) / 2, PAD), TEXT, font=font, fill=(0, 0, 0))

out.save("tide_meme_longterm.png")
print("ok", out.size, "font", size)
