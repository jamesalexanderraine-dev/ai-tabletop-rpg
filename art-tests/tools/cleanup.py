"""Detect and trim a flat border band (e.g. a cream print edge) that image models sometimes add."""
import sys
from PIL import Image, ImageStat

def border(im, max_frac=0.08, std_max=14, drift=28):
    g = im.convert("L"); W, H = g.size; out = {}
    def band(box): s = ImageStat.Stat(g.crop(box)); return s.mean[0], s.stddev[0]
    for side in ("top", "bottom", "left", "right"):
        n = int((H if side in ("top", "bottom") else W) * max_frac); ref = None; k = 0
        for i in range(n):
            box = {"top": (0, i, W, i + 1), "bottom": (0, H - 1 - i, W, H - i),
                   "left": (i, 0, i + 1, H), "right": (W - 1 - i, 0, W - i, H)}[side]
            m, sd = band(box)
            if ref is None: ref = m
            if sd > std_max or abs(m - ref) > drift: break
            k = i + 1
        out[side] = k if k >= 3 else 0
    return out

def trim(im, b):
    W, H = im.size
    return im.crop((b["left"], b["top"], W - b["right"], H - b["bottom"]))

if __name__ == "__main__":
    for p in sys.argv[1:]:
        b = border(Image.open(p)); print(p.split("/")[-1], b if any(b.values()) else "no border")

def classify(im, max_frac=0.08):
    """clean: nothing to do. trim: a frame that ends inside the image on 2+ sides. reject: a light 'page' around a small picture.
    A flat band that runs the full search depth is a background (dark flat portrait grounds), not a frame."""
    b = border(im, max_frac)
    W, H = im.size
    lim = {"top": int(H * max_frac), "bottom": int(H * max_frac), "left": int(W * max_frac), "right": int(W * max_frac)}
    g = im.convert("L")
    light_full = [s for s in b if b[s] >= lim[s] - 1 and ImageStat.Stat(g.crop(
        {"top": (0, 0, W, 4), "bottom": (0, H - 4, W, H), "left": (0, 0, 4, H), "right": (W - 4, 0, W, H)}[s])).mean[0] > 190]
    if light_full: return "reject", b
    frame = {s: v for s, v in b.items() if 0 < v < lim[s] - 1}
    if len(frame) >= 2: return "trim", frame
    return "clean", {}

def gutters(im, depth=0.12, light=200):
    """Cut past panel gutters: rows/cols near an edge that are far lighter than the image's typical row/col
    (catches straight and slanted white gutters). Returns pixels to trim per side."""
    import statistics
    g = im.convert("L"); W, H = g.size; px = g.load()
    xs, ys = range(0, W, 4), range(0, H, 4)
    row = [sum(1 for x in xs if px[x, y] > light) / len(xs) for y in range(H)]
    col = [sum(1 for y in ys if px[x, y] > light) / len(ys) for x in range(W)]
    tr = max(0.2, 3 * statistics.median(row)); tc = max(0.2, 3 * statistics.median(col))
    out = {}
    out["top"] = max([y + 1 for y in range(int(H * depth)) if row[y] > tr], default=0)
    out["bottom"] = max([H - y for y in range(H - int(H * depth), H) if row[y] > tr], default=0)
    out["left"] = max([x + 1 for x in range(int(W * depth)) if col[x] > tc], default=0)
    out["right"] = max([W - x for x in range(W - int(W * depth), W) if col[x] > tc], default=0)
    return out

def clean_frame(im, kind):
    """Final crop for use. kind: 'portrait' (always zoom in ~10%) or 'scene' (trim any frame, then re-crop to 16:9)."""
    W, H = im.size
    if kind == "portrait":
        c, b = classify(im)
        inset = max([0.05 if c == "clean" else 0.10] + [v / W + 0.03 for v in b.values()])
        d = int(W * inset)
        return im.crop((d, d, W - d, H - d)), "ok"
    c, b = classify(im)
    if c == "reject": return im, "reject"
    if c == "trim":
        im = trim(im, {s: b.get(s, 0) for s in ("top", "bottom", "left", "right")})
    gt = gutters(im)
    if any(gt.values()) or c == "trim":
        im = trim(im, gt)
        w, h = im.size; d = int(min(w, h) * 0.02)
        im = im.crop((d, d, w - d, h - d))
    w, h = im.size; target = 16 / 9
    if w / h > target: nw = int(h * target); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    elif w / h < target: nh = int(w / target); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im, "ok"
