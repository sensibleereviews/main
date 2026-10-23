from PIL import Image
import numpy as np

up = '/home/z/my-project/upload/'
for name in ['Logo - Sensiblee.png', 'trans-Logo - Sensiblee.png']:
    im = Image.open(up + name).convert('RGBA')
    a = np.array(im)
    rgb = a[..., :3].astype(int)
    alpha = a[..., 3]
    # For opaque: background = most common corner color; mask = pixels far from bg
    # For transparent: mask = alpha > 20
    if name.startswith('trans'):
        mask = alpha > 20
        bg = None
    else:
        bg = a[5, 5, :3].tolist()
        dist = np.abs(rgb - np.array(bg)).sum(axis=2)
        mask = dist > 40
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    print(f"== {name}")
    print(f"  bg={bg} size={im.size}")
    print(f"  content bbox: x {cols.min()}..{cols.max()}  y {rows.min()}..{rows.max()}")
    # Row profile to find the gap between main lockup and descriptor line
    rowsum = mask.sum(axis=1)
    gaps = []
    in_gap = False
    for y in range(rows.min(), rows.max()):
        if rowsum[y] == 0 and not in_gap:
            in_gap = True; start = y
        elif rowsum[y] != 0 and in_gap:
            in_gap = False
            if y - start > 8: gaps.append((start, y))
    print(f"  horizontal gaps (>8px): {gaps}")
    # Dominant colors in content
    px = a[mask]
    from collections import Counter
    q = (px[:, :3] // 24 * 24)
    cc = Counter(map(tuple, q.tolist()))
    print(f"  top colors: {cc.most_common(6)}")
