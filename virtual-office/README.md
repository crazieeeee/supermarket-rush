# King Hang's Staff Virtual Office (Three.js v1)

Isometric-style 3D virtual office for Grok Bots / teammates. Inspired by the Threads “David’s Staff Virtual Office” look.

## What’s in v1

- **Three rooms:** Investment · 外匯 · 未分類 (glass partitions)
- **Desks + glowing avatars** (capsules); Working sits at desk, Idle wanders in-room
- **Right sidebar:** Team list (filter by room) + Activity log
- **Bottom:** activity legend + Day / Evening / Night toggle
- **Data:** snapshot only (`data.js` / `data.json`) — statuses are **not invented**; live refresh is future work

Snapshot as-of is embedded from `/workspace/virtual-office-snapshot.json`.

## Open locally

CDN Three.js needs network. Prefer a tiny static server (avoids `file://` quirks):

```bash
cd virtual-office-3d
python3 -m http.server 8765
# then open http://localhost:8765/
```

Or open `index.html` directly if your browser allows CDN scripts on `file://`.

Controls: drag to orbit · scroll to zoom · click an agent in the Team list to focus.

## Files

| File | Role |
|------|------|
| `index.html` | Shell + UI chrome |
| `styles.css` | Dark dashboard UI |
| `app.js` | Three.js scene, rooms, avatars, TOD |
| `data.js` | Inline `window.OFFICE_SNAPSHOT` (preferred for publish) |
| `data.json` | Same snapshot as JSON |
| `vendor/three.min.js` | Vendored Three.js r160 UMD (no CDN required) |

## Publish (parent / King Hang)

Do **not** push from a box without `gh` auth. Options:

1. **Existing Pages repo** `crazieeeee/supermarket-rush`  
   Copy this folder to e.g. `virtual-office/` (or `Y51…/virtual-office/`), commit, push; Pages URL becomes  
   `https://crazieeeee.github.io/supermarket-rush/<path>/`

2. **New repo / folder** dedicated to the office — same static files, enable GitHub Pages on `main` root or `/docs`.

After auth is available:

```bash
# example — adjust remote/path
cp -R virtual-office-3d /path/to/supermarket-rush/virtual-office
cd /path/to/supermarket-rush
git add virtual-office && git commit -m "Add 3D virtual office v1" && git push
```

## Later

- Periodic rewrite of `data.js` from a fresh bot-status snapshot
- Optional “Stop Simulation” / Now = wall-clock lighting
- Richer furniture / city skyline if desired
