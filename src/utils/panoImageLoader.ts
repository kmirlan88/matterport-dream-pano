export type LoadedImageData = {
  data: ImageData;
  loaded: boolean;
};

export async function loadImageData(
  src: string | undefined,
  fallback: 'original' | 'transformed',
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

function createFallbackImageData(kind: 'original' | 'transformed') {
  const width = 960;
  const height = 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is not available');

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
