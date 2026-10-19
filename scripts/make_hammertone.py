"""Generate the seamless hammertone-enamel tile used for the MANDATE instrument housing.

Toroidal Worley (cellular) noise gives hammered dimples; a normal map lit from the
upper left gives the beaten-metal sheen. Output: public/textures/hammertone.png.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

SIZE = 512
rng = np.random.default_rng(1966)


def worley(points: int, size: int) -> np.ndarray:
    pts = rng.random((points, 2)) * size
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    best = np.full((size, size), np.inf, dtype=np.float32)
    for px, py in pts:
        dx = np.abs(xx - px)
        dy = np.abs(yy - py)
        dx = np.minimum(dx, size - dx)
        dy = np.minimum(dy, size - dy)
        best = np.minimum(best, np.sqrt(dx * dx + dy * dy))
    return best / best.max()


def blur_wrap(a: np.ndarray, r: int) -> np.ndarray:
    out = a.copy()
    for _ in range(r):
        out = (out + np.roll(out, 1, 0) + np.roll(out, -1, 0) + np.roll(out, 1, 1) + np.roll(out, -1, 1)) / 5
    return out


coarse = worley(260, SIZE)
fine = worley(900, SIZE)
height = 0.7 * (coarse ** 0.8) + 0.3 * (fine ** 0.9)
height = blur_wrap(height, 3)

gx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * 6
gy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * 6
nz = np.ones_like(height)
norm = np.sqrt(gx * gx + gy * gy + nz * nz)
nx, ny, nz = -gx / norm, -gy / norm, nz / norm
light = np.array([-0.55, -0.6, 0.58])
light /= np.linalg.norm(light)
shade = nx * light[0] + ny * light[1] + nz * light[2]
shade = (shade - shade.mean()) / (shade.std() + 1e-6)

speck = rng.normal(0, 1, (SIZE, SIZE)).astype(np.float32)
speck = blur_wrap(speck, 1)

base = np.array([0x19, 0x21, 0x1D], dtype=np.float32)
lum = 1 + 0.055 * shade + 0.018 * speck + 0.03 * (height - height.mean())
rgb = np.clip(base[None, None, :] * lum[..., None], 0, 255).astype(np.uint8)

out = Path(sys.argv[1] if len(sys.argv) > 1 else "public/textures/hammertone.png")
out.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(rgb, "RGB").save(out)
print(out, rgb.reshape(-1, 3).min(0), rgb.reshape(-1, 3).max(0), rgb.reshape(-1, 3).mean(0).round(1))
