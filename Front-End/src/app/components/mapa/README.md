# Mapa Component

## Overview
Renders an interactive Leaflet map centered on Aguascalientes, Mexico (`[21.8853, -102.2916]`) using OpenStreetMap tiles without requiring an API key.

## Interface
- `Mapa` (`[mapa.ts:Mapa]`): Standalone Angular component (`selector: 'app-mapa'`) implementing `AfterViewInit` to mount a Leaflet `L.Map` onto `#mapa-leaflet`.

## Invariants
- DOM mounting contract (`[mapa.ts:Mapa.initMap]`, `[mapa.html]`): Requires the `#mapa-leaflet` element to exist in the DOM when `ngAfterViewInit()` executes; initializes at `[21.8853, -102.2916]` with zoom `13` and `maxZoom: 19`.

## Side Effects
- Mutates the `#mapa-leaflet` DOM container via Leaflet, adds a marker at `[21.8853, -102.2916]` with an open `'Aquí estamos'` popup, and loads map tile images from `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` (`[mapa.ts:Mapa.initMap]`).

## Verification
- Run: `npm --prefix Front-End test`
