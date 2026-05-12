import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AssetStatus, CameraView, RenderMode, Vibe, ViewerMode } from '../types';
import { loadImageData, panoToPointCloud } from '../utils/panoToPointCloud';

type AssetExtension = 'jpg' | 'jpeg' | 'png';

const ASSET_EXTENSIONS: AssetExtension[] = ['jpg', 'jpeg', 'png'];

type SplatViewerProps = {
  vibe: Vibe;
  pointSize: number;
  density: number;
  compare: number;
  mode: ViewerMode;
  renderMode: RenderMode;
  cameraView: CameraView;
  resetSignal: number;
  explodeSignal: number;
  onModeChange: (mode: ViewerMode) => void;
  onCompareChange: (value: number) => void;
  onRenderModeChange: (mode: RenderMode) => void;
  onCameraViewChange: (view: CameraView) => void;
  onAssetStatusChange: (status: AssetStatus) => void;
};

export function SplatViewer({
  vibe,
  pointSize,
  density,
  compare,
  mode,
  renderMode,
  cameraView,
  resetSignal,
  explodeSignal,
  onModeChange,
  onCompareChange,
  onRenderModeChange,
  onCameraViewChange,
  onAssetStatusChange,
}: SplatViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const panoSphereRef = useRef<THREE.Mesh | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pointScaleRef = useRef(1);
  const compareDragRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageData, setImageData] = useState<Awaited<ReturnType<typeof loadAllImages>> | null>(null);
  const [cameraPosition, setCameraPosition] = useState('0.00, 0.00, 0.00');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadAllImages().then((loaded) => {
      if (cancelled) return;
      setImageData(loaded);
      setIsLoading(false);
      onAssetStatusChange({
        original: loaded.original.loaded,
        transformed: loaded.transformed.loaded,
        depth: loaded.depth.loaded,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [onAssetStatusChange]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020812, 0.022);
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.01, 120);
    camera.position.set(0, 0, 0.01);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x020812, 0);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.35;
    controls.zoomSpeed = 0.85;
    controls.minDistance = 0.01;
    controls.maxDistance = 22;
    controls.target.set(0, 0, 1);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    rendererRef.current = renderer;

    let frame = 0;
    let lastCameraDebugUpdate = 0;
    const animate = () => {
      frame = window.requestAnimationFrame(animate);
      const points = pointsRef.current;
      if (points) {
        if (pointScaleRef.current < 1) {
          pointScaleRef.current = Math.min(1, pointScaleRef.current + 0.026);
          points.scale.setScalar(easeOutCubic(pointScaleRef.current));
        }
        points.rotation.y += 0.00025;
      }
      controls.update();
      const now = performance.now();
      if (now - lastCameraDebugUpdate > 280) {
        lastCameraDebugUpdate = now;
        setCameraPosition(formatVector(camera.position));
      }
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      const panoSphere = panoSphereRef.current;
      const material = panoSphere?.material;
      if (material instanceof THREE.ShaderMaterial) {
        material.uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
      } else if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const material = object.material;
        disposeMaterial(material);
      }
    });
  };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !imageData) return;

    if (panoSphereRef.current) {
      scene.remove(panoSphereRef.current);
      panoSphereRef.current.geometry.dispose();
      const oldMaterial = panoSphereRef.current.material;
      disposeMaterial(oldMaterial);
      panoSphereRef.current = null;
    }

    const originalTexture = imageDataToTexture(imageData.original.data);
    const transformedTexture = imageDataToTexture(imageData.transformed.data);
    const geometry = new THREE.SphereGeometry(18, 128, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uOriginal: { value: originalTexture },
        uTransformed: { value: transformedTexture },
        uMode: { value: viewerModeUniform(mode) },
        uCompare: { value: compare },
        uResolution: { value: new THREE.Vector2(rendererRef.current?.domElement.width ?? 1, rendererRef.current?.domElement.height ?? 1) },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uOriginal;
        uniform sampler2D uTransformed;
        uniform float uMode;
        uniform float uCompare;
        uniform vec2 uResolution;
        varying vec2 vUv;

        void main() {
          vec2 panoUv = vec2(fract(1.5 - vUv.x), 1.0 - vUv.y);
          vec3 originalColor = texture2D(uOriginal, panoUv).rgb;
          vec3 transformedColor = texture2D(uTransformed, panoUv).rgb;
          float screenX = gl_FragCoord.x / max(uResolution.x, 1.0);
          float transformedMix = uMode > 1.5 ? 1.0 : (uMode > 0.5 ? step(uCompare, screenX) : 0.0);
          vec3 color = mix(originalColor, transformedColor, transformedMix);
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }
      `,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const panoSphere = new THREE.Mesh(geometry, material);
    panoSphere.frustumCulled = false;
    panoSphere.renderOrder = -100;
    scene.background = new THREE.Color(0x020812);
    scene.add(panoSphere);
    panoSphereRef.current = panoSphere;
  }, [imageData]);

  useEffect(() => {
    const material = panoSphereRef.current?.material;
    if (!(material instanceof THREE.ShaderMaterial)) return;
    material.uniforms.uMode.value = viewerModeUniform(mode);
    material.uniforms.uCompare.value = compare;
  }, [compare, mode]);

  const pointCloud = useMemo(() => {
    if (!imageData || renderMode !== 'splat') return null;
    return panoToPointCloud({
      original: imageData.original.data,
      transformed: imageData.transformed.data,
      depth: imageData.depth.loaded ? imageData.depth.data : null,
      depthLoaded: imageData.depth.loaded,
      density,
      vibe,
      mode,
      compare,
    });
  }, [compare, density, imageData, mode, renderMode, vibe]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (pointsRef.current) {
      scene.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
      const oldMaterial = pointsRef.current.material;
      if (Array.isArray(oldMaterial)) oldMaterial.forEach((material) => material.dispose());
      else oldMaterial.dispose();
      pointsRef.current = null;
    }

    if (!pointCloud || renderMode !== 'splat') return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pointCloud.positions, 3));
    geometry.setAttribute('customColor', new THREE.BufferAttribute(pointCloud.colors, 3));
    geometry.computeBoundingSphere();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: pointSizeToShaderPixels(pointSize) },
      },
      vertexShader: `
        attribute vec3 customColor;
        varying vec3 vColor;
        uniform float uSize;

        void main() {
          vColor = customColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float distanceToCamera = max(0.85, length(mvPosition.xyz));
          gl_PointSize = uSize * (7.0 / distanceToCamera);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float radius = length(uv);
          if (radius > 0.5) discard;
          float alpha = smoothstep(0.5, 0.18, radius) * 0.42;
          vec3 color = vColor * (1.22 - radius * 0.18);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    const points = new THREE.Points(geometry, material);
    pointScaleRef.current = 1;
    scene.add(points);
    pointsRef.current = points;
  }, [pointCloud, pointSize, renderMode]);

  useEffect(() => {
    const points = pointsRef.current;
    if (!points) return;
    const material = points.material;
    if (Array.isArray(material)) return;
    if (!(material instanceof THREE.ShaderMaterial)) return;
    material.uniforms.uSize.value = pointSizeToShaderPixels(pointSize);
  }, [pointSize]);

  useEffect(() => {
    resetCamera(cameraRef.current, controlsRef.current, cameraView);
  }, [cameraView, resetSignal]);

  useEffect(() => {
    if (renderMode !== 'splat') return;
    const points = pointsRef.current;
    if (!points) return;
    pointScaleRef.current = 0.02;
    points.scale.setScalar(0.02);
    resetCamera(cameraRef.current, controlsRef.current, 'inside');
    onCameraViewChange('inside');
  }, [explodeSignal, onCameraViewChange, renderMode]);

  const pointCount = pointCloud?.count ?? 0;
  const depthMissing = imageData ? !imageData.depth.loaded : false;
  const updateCompareFromPointer = useCallback((clientX: number) => {
    const mount = mountRef.current;
    if (!mount) return;
    const rect = mount.getBoundingClientRect();
    const nextCompare = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width));
    onModeChange('split');
    onCompareChange(nextCompare);
  }, [onCompareChange, onModeChange]);
  const endCompareDrag = useCallback(() => {
    compareDragRef.current = false;
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, []);
  const handleComparePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    compareDragRef.current = true;
    if (controlsRef.current) controlsRef.current.enabled = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateCompareFromPointer(event.clientX);
  }, [updateCompareFromPointer]);
  const handleComparePointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (!compareDragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    updateCompareFromPointer(event.clientX);
  }, [updateCompareFromPointer]);
  const handleCompareKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    onModeChange('split');
    onCompareChange(Math.max(0.02, Math.min(0.98, compare + (event.key === 'ArrowRight' ? 0.025 : -0.025))));
  }, [compare, onCompareChange, onModeChange]);

  return (
    <section className="viewer-shell">
      <div className="viewer-toolbar">
        <div>
          <span className="viewer-label">{renderMode === 'pano' ? 'Pano sphere preview' : 'Live splat viewport'}</span>
          <strong>{renderMode === 'pano' ? 'Room-first preview mode' : `${pointCount.toLocaleString()} sampled points`}</strong>
        </div>
        <div className="mode-toggle" aria-label="Viewer mode">
          {(['pano', 'splat'] as RenderMode[]).map((item) => (
            <button
              className={renderMode === item ? 'active' : ''}
              key={item}
              type="button"
              onClick={() => onRenderModeChange(item)}
            >
              {item === 'pano' ? 'Pano Sphere' : 'Splat'}
            </button>
          ))}
          {(['original', 'split', 'transformed'] as ViewerMode[]).map((item) => (
            <button
              className={mode === item ? 'active' : ''}
              key={item}
              type="button"
              onClick={() => onModeChange(item)}
            >
              {item === 'split' ? 'Before / After' : titleCase(item)}
            </button>
          ))}
        </div>
      </div>

      <div className="viewer-canvas" ref={mountRef}>
        {isLoading && (
          <div className="loading-state">
            <Sparkles size={22} />
            Building fake splat world...
          </div>
        )}
        {depthMissing && (
          <div className="depth-warning" role="status">
            Depth map missing — using preview sphere mode.
          </div>
        )}
        {mode === 'split' && (
          <div className="compare-divider" style={{ left: `${compare * 100}%` }}>
            <button
              aria-label="Drag before after divider"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(compare * 100)}
              className="compare-handle"
              onKeyDown={handleCompareKeyDown}
              onLostPointerCapture={endCompareDrag}
              onPointerCancel={endCompareDrag}
              onPointerDown={handleComparePointerDown}
              onPointerMove={handleComparePointerMove}
              onPointerUp={endCompareDrag}
              role="slider"
              type="button"
            />
          </div>
        )}
        <div className="scanline" aria-hidden="true" />
      </div>

      <div className="debug-overlay" aria-label="Viewer debug overlay">
        <span>pano loaded: {imageData?.original.loaded ? 'yes' : 'no'}</span>
        <span>transformed loaded: {imageData?.transformed.loaded ? 'yes' : 'no'}</span>
        <span>depth loaded: {imageData?.depth.loaded ? 'yes' : 'no'}</span>
        <span>point count: {pointCount.toLocaleString()}</span>
        <span>camera position: {cameraPosition}</span>
      </div>

      <button className="floating-reset" type="button" onClick={() => resetCamera(cameraRef.current, controlsRef.current, cameraView)}>
        <RotateCcw size={15} />
      </button>

      <div className="camera-toggle" aria-label="Camera view">
        {(['inside', 'outside'] as CameraView[]).map((item) => (
          <button
            className={cameraView === item ? 'active' : ''}
            key={item}
            type="button"
            onClick={() => onCameraViewChange(item)}
          >
            {item === 'inside' ? 'Inside View' : 'Outside View'}
          </button>
        ))}
      </div>
    </section>
  );
}

async function loadAllImages() {
  const original = await loadImageData(await findAssetUrl('pano-original'), 'original');
  const [transformedAsset, depthAsset] = await Promise.all([
    findAssetUrl('pano-transformed', ['png', 'jpg', 'jpeg']).then((url) => loadImageData(url, 'transformed')),
    findAssetUrl('depth-map').then((url) => loadImageData(url, 'depth')),
  ]);
  const transformed = transformedAsset.loaded ? transformedAsset : { data: original.data, loaded: false };

  return { original, transformed, depth: depthAsset };
}

function resetCamera(
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
  cameraView: CameraView = 'inside',
) {
  if (!camera || !controls) return;
  if (cameraView === 'inside') {
    camera.position.set(0, 0, 0.01);
    controls.target.set(0, 0, 1);
  } else {
    camera.position.set(0, 2.2, 13.5);
    controls.target.set(0, 0, 0);
  }
  controls.update();
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function viewerModeUniform(mode: ViewerMode) {
  if (mode === 'transformed') return 2;
  if (mode === 'split') return 1;
  return 0;
}

async function findAssetUrl(baseName: string, extensions: AssetExtension[] = ASSET_EXTENSIONS) {
  for (const extension of extensions) {
    const url = `/assets/${baseName}.${extension}`;
    try {
      const response = await fetch(`${url}?probe=${Date.now()}`, {
        cache: 'no-store',
        method: 'HEAD',
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (response.ok && contentType.startsWith('image/')) return `${url}?v=${Date.now()}`;
    } catch {
      // Try the next extension.
    }
  }

  return undefined;
}

function pointSizeToShaderPixels(pointSize: number) {
  return pointSize * 2.9;
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }

  if (material instanceof THREE.ShaderMaterial) {
    const original = material.uniforms.uOriginal?.value;
    const transformed = material.uniforms.uTransformed?.value;
    if (original instanceof THREE.Texture) original.dispose();
    if (transformed instanceof THREE.Texture) transformed.dispose();
  }

  material.dispose();
}

function imageDataToTexture(imageData: ImageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function formatVector(vector: THREE.Vector3) {
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}
