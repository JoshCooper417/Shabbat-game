# Preparing for Shabbat — Cooper Family Edition (v3 Simplified)

A 1–4 player cooperative family card game (**Ages 6+ · 15–20 Minutes**) built with 72 illustrated poker cards, 4 family Helpers (**Abba**, **Nael**, **Mommy**, **Mekimi**), 2-Action turns, and an interactive web app featuring all of the official artwork.

## Repository Contents

- [`RULES.md`](RULES.md) — Complete, up-to-date v3 Simplified rules transcribed from the 16-page Small Booklet + full 72-card inventory.
- [`print-pack/`](print-pack/) — Original 300-DPI print-ready assets for The Game Crafter (TGC):
  - `01_Cards_Fronts/` — All card front PNGs (`825×1125` px full bleed)
  - `02_Cards_Backs/` — All 12 red Blocked room backs + 4 shared deck backs
  - `03_Tuck_Box_90/` — 90-card Poker Tuck Box full-bleed wrap (`2775×2100` px)
  - `04_Small_Booklet/` — 16-page illustrated Family Rulebook booklet PNGs
  - `TGC_Upload_Checklist.md` — Print upload checklist
- **Web App (`src/`, `public/`)** — Interactive React + TypeScript + Vite playable tabletop edition using all trimmed card artwork and the 16-page illustrated booklet.

## Running the Web App Locally

```bash
npm install
npm run dev
```

## Testing & Building

```bash
npm test
npm run build
```
