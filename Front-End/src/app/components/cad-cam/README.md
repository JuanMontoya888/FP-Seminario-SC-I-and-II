# CAD-CAM STL Laboratory Component

## Overview
Provides a browser-only 3D STL dental mesh viewer, geometric transform tool (scale, Z-rotation, view angle), horizontal layer slicer, procedural default mandible generator, and binary STL exporter.

## Interface
- `CadCam` (`[cad-cam.ts:CadCam]`): Standalone Angular component (`selector: 'app-cad-cam'`) exposing reactive signals (`model`, `error`, `busy`, `scale`, `rotation`, `viewAngle`, `layerHeight`, `selectedLayer`, `mesh`, `dimensions`, `layerCount`, `layer`, `sliceZ`), `openFile(event)`, and `download()`.
- `mandibleMesh()` (`[mandible.ts:mandibleMesh]`): Generates the default procedural lower mandible triangle mesh (`Triangle[]`) with 16 teeth (including wisdom molars).
- STL geometry utilities (`[stl.ts]`): Exports types `Point`, `Triangle`, constants `maxTriangles` (`250_000`) and `maxFileBytes` (`24 * 1024 * 1024`), and functions `readStl(buffer)`, `bounds(faces)`, `transformMesh(faces, scale, degrees)`, `sliceMesh(faces, z)`, and `writeStl(faces)`.

## Invariants
- Upload size and triangle bounds (`[stl.ts:maxFileBytes]`, `[stl.ts:maxTriangles]`, `[stl.ts:readStl]`, `[cad-cam.ts:CadCam.openFile]`): Accepts only `.stl` files up to `24 MB` and `250,000` triangles (binary or ASCII); rejects empty meshes or vertices with non-finite values or `|coord| > 1_000_000`.
- Export coordinate normalization (`[stl.ts:transformMesh]`): Centers the mesh bounding box around `X = 0, Y = 0`, places the base at `Z = 0`, then applies Z-rotation and uniform scaling.
- Render performance fallback (`[cad-cam.ts:CadCam.drawModel]`): Renders shaded depth-sorted polygons up to `20,000` triangles and switches to strided wireframe sampling (`<= 12,000` triangles) above that threshold.
- Layer & control state invariants (`[cad-cam.ts:CadCam.layer]`, `[cad-cam.ts:CadCam.sliceZ]`, `[cad-cam.ts:CadCam.resetControls]`): Initializes `viewAngle` to `20` and `layerHeight` to `0.2` mm, resets `viewAngle` to `35` (and `scale: 100`, `rotation: 0`, `layerHeight: 0.2`, `selectedLayer: 1`) on file upload, clamps displayed layer to `layerCount()`, and slices at the vertical midpoint of the selected layer height.

## Side Effects
- Reads uploaded files locally in the browser via `file.arrayBuffer()` (`[cad-cam.ts:CadCam.openFile]`).
- Mutates 2D `<canvas>` contexts (`modelCanvas`, `sliceCanvas`) inside reactive Angular `effect()` hooks (`[cad-cam.ts:CadCam]`).
- Triggers a client-side file download (`modelo-ajustado.stl`) by creating a Blob object URL, programmatically clicking a temporary `<a>` element, and revoking the URL after `1000` ms (`[cad-cam.ts:CadCam.download]`).

## Verification
- Run: `npm --prefix Front-End test`
