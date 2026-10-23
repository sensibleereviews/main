"""Task 11: sharpen header/footer logo derivatives for tagline clarity +
derive favicon set (icon.png / favicon.ico / apple-icon.png) from the official mark."""
from PIL import Image, ImageFilter
import numpy as np

UP = '/home/z/my-project/upload/'
OUT = '/home/z/my-project/public/brand/'
APP = '/home/z/my-project/src/app/'


def sharpen_rgba(im, radius=1.4, percent=65, threshold=2):
    """Unsharp-mask an RGBA image without halo artifacts (premultiplied alpha)."""
    arr = np.array(im.convert('RGBA')).astype(np.float64)
    rgb, a = arr[..., :3], arr[..., 3:4] / 255.0
    premul = np.clip(rgb * a, 0, 255).astype(np.uint8)
    pm_s = np.array(Image.fromarray(premul).filter(
        ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold))).astype(np.float64)
    a_s = np.array(Image.fromarray(arr[..., 3].astype(np.uint8)).filter(
        ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold))).astype(np.float64)
    a2 = np.clip(a_s, 0, 255)[..., None] / 255.0
    rgb2 = np.where(a2 > 0.004, pm_s / np.maximum(a2, 1e-6), 0)
    out = np.dstack([np.clip(rgb2, 0, 255), np.clip(a2 * 255, 0, 255)]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


# ---- 1. Header logo v2: same crop + chroma removal as Task 10, plus sharpen ----
im = Image.open(UP + 'Logo - Sensiblee.png').convert('RGBA')
crop = im.crop((280, 217, 1494, 532))
a = np.array(crop).astype(int)
rgb, alpha = a[..., :3], a[..., 3]
bg = np.array([251, 249, 244])
dist = np.abs(rgb - bg).sum(axis=2)
new_alpha = np.clip((dist - 12) * 12, 0, 255).astype(np.uint8)
a[..., 3] = np.minimum(alpha, new_alpha)
header = sharpen_rgba(Image.fromarray(a.astype(np.uint8)))
header.save(OUT + 'logo-header.png')
print('logo-header.png', header.size)

# ---- 2. Footer logo v2: same transparent crop as Task 10, plus sharpen ----
im2 = Image.open(UP + 'trans-Logo - Sensiblee.png').convert('RGBA')
crop2 = im2.crop((99, 172, 1687, 586))
footer = sharpen_rgba(crop2)
footer.save(OUT + 'logo-footer.png')
print('logo-footer.png', footer.size)

# ---- 3. Favicon from the official mark (bubble + stars + sparkles) ----
mark_zone = im2.crop((90, 160, 560, 610))  # generous window around the mark, excludes tagline band
ma = np.array(mark_zone)
ys, xs = np.nonzero(ma[..., 3] > 20)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
mark = mark_zone.crop((x0, y0, x1 + 1, y1 + 1))
print('mark bbox in zone:', (x0, y0, x1, y1), '-> size', mark.size)

CANVAS = 512
FIT = int(CANVAS * 0.88)
scale = min(FIT / mark.width, FIT / mark.height)
mw, mh = max(1, round(mark.width * scale)), max(1, round(mark.height * scale))
mark_resized = mark.resize((mw, mh), Image.LANCZOS)

canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
canvas.paste(mark_resized, ((CANVAS - mw) // 2, (CANVAS - mh) // 2), mark_resized)
canvas.save(APP + 'icon.png')
print('icon.png', canvas.size)

# favicon.ico with 16/32/48 (keep transparency)
ico_sizes = [16, 32, 48]
canvas.save(APP + 'favicon.ico', format='ICO', sizes=[(s, s) for s in ico_sizes])
print('favicon.ico', ico_sizes)

# apple-icon.png: iOS flattens transparency to black -> render on white
apple_bg = Image.new('RGB', (180, 180), (255, 255, 255))
m180 = mark.resize((int(180 * 0.82 * mark.width / max(mark.width, mark.height)),
                    int(180 * 0.82 * mark.height / max(mark.width, mark.height))), Image.LANCZOS)
apple_bg.paste(m180, ((180 - m180.width) // 2, (180 - m180.height) // 2), m180)
apple_bg.save(APP + 'apple-icon.png')
print('apple-icon.png', apple_bg.size)
