import type { Vibe, ViewerMode } from '../types';

export type LoadedImageData = {
  data: ImageData;
  loaded: boolean;
};

export type PointCloudInput = {
  original: ImageData;
  transformed: ImageData;
  depth: ImageData | null;
  depthLoaded: boolean;
  density: number;
  vibe: Vibe;
  mode: ViewerMode;
  compare: number;
};

export type PointCloudData = {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
};

const MAX_POINTS = 500_000;
const MIN_RADIUS = 4.8;
const DEPTH_RANGE = 5.8;
const SHELL_RADIUS = 7.2;

export function panoToPointCloud(input: PointCloudInput): PointCloudData {
  const { original, transformed, depth, depthLoaded, density, vibe, mode, compare } = input;
  const width = original.width;
  const height = original.height;
  const count = Math.min(MAX_POINTS, Math.max(30_000, Math.floor(MAX_POINTS * density)));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cols = Math.ceil(Math.sqrt(count * 2));
  const rows = Math.ceil(count / cols);

  for (let pointIndex = 0; pointIndex < count; pointIndex += 1) {
      const row = Math.floor(pointIndex / cols);
      const col = pointIndex % cols;
      const jitterX = hash2(pointIndex, 17);
      const jitterY = hash2(pointIndex, 53);
      const u = (col + jitterX) / cols;
      const v = (row + jitterY) / rows;
      const x = u * width;
      const y = v * height;
      const theta = u * Math.PI * 2 - Math.PI;
      const phi = v * Math.PI;
      const sinPhi = Math.sin(phi);
      const directionX = sinPhi * Math.sin(theta);
      const directionY = Math.cos(phi);
      const directionZ = sinPhi * Math.cos(theta);
      const depthBrightness = depthLoaded && depth ? readBrightness(depth, x, y) : 0.5;
      const shellRipple = (hash2(pointIndex, 101) - 0.5) * 0.035;
      const radius = depthLoaded && depth
        ? MIN_RADIUS + depthBrightness * DEPTH_RANGE
        : SHELL_RADIUS * (1 + shellRipple);
      const base = pointIndex * 3;

      positions[base] = directionX * radius;
      positions[base + 1] = directionY * radius;
      positions[base + 2] = directionZ * radius;

      const originalRgb = readRgb(original, x, y);
      const transformedRgb = readRgb(transformed, x, y);
      const useTransformed = resolveTransformedColor(mode, u, compare);
      const rgb = useTransformed
        ? transformVibe(transformedRgb, vibe, depthBrightness, v)
        : originalRgb;

      colors[base] = rgb[0] / 255;
      colors[base + 1] = rgb[1] / 255;
      colors[base + 2] = rgb[2] / 255;
  }

  return {
    positions,
    colors,
    count,
  };
}

function resolveTransformedColor(mode: ViewerMode, longitude: number, compare: number) {
  if (mode === 'original') return false;
  if (mode === 'transformed') return true;
  return longitude >= compare;
}

function readBrightness(image: ImageData, x: number, y: number) {
  const index = pixelIndex(image, x, y);
  const r = image.data[index];
  const g = image.data[index + 1];
  const b = image.data[index + 2];
  return (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
}

function readRgb(image: ImageData, x: number, y: number): [number, number, number] {
  const index = pixelIndex(image, x, y);
  return [image.data[index], image.data[index + 1], image.data[index + 2]];
}

function pixelIndex(image: ImageData, x: number, y: number) {
  const safeX = Math.min(image.width - 1, Math.max(0, Math.floor((x / image.width) * image.width)));
  const safeY = Math.min(image.height - 1, Math.max(0, Math.floor((y / image.height) * image.height)));
  return (safeY * image.width + safeX) * 4;
}

function transformVibe(
  rgb: [number, number, number],
  vibe: Vibe,
  depthBrightness: number,
  vertical: number,
): [number, number, number] {
  const [r, g, b] = rgb;
  const glow = 35 * depthBrightness;

  switch (vibe) {
    case 'Zombie Apocalypse':
      return [r * 0.42 + 38, g * 0.82 + glow, b * 0.38 + 18];
    case 'Luxury Staging':
      return [r * 1.12 + 38, g * 1.02 + 24, b * 0.86 + 8].map(clampRgb) as [number, number, number];
    case 'Cyberpunk':
      return [
        r * 0.55 + (vertical > 0.48 ? 26 : 90),
        g * 0.72 + glow,
        b * 1.18 + 54,
      ].map(clampRgb) as [number, number, number];
    case 'Cozy Family':
      return [r * 1.08 + 24, g * 0.94 + 18, b * 0.76 + 8].map(clampRgb) as [number, number, number];
    case 'Flooded':
      return [r * 0.48 + 18, g * 0.76 + 42, b * 1.18 + 64].map(clampRgb) as [number, number, number];
    case 'Original':
    default:
      return rgb;
  }
}

function clampRgb(value: number) {
  return Math.max(0, Math.min(255, value));
}

function hash2(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export async function loadImageData(
  src: string | undefined,
  fallback: 'original' | 'transformed' | 'depth',
): Promise<LoadedImageData> {
  if (!src) {
    return { data: createFallbackImageData(fallback), loaded: false };
  }

  try {
    const response = await fetch(src, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load ${src}`);
    const blobUrl = URL.createObjectURL(await response.blob());
    try {
      const image = await loadImage(blobUrl);
      return { data: imageToData(image), loaded: true };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    return { data: createFallbackImageData(fallback), loaded: false };
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function imageToData(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  const maxWidth = 4096;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  canvas.width = Math.max(2, Math.floor(image.naturalWidth * scale));
  canvas.height = Math.max(2, Math.floor(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is not available');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function createFallbackImageData(kind: 'original' | 'transformed' | 'depth') {
  const width = 960;
  const height = 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is not available');

  if (kind === 'depth') {
    const image = context.createImageData(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const nx = x / width - 0.5;
        const ny = y / height - 0.5;
        const radial = Math.sqrt(nx * nx + ny * ny);
        const v = Math.floor(255 * Math.max(0.15, 1 - radial * 1.65 + ny * 0.25));
        const index = (y * width + x) * 4;
        image.data[index] = v;
        image.data[index + 1] = v;
        image.data[index + 2] = v;
        image.data[index + 3] = 255;
      }
    }
    return image;
  }

  const ceiling = context.createLinearGradient(0, 0, 0, height);
  if (kind === 'original') {
    ceiling.addColorStop(0, '#233043');
    ceiling.addColorStop(0.48, '#b8ada0');
    ceiling.addColorStop(0.52, '#5b4a3e');
    ceiling.addColorStop(1, '#151c25');
  } else {
    ceiling.addColorStop(0, '#102231');
    ceiling.addColorStop(0.48, '#1b8090');
    ceiling.addColorStop(0.52, '#412141');
    ceiling.addColorStop(1, '#061017');
  }
  context.fillStyle = ceiling;
  context.fillRect(0, 0, width, height);

  drawFallbackRoom(context, width, height, kind);
  return context.getImageData(0, 0, width, height);
}

function drawFallbackRoom(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  kind: 'original' | 'transformed',
) {
  const accent = kind === 'original' ? '#d8b56f' : '#27e7ff';
  const sofa = kind === 'original' ? '#7b5c48' : '#241d34';
  context.globalAlpha = 0.84;
  for (let i = 0; i < 10; i += 1) {
    const x = (i / 10) * width;
    context.strokeStyle = i % 2 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.2)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, height * 0.52);
    context.lineTo(width * 0.5, height * 0.2);
    context.stroke();
  }

  context.fillStyle = sofa;
  roundedRect(context, width * 0.16, height * 0.58, width * 0.22, height * 0.14, 18);
  roundedRect(context, width * 0.58, height * 0.56, width * 0.24, height * 0.16, 18);

  context.fillStyle = accent;
  context.globalAlpha = 0.78;
  roundedRect(context, width * 0.42, height * 0.34, width * 0.16, height * 0.14, 10);

  context.globalAlpha = 0.35;
  context.fillStyle = kind === 'original' ? '#ffffff' : '#ff4fd2';
  for (let i = 0; i < 18; i += 1) {
    const x = ((i * 113) % width) + 12;
    const y = height * (0.25 + ((i * 47) % 45) / 100);
    context.beginPath();
    context.arc(x, y, 2 + (i % 5), 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}
