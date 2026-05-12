# Matterport Dream Pano

A local Vite + React + TypeScript demo that previews a Matterport-style 360 panorama with original, transformed, and before/after comparison modes.

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
```

`.jpg`, `.jpeg`, and `.png` are supported for the same base names, so `pano-transformed.png` works too.

`pano-transformed` is optional; when it is missing, the transformed mode falls back to a generated stylized room preview.

## Viewer modes

- `Original`: renders the source panorama.
- `Before / After`: splits the source and transformed panoramas with a draggable divider.
- `Transformed`: renders the transformed panorama.
- `Inside` / `Outside`: toggles between an immersive camera near the pano origin and an outside sphere view.
