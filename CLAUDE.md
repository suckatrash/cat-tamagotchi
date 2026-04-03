# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build system or dependencies. Open `index.html` directly in a browser. No package manager, bundler, or dev server is needed.

## Architecture

A retro Tamagotchi-style virtual cat pet game built with vanilla HTML/CSS/JavaScript (zero dependencies).

**Three files:**
- `index.html` — DOM structure (happiness bar, game stage, toy tray)
- `app.js` — All game logic in a single IIFE (~530 lines)
- `style.css` — Retro 80s/90s styling with CRT scanline effects (~560 lines)

**Core game loop (app.js):**
- Global `state` object tracks happiness (0-100), alive status, idle timers, and current sprite
- `init()` sets up canvas, draws the cat, starts two background loops: `startDecay()` (happiness ticks down every 3s) and `startIdleCheck()` (death after 3min idle, sleep "Zzz" after 20s)
- Interactions: click/tap to pet (+5 happiness), drag-and-drop toys to the cat (+10-20 happiness depending on toy)
- Cat dies when happiness hits 0 or after 3 minutes of no interaction

**Pixel cat rendering:**
- Sprites defined as arrays of character rows, each character maps to a color
- Rendered on an HTML5 Canvas at 6px per pixel (84×102 canvas)
- Four emotional states: `normal`, `happy`, `sad`, `verySad` — selected based on happiness threshold

**Mobile support:**
- Touch events with ghost element tracking finger position
- Drop detection via distance calculation (< 120px from cat)

## Conventions

- `$()` helper wraps `document.querySelector`
- Section dividers use `── section ──` comment style
- Sprite rows reuse shared constants (`const R = {...}`) for common pixel patterns
- All state mutations go through `setHappiness()` which updates the bar, sprite, and triggers death if needed
