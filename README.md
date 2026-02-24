# Kadapa Kalyanam - Browser Build

Offline, responsive multi-part HTML narrative game.

## Run
Open any file directly in browser:
- `chapters-1-3.html`
- `chapters-3-6.html`
- `chapters-6-9.html`
- `chapters-9-12.html`

No server required.

## Features
- Destiny-Fixed branching narrative (choices alter flavor/stats, no breakup path)
- Auto-save after each scene/decision in local JSON (`localStorage`)
- Mini-games: Shadow Follow, Jeelakarra Bellam timing, Talambralu rapid tap
- Adaptive layout for desktop/mobile (dvh/vw responsive)
- Canvas-based animated backgrounds/effects + adaptive tone cues

## Save
Each chapter bundle keeps its own progress scope through chapter-range keyed save metadata.
Use **Clear Save** button to reset chapter progress.
