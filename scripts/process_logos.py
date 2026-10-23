from PIL import Image
import numpy as np

up = '/home/z/my-project/upload/'
out = '/home/z/my-project/public/brand/'

# ---- Header logo: OPAQUE artwork, cropped to mark+wordmark+tagline, bg -> transparent ----
im = Image.open(up + 'Logo - Sensiblee.png').convert('RGBA')
crop = im.crop((280, 217, 1494, 532))  # main lockup, 12px padding, excludes descriptor line
a = np.array(crop).astype(int)
rgb, alpha = a[..., :3], a[..., 3]
bg = np.array([251, 249, 244])
dist = np.abs(rgb - bg).sum(axis=2)
new_alpha = np.clip((dist - 12) * 12, 0, 255).astype(np.uint8)  # smooth chroma removal
# keep pure-white-ish inner strokes of the mark intact (they differ from cream enough)
a[..., 3] = np.minimum(alpha, new_alpha)
res = Image.fromarray(a.astype(np.uint8))
res.save(out + 'logo-header.png')
print('logo-header.png', res.size)

# ---- Footer logo: TRANSPARENT artwork, cropped to main lockup ----
im2 = Image.open(up + 'trans-Logo - Sensiblee.png').convert('RGBA')
crop2 = im2.crop((99, 172, 1687, 586))
crop2.save(out + 'logo-footer.png')
print('logo-footer.png', crop2.size)

# ---- Full originals for reference / og-image use ----
Image.open(up + 'Logo - Sensiblee.png').save(out + 'sensiblee-logo-full.png')
Image.open(up + 'trans-Logo - Sensiblee.png').save(out + 'sensiblee-logo-full-trans.png')
print('full originals copied')
