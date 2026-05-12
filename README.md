# Matterport Dream Splat

A local Vite + React + TypeScript demo that turns a Matterport-style 360 panorama into a fake 3D splat / point-cloud world with before-and-after vibe transformations.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL printed by Vite, usually `http://localhost:5173`.

## Add sample assets

Place these files in:

```text
public/assets/
  pano-original.jpg
  pano-transformed.jpg
  depth-map.jpg
```

`.jpg`, `.jpeg`, and `.png` are supported for the same base names, so `pano-transformed.png` works too.

`pano-transformed` is optional; when it is missing, transformed vibes are simulated from the original colors.

`depth-map` changes the Splat mode from a constant-radius preview shell into a depth-shaped point cloud. If it is missing, the app does not fake a gradient depth map. It shows: `Depth map missing — using preview sphere mode.`

## Viewer modes

- `Pano Sphere`: default mode. Renders the panorama as an equirectangular sphere/background so the room is always readable.
- `Splat`: samples the panorama into a dense point shell. With a real `depth-map`, brightness controls point radius. Without one, radius stays almost constant so it reads as a panoramic room shell instead of scattered fog.
- `Inside` / `Outside`: toggles between an immersive camera near the pano origin and an outside view of the point shell.
- `Explode to Splat`: starts in the clear sphere preview, then animates into the point-cloud shell.

## Fake splat pipeline

This is intentionally not a mathematically perfect Gaussian Splat. It is a browser-friendly visual prototype:

1. Load an equirectangular 360 panorama and a depth map.
2. Sample panorama pixels at the selected density, capped near 500k points.
3. Convert each sampled pixel into spherical coordinates:
   - `theta` comes from horizontal position.
   - `phi` comes from vertical position.
   - the spherical direction becomes a 3D vector.
4. Read depth brightness from the depth map and use it as distance.
5. Set each point position to `direction * depth`.
6. Color each point from the original or transformed panorama.

The before/after slider splits point colors by panorama longitude, so the scene communicates "original Matterport pano becomes transformed 3D world" without needing a backend reconstruction pipeline.
