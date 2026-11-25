"""Generate the ARCore Augmented Image markers (A, B) used to align a track.

Run:  python docs/markers/make_markers.py

Writes, next to this script:
  marker_A.png, marker_B.png   reference images to register in the app (ARCore)
  markers_A3.pdf               one marker per page, 270 mm wide
  markers_A4.pdf               one marker per page, 180 mm wide

The shapes are seeded, but the letter font can differ between machines. If you regenerate,
reprint the markers too: the printed marker must match the reference PNG.
"""
import math
import random
import re
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

OUT = Path(__file__).parent
DPI = 300
SIZE = 3200  # drawing resolution in px, larger than the biggest printed marker
REF_PX = 1000  # ARCore needs >= 300 px; more does not improve detection
PAGES = {"A3": ((297, 420), 270), "A4": ((210, 297), 180)}  # page (w, h) mm, marker width mm
MARKERS = {"A": "trackseed-A", "B": "trackseed-B"}  # letter -> random seed


def px(mm: float) -> int:
    return round(mm / 25.4 * DPI)


def font(size: int) -> ImageFont.FreeTypeFont:
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


def marker(letter: str, seed: str) -> Image.Image:
    """Black-on-white scatter of random shapes: many unique corners, no repeating pattern."""
    rnd = random.Random(seed)
    im = Image.new("1", (SIZE, SIZE), 255)
    d = ImageDraw.Draw(im)
    for _ in range(200):
        x, y = rnd.uniform(0, SIZE), rnd.uniform(0, SIZE)
        # Mostly mid-sized polygons: corners are what ARCore tracks; big round blobs add few.
        r = SIZE * rnd.choice((0.015, 0.025, 0.035, 0.05, 0.065)) * rnd.uniform(0.7, 1.3)
        kind = rnd.choice((0, 1, 2, 2, 3, 3, 3))
        if kind == 0:
            d.ellipse((x - r, y - r, x + r, y + r), fill=0)
        elif kind == 1:
            d.ellipse((x - r, y - r, x + r, y + r), outline=0, width=max(6, int(r / 3)))
        else:
            n = 3 if kind == 2 else rnd.randint(4, 7)
            a0 = rnd.uniform(0, 2 * math.pi)
            pts = []
            for i in range(n):
                a, k = a0 + 2 * math.pi * i / n, r * rnd.uniform(0.5, 1.2)
                pts.append((x + k * math.cos(a), y + k * math.sin(a)))
            d.polygon(pts, fill=0)
    # Big letter with a white halo so people can tell the markers apart.
    d.text((SIZE / 2, SIZE / 2), letter, font=font(int(SIZE * 0.45)), fill=0, anchor="mm",
           stroke_width=SIZE // 60, stroke_fill=255)
    # Black frame: its outer edge is the marker width you measure and register in the app.
    d.rectangle((0, 0, SIZE - 1, SIZE - 1), outline=0, width=SIZE // 30)
    return im


def page(im: Image.Image, letter: str, page_mm: tuple[int, int], width_mm: int) -> Image.Image:
    w, h = px(page_mm[0]), px(page_mm[1])
    pg = Image.new("1", (w, h), 255)
    m, top = px(width_mm), px(15)
    pg.paste(im.resize((m, m), Image.NEAREST), ((w - m) // 2, top))
    d = ImageDraw.Draw(pg)
    small = font(px(4))
    y = top + m + px(8)
    d.text((w / 2, y), f"TrackSeed marker {letter}", font=font(px(7)), fill=0, anchor="mt")
    d.text((w / 2, y + px(11)), f"Print at 100 % (actual size). The black frame must measure {width_mm} mm.",
           font=small, fill=0, anchor="mt")
    # 100 mm bar to check the printer did not scale the page.
    bar_y, bar_x = y + px(20), (w - px(100)) // 2
    d.rectangle((bar_x, bar_y, bar_x + px(100), bar_y + px(3)), fill=0)
    d.text((w / 2, bar_y + px(5)), "100 mm", font=small, fill=0, anchor="mt")
    return pg


def main() -> None:
    images = {letter: marker(letter, seed) for letter, seed in MARKERS.items()}
    for letter, im in images.items():
        black = im.histogram()[0] / (SIZE * SIZE)
        assert 0.2 < black < 0.6, f"marker {letter}: {black:.0%} black, expected a busy but not solid image"
        im.convert("L").resize((REF_PX, REF_PX), Image.LANCZOS).save(OUT / f"marker_{letter}.png")

    diff = ImageChops.logical_xor(images["A"], images["B"]).histogram()[255] / (SIZE * SIZE)
    assert diff > 0.3, f"markers A and B are too alike ({diff:.0%} of pixels differ)"

    for name, (page_mm, width_mm) in PAGES.items():
        pages = [page(im, letter, page_mm, width_mm) for letter, im in images.items()]
        path = OUT / f"markers_{name}.pdf"
        pages[0].save(path, save_all=True, append_images=pages[1:], resolution=DPI)
        # The page size in the PDF sets the print scale, so check it is exactly the paper size.
        boxes = re.findall(rb"/MediaBox \[ ?0 0 ([\d.]+) ([\d.]+) ?\]", path.read_bytes())
        assert len(boxes) == len(pages), f"{path.name}: expected {len(pages)} pages, found {len(boxes)}"
        for bw, bh in boxes:
            got = (float(bw) / 72 * 25.4, float(bh) / 72 * 25.4)
            assert all(abs(g - e) < 0.5 for g, e in zip(got, page_mm)), f"{path.name}: page is {got} mm, not {page_mm}"
        print(f"{path.name}: {len(pages)} pages, {page_mm[0]}x{page_mm[1]} mm, marker {width_mm} mm")


if __name__ == "__main__":
    main()
