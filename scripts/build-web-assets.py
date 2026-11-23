#!/usr/bin/env python3
"""Generate web-optimized, bleed-trimmed WebP assets from print-pack/ into public/assets/."""

import glob
import os
from PIL import Image

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRINT_PACK = os.path.join(REPO_ROOT, "print-pack")
PUBLIC_ASSETS = os.path.join(REPO_ROOT, "public", "assets")

# TGC Poker Card (825x1125 @ 300 DPI) has 37.5px bleed on each edge -> 750x1050 trim box
CARD_TRIM_BOX = (37, 37, 788, 1088)
CARD_WEB_SIZE = (480, 672)

# Room illustration inner frame inside 825x1125 room front PNGs
ROOM_ART_BOX = (88, 252, 737, 790)
ROOM_ART_SIZE = (480, 398)

# Booklet pages: keep full safe layout (small_booklet_page_01..16 are 825x1125)
BOOKLET_SIZE = (750, 1023)

# Face-centered square crops for the 4 Helper portrait tokens (aligned inside v3 Helper card art frames)
HELPER_AVATAR_CROPS = {
    "abba": ("01_Cards_Fronts/helper_01_abba.png", (275, 180, 555, 460)),
    "mommy": ("01_Cards_Fronts/helper_02_mommy.png", (355, 198, 615, 458)),
    "nael": ("01_Cards_Fronts/helper_03_nael.png", (285, 206, 555, 476)),
    "mekimi": ("01_Cards_Fronts/helper_04_mekimi.png", (235, 212, 515, 492)),
}


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def main() -> None:
    cards_out = os.path.join(PUBLIC_ASSETS, "cards")
    rooms_out = os.path.join(PUBLIC_ASSETS, "rooms-art")
    avatars_out = os.path.join(PUBLIC_ASSETS, "avatars")
    booklet_out = os.path.join(PUBLIC_ASSETS, "booklet")
    for d in (cards_out, rooms_out, avatars_out, booklet_out):
        ensure_dir(d)

    # 1. All card fronts & backs -> trimmed 480x672 WebP
    card_count = 0
    for sub in ("01_Cards_Fronts", "02_Cards_Backs"):
        for src in sorted(glob.glob(os.path.join(PRINT_PACK, sub, "*.png"))):
            stem = os.path.splitext(os.path.basename(src))[0]
            im = Image.open(src).convert("RGB")
            im = im.crop(CARD_TRIM_BOX).resize(CARD_WEB_SIZE, Image.Resampling.LANCZOS)
            im.save(os.path.join(cards_out, f"{stem}.webp"), "WEBP", quality=86, method=6)
            card_count += 1

    # 2. Room artwork crops for the 3x3 tabletop house grid
    room_count = 0
    for src in sorted(glob.glob(os.path.join(PRINT_PACK, "01_Cards_Fronts", "room_*.png"))):
        stem = os.path.splitext(os.path.basename(src))[0]
        im = Image.open(src).convert("RGB")
        im = im.crop(ROOM_ART_BOX).resize(ROOM_ART_SIZE, Image.Resampling.LANCZOS)
        im.save(os.path.join(rooms_out, f"{stem}.webp"), "WEBP", quality=88, method=6)
        room_count += 1

    # 3. Helper circular portrait avatars
    for key, (rel_src, box) in HELPER_AVATAR_CROPS.items():
        im = Image.open(os.path.join(PRINT_PACK, rel_src)).convert("RGB")
        im = im.crop(box).resize((240, 240), Image.Resampling.LANCZOS)
        im.save(os.path.join(avatars_out, f"{key}.webp"), "WEBP", quality=90, method=6)

    # 4. Illustrated 16-page Small Booklet
    booklet_count = 0
    for src in sorted(glob.glob(os.path.join(PRINT_PACK, "04_Small_Booklet", "*.png"))):
        stem = os.path.splitext(os.path.basename(src))[0]
        im = Image.open(src).convert("RGB")
        im = im.resize(BOOKLET_SIZE, Image.Resampling.LANCZOS)
        im.save(os.path.join(booklet_out, f"{stem}.webp"), "WEBP", quality=88, method=6)
        booklet_count += 1

    # 5. Cover family illustration for Start Screen hero
    cover = Image.open(os.path.join(PRINT_PACK, "04_Small_Booklet", "small_booklet_page_01.png")).convert("RGB")
    cover_art = cover.crop((174, 355, 651, 959)).resize((477, 604), Image.Resampling.LANCZOS)
    cover_art.save(os.path.join(PUBLIC_ASSETS, "cover_family.webp"), "WEBP", quality=90, method=6)

    total_kb = sum(
        os.path.getsize(p)
        for p in glob.glob(os.path.join(PUBLIC_ASSETS, "**", "*.webp"), recursive=True)
    ) / 1024
    print(f"Built {card_count} cards, {room_count} room art crops, 4 avatars, {booklet_count} booklet pages + cover ({total_kb:.1f} KB total)")


if __name__ == "__main__":
    main()
