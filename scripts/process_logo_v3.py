"""Task 12: logo v3 — darken the tagline band for easy readability,
regenerate header/footer derivatives, and export a square mark-only PNG
for app surfaces (guest 'Powered by', etc.)."""
from PIL import Image, ImageFilter
import numpy as np

UP = '/home/z/my-project/upload/'
OUT = '/home/z/my-project/public/brand/'
APP = '/home/z/my-project/src/app/'

DARKEN = 0.45  # multiply tagline-band RGB toward dark slate for readability


def dilate_band_alpha(im, x_min):
    """Thicken tagline strokes: 1px max-filter dilation of the alpha channel
    inside the detected band (left of x_min untouched)."""
    a = np.array(im)
    zone = a[:, x_min:, 3]
    rows = (zone > 20).sum(axis=1)
    blocks, start = [], None
    for i, c in enumerate(rows):
        if c > 0 and start is None:
            start = i
        elif c == 0 and start is not None:
            blocks.append((start, i - 1)); start = None
    if start is not None:
        blocks.append((start, len(rows) - 1))
    y0, y1 = blocks[-1]
    pad = 2
    sub = Image.fromarray(a[max(0, y0 - pad):y1 + 1 + pad, x_min:, 3])
    dil = sub.filter(ImageFilter.MaxFilter(3))
    a[max(0, y0 - pad):y1 + 1 + pad, x_min:, 3] = np.array(dil)
    print(f'  dilated band rows {y0}-{y1}')
    return Image.fromarray(a)


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
    return Image.fromarray(out)


def boost_tagline_alpha(im, x_min, target_mean=238):
    """Footer variant: tagline is dark-navy ink at LOW ALPHA (washed out on the
    white plate). Find the last content row-band right of x_min and scale alpha
    up so the tagline renders as solid as the wordmark."""
    a = np.array(im).astype(np.float64)
    zone = a[:, x_min:, 3]
    rows = (zone > 20).sum(axis=1)
    blocks, start = [], None
    for i, c in enumerate(rows):
        if c > 0 and start is None:
            start = i
        elif c == 0 and start is not None:
            blocks.append((start, i - 1)); start = None
    if start is not None:
        blocks.append((start, len(rows) - 1))
    y0, y1 = blocks[-1]
    band = a[y0:y1 + 1, x_min:, 3]
    on = band > 20
    mean_before = band[on].mean()
    factor = target_mean / max(mean_before, 1)  # a few core pixels clip at 255 — visually harmless
    a[y0:y1 + 1, x_min:, 3] = np.clip(band * factor, 0, 255)
    print(f'  tagline band rows {y0}-{y1}, alpha mean {mean_before:.0f} -> {(band[on].mean()):.0f} (factor {factor:.2f})')
    return Image.fromarray(a.astype(np.uint8))


def darken_band_rgb(im, x_min, factor=DARKEN):
    """Header variant: tagline is SOLID light-slate ink -> darken its RGB."""
    a = np.array(im).astype(np.float64)
    zone = a[:, x_min:, 3]
    rows = (zone > 20).sum(axis=1)
    blocks, start = [], None
    for i, c in enumerate(rows):
        if c > 0 and start is None:
            start = i
        elif c == 0 and start is not None:
            blocks.append((start, i - 1)); start = None
    if start is not None:
        blocks.append((start, len(rows) - 1))
    y0, y1 = blocks[-1]
    band = a[y0:y1 + 1, x_min:, :3]
    mask2d = (a[y0:y1 + 1, x_min:, 3] > 0)
    before = band[mask2d].mean(axis=0)
    a[y0:y1 + 1, x_min:, :3] = np.where(mask2d[..., None], band * factor, band)
    print(f'  tagline band rows {y0}-{y1}, mean RGB {before.astype(int)} -> {(band[mask2d].mean(axis=0)).astype(int)}')
    return Image.fromarray(a.astype(np.uint8))


# ---- 1. Header logo: crop + chroma removal + tagline darkening + sharpen ----
im = Image.open(UP + 'Logo - Sensiblee.png').convert('RGBA')
crop = im.crop((280, 217, 1494, 532))
a = np.array(crop).astype(int)
rgb, alpha = a[..., :3], a[..., 3]
dist = np.abs(rgb - np.array([251, 249, 244])).sum(axis=2)
a[..., 3] = np.minimum(alpha, np.clip((dist - 12) * 12, 0, 255).astype(np.uint8))
print('logo-header.png')
header = sharpen_rgba(dilate_band_alpha(darken_band_rgb(Image.fromarray(a.astype(np.uint8)), x_min=340), x_min=340))
header.save(OUT + 'logo-header.png')
print('  saved', header.size)

# ---- 2. Footer logo: transparent crop + tagline alpha boost + dilate + sharpen ----
im2 = Image.open(UP + 'trans-Logo - Sensiblee.png').convert('RGBA')
print('logo-footer.png')
footer = sharpen_rgba(dilate_band_alpha(boost_tagline_alpha(im2.crop((99, 172, 1687, 586)), x_min=460), x_min=460))
footer.save(OUT + 'logo-footer.png')
print('  saved', footer.size)

# ---- 3. Square mark-only PNG (for tiny 'Powered by' chips in app surfaces) ----
mark_zone = im2.crop((90, 160, 560, 610))
ma = np.array(mark_zone)
ys, xs = np.nonzero(ma[..., 3] > 20)
mark = mark_zone.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
CANVAS = 512
FIT = int(CANVAS * 0.88)
scale = min(FIT / mark.width, FIT / mark.height)
mw, mh = max(1, round(mark.width * scale)), max(1, round(mark.height * scale))
canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
m = mark.resize((mw, mh), Image.LANCZOS)
canvas.paste(m, ((CANVAS - mw) // 2, (CANVAS - mh) // 2), m)
canvas.save(OUT + 'logo-mark.png')
print('logo-mark.png', canvas.size)
