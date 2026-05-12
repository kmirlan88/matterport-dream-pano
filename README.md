# Matterport Dream Pano

A local Vite + React + TypeScript demo that previews a Matterport-style 360 panorama with original, transformed, and before/after comparison modes.

## Install and Run

### Requirements

- Node.js `20.19.0` or newer in the Node 20 line, or Node.js `22.12.0` or newer
- npm

```bash
npm install
npm run dev
```

Then open the URL printed by Vite, usually `http://localhost:5173`.

If dependencies are already installed, you can run only:

```bash
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

`npm run build` writes the static app to `dist/`. `npm run preview` serves that build locally, usually at `http://localhost:4173`.

## Add sample assets

Place these files in:

```text
public/assets/
  pano-original.jpg
  pano-transformed.jpg
```

`.jpg`, `.jpeg`, and `.png` are supported for the same base names, so `pano-transformed.png` works too.

`pano-transformed` is optional; when it is missing, the transformed mode falls back to a generated stylized room preview.

## Upscale generated panoramas

Generated panoramas can be upscaled with [Upscayl](https://github.com/upscayl/upscayl).

Install it on macOS with Homebrew:

```bash
brew install --cask upscayl
```

Example CLI usage:

```bash
"/Applications/Upscayl.app/Contents/Resources/bin/upscayl-bin" \
  -i party-pano.png \
  -o party-pano-upscaled.png \
  -s 2 \
  -n realesrnet-x4plus \
  -f png
```

After upscaling, place the final panorama in `public/assets/` as `pano-transformed.png` or `pano-original.png`.

## TODO

- Automate generated panorama flow:
  1. `npm run generate-pano`
  2. Auto upscale with Upscayl
  3. Copy the upscaled output to `public/assets/`
  4. Reload the viewer

## Viewer modes

- `Original`: renders the source panorama.
- `Before / After`: splits the source and transformed panoramas with a draggable divider.
- `Transformed`: renders the transformed panorama.
- `Inside` / `Outside`: toggles between an immersive camera near the pano origin and an outside sphere view.
