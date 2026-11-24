#!/usr/bin/env python3
"""
Generate all 44 updated TGC print-ready card fronts + 15 updated Small Booklet pages (02-16)
for Preparing for Shabbat: Cooper Family Edition — v3 Simplified (D2*: 10 Team Chores + 8 Errands).

Specs enforced strictly:
- Exact 825 x 1125 px (2.75" x 3.75" full bleed at 300 DPI)
- RGB mode (no alpha channel), 300 DPI metadata
- >= 75px safe margin on all sides (78px 76px 76px 76px)
- Zero scrollbars, zero text overflow (checked via Playwright DOM measurement!)
- 100% lossless full-res artwork extracted directly from existing v2 cards
"""

import base64
import io
import os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FRONTS_DIR = ROOT / "print-pack" / "01_Cards_Fronts"
BOOKLET_DIR = ROOT / "print-pack" / "04_Small_Booklet"
ART_CACHE = Path(os.environ.get("SHABBAT_ART_CACHE", str(ROOT / ".art_cache")))
ART_CACHE.mkdir(parents=True, exist_ok=True)

ZONES = {
    "KITCHEN": {
        "name": "Kitchen",
        "color": "#D97706",
        "bg": "#FEF3C7",
        "icon": '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18.5 7.5a3.5 3.5 0 0 0-3.1-3.47A4.5 4.5 0 0 0 8.6 4.03 3.5 3.5 0 0 0 5.5 7.5c0 1.4.82 2.61 2 3.17V16a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-5.33c1.18-.56 2-1.77 2-3.17ZM7.5 18.5h9a1 1 0 0 1 0 2h-9a1 1 0 0 1 0-2Z"/></svg>',
    },
    "DOWNSTAIRS": {
        "name": "Downstairs",
        "color": "#0D9488",
        "bg": "#CCFBF1",
        "icon": '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="8.5" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    },
    "TABLE": {
        "name": "Table",
        "color": "#2563EB",
        "bg": "#DBEAFE",
        "icon": '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8.5 3.2c1.1 1.3 1.4 2.4.8 3.3-.5.7-1.6.7-2.1 0-.6-.9-.3-2 .8-3.3.2-.2.4-.2.5 0Zm7 0c1.1 1.3 1.4 2.4.8 3.3-.5.7-1.6.7-2.1 0-.6-.9-.3-2 .8-3.3.2-.2.4-.2.5 0ZM7 9h3v8h1.5v2.5h-6V17H7V9Zm7 0h3v8h1.5v2.5h-6V17H14V9Z"/></svg>',
    },
    "UPSTAIRS": {
        "name": "Upstairs",
        "color": "#7C3AED",
        "bg": "#F3E8FF",
        "icon": '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M4 19h16v-3h-3v-3h-3v-3h-3V7H8v3h3v3h3v3H4v3Zm12-13.5 1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.4L16 5.5Z"/></svg>',
    },
}

PEOPLE_ICON = '<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><circle cx="9" cy="8.5" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 18.5c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5v1h-11v-1Zm11.5 1v-1c0-1.6-.6-3-1.6-4.1.9-.5 2-.9 3.1-.9 2.5 0 4.5 1.8 4.5 4.2v1.8h-6Z"/></svg>'
WRENCH_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M21.7 6.3a5.5 5.5 0 0 1-7.2 6.8l-7.2 7.2a2.1 2.1 0 1 1-3-3l7.2-7.2a5.5 5.5 0 0 1 6.8-7.2l-2.9 2.9 3.4 3.4 2.9-2.9Z"/></svg>'
CLOCK_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>'

# Exact lossless inner artwork boxes detected from the original v2 PNGs
HELPER_ART_BOXES = {
    "helper_01_abba": (81, 141, 744, 506),
    "helper_02_mommy": (81, 141, 744, 556),
    "helper_03_nael": (81, 141, 744, 556),
    "helper_04_mekimi": (81, 141, 744, 506),
}

def extract_art_data_uri(filename: str) -> str:
    stem = Path(filename).stem
    cached = ART_CACHE / f"{stem}.png"
    if not cached.exists():
        src = FRONTS_DIR / filename
        im = Image.open(src).convert("RGB")
        if stem in HELPER_ART_BOXES:
            box = HELPER_ART_BOXES[stem]
        else:
            px = im.load()
            bcol = px[77, 360]
            def is_b(rgb):
                return sum(abs(a - b) for a, b in zip(rgb, bcol)) <= 12
            top_run = [y for y in range(110, 260) if is_b(px[412, y]) and is_b(px[250, y]) and is_b(px[575, y])]
            bot_run = [y for y in range(580, 720) if is_b(px[412, y]) and is_b(px[250, y]) and is_b(px[575, y])]
            yt = max(top_run) + 1
            yb = min(bot_run)
            box = (81, yt, 744, yb)
        crop = im.crop(box)
        crop.save(cached, "PNG")
    buf = cached.read_bytes()
    return "data:image/png;base64," + base64.b64encode(buf).decode("ascii")

def avatar_data_uri(helper_key: str) -> str:
    p = ROOT / "public" / "assets" / "avatars" / f"{helper_key}.webp"
    buf = p.read_bytes()
    return "data:image/webp;base64," + base64.b64encode(buf).decode("ascii")

def zone_badge(zone_id: str) -> str:
    z = ZONES[zone_id]
    return f'<span class="zone-badge" style="background:{z["color"]}">{z["icon"]}<span>{z["name"]}</span></span>'

BASE_CARD_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 825px;
  height: 1125px;
  overflow: hidden;
  font-family: 'DM Sans', 'Liberation Sans', 'DejaVu Sans', sans-serif;
  color: #1E293B;
  -webkit-font-smoothing: antialiased;
}
.card {
  width: 825px;
  height: 1125px;
  padding: 78px 76px 76px 76px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 21px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1;
  color: #FFFFFF;
}
.pill-outline {
  background: rgba(255,255,255,0.88);
  border: 2px solid currentColor;
  padding: 9px 20px;
}
.zone-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 16px;
  font-weight: 700;
  font-size: 21px;
  line-height: 1;
  color: #FFFFFF;
}
.arrow-sep {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0F172A;
}
.plus-sep {
  font-size: 28px;
  font-weight: 800;
  color: #991B1B;
}
.art-frame {
  width: 673px;
  border-radius: 26px;
  border: 5px solid #FFFFFF;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
  overflow: hidden;
  background: #FFFFFF;
  flex-shrink: 0;
}
.art-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.title {
  font-family: 'Baloo', 'Liberation Sans', 'DejaVu Sans', sans-serif;
  font-size: 46px;
  font-weight: 700;
  text-align: center;
  line-height: 1.12;
  color: #0F172A;
}
.rules-box {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 20px 24px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
  font-size: 23px;
  line-height: 1.38;
  color: #1E293B;
}
.rules-box-accent {
  border-left: 8px solid var(--accent);
}
.rules-box-bordered {
  border: 3px solid var(--border);
  font-weight: 600;
}
.power-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.power-card {
  background: #FFFFFF;
  border-radius: 20px;
  border-left: 8px solid var(--accent);
  padding: 18px 22px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}
.power-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.power-name {
  font-size: 26px;
  font-weight: 700;
  color: #0F172A;
}
.timing-pill {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 999px;
  color: var(--accent);
  background: var(--soft);
}
.power-text {
  font-size: 22px;
  line-height: 1.34;
  color: #1E293B;
}
.flavor {
  font-style: italic;
  font-size: 22px;
  line-height: 1.32;
  text-align: center;
  color: #475569;
  padding: 0 10px;
}
"""

def wrap_html(body: str, extra_css: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><style>{BASE_CARD_CSS}{extra_css}</style></head>
<body>{body}</body>
</html>"""

# -----------------------------------------------------------------------------
# 1. Helper Cards (4)
# -----------------------------------------------------------------------------
HELPERS_SPEC = [
    {
        "file": "helper_01_abba.png",
        "name": "ABBA",
        "accent": "#2563EB",
        "bg": "#EFF6FF",
        "art_h": 375,
        "powers": [
            ("Solo Cleanup", "YOUR TURN", "Flip a Red Blocked room you're in back to Clear all by yourself (1 Action — no teammate needed)."),
            ("Clutter Guard", "ALWAYS ON", "While Abba stands in a Cluttered room, Slow-Downs can't flip it Blocked (the Slow-Down is canceled!)."),
        ],
        "flavor": "“Flour on the counter? Fine. Total meltdown? Not on his watch.”",
    },
    {
        "file": "helper_02_mommy.png",
        "name": "MOMMY",
        "accent": "#DB2777",
        "bg": "#FDF2F8",
        "art_h": 425,
        "powers": [
            ("Errand Express", "YOUR TURN", "Once per turn, Pick Up or Deliver an Errand for FREE (in addition to your 2 Actions!). You may Pick Up or Deliver Errands even in a Cluttered room (not Blocked)."),
        ],
        "flavor": "“Tracking 47 things in her head and already three steps ahead.”",
    },
    {
        "file": "helper_03_nael.png",
        "name": "NAEL",
        "accent": "#059669",
        "bg": "#ECFDF5",
        "art_h": 425,
        "powers": [
            ("Learning Tower Power!", "ALWAYS ON", "While Nael and a teammate share a Cluttered room, either one can finish a Team Chore there on either player's turn (not Blocked)."),
        ],
        "flavor": "“Messy room? Doesn't stop the sous-chef.”",
    },
    {
        "file": "helper_04_mekimi.png",
        "name": "MEKIMI",
        "accent": "#7C3AED",
        "bg": "#F5F3FF",
        "art_h": 405,
        "powers": [
            ("Turbo Crawl", "YOUR TURN", "Whenever you spend 1 Action to Move, crawl straight into ANY room on the board!"),
        ],
        "flavor": "“One giant grin and suddenly she's already across the house.”",
    },
]

def render_helper_html(h: dict) -> str:
    art = extract_art_data_uri(h["file"])
    powers_html = "".join(
        f"""<div class="power-card">
            <div class="power-head">
                <span class="power-name">{pname}</span>
                <span class="timing-pill">{ptiming}</span>
            </div>
            <div class="power-text">{ptext}</div>
        </div>"""
        for pname, ptiming, ptext in h["powers"]
    )
    body = f"""
    <div class="card" style="--accent:{h['accent']}; --soft:{h['bg']}; background: linear-gradient(180deg, {h['bg']} 0%, #FFFBF2 46%, #FFFBF2 78%, {h['bg']} 100%);">
      <div class="top-bar">
        <span class="pill" style="background:{h['accent']}">HELPER</span>
        <span class="pill pill-outline" style="color:{h['accent']}; border-color:{h['accent']}44;">2 ACTIONS / TURN</span>
      </div>
      <div class="art-frame" style="height:{h['art_h']}px;"><img src="{art}" alt="{h['name']}"></div>
      <div class="title" style="color:{h['accent']}; font-size:52px; letter-spacing:0.03em;">{h['name']}</div>
      <div class="power-stack">{powers_html}</div>
      <div class="flavor">{h['flavor']}</div>
    </div>
    """
    return wrap_html(body)

# -----------------------------------------------------------------------------
# 2. Chore Cards (18: 10 Team Chores + 8 Errands)
# -----------------------------------------------------------------------------
CHORES_SPEC = [
    # 10 Team Chores
    ("chore_18_kumkum_plata.png", "TEAM", "Fill Kumkum & Set Plata Timer", "KITCHEN", None,
     "“Water topped all the way up and the Shabbat timer is looking good.”"),
    ("chore_27_learning_tower.png", "TEAM", "Learning Tower Bake-Off", "KITCHEN", None,
     "“Nael's on the tower—time to get the white sugar!”"),
    ("chore_31_clear_giant_island.png", "TEAM", "Clear the Giant Island", "KITCHEN", None,
     "“Wait... we actually have a countertop under there?!”"),
    ("chore_28_mamad_avalanche.png", "TEAM", "Mamad Toy Avalanche", "DOWNSTAIRS", None,
     "“A two-person scoop-and-bin operation.”"),
    ("chore_32_great_salon_reset.png", "TEAM", "The Great Salon Reset", "DOWNSTAIRS", None,
     "“Not a single rogue toy underfoot.”"),
    ("chore_20_high_chair_stack.png", "TEAM", "High Chair & Chair Stack", "TABLE", None,
     "“Unstack the extra chairs and pull the high chair into position.”"),
    ("chore_29_set_shabbat_table.png", "TEAM", "Set the Shabbat Table", "TABLE", None,
     "“Plates, cups, silverware—teamwork makes the dream work.”"),
    ("chore_33_shabbat_candles_ready.png", "TEAM", "Shabbat Candles Ready", "TABLE", None,
     "“Out of the cabinet, last week's wicks removed, waiting for sunset.”"),
    ("chore_21_shabbat_outfits.png", "TEAM", "Lay Out the Shabbat Outfits", "UPSTAIRS", None,
     "“Tiny shirts, clean diapers, and picking out super cute outfits.”"),
    ("chore_30_bath_splash_squad.png", "TEAM", "Bath Time Splash Squad", "UPSTAIRS", None,
     "“Soap, soap, soap!”"),

    # 8 Errands (exact 2/2/2/2 Start Zones)
    ("chore_17_challah_oven.png", "ERRAND", "Challah: Mixer to Oven", "KITCHEN", "TABLE",
     "“Kneaded in the mixer, baked golden, and carried right to the table.”"),
    ("chore_22_hbh_showstopper.png", "ERRAND", "Half Baked Harvest Showstopper", "KITCHEN", "TABLE",
     "“23 ingredients, 4 mixing bowls, zero regrets—straight to the table.”"),
    ("chore_23_shabbat_flowers.png", "ERRAND", "Shabbat Flowers to the Center", "DOWNSTAIRS", "TABLE",
     "“Put them with water in a vase on the table.”"),
    ("chore_25_herd_kids_baths.png", "ERRAND", "Herd the Kids Upstairs for Baths", "DOWNSTAIRS", "UPSTAIRS",
     "“Peel everyone away from the toys and up the stairs.”"),
    ("chore_19_dishwasher_round3.png", "ERRAND", "Dishwasher Round #3", "TABLE", "DOWNSTAIRS",
     "“Clear the last dishes off the table for strategic Friday dish-tetris.”"),
    ("chore_24_mystery_table_pile.png", "ERRAND", "Mystery Table Pile", "TABLE", "KITCHEN",
     "“Why is there a toy truck next to the Kiddush cup?”"),
    ("chore_26_dressed_kids_clean.png", "ERRAND", "Dressed Kids Downstairs—Keep 'Em Clean!", "UPSTAIRS", "DOWNSTAIRS",
     "“Steer freshly dressed kids straight down without touching anything sticky.”"),
    ("chore_34_everyone_shabbat_clothes.png", "ERRAND", "Everyone in Shabbat Clothes!", "UPSTAIRS", "TABLE",
     "“Clean, dressed, and spotless—straight to the Shabbat table!”"),
]

def zone_room_phrase(z: str) -> str:
    return "Kitchen" if z == "KITCHEN" else f"{ZONES[z]['name']} room"

def render_chore_html(c: tuple) -> str:
    fname, kind, title, z1, z2, flavor = c
    art = extract_art_data_uri(fname)
    zm = ZONES[z1]
    title_size = 40 if len(title) > 28 else 44

    if kind == "TEAM":
        left_pill = f'<span class="pill" style="background:#1E293B; color:#FFFFFF;">{PEOPLE_ICON}<span>TEAM CHORE</span></span>'
        right_pills = f'{zone_badge(z1)}<span class="zone-badge" style="background:#FFFFFF; color:#0F172A; border:2.5px solid #1E293B;">{PEOPLE_ICON}<span>2+</span></span>'
        rules = (
            f"With <strong>2 or more Helpers</strong> in a Clear <strong>{zone_room_phrase(z1)}</strong> "
            f"(or Cluttered if <strong>Nael</strong> is here), spend <strong>1 Action</strong> to finish this together!"
        )
    else:
        arrow_icon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
        arrow_sep = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="m14 6 6 6-6 6"/></svg>'
        left_pill = f'<span class="pill" style="background:#FFFFFF; color:#0F172A; border:3px solid #1E293B;">{arrow_icon}<span>ERRAND</span></span>'
        right_pills = f'{zone_badge(z1)}<span class="arrow-sep">{arrow_sep}</span>{zone_badge(z2)}'
        rules = (
            f"<strong>1 Action:</strong> Pick Up in a Clear <strong>{zone_room_phrase(z1)}</strong>, then "
            f"<strong>1 Action:</strong> Deliver in a Clear <strong>{zone_room_phrase(z2)}</strong>. "
            f"<em>(Mommy can do either in Cluttered rooms, plus 1 Free Errand/turn!)</em>"
        )

    body = f"""
    <div class="card" style="--accent:{zm['color']}; background: linear-gradient(180deg, {zm['bg']} 0%, #FFFBF2 34%, #FFFBF2 74%, {zm['bg']} 100%);">
      <div class="top-bar">
        {left_pill}
        <div class="top-right">{right_pills}</div>
      </div>
      <div class="art-frame" style="height:445px;"><img src="{art}" alt="{title}"></div>
      <div class="title" style="font-size:{title_size}px;">{title}</div>
      <div class="rules-box rules-box-accent">{rules}</div>
      <div class="flavor">{flavor}</div>
    </div>
    """
    return wrap_html(body)

# -----------------------------------------------------------------------------
# 3. Household Tool Cards (3 templates = 10 physical cards)
# -----------------------------------------------------------------------------
TOOLS_SPEC = [
    {
        "file": "tool_35_38_ice_coffee_boost_QTY4.png",
        "title": "Ice Coffee Boost",
        "badge": "REUSABLE TOOL",
        "accent": "#0F766E",
        "bg": "#F0FDFA",
        "border": "#99F6E4",
        "rules": "1 Action (any room): Turn 1 or 2 Cluttered rooms anywhere back to Clear (doesn't work on Blocked rooms), then put this card in Event Discard.",
        "flavor": "“Caffeine hits and two rooms get cleared in record time.”",
    },
    {
        "file": "tool_39_41_strategic_snack_summons_QTY3.png",
        "title": "Strategic Snack Summons",
        "badge": "REUSABLE TOOL",
        "accent": "#0369A1",
        "bg": "#F0F9FF",
        "border": "#BAE6FD",
        "rules": "1 Action (any room): Move any teammate from anywhere straight into your room (carried Errands travel with them!), then put this card in Event Discard.",
        "flavor": "“Crinkle one snack bag and watch everyone materialize.”",
    },
    {
        "file": "tool_42_44_cousin_aviel_drops_by_QTY3.png",
        "title": "Cousin Aviel Drops By!",
        "badge": "ONE-TIME SHIELD",
        "accent": "#B45309",
        "bg": "#FFFBEB",
        "border": "#FDE68A",
        "rules": "1 Action (any room): Place on the next unshielded face-down Clock card. When it blocks a Clock flip, return this card to the box.",
        "flavor": "“Game co-designer to the rescue—buying you extra time before sunset!”",
    },
]

def render_tool_html(t: dict) -> str:
    art = extract_art_data_uri(t["file"])
    body = f"""
    <div class="card" style="--accent:{t['accent']}; --border:{t['border']}; background: linear-gradient(180deg, {t['bg']} 0%, #FFFBF2 36%, #FFFBF2 74%, {t['bg']} 100%);">
      <div class="top-bar">
        <span class="pill" style="background:{t['accent']};">{WRENCH_ICON}<span>HOUSEHOLD TOOL</span></span>
        <span class="pill pill-outline" style="color:{t['accent']}; border-color:{t['accent']}55;">{t['badge']}</span>
      </div>
      <div class="art-frame" style="height:455px;"><img src="{art}" alt="{t['title']}"></div>
      <div class="title" style="color:{t['accent']}; font-size:44px;">{t['title']}</div>
      <div class="rules-box rules-box-bordered">{t['rules']}</div>
      <div class="flavor">{t['flavor']}</div>
    </div>
    """
    return wrap_html(body)

# -----------------------------------------------------------------------------
# 4. Slow-Down Cards (18: Universal Cluttered-First — NO 1ST/2ND/3RD!)
# -----------------------------------------------------------------------------
SLOW_DOWNS_SPEC = [
    ("slowdown_45_missing_ingredient.png", "SINGLE", "Wait—Where's That Ingredient?!", ["KITCHEN"],
     "“Fridge and cabinet excavation begins.”"),
    ("slowdown_46_sticky_counter.png", "SINGLE", "Sticky Counter Situation", ["KITCHEN"],
     "“Every spoon in the house is somehow dirty.”"),
    ("slowdown_47_fridge_tetris.png", "SINGLE", "Fridge Tetris Crisis", ["KITCHEN"],
     "“How are we fitting three giant Shabbat pots in here?!”"),
    ("slowdown_48_fresh_toy_dump.png", "SINGLE", "Fresh Toy Dump!", ["DOWNSTAIRS"],
     "“One entire bin just got flipped upside down.”"),
    ("slowdown_49_mekimi_found_something.png", "SINGLE", "Mekimi Found Something!", ["DOWNSTAIRS"],
     "“Fastest crawler in Givot Eden strikes again.”"),
    ("slowdown_50_surprise_sink_stack.png", "SINGLE", "Surprise Sink Stack", ["DOWNSTAIRS"],
     "“Where did four more pots just come from?!”"),
    ("slowdown_51_dishwasher_running.png", "SINGLE", "Dishwasher Still Running!", ["DOWNSTAIRS"],
     "“45 minutes left and the sink is already full again.”"),
    ("slowdown_52_table_magnet.png", "SINGLE", "The Table Magnet Effect", ["TABLE"],
     "“Mail, keys, backpacks, and random stuff appear.”"),
    ("slowdown_53_kiddush_cup_takeover.png", "SINGLE", "Kiddush Cup Takeover!", ["TABLE"],
     "“Nael just emptied the entire kiddush cup shelf.”"),
    ("slowdown_54_out_of_candles.png", "SINGLE", "Out of Shabbat Candles!", ["TABLE"],
     "“Empty box in the cabinet—emergency backup hunt!”"),
    ("slowdown_55_wrong_tablecloth.png", "SINGLE", "Wrong Tablecloth Size!", ["TABLE"],
     "“Grabbed the giant chag tablecloth by mistake.”"),
    ("slowdown_56_diaper_detour.png", "SINGLE", "Diaper Detour!", ["UPSTAIRS"],
     "“Stop everything—we need wipes and a backup outfit.”"),
    ("slowdown_57_bath_escape_artist.png", "SINGLE", "Bath-Time Escape Artist!", ["UPSTAIRS"],
     "“Fresh out of the tub and sprinting down the hallway.”"),
    ("slowdown_58_not_that_shirt.png", "SINGLE", "“Not THAT Shirt!”", ["UPSTAIRS"],
     "“Last-minute Shabbat outfit negotiation.”"),
    ("slowdown_59_surprise_book_pile.png", "SINGLE", "Surprise Book Pile", ["UPSTAIRS"],
     "“Twenty picture books just materialized on the bedroom floor.”"),
    ("slowdown_60_bamba_trail.png", "DOUBLE", "Challah Flour Trail!", ["KITCHEN", "DOWNSTAIRS"],
     "“Started at the island, left tiny handprints on the couch.”"),
    ("slowdown_61_whirlwind.png", "DOUBLE", "Table-to-Upstairs Whirlwind!", ["TABLE", "UPSTAIRS"],
     "“Two zones hit in one sweep.”"),
    ("slowdown_62_what_time.png", "TIME_FLIES", "“Wait—Shabbat Is at WHAT Time?!”", ["KITCHEN"],
     "“Winter Friday strikes again!”"),
]

def render_slowdown_html(s: tuple) -> str:
    fname, kind, title, zones, flavor = s
    art = extract_art_data_uri(fname)
    title_size = 40 if len(title) > 26 else 44

    if kind == "SINGLE":
        z = zones[0]
        left_pill = '<span class="pill" style="background:#B91C1C;">SLOW-DOWN</span>'
        right_pills = zone_badge(z)
        rules = (
            f"Scan <strong>{ZONES[z]['name']}</strong> rooms left to right, top to bottom (skip Blocked):<br>"
            f"Flip the <strong>1st Cluttered</strong> room to <strong>Blocked</strong>! "
            f"If none are Cluttered, turn the <strong>1st Clear</strong> room sideways (<strong>Cluttered</strong>)."
        )
    elif kind == "DOUBLE":
        z1, z2 = zones
        left_pill = '<span class="pill" style="background:#991B1B;">DOUBLE TROUBLE</span>'
        right_pills = f'{zone_badge(z1)}<span class="plus-sep">+</span>{zone_badge(z2)}'
        rules = (
            f"<strong>Double Slow-Down!</strong> Resolve a <strong>{ZONES[z1]['name']}</strong> Slow-Down first, "
            f"then a <strong>{ZONES[z2]['name']}</strong> Slow-Down <em>(for each zone, scan left to right, top to bottom: "
            f"flip the 1st Cluttered room to Blocked, else turn the 1st Clear room Cluttered!)</em>"
        )
    else:
        left_pill = '<span class="pill" style="background:#9A3412;">TIME FLIES!</span>'
        right_pills = f'<span class="zone-badge" style="background:#D97706;">{CLOCK_ICON}<span>+1 FLIP</span></span>{zone_badge("KITCHEN")}'
        rules = (
            "<strong>1.</strong> Flip the next Clock card (unless Cousin Aviel blocks it).<br>"
            "<strong>2.</strong> Resolve a <strong>Kitchen</strong> Slow-Down: flip the 1st Cluttered Kitchen to Blocked, else turn the 1st Clear Kitchen sideways.<br>"
            "<strong>3.</strong> Return this card to the box."
        )

    body = f"""
    <div class="card" style="--accent:#B91C1C; background: linear-gradient(180deg, #FEF2F2 0%, #FFFBF2 34%, #FFFBF2 74%, #FEE2E2 100%);">
      <div class="top-bar">
        {left_pill}
        <div class="top-right">{right_pills}</div>
      </div>
      <div class="art-frame" style="height:445px; border-color:#FECACA;"><img src="{art}" alt="{title}"></div>
      <div class="title" style="color:#7F1D1D; font-size:{title_size}px;">{title}</div>
      <div class="rules-box rules-box-accent" style="font-size:21.5px;">{rules}</div>
      <div class="flavor">{flavor}</div>
    </div>
    """
    return wrap_html(body)

# -----------------------------------------------------------------------------
# 5. Clock Card: Friday Afternoon (1 template = 9 physical cards)
# -----------------------------------------------------------------------------
def render_friday_afternoon_html() -> str:
    art = extract_art_data_uri("clock_63_71_friday_afternoon_QTY9.png")
    body = f"""
    <div class="card" style="background: linear-gradient(180deg, #FEF3C7 0%, #FFFBF2 44%, #FDE68A 100%);">
      <div class="top-bar" style="justify-content:center;">
        <span class="pill" style="background:#B45309;">SHABBAT CLOCK</span>
      </div>
      <div class="art-frame" style="height:495px;"><img src="{art}" alt="Friday Afternoon"></div>
      <div class="title" style="color:#78350F; font-size:48px;">Friday Afternoon</div>
      <div class="rules-box" style="text-align:center; font-weight:700; font-size:22.5px; line-height:1.38;">
        Sunset is closer! After Mekimi's turn, flip this card and start the next round with Abba.<br>
        <span style="font-weight:500; color:#475569;">(If Time Flies flipped this card, keep playing the current round!)</span>
      </div>
      <div class="flavor">“Keep moving—sunset is on its way!”</div>
    </div>
    """
    return wrap_html(body)

# -----------------------------------------------------------------------------
# 6. Small Booklet Interior Pages (Pages 2–16, matching Page 1 Cover!)
# -----------------------------------------------------------------------------
BOOKLET_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 825px;
  height: 1125px;
  overflow: hidden;
  background: #FFFBF2;
  font-family: 'DM Sans', 'Liberation Sans', 'DejaVu Sans', sans-serif;
  color: #1E293B;
  -webkit-font-smoothing: antialiased;
}
.page {
  width: 825px;
  height: 1125px;
  padding: 76px 76px 76px 76px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #FFFBF2;
}
.page-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
h1 {
  font-family: 'Baloo', 'Liberation Sans', 'DejaVu Sans', sans-serif;
  font-size: 36px;
  font-weight: 700;
  color: #1E3A8A;
  padding-bottom: 10px;
  border-bottom: 4px solid #F59E0B;
  line-height: 1.12;
}
h2 {
  font-size: 23px;
  font-weight: 700;
  color: #B45309;
  margin-top: 4px;
}
p {
  font-size: 20.5px;
  line-height: 1.38;
}
ul, ol {
  padding-left: 26px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
li {
  font-size: 20px;
  line-height: 1.35;
}
.callout {
  background: #FEF3C7;
  border-left: 7px solid #D97706;
  border-radius: 14px;
  padding: 15px 18px;
  font-size: 19.5px;
  line-height: 1.36;
}
.callout-blue {
  background: #EFF6FF;
  border-left: 7px solid #2563EB;
}
.callout-green {
  background: #ECFDF5;
  border-left: 7px solid #059669;
}
.callout-red {
  background: #FEF2F2;
  border-left: 7px solid #DC2626;
}
.box-card {
  background: #FFFFFF;
  border: 2px solid #E2E8F0;
  border-radius: 14px;
  padding: 13px 16px;
  font-size: 19px;
  line-height: 1.34;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 18px;
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #CBD5E1;
}
th {
  background: #1E3A8A;
  color: #FFFFFF;
  text-align: left;
  padding: 9px 10px;
  font-weight: 700;
  font-size: 17px;
}
td {
  padding: 9px 10px;
  border-top: 1px solid #E2E8F0;
  vertical-align: top;
  line-height: 1.3;
}
tr:nth-child(even) td { background: #F8FAFC; }
.can { color: #047857; font-weight: 700; }
.cannot { color: #B91C1C; font-weight: 700; }
.helper-row {
  display: flex;
  gap: 14px;
  align-items: center;
  background: #FFFFFF;
  border-radius: 16px;
  padding: 11px 14px;
  border-left: 7px solid var(--c);
  box-shadow: 0 3px 10px rgba(15,23,42,0.06);
}
.helper-row img {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--c);
  flex-shrink: 0;
}
.helper-row h3 {
  font-size: 21px;
  color: var(--c);
  margin-bottom: 3px;
}
.helper-row p {
  font-size: 17.5px;
  line-height: 1.28;
}
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 2px solid #CBD5E1;
  font-size: 17.5px;
  font-weight: 600;
  color: #64748B;
}
.tag {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  color: #FFF;
}
.inline-arrow {
  display: inline-block;
  width: 0.92em;
  height: 0.72em;
  vertical-align: -0.05em;
  margin: 0 0.08em;
}
"""

BOOKLET_INLINE_ARROW_SVG = (
    '<svg class="inline-arrow" viewBox="0 0 18 12" aria-hidden="true">'
    '<path d="M1.5 6h14M10.5 2l5 4-5 4" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    '</svg>'
)

def _replace_arrows_in_html(html_str: str) -> str:
    """Replace raw Unicode → with a vertically centered inline SVG arrow (skipping inside <svg>…</svg>)."""
    import re
    parts = re.split(r'(<svg\b[^>]*>.*?</svg>)', html_str, flags=re.S)
    for i in range(0, len(parts), 2):
        parts[i] = parts[i].replace("→", BOOKLET_INLINE_ARROW_SVG)
    return "".join(parts)

def booklet_page(page_num: int, title: str, inner_html: str) -> str:
    rendered_inner = _replace_arrows_in_html(inner_html)
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><style>{BOOKLET_CSS}</style></head>
<body>
  <div class="page">
    <div class="page-body">
      <h1>{title}</h1>
      {rendered_inner}
    </div>
    <div class="footer">
      <span>Preparing for Shabbat: Cooper Family Edition</span>
      <span>Page {page_num} of 16</span>
    </div>
  </div>
</body>
</html>"""

def build_booklet_pages() -> list[tuple[int, str]]:
    av_abba = avatar_data_uri("abba")
    av_mommy = avatar_data_uri("mommy")
    av_nael = avatar_data_uri("nael")
    av_mekimi = avatar_data_uri("mekimi")

    # 4-Zone Visual Legend Strip (Page 3 — pairs each Zone's color + icon!)
    zone_legend_html = """
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px;">
      <div style="display:flex; align-items:center; gap:9px; background:#FEF3C7; border:2px solid #D97706; border-radius:12px; padding:7px 11px;">
        <span style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:#D97706; color:#FFF; flex-shrink:0;">""" + ZONES["KITCHEN"]["icon"] + """</span>
        <div style="font-size:16.5px; line-height:1.2;"><strong style="color:#92400E;">Kitchen</strong><br><span style="font-size:14px; color:#78350F;">Orange · Chef's Hat</span></div>
      </div>
      <div style="display:flex; align-items:center; gap:9px; background:#CCFBF1; border:2px solid #0D9488; border-radius:12px; padding:7px 11px;">
        <span style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:#0D9488; color:#FFF; flex-shrink:0;">""" + ZONES["DOWNSTAIRS"]["icon"] + """</span>
        <div style="font-size:16.5px; line-height:1.2;"><strong style="color:#115E59;">Downstairs Balagan</strong><br><span style="font-size:14px; color:#0F766E;">Teal · Toy Blocks</span></div>
      </div>
      <div style="display:flex; align-items:center; gap:9px; background:#DBEAFE; border:2px solid #2563EB; border-radius:12px; padding:7px 11px;">
        <span style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:#2563EB; color:#FFF; flex-shrink:0;">""" + ZONES["TABLE"]["icon"] + """</span>
        <div style="font-size:16.5px; line-height:1.2;"><strong style="color:#1E40AF;">Table</strong><br><span style="font-size:14px; color:#1E3A8A;">Blue · Shabbat Candles</span></div>
      </div>
      <div style="display:flex; align-items:center; gap:9px; background:#F3E8FF; border:2px solid #7C3AED; border-radius:12px; padding:7px 11px;">
        <span style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:#7C3AED; color:#FFF; flex-shrink:0;">""" + ZONES["UPSTAIRS"]["icon"] + """</span>
        <div style="font-size:16.5px; line-height:1.2;"><strong style="color:#6B21A8;">Upstairs</strong><br><span style="font-size:14px; color:#5B21B6;">Purple · Stairs &amp; Star</span></div>
      </div>
    </div>
    """

    # Page 5: Bird's-Eye Table Layout Diagram (Standard Mode — faces Setup Page 4! Zero forward refs, zero Beg. clutter, neutral Mission cards!)
    diagram_svg = f"""
    <svg viewBox="0 0 673 730" width="673" height="730" xmlns="http://www.w3.org/2000/svg" style="display:block;">
      <!-- Clock Strip -->
      <rect x="0" y="0" width="673" height="92" rx="16" fill="#FEF3C7" stroke="#D97706" stroke-width="2.5"/>
      <foreignObject x="16" y="7" width="642" height="26">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:'DM Sans','Liberation Sans','DejaVu Sans',sans-serif; font-size:16px; font-weight:800; color:#92400E; line-height:1.2;">
          SHABBAT CLOCK (face-down left {BOOKLET_INLINE_ARROW_SVG} right; Shabbat Begins! on far right)
        </div>
      </foreignObject>
      <g transform="translate(16, 36)">
        <rect x="0" y="0" width="94" height="44" rx="8" fill="#FDE68A" stroke="#B45309" stroke-width="2"/>
        <text x="47" y="27" text-anchor="middle" font-size="13" font-weight="700" fill="#78350F">Fri Aft</text>
        <rect x="104" y="0" width="94" height="44" rx="8" fill="#FDE68A" stroke="#B45309" stroke-width="2"/>
        <text x="151" y="27" text-anchor="middle" font-size="13" font-weight="700" fill="#78350F">Fri Aft</text>
        <rect x="208" y="0" width="94" height="44" rx="8" fill="#FDE68A" stroke="#B45309" stroke-width="2"/>
        <text x="255" y="27" text-anchor="middle" font-size="13" font-weight="700" fill="#78350F">Fri Aft</text>
        <rect x="312" y="0" width="94" height="44" rx="8" fill="#FDE68A" stroke="#B45309" stroke-width="2"/>
        <text x="359" y="27" text-anchor="middle" font-size="13" font-weight="700" fill="#78350F">Fri Aft</text>
        <rect x="416" y="0" width="94" height="44" rx="8" fill="#FDE68A" stroke="#B45309" stroke-width="2"/>
        <text x="463" y="27" text-anchor="middle" font-size="13" font-weight="700" fill="#78350F">Fri Aft</text>
        <rect x="520" y="0" width="121" height="44" rx="8" fill="#1E1B4B" stroke="#F59E0B" stroke-width="2.5"/>
        <text x="580" y="26" text-anchor="middle" font-size="12.5" font-weight="800" fill="#FDE047">SHABBAT BEGINS!</text>
      </g>

      <!-- Left Column: Missions & Events (neutral slate borders on Mission cards!) -->
      <rect x="0" y="110" width="235" height="236" rx="16" fill="#F8FAFC" stroke="#334155" stroke-width="2.5"/>
      <text x="14" y="135" font-size="15" font-weight="800" fill="#0F172A">MISSION ROW (4 face-up)</text>
      <rect x="14" y="148" width="98" height="60" rx="8" fill="#FFF" stroke="#334155" stroke-width="2"/>
      <text x="63" y="182" text-anchor="middle" font-size="13" font-weight="700" fill="#1E293B">Mission 1</text>
      <rect x="122" y="148" width="98" height="60" rx="8" fill="#FFF" stroke="#334155" stroke-width="2"/>
      <text x="171" y="182" text-anchor="middle" font-size="13" font-weight="700" fill="#1E293B">Mission 2</text>
      <rect x="14" y="218" width="98" height="60" rx="8" fill="#FFF" stroke="#334155" stroke-width="2"/>
      <text x="63" y="252" text-anchor="middle" font-size="13" font-weight="700" fill="#1E293B">Mission 3</text>
      <rect x="122" y="218" width="98" height="60" rx="8" fill="#FFF" stroke="#334155" stroke-width="2"/>
      <text x="171" y="252" text-anchor="middle" font-size="13" font-weight="700" fill="#1E293B">Mission 4</text>
      <rect x="14" y="290" width="98" height="42" rx="8" fill="#E2E8F0" stroke="#475569" stroke-width="1.8"/>
      <text x="63" y="316" text-anchor="middle" font-size="12" font-weight="700" fill="#0F172A">Mission Deck</text>
      <rect x="122" y="290" width="98" height="42" rx="8" fill="#DCFCE7" stroke="#059669" stroke-width="1.8"/>
      <text x="171" y="316" text-anchor="middle" font-size="12.5" font-weight="700" fill="#065F46">Done Pile</text>

      <!-- Events & Toolbox -->
      <rect x="0" y="362" width="235" height="214" rx="16" fill="#F0FDFA" stroke="#0D9488" stroke-width="2.5"/>
      <text x="14" y="388" font-size="15.5" font-weight="800" fill="#115E59">EVENTS &amp; TOOLBOX</text>
      <rect x="14" y="400" width="98" height="58" rx="8" fill="#FEE2E2" stroke="#B91C1C" stroke-width="2"/>
      <text x="63" y="427" text-anchor="middle" font-size="13" font-weight="800" fill="#991B1B">Event</text>
      <text x="63" y="444" text-anchor="middle" font-size="12" font-weight="600" fill="#991B1B">Deck (22)</text>
      <rect x="122" y="400" width="98" height="58" rx="8" fill="#FFF" stroke="#94A3B8" stroke-width="2" stroke-dasharray="5,3"/>
      <text x="171" y="427" text-anchor="middle" font-size="13" font-weight="700" fill="#475569">Event</text>
      <text x="171" y="444" text-anchor="middle" font-size="12" font-weight="600" fill="#475569">Discard</text>
      <text x="14" y="484" font-size="14" font-weight="800" fill="#0F766E">Family Toolbox (face-up):</text>
      <rect x="14" y="496" width="98" height="62" rx="8" fill="#FFF" stroke="#0F766E" stroke-width="2"/>
      <text x="63" y="532" text-anchor="middle" font-size="13" font-weight="700" fill="#0F766E">Tool 1</text>
      <rect x="122" y="496" width="98" height="62" rx="8" fill="#FFF" stroke="#0F766E" stroke-width="2"/>
      <text x="171" y="532" text-anchor="middle" font-size="13" font-weight="700" fill="#0F766E">Tool 2</text>

      <!-- Right Column: 3x3 House (Standard Mode: Top-Center & Bottom-Center sideways, all other 7 Clear!) -->
      <rect x="253" y="110" width="420" height="466" rx="18" fill="#FFFBEB" stroke="#B45309" stroke-width="2.5"/>
      <text x="272" y="138" font-size="17" font-weight="800" fill="#78350F">THE 3×3 HOUSE (9 Room Cards)</text>
      <!-- Row 1 -->
      <rect x="272" y="156" width="116" height="122" rx="12" fill="#FEF3C7" stroke="#D97706" stroke-width="2.5"/>
      <text x="330" y="182" text-anchor="middle" font-size="14" font-weight="800" fill="#92400E">Clear Room</text>
      <circle cx="330" cy="232" r="24" fill="#2563EB"/>
      <text x="330" y="237" text-anchor="middle" font-size="13" font-weight="800" fill="#FFF">ABBA</text>

      <!-- Sideways Top-Center -->
      <rect x="401" y="178" width="124" height="82" rx="12" fill="#CCFBF1" stroke="#0D9488" stroke-width="2.5"/>
      <text x="463" y="213" text-anchor="middle" font-size="14" font-weight="800" fill="#115E59">CLUTTERED</text>
      <text x="463" y="234" text-anchor="middle" font-size="12.5" font-weight="600" fill="#0F766E">(turned sideways)</text>

      <rect x="538" y="156" width="116" height="122" rx="12" fill="#DBEAFE" stroke="#2563EB" stroke-width="2.5"/>
      <text x="596" y="182" text-anchor="middle" font-size="14" font-weight="800" fill="#1E40AF">Clear Room</text>
      <circle cx="596" cy="232" r="24" fill="#059669"/>
      <text x="596" y="237" text-anchor="middle" font-size="13" font-weight="800" fill="#FFF">NAEL</text>

      <!-- Row 2 (All 3 upright Clear Rooms!) -->
      <rect x="272" y="294" width="116" height="122" rx="12" fill="#F3E8FF" stroke="#7C3AED" stroke-width="2.5"/>
      <text x="330" y="360" text-anchor="middle" font-size="14" font-weight="700" fill="#6B21A8">Clear Room</text>
      <rect x="405" y="294" width="116" height="122" rx="12" fill="#FEF3C7" stroke="#D97706" stroke-width="2.5"/>
      <text x="463" y="360" text-anchor="middle" font-size="14" font-weight="700" fill="#92400E">Clear Room</text>
      <rect x="538" y="294" width="116" height="122" rx="12" fill="#CCFBF1" stroke="#0D9488" stroke-width="2.5"/>
      <text x="596" y="360" text-anchor="middle" font-size="14" font-weight="700" fill="#115E59">Clear Room</text>

      <!-- Row 3 -->
      <rect x="272" y="432" width="116" height="122" rx="12" fill="#DBEAFE" stroke="#2563EB" stroke-width="2.5"/>
      <text x="330" y="458" text-anchor="middle" font-size="14" font-weight="800" fill="#1E40AF">Clear Room</text>
      <circle cx="330" cy="508" r="24" fill="#7C3AED"/>
      <text x="330" y="513" text-anchor="middle" font-size="11.5" font-weight="800" fill="#FFF">MEKIMI</text>

      <!-- Sideways Bottom-Center -->
      <rect x="401" y="454" width="124" height="82" rx="12" fill="#F3E8FF" stroke="#7C3AED" stroke-width="2.5"/>
      <text x="463" y="489" text-anchor="middle" font-size="14" font-weight="800" fill="#6B21A8">CLUTTERED</text>
      <text x="463" y="510" text-anchor="middle" font-size="12.5" font-weight="600" fill="#7C3AED">(turned sideways)</text>

      <rect x="538" y="432" width="116" height="122" rx="12" fill="#FEF3C7" stroke="#D97706" stroke-width="2.5"/>
      <text x="596" y="458" text-anchor="middle" font-size="14" font-weight="800" fill="#92400E">Clear Room</text>
      <circle cx="596" cy="508" r="24" fill="#DB2777"/>
      <text x="596" y="513" text-anchor="middle" font-size="11.5" font-weight="800" fill="#FFF">MOMMY</text>

      <!-- Bottom: Helper Power Cards (zero premature superpower spoilers!) -->
      <rect x="0" y="596" width="673" height="118" rx="16" fill="#F8FAFC" stroke="#64748B" stroke-width="2.2"/>
      <text x="16" y="622" font-size="16" font-weight="800" fill="#334155">HELPER POWER CARDS (face-up in front of their players)</text>
      <g transform="translate(16, 634)">
        <rect x="0" y="0" width="150" height="64" rx="10" fill="#EFF6FF" stroke="#2563EB" stroke-width="2.2"/>
        <text x="75" y="28" text-anchor="middle" font-size="16" font-weight="800" fill="#2563EB">1. ABBA</text>
        <text x="75" y="49" text-anchor="middle" font-size="12.5" fill="#334155">Starts Top-Left</text>

        <rect x="163" y="0" width="150" height="64" rx="10" fill="#ECFDF5" stroke="#059669" stroke-width="2.2"/>
        <text x="238" y="28" text-anchor="middle" font-size="16" font-weight="800" fill="#059669">2. NAEL</text>
        <text x="238" y="49" text-anchor="middle" font-size="12.5" fill="#334155">Starts Top-Right</text>

        <rect x="326" y="0" width="150" height="64" rx="10" fill="#FDF2F8" stroke="#DB2777" stroke-width="2.2"/>
        <text x="401" y="28" text-anchor="middle" font-size="16" font-weight="800" fill="#DB2777">3. MOMMY</text>
        <text x="401" y="49" text-anchor="middle" font-size="12.5" fill="#334155">Starts Bot-Right</text>

        <rect x="489" y="0" width="152" height="64" rx="10" fill="#F5F3FF" stroke="#7C3AED" stroke-width="2.2"/>
        <text x="565" y="28" text-anchor="middle" font-size="16" font-weight="800" fill="#7C3AED">4. MEKIMI</text>
        <text x="565" y="49" text-anchor="middle" font-size="12.5" fill="#334155">Starts Bot-Left</text>
      </g>
    </svg>
    """

    pages = [
        # PAGE 2: Welcome, Goal & Choosing Helpers (Strictly Zero Forward References!)
        (2, "1. Welcome, Goal &amp; Players", """
          <p style="font-size:20.5px; color:#1E3A8A;"><strong>You may think you are just coming to play a game, but today we are Mommy, Abba, Nael, and Mekimi!</strong></p>
          <p>Work together as a family to finish every <strong>Mission</strong> before <strong>Shabbat Begins!</strong> flips face-up on the <strong>Shabbat Clock</strong>.</p>
          <div class="callout">
            <strong>Win Right Away:</strong> The instant your family finishes the final Mission, <strong>Shabbat Shalom—the game ends immediately and you win!</strong><br>
            <strong>Lose Right Away:</strong> If <strong>Shabbat Begins!</strong> flips face-up before all Missions are done, stop right away and try again!
          </div>
          <p style="font-size:19.5px;"><strong>Table Talk:</strong> This is a collaborative game so discuss freely! The player taking the current turn makes the final call.</p>
          <div class="callout callout-blue" style="text-align:center; font-size:20.5px; padding:11px 14px;">
            <strong>Clockwise Turn Order (Every Game):</strong><br>
            <span style="color:#2563EB; font-weight:800;">1. Abba</span> →
            <span style="color:#059669; font-weight:800;">2. Nael</span> →
            <span style="color:#DB2777; font-weight:800;">3. Mommy</span> →
            <span style="color:#7C3AED; font-weight:800;">4. Mekimi</span>
          </div>
          <h2>Choosing Helpers (1–4 Players)</h2>
          <p style="font-size:18.5px;">All 4 Helpers always play in every game. Pick whoever you want—let the youngest player pick first, choose freely, or deal them randomly:</p>
          <ul style="gap:6px;">
            <li style="font-size:18.5px;"><strong>4 Players:</strong> Each player controls 1 Helper.</li>
            <li style="font-size:18.5px;"><strong>3 Players:</strong> One player controls 2 Helpers (for example, Abba &amp; Mekimi); the other two control 1 each.</li>
            <li style="font-size:18.5px;"><strong>2 Players:</strong> Player 1 controls <strong>Abba &amp; Mommy</strong> (turns 1 &amp; 3); Player 2 controls <strong>Nael &amp; Mekimi</strong> (turns 2 &amp; 4) to alternate every turn!</li>
            <li style="font-size:18.5px;"><strong>1 Player (Solo):</strong> Control all 4 Helpers in order.</li>
          </ul>
        """),

        # PAGE 3: What's in the Box (Purely Physical Inventory + 4-Zone Visual Legend!)
        (3, "2. What's in the Box (72 Cards)", f"""
          <p style="font-size:19.5px;">Everything fits in <strong>72 poker-size cards</strong> plus your <strong>4 3D-Printed Family Helpers</strong>:</p>
          <div class="box-card" style="padding:11px 14px;">
            <h2 style="margin-top:0; font-size:20.5px;">Rooms &amp; Helpers (16 cards)</h2>
            <ul style="gap:5px;">
              <li style="font-size:18.5px;"><strong>12 Double-Sided Room Cards:</strong> 3 rooms in each of the 4 House Zones—an illustrated room scene on the front and a red-striped <strong>Blocked</strong> side on the back (the Zone badge stays visible on both sides).</li>
              <li style="font-size:18.5px;"><strong>4 Helper Power Cards:</strong> <strong>Abba</strong>, <strong>Nael</strong>, <strong>Mommy</strong>, and <strong>Mekimi</strong> (matching your 4 3D-Printed Family Helpers).</li>
            </ul>
            {zone_legend_html}
          </div>
          <div class="box-card" style="padding:11px 14px;">
            <h2 style="margin-top:0; font-size:20.5px;">Missions Deck (18 cards)</h2>
            <ul style="gap:5px;">
              <li style="font-size:18.5px;"><strong>10 Team Chores</strong> (marked <strong>TEAM CHORE · 2+</strong>)</li>
              <li style="font-size:18.5px;"><strong>8 Errands</strong> (marked <strong>ERRAND · Start → End</strong>)</li>
            </ul>
          </div>
          <div class="box-card" style="padding:11px 14px;">
            <h2 style="margin-top:0; font-size:20.5px;">Shabbat Clock (10) &amp; Friday Events (28)</h2>
            <ul style="gap:5px;">
              <li style="font-size:18.5px;"><strong>10 Clock Cards:</strong> 9 <em>Friday Afternoon</em> + 1 <em>Shabbat Begins!</em></li>
              <li style="font-size:18.5px;"><strong>18 Slow-Downs:</strong> 15 Single-Zone, 2 Double Trouble, and 1 Time Flies.</li>
              <li style="font-size:18.5px;"><strong>10 Household Tools:</strong> 4 <em>Ice Coffee Boost</em>, 3 <em>Strategic Snack Summons</em>, and 3 <em>Cousin Aviel Drops By!</em></li>
            </ul>
          </div>
        """),

        # PAGE 4: Setup (Standard Mode) — Faces Table Layout Page 5!
        (4, "3. Setup (Standard Mode)", """
          <p style="font-size:18.5px; color:#475569;"><em>First game? Check Page 13 for Beginner Mode! See the diagram on Page 5 as you set up.</em></p>
          <ol style="gap:10px;">
            <li style="font-size:19px;"><strong>Build the 3×3 House:</strong> Shuffle the 12 Room cards, deal <strong>9</strong> bright-side upright (<strong>Clear</strong>) in a 3×3 grid with a small gap between cards, and set the other 3 aside. Make sure all 4 House Zones appear—if a zone is missing, swap the <strong>bottom-right room</strong> for a <strong>random</strong> set-aside room of that zone. Return the 3 unused rooms to the box.</li>
            <li style="font-size:19px;"><strong>Starting Clutter:</strong> Turn the <strong>Top-Center</strong> and <strong>Bottom-Center</strong> rooms sideways (<strong>Cluttered</strong>). Leave all other <strong>7 rooms</strong> (the Center, both sides, and all 4 corners) upright (<strong>Clear</strong>).</li>
            <li style="font-size:19px;"><strong>Place the 4 Helpers:</strong> Set the 3D Helpers in the 4 corners: <strong>Top-Left:</strong> Abba · <strong>Top-Right:</strong> Nael · <strong>Bottom-Left:</strong> Mekimi · <strong>Bottom-Right:</strong> Mommy. Place each Helper Power Card face-up in front of the player who chose that Helper (Page 2).</li>
            <li style="font-size:19px;"><strong>Deal the Missions:</strong> Shuffle all 18 Mission cards and deal <strong>13</strong> (box the other 5 unseen). Flip <strong>4 face-up</strong> into the <strong>Mission Row</strong> and stack <strong>9 face-down</strong> as the <strong>Mission Deck</strong>. Leave space for the <strong>Done Pile</strong>.</li>
            <li style="font-size:19px;"><strong>Build the Shabbat Clock:</strong> Place <strong>5 Friday Afternoon</strong> cards face-down left to right, with <strong>Shabbat Begins!</strong> face-down on the far right (6 total; box the other 4).</li>
            <li style="font-size:19px;"><strong>Tools &amp; Event Deck:</strong> Shuffle all 10 Tools face-down: place <strong>2 face-up</strong> in the <strong>Family Toolbox</strong>, box <strong>4 unseen</strong>, and shuffle the <strong>remaining 4</strong> with all <strong>18 Slow-Downs</strong> face-down to form the <strong>Event Deck</strong> (22 cards). Leave space for an <strong>Event Discard Pile</strong>.</li>
          </ol>
        """),

        # PAGE 5: Bird's-Eye Table Layout Diagram (Standard Mode — faces Page 4!)
        (5, "Table Layout (Standard Mode)", f"""
          <p style="font-size:18.5px; color:#475569;">Set up your table like this before Turn 1 (follow Steps 1–6 on Page 4):</p>
          {diagram_svg}
        """),

        # PAGE 6: Key Terms & How a Turn Works (Zero Forward References!)
        (6, "4. Key Terms &amp; How a Turn Works", """
          <h2>Key Terms</h2>
          <ul style="gap:9px;">
            <li><strong>3D Helpers vs. Helper Cards:</strong> Your 4 3D-Printed Helpers stand and move on top of the 3×3 Room cards. Your 4 Helper Power Cards stay face-up in front of their players to show powers and hold Errands you are carrying.</li>
            <li><strong>Room States:</strong> Every Room card is <strong>Clear</strong> (bright side upright), <strong>Cluttered</strong> (bright side turned sideways), or <strong>Blocked</strong> (flipped to its red-striped back—the Zone badge stays visible).</li>
            <li><strong>Next-Door Room:</strong> Straight up, down, left, or right (<strong>not diagonal</strong>).</li>
            <li><strong>Matching a Card to a Room:</strong> Each of the 4 House Zones always uses the same color and icon together. When a Mission or Event shows a Zone badge, it matches <strong>any</strong> Room card in that Zone (for example, any orange Kitchen card works on any Kitchen room).</li>
            <li><strong>Clock Flip:</strong> Flip the leftmost face-down Shabbat Clock card face-up.</li>
          </ul>
          <h2>On Every Turn: Just 2 Easy Steps!</h2>
          <div class="box-card">
            <strong>Step 1 — Take Up to 2 Actions</strong> (in any order; repeats allowed!)<br>
            Choose from the <strong>4 Actions</strong> on Pages 7–9: <strong>Move</strong>, <strong>Tidy Room</strong>, <strong>Do a Mission</strong>, or <strong>Use a Household Tool</strong>.
          </div>
          <div class="box-card">
            <strong>Step 2 — Flip 1 Event Card</strong> (Page 10)<br>
            Flip and resolve the top card of the Event Deck, then pass play clockwise (<strong>Abba → Nael → Mommy → Mekimi</strong>). <strong>After Mekimi's turn</strong>, do 1 <strong>Clock Flip</strong> and start the next round with <strong>Abba</strong>!
          </div>
        """),

        # PAGE 7: 5. The 4 Actions (Unified 4-Action Overview + Action 1 Move + Action 2 Tidy!)
        (7, "5. The 4 Actions", """
          <p style="font-size:19px;">On your turn, spend up to <strong>2 Actions</strong> on any mix of these <strong>4 Actions</strong>—you may repeat the same action twice (like Move → Move), or stop early:</p>
          <div class="grid-2" style="gap:9px;">
            <div class="box-card" style="padding:9px 12px; font-size:17px; border-left:5px solid #2563EB;"><strong>1. Move</strong> — Walk 1 next-door room</div>
            <div class="box-card" style="padding:9px 12px; font-size:17px; border-left:5px solid #059669;"><strong>2. Tidy Room</strong> — Clear or Unblock</div>
            <div class="box-card" style="padding:9px 12px; font-size:17px; border-left:5px solid #1E293B;"><strong>3. Do a Mission</strong> — Team Chore or Errand</div>
            <div class="box-card" style="padding:9px 12px; font-size:17px; border-left:5px solid #0F766E;"><strong>4. Use a Tool</strong> — Play from Toolbox</div>
          </div>
          <div class="box-card" style="border-left:7px solid #2563EB;">
            <h2 style="margin-top:0; color:#1E40AF;">Action 1: Move (1 Action)</h2>
            <ul>
              <li>Walk your 3D Helper <strong>1 room</strong> straight up, down, left, or right (<strong>not diagonal</strong>).</li>
              <li>You may walk into and out of Clear, Cluttered, and Blocked rooms.</li>
            </ul>
          </div>
          <div class="box-card" style="border-left:7px solid #059669;">
            <h2 style="margin-top:0; color:#047857;">Action 2: Tidy Room (1 Action)</h2>
            <ul>
              <li><strong>Tidy Cluttered → Clear:</strong> Stand in a sideways room and turn it upright (1 Helper).</li>
              <li><strong>Unblock Red Blocked → Clear:</strong> Flip a red Blocked room straight back to Clear! Requires <strong>2 or more Helpers</strong> standing in that room.</li>
            </ul>
          </div>
          <div class="callout callout-blue" style="font-size:18px; padding:11px 14px;">
            <strong>Family Superpowers:</strong> Each Cooper Helper bends one of the core rules—see Page 11 once you've read all 4 Actions and Events!
          </div>
        """),

        # PAGE 8: 5. The 4 Actions (cont.): Do a Mission (+ Free Handoff + Refill + Exact Win!)
        (8, "5. The 4 Actions: Do a Mission", """
          <p style="font-size:19.5px;">There are <strong>2 types of Missions</strong>—each card shows the House Zone(s) where you do it:</p>
          <div class="box-card" style="border-left:7px solid #1E293B;">
            <h2 style="margin-top:0; color:#0F172A;">Team Chores (10 cards · TEAM CHORE · 2+)</h2>
            <p style="font-size:19px;">With <strong>2 or more Helpers</strong> standing together in a <strong>Clear</strong> room of the matching Zone, spend <strong>1 Action</strong> to move the card straight to the <strong>Done Pile</strong>!</p>
          </div>
          <div class="box-card" style="border-left:7px solid #334155;">
            <h2 style="margin-top:0; color:#1E293B;">Errands (8 cards · ERRAND · Start → End)</h2>
            <ul style="gap:6px;">
              <li style="font-size:19px;"><strong>Pick Up (1 Action):</strong> In a <strong>Clear</strong> room matching the <strong>Start</strong> Zone, place the Errand on your Helper Power Card.</li>
              <li style="font-size:19px;"><strong>Deliver (1 Action):</strong> In a <strong>Clear</strong> room matching the <strong>End</strong> Zone, move 1 carried Errand to the <strong>Done Pile</strong>!</li>
            </ul>
          </div>
          <div class="callout callout-blue" style="font-size:18.5px; padding:12px 15px;">
            <strong>Free Handoff (Free Bonus — Any Room!):</strong> Anytime on your turn, you may freely give or take any carried Errand(s) with a teammate standing in your room at no Action cost.
          </div>
          <div class="callout" style="font-size:18.5px; padding:12px 15px;">
            <strong>Instant Refill &amp; Win Check:</strong> Whenever a Mission leaves the <strong>Mission Row</strong> (finished or picked up), immediately flip the top card of the <strong>Mission Deck</strong> so 4 stay face-up. The instant the final Mission reaches the <strong>Done Pile</strong> (Row, Deck, and all Helper cards empty), you win!
          </div>
        """),

        # PAGE 9: 5. The 4 Actions (cont.): Household Tools (Breaks Cycle 2 — no Time Flies mention!)
        (9, "5. The 4 Actions: Household Tools", """
          <p style="font-size:19.5px;">Spend <strong>1 Action from any room</strong> to play a face-up Tool from the <strong>Family Toolbox</strong>:</p>
          <div class="box-card" style="border-left:7px solid #0F766E;">
            <h2 style="margin-top:0; color:#0F766E;">Ice Coffee Boost (4 cards · Reusable)</h2>
            <p style="font-size:19px;">Turn <strong>1 or 2 Cluttered rooms</strong> anywhere on the board back to Clear <em>(cannot fix Blocked rooms)</em>, then place this card in the <strong>Event Discard Pile</strong>.</p>
          </div>
          <div class="box-card" style="border-left:7px solid #0369A1;">
            <h2 style="margin-top:0; color:#0369A1;">Strategic Snack Summons (3 cards · Reusable)</h2>
            <p style="font-size:19px;">Pull <strong>any 1 teammate</strong> from anywhere on the board straight into your room <em>(their carried Errands come with them!)</em>, then place this card in the <strong>Event Discard Pile</strong>.</p>
          </div>
          <div class="box-card" style="border-left:7px solid #B45309;">
            <h2 style="margin-top:0; color:#B45309;">Cousin Aviel Drops By! (3 cards · One-Time Shield)</h2>
            <p style="font-size:19px;">Place face-up on the leftmost unshielded face-down Clock card. <strong>The next time that Clock card would flip for any reason, return Cousin Aviel to the box instead!</strong> <em>(Multiple shields may guard consecutive Clock cards.)</em></p>
          </div>
          <div class="callout callout-green" style="font-size:18.5px; padding:12px 15px;">
            <strong>Great 2-Action Combos:</strong> Tidy a Cluttered room on Action 1 and immediately finish a Mission there on Action 2—or play <strong>Snack Summons</strong> on Action 1 and finish a <strong>Team Chore</strong> together on Action 2!
          </div>
        """),

        # PAGE 10: 6. Events & End of Round (Fixes Comments #1, #2, #4 — faces Helpers Page 11!)
        (10, "6. Events &amp; End of Round", """
          <p style="font-size:19px;">After your 2 Actions, flip the top card of the <strong>Event Deck</strong>. If the deck is empty, shuffle the entire <strong>Event Discard Pile</strong> face-down first—so spent Reusable Tools naturally return to the deck!</p>
          <ul style="gap:8px;">
            <li style="font-size:18.5px;"><strong>Household Tool:</strong> Place it face-up in the <strong>Family Toolbox</strong>!</li>
            <li style="font-size:18.5px;"><strong>Slow-Down:</strong> Scan rooms in the matching Zone <strong>left to right, top to bottom</strong> (skip Blocked rooms):
              <div class="callout callout-red" style="margin-top:6px; padding:10px 14px; font-size:18px;">
                <strong>1.</strong> If any matching room is <strong>Cluttered</strong>, flip the <strong>1st Cluttered</strong> room to <strong>Red Blocked</strong>!<br>
                <strong>2.</strong> Else if any matching room is <strong>Clear</strong>, turn the <strong>1st Clear</strong> room sideways (<strong>Cluttered</strong>)!<br>
                <strong>3.</strong> If all matching rooms are already Blocked, nothing happens.
              </div>
              Then place the Slow-Down in the <strong>Event Discard Pile</strong>.
            </li>
            <li style="font-size:18.5px;"><strong>Double Trouble (Double Slow-Down!):</strong> Triggers <strong>two Slow-Downs on one card</strong>—resolve a normal Slow-Down for the <strong>left</strong> Zone badge first, then a second Slow-Down for the <strong>right</strong> Zone badge. Discard to Event Discard.</li>
            <li style="font-size:18.5px;"><strong>Time Flies (<em>“Wait—Shabbat Is at WHAT Time?!”</em>):</strong> (1) Do <strong>1 Clock Flip</strong> right away (<em>Shabbat Begins!</em> = lose unless <strong>Cousin Aviel</strong> shields it); (2) <strong>resolve a Kitchen Slow-Down</strong> (flip the 1st Cluttered Kitchen Blocked, else turn the 1st Clear Kitchen sideways); (3) <strong>return this card to the box</strong>.</li>
          </ul>
          <div class="callout" style="font-size:18px; padding:11px 14px;">
            <strong>End of Round (Only After Mekimi's Turn!):</strong> Do 1 <strong>Clock Flip</strong> (or box a Cousin Aviel shield on it). If <em>Shabbat Begins!</em> flips, you lose! Otherwise, start the next round with <strong>Abba</strong>.
          </div>
        """),

        # PAGE 11: 7. Meet the 4 Cooper Helpers (Faces Page 10! Zero Forward Refs!)
        (11, "7. Meet the 4 Cooper Helpers", f"""
          <p style="font-size:19px;">Every Helper gets <strong>2 Actions per turn</strong> plus their own Cooper family superpower:</p>
          <div class="helper-row" style="--c:#2563EB;">
            <img src="{av_abba}" alt="Abba">
            <div>
              <h3>1. ABBA · Top-Left</h3>
              <p><strong>Solo Cleanup (Your Turn):</strong> Unblock a Red Blocked room alone (1 Action).<br>
              <strong>Clutter Guard (Always On):</strong> While Abba stands in a Cluttered room, Slow-Downs can't flip it Blocked (the Slow-Down is canceled!).</p>
            </div>
          </div>
          <div class="helper-row" style="--c:#059669;">
            <img src="{av_nael}" alt="Nael">
            <div>
              <h3>2. NAEL · Top-Right</h3>
              <p><strong>Learning Tower Power! (Always On):</strong> While Nael and a teammate share a <strong>Cluttered</strong> room, either one can finish a <strong>Team Chore</strong> there on either player's turn (not Blocked).</p>
            </div>
          </div>
          <div class="helper-row" style="--c:#DB2777;">
            <img src="{av_mommy}" alt="Mommy">
            <div>
              <h3>3. MOMMY · Bottom-Right</h3>
              <p><strong>Errand Express (Your Turn):</strong> Once per turn, Pick Up or Deliver an Errand for <strong>FREE</strong> (in addition to your 2 Actions!). Pick Up &amp; Deliver also work in <strong>Cluttered</strong> rooms (not Blocked)!</p>
            </div>
          </div>
          <div class="helper-row" style="--c:#7C3AED;">
            <img src="{av_mekimi}" alt="Mekimi">
            <div>
              <h3>4. MEKIMI · Bottom-Left</h3>
              <p><strong>Turbo Crawl (Your Turn):</strong> Whenever Mekimi spends 1 Action to Move, crawl straight into <strong>ANY room</strong> on the board!</p>
            </div>
          </div>
        """),

        # PAGE 12: 8. Room States: CAN & CANNOT (Complete Synthesis Table — ZERO Forward Refs! Resolves #7, #8, #9, #10!)
        (12, "8. Room States: CAN &amp; CANNOT", """
          <p>Check the orientation of the Room card your Helper stands on:</p>
          <table>
            <thead>
              <tr>
                <th style="width:20%;">Room State</th>
                <th style="width:41%;">✓ You CAN</th>
                <th style="width:39%;">✗ You CANNOT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Clear</strong><br><span style="font-size:15px; color:#047857;">(upright)</span></td>
                <td><span class="can">✓ Everything!</span> Move in/out, Team Chores, Pick Up/Deliver/Handoff Errands, and Tools.</td>
                <td>Nothing—everything works here!</td>
              </tr>
              <tr>
                <td><strong>Cluttered</strong><br><span style="font-size:15px; color:#B45309;">(sideways)</span></td>
                <td><span class="can">✓</span> Move in/out, <strong>Tidy</strong> (1 Helper), <strong>Free Handoff</strong>, Tools.<br>• <strong>Team Chores</strong> if <strong>Nael + teammate</strong> are here.<br>• <strong>Errands</strong> on <strong>Mommy's</strong> turn.</td>
                <td><span class="cannot">✗</span> Team Chores <em>(without Nael)</em>.<br><span class="cannot">✗</span> Pick Up or Deliver Errands <em>(if not Mommy)</em>.</td>
              </tr>
              <tr>
                <td><strong>Blocked</strong><br><span style="font-size:15px; color:#B91C1C;">(red back)</span></td>
                <td><span class="can">✓</span> Move in/out, <strong>Unblock</strong> (2+ Helpers or Abba alone), <strong>Free Handoff</strong>, Tools.</td>
                <td><span class="cannot">✗</span> <strong>No Team Chores</strong>.<br><span class="cannot">✗</span> <strong>No Pick Up or Deliver Errands</strong> <em>(not even Nael or Mommy!)</em>.</td>
              </tr>
            </tbody>
          </table>
          <div class="callout callout-red">
            <strong>Watch Out for Cluttered Rooms!</strong> Slow-Downs always flip Cluttered rooms to <strong>Red Blocked</strong> first—Tidy messy rooms early (or stand <strong>Abba</strong> there with <em>Clutter Guard</em>)!
          </div>
        """),

        # PAGE 13: 9. Difficulty Modes (Purged designer 72-Card Check!)
        (13, "9. Difficulty Modes", """
          <p>All modes use <strong>9 Rooms</strong> (3 boxed), <strong>4 Helpers</strong>, and <strong>6 Tools</strong> (<strong>2</strong> in Family Toolbox + <strong>4</strong> in Event Deck; 4 boxed). Always keep <strong>4 Missions</strong> face-up in the Mission Row.</p>
          <table style="font-size:17.5px;">
            <thead>
              <tr>
                <th>Mode</th>
                <th>Missions<br>(Row+Deck / Box)</th>
                <th>Shabbat Clock<br>(Aft+Shab / Box)</th>
                <th>Starting Clutter</th>
                <th>Slow-Downs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Beginner</strong><br><span style="font-size:13.5px; color:#047857; white-space:nowrap;">First Game · 6+</span></td>
                <td><strong>10</strong><br>(4+6 / 8 boxed)</td>
                <td><strong>7</strong><br>(6+1 / 3 boxed)</td>
                <td><strong>1 room</strong><br><em>Center</em></td>
                <td><strong>17</strong><br><em>Box Time Flies!</em></td>
              </tr>
              <tr>
                <td><strong>Standard</strong><br><span style="font-size:13.5px; color:#1D4ED8; white-space:nowrap;">Family Balance</span></td>
                <td><strong>13</strong><br>(4+9 / 5 boxed)</td>
                <td><strong>6</strong><br>(5+1 / 4 boxed)</td>
                <td><strong>2 rooms</strong><br><em>Top &amp; Bot Center</em></td>
                <td><strong>18</strong><br><em>All included</em></td>
              </tr>
              <tr>
                <td><strong>Hard</strong><br><span style="font-size:13.5px; color:#B91C1C; white-space:nowrap;">Friday Rush</span></td>
                <td><strong>15</strong><br>(4+11 / 3 boxed)</td>
                <td><strong>6</strong><br>(5+1 / 4 boxed)</td>
                <td><strong>2 rooms</strong><br><em>Top &amp; Bot Center</em></td>
                <td><strong>18</strong><br><em>All included</em></td>
              </tr>
            </tbody>
          </table>
          <div class="callout callout-green">
            <strong>Family Tip:</strong> Play <strong>Beginner</strong> once so kids learn the flow (almost every family wins their first game!), then step up to <strong>Standard</strong> for thrilling final-round finishes—and try <strong>Hard</strong> when your family is ready for a true Friday afternoon sprint!
          </div>
        """),

        # PAGE 14: 10. Quick 1-Round Example (Purged "isn't trapped!" and "Round 3" artifacts!)
        (14, "10. Quick 1-Round Example", """
          <p style="font-size:18px; color:#475569;">A sample Standard-mode round showing combos and all 4 Cooper Helpers:</p>
          <div class="box-card" style="border-left:6px solid #2563EB; font-size:17.5px;">
            <strong>1. Abba (2 Actions):</strong> Walks right into Red Blocked <em>The Salon</em> (Action 1) and uses <strong>Solo Cleanup</strong> to flip it Clear alone (Action 2)!<br>
            <em>Event:</em> Kitchen Slow-Down → Cluttered <em>The Fridge</em> (where Mommy stands) flips Blocked.
          </div>
          <div class="box-card" style="border-left:6px solid #059669; font-size:17.5px;">
            <strong>2. Nael (2 Actions):</strong> Plays <strong>Snack Summons</strong> to pull Abba into Nael's Cluttered <em>Dining Table</em> (Action 1), then uses <strong>Learning Tower Power!</strong> to finish <em>Set the Shabbat Table</em> right away (Action 2)! Refill Mission Row to 4.<br>
            <em>Event:</em> Draws <em>Cousin Aviel Drops By!</em> → added to Family Toolbox!
          </div>
          <div class="box-card" style="border-left:6px solid #DB2777; font-size:17.5px;">
            <strong>3. Mommy (2 Actions + Free Errand):</strong> Walks out of Blocked <em>Fridge</em> into Clear <em>Chairs</em> (Action 1), Delivers <em>Challah</em> for <strong>FREE</strong> (<strong>Errand Express</strong>!), and puts <em>Cousin Aviel</em> on the Clock (Action 2)!<br>
            <em>Event:</em> Downstairs Slow-Down → Clear <em>Salon</em> tilts sideways.
          </div>
          <div class="box-card" style="border-left:6px solid #7C3AED; font-size:17.5px;">
            <strong>4. Mekimi (2 Actions):</strong> Uses <strong>Turbo Crawl</strong> straight to Clear <em>Giant Island</em> (Action 1) and Picks Up <em>Showstopper</em> Errand (Action 2)! Refill Mission Row.<br>
            <em>Event:</em> Table Slow-Down targets Cluttered <em>Dining Table</em>—<strong>Abba's Clutter Guard</strong> cancels the Slow-Down!<br>
            <em>End of Round:</em> <strong>Cousin Aviel</strong> blocks the Clock flip and returns to the box! The next round starts with <strong>Abba</strong>!
          </div>
        """),

        # PAGE 15: Kid's First-Game Guide (6+) — Fixed Missions + No Purple/Blue!
        (15, "Kid's First-Game Guide (6+)", """
          <div class="callout" style="font-size:21px; text-align:center;">
            <strong>How We Win:</strong> Finish <strong>all the Missions</strong> together before <strong>Shabbat Begins!</strong> flips over!
          </div>
          <h2>On Your Turn: 2 Actions + 1 Event!</h2>
          <ol style="gap:9px;">
            <li><strong>Pick Any 2 Fun Actions</strong> (you can even do the same one twice!):
              <ul style="margin-top:6px; gap:5px;">
                <li><strong>Walk</strong> 1 room up, down, left, or right. <em>(Mekimi crawls ANYWHERE!)</em></li>
                <li><strong>Tidy</strong> a sideways room (alone) or a Red room (with a friend—or Abba alone!).</li>
                <li><strong>Team Chore (2+):</strong> Meet a friend in a Clear room of that Zone and finish it!</li>
                <li><strong>Errand (Start → End):</strong> Pick up at Start, carry it, and drop off at End—you can also pass it to a friend in your room anytime for free!</li>
                <li><strong>Use a Tool</strong> from the Toolbox (from any room)!</li>
              </ul>
            </li>
            <li><strong>Flip 1 Event Card:</strong> Tool → Toolbox! Slow-Down → find rooms in that Zone: flip the 1st sideways room Red (or tilt the 1st Clear room sideways!).</li>
            <li><strong>After Mekimi:</strong> Flip 1 Clock card closer to sunset, then go back to <strong>Abba</strong>!</li>
          </ol>
          <div class="callout callout-green" style="font-size:17.5px;">
            <strong>Superpowers:</strong> <strong>Abba</strong> fixes Red rooms alone &amp; keeps his sideways room from flipping Red · <strong>Nael</strong> finishes Team Chores in sideways rooms with a friend · <strong>Mommy</strong> gets 1 FREE Errand/turn (even sideways!) · <strong>Mekimi</strong> crawls to ANY room!
          </div>
        """),

        # PAGE 16: Tabletop Quick Reference (Fixed Missions, purged "1 Rule!" & "Stuck"!)
        (16, "Tabletop Quick Reference", """
          <div class="callout callout-blue" style="font-size:19px; text-align:center; padding:12px 16px;">
            <strong>Turn Order:</strong> Abba → Nael → Mommy → Mekimi → <strong>Clock Flip!</strong><br>
            <strong>Every Turn:</strong> <strong>2 Actions</strong> (+ Free Handoff) → <strong>Flip 1 Event</strong>
          </div>
          <div class="grid-2">
            <div class="box-card" style="font-size:17px; padding:12px 14px;">
              <strong style="color:#1E3A8A;">4 Actions (Pick Any 2)</strong><br>
              • <strong>Move:</strong> 1 room straight<br>
              • <strong>Tidy:</strong> Cluttered (1) / Red (2 or Abba)<br>
              • <strong>Mission:</strong> Team Chore (2+) or Errand<br>
              • <strong>Tool:</strong> Play from Toolbox
            </div>
            <div class="box-card" style="font-size:17px; padding:12px 14px;">
              <strong style="color:#B91C1C;">Slow-Downs</strong><br>
              Scan matching Zone L→R, T→B:<br>
              <strong>1st Cluttered → Blocked!</strong><br>
              Else <strong>1st Clear → Cluttered!</strong>
            </div>
          </div>
          <div class="box-card" style="padding:10px 14px; font-size:16px; line-height:1.38;">
            <strong style="color:#1E3A8A; display:block; margin-bottom:5px;">Room States Cheat Sheet (Keep Face-Up on Table!)</strong>
            <div style="background:#ECFDF5; border-left:5px solid #059669; padding:5px 9px; border-radius:6px; margin-bottom:5px;">
              <strong style="color:#065F46;">Clear (Upright):</strong> Everything works! Team Chores, Errands, Handoffs, Tools.
            </div>
            <div style="background:#FFFBEB; border-left:5px solid #D97706; padding:5px 9px; border-radius:6px; margin-bottom:5px;">
              <strong style="color:#92400E;">Cluttered (Tilted):</strong> Walk, Tidy (1), Handoff, Tools. <em>(Team w/ Nael; Errands w/ Mommy.)</em>
            </div>
            <div style="background:#FEF2F2; border-left:5px solid #B91C1C; padding:5px 9px; border-radius:6px;">
              <strong style="color:#991B1B;">Red Blocked:</strong> Walk, Handoff, Tools only. Fix w/ <strong>2+ Helpers</strong> or <strong>Abba</strong>!
            </div>
          </div>
          <div class="box-card" style="font-size:16.5px; padding:11px 14px; line-height:1.4;">
            <strong style="color:#B45309;">4 Family Superpowers</strong><br>
            • <strong>Abba:</strong> Unblocks Red alone; his Cluttered room can't flip Red (canceled!).<br>
            • <strong>Nael:</strong> With teammate in Cluttered room, either finishes Team Chores (any turn).<br>
            • <strong>Mommy:</strong> 1 FREE Errand/turn (in addition to 2 Actions!); works in Cluttered.<br>
            • <strong>Mekimi:</strong> Crawls straight into <strong>ANY room</strong> on any Move!
          </div>
          <div class="box-card" style="font-size:17px; text-align:center; padding:10px 14px;">
            <strong>Modes:</strong> Beg <strong>10</strong> Missions / <strong>7</strong> Clock (no Time Flies) · Std <strong>13</strong> / <strong>6</strong> · Hard <strong>15</strong> / <strong>6</strong>
          </div>
        """),
    ]
    return [(num, booklet_page(num, title, body)) for num, title, body in pages]

BACKS_DIR = ROOT / "print-pack" / "02_Cards_Backs"
TUCK_DIR = ROOT / "print-pack" / "03_Tuck_Box_90"

def render_blocked_back_html(orig_path: Path) -> str:
    b64 = base64.b64encode(orig_path.read_bytes()).decode("ascii")
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@600;700;800&display=swap');
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      html, body {{ width: 825px; height: 1125px; overflow: hidden; font-family: 'DM Sans', sans-serif; }}
      .card {{ position: relative; width: 825px; height: 1125px; background: url("data:image/png;base64,{b64}") no-repeat 0 0 / 825px 1125px; }}
      .bottom-pill {{
        position: absolute;
        left: 76px;
        top: 974px;
        width: 673px;
        height: 76px;
        background: #FFFFFF;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 8px 22px;
        color: #991B1B;
        font-size: 20.5px;
        font-weight: 700;
        line-height: 1.28;
        letter-spacing: -0.01em;
      }}
    </style></head><body>
      <div class="card">
        <div class="bottom-pill">
          <div>Still allowed here: walk in or out,</div>
          <div>hand off Errands for free, and use Tools normally.</div>
        </div>
      </div>
    </body></html>"""

def render_shared_helper_back_html(orig_path: Path) -> str:
    # Smoothly erase the old subtitle band (y=740..792, x=100..725) via vertical per-column gradient interpolation
    im = Image.open(orig_path).convert("RGB")
    px = im.load()
    y0, y1 = 740, 792
    for x in range(100, 726):
        c0 = px[x, y0]
        c1 = px[x, y1]
        for y in range(y0 + 1, y1):
            t = (y - y0) / (y1 - y0)
            px[x, y] = (
                round(c0[0] * (1 - t) + c1[0] * t),
                round(c0[1] * (1 - t) + c1[1] * t),
                round(c0[2] * (1 - t) + c1[2] * t),
            )
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600&display=swap');
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      html, body {{ width: 825px; height: 1125px; overflow: hidden; font-family: 'DM Sans', sans-serif; }}
      .card {{ position: relative; width: 825px; height: 1125px; background: url("data:image/png;base64,{b64}") no-repeat 0 0 / 825px 1125px; }}
      .subtitle {{
        position: absolute;
        left: 90px;
        right: 90px;
        top: 744px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #E2E8F0;
        font-size: 24px;
        font-weight: 500;
        letter-spacing: 0.005em;
      }}
    </style></head><body>
      <div class="card">
        <div class="subtitle">Keep face-up · Place carried Errands here</div>
      </div>
    </body></html>"""

def _interp_box(im: Image.Image, x0: int, y0: int, x1: int, y1: int) -> None:
    px = im.load()
    for x in range(x0, x1 + 1):
        c0 = px[x, y0]
        c1 = px[x, y1]
        for y in range(y0 + 1, y1):
            t = (y - y0) / (y1 - y0)
            px[x, y] = (
                round(c0[0] * (1 - t) + c1[0] * t),
                round(c0[1] * (1 - t) + c1[1] * t),
                round(c0[2] * (1 - t) + c1[2] * t),
            )

def render_shared_chores_back_html(orig_path: Path) -> str:
    im = Image.open(orig_path).convert("RGB")
    _interp_box(im, 140, 682, 685, 788)
    _interp_box(im, 265, 938, 560, 994)
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700;800&display=swap');
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      html, body {{ width: 825px; height: 1125px; overflow: hidden; font-family: 'DM Sans', sans-serif; }}
      .card {{ position: relative; width: 825px; height: 1125px; background: url("data:image/png;base64,{b64}") no-repeat 0 0 / 825px 1125px; }}
      .heading {{
        position: absolute; left: 90px; right: 90px; top: 684px;
        text-align: center; color: #FDE68A; font-size: 38px; font-weight: 600; letter-spacing: 0.03em;
      }}
      .sub {{
        position: absolute; left: 90px; right: 90px; top: 746px;
        text-align: center; color: #E2E8F0; font-size: 24px; font-weight: 500;
      }}
      .pill {{
        position: absolute; left: 50%; top: 944px; transform: translateX(-50%);
        background: #FCD34D; color: #0F172A; font-size: 20px; font-weight: 800;
        letter-spacing: 0.07em; padding: 10px 26px; border-radius: 999px; white-space: nowrap;
      }}
    </style></head><body>
      <div class="card">
        <div class="heading">MISSIONS DECK</div>
        <div class="sub">Finish all Missions before Shabbat begins!</div>
        <div class="pill">18 MISSION CARDS</div>
      </div>
    </body></html>"""

def render_shabbat_begins_html(orig_path: Path) -> str:
    im = Image.open(orig_path).convert("RGB")
    _interp_box(im, 72, 864, 753, 976)
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@600;700&display=swap');
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      html, body {{ width: 825px; height: 1125px; overflow: hidden; font-family: 'DM Sans', sans-serif; }}
      .card {{ position: relative; width: 825px; height: 1125px; background: url("data:image/png;base64,{b64}") no-repeat 0 0 / 825px 1125px; }}
      .box {{
        position: absolute; left: 76px; top: 872px; width: 673px; height: 96px;
        background: rgba(255, 255, 255, 0.13); border-radius: 22px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        text-align: center; padding: 10px 24px; color: #FFFFFF; font-size: 23.5px; font-weight: 700; line-height: 1.38;
      }}
    </style></head><body>
      <div class="card">
        <div class="box">
          <div>If any Missions are still unfinished, Shabbat has begun</div>
          <div>before the house is ready — try again!</div>
        </div>
      </div>
    </body></html>"""

def render_tuck_box_html(orig_path: Path) -> str:
    im = Image.open(orig_path).convert("RGB")
    # Erase inside back blurb card (keep outer rounded border intact!)
    _interp_box(im, 696, 768, 1304, 1006)
    # Erase top flap subtitle line ("Can your family finish every chore before sunset?")
    _interp_box(im, 1930, 326, 2520, 362)
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      html, body {{ width: 2775px; height: 2100px; overflow: hidden; font-family: 'DM Sans', sans-serif; }}
      .tuck {{ position: relative; width: 2775px; height: 2100px; background: url("data:image/png;base64,{b64}") no-repeat 0 0 / 2775px 2100px; }}
      .blurb {{
        position: absolute; left: 712px; top: 785px; width: 562px;
        color: #E2E8F0; font-size: 27px; font-weight: 400; line-height: 1.34;
      }}
      .blurb strong {{ color: #FFFFFF; font-weight: 700; }}
      .flap-sub {{
        position: absolute; left: 1930px; top: 329px; width: 590px;
        text-align: center; color: #CBD5E1; font-size: 24px; font-weight: 400;
      }}
    </style></head><body>
      <div class="tuck">
        <div class="blurb">
          It's Friday afternoon in Givot Eden—challah is rising, toys are exploding out of the Mamad, and winter sunset is coming fast! Team up as <strong>Abba, Mommy, Nael, and Mekimi</strong> to tidy rooms, unleash Household Tools, and finish every Mission before <strong>Shabbat Begins!</strong>
        </div>
        <div class="flap-sub">Can your family finish every Mission before sunset?</div>
      </div>
    </body></html>"""

def render_all(
    only_backs_and_pages: set[int] | None = None,
    only_abba_and_pages: set[int] | None = None,
    arrows_and_clutter_guard: bool = False,
):
    jobs: list[tuple[Path, str]] = []

    if arrows_and_clutter_guard:
        jobs.append((FRONTS_DIR / HELPERS_SPEC[0]["file"], render_helper_html(HELPERS_SPEC[0])))
        for c in CHORES_SPEC:
            if c[1] == "ERRAND":
                jobs.append((FRONTS_DIR / c[0], render_chore_html(c)))
        for num, html in build_booklet_pages():
            jobs.append((BOOKLET_DIR / f"small_booklet_page_{num:02d}.png", html))
    elif only_abba_and_pages is not None:
        jobs.append((FRONTS_DIR / HELPERS_SPEC[0]["file"], render_helper_html(HELPERS_SPEC[0])))
        for num, html in build_booklet_pages():
            if num in only_abba_and_pages:
                jobs.append((BOOKLET_DIR / f"small_booklet_page_{num:02d}.png", html))
    else:
        if only_backs_and_pages is None:
            for h in HELPERS_SPEC:
                jobs.append((FRONTS_DIR / h["file"], render_helper_html(h)))
            for c in CHORES_SPEC:
                jobs.append((FRONTS_DIR / c[0], render_chore_html(c)))
            for t in TOOLS_SPEC:
                jobs.append((FRONTS_DIR / t["file"], render_tool_html(t)))
            for s in SLOW_DOWNS_SPEC:
                jobs.append((FRONTS_DIR / s[0], render_slowdown_html(s)))
            jobs.append((FRONTS_DIR / "clock_63_71_friday_afternoon_QTY9.png", render_friday_afternoon_html()))

        # 13 updated card backs (12 Red Blocked Rooms + Shared Helper Back)
        for back_path in sorted(BACKS_DIR.glob("back_room_*_BLOCKED.png")):
            jobs.append((back_path, render_blocked_back_html(back_path)))
        jobs.append((BACKS_DIR / "back_SHARED_helpers.png", render_shared_helper_back_html(BACKS_DIR / "back_SHARED_helpers.png")))

        for num, html in build_booklet_pages():
            if only_backs_and_pages is None or num in only_backs_and_pages:
                jobs.append((BOOKLET_DIR / f"small_booklet_page_{num:02d}.png", html))

    print(f"Rendering {len(jobs)} TGC 300-DPI RGB PNGs...")
    overflows = []

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True)
        page = browser.new_page(viewport={"width": 825, "height": 1125}, device_scale_factor=1)

        for out_path, html in jobs:
            page.set_content(html, wait_until="load")
            page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
            dims = page.evaluate("""() => {
                const el = document.querySelector('.card, .page');
                const inner = document.querySelector('.page-body');
                return {
                    sw: document.documentElement.scrollWidth,
                    sh: document.documentElement.scrollHeight,
                    elSh: el ? el.scrollHeight : 0,
                    innerBot: inner ? inner.getBoundingClientRect().bottom : 0,
                    footerTop: document.querySelector('.footer') ? document.querySelector('.footer').getBoundingClientRect().top : 9999
                };
            }""")
            if dims["sw"] > 825 or dims["sh"] > 1125 or dims["elSh"] > 1125 or dims["innerBot"] > dims["footerTop"] - 4:
                overflows.append((out_path.name, dims))

            raw_png = page.screenshot(type="png", full_page=False)
            im = Image.open(io.BytesIO(raw_png)).convert("RGB")
            assert im.size == (825, 1125), f"Bad size {im.size} for {out_path.name}"
            im.save(out_path, "PNG", dpi=(300, 300), optimize=True)

        browser.close()

    if overflows:
        print("OVERFLOW DETECTED:")
        for name, d in overflows:
            print("  ", name, d)
        raise SystemExit(1)

    print(f"SUCCESS: Rendered & verified {len(jobs)} crisp 825x1125 RGB 300-DPI PNGs with 0 overflows!")

if __name__ == "__main__":
    import sys
    if "--arrows-and-clutter-guard" in sys.argv:
        render_all(arrows_and_clutter_guard=True)
    elif "--targeted-polish" in sys.argv:
        render_all(only_abba_and_pages={7, 12, 15, 16})
    elif "--backs-and-booklet" in sys.argv:
        render_all(only_backs_and_pages={7, 12, 13, 14, 15, 16})
    else:
        render_all()
