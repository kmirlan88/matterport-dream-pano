import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Camera, Layers3, Sparkles } from 'lucide-react';
import { ControlPanel } from './components/ControlPanel';
import { PipelineStrip } from './components/PipelineStrip';
import { SplatViewer } from './components/SplatViewer';
import type { AssetStatus, CameraView, RenderMode, Vibe, ViewerMode } from './types';

const vibes: Vibe[] = [
  'Original',
  'Zombie Apocalypse',
  'Luxury Staging',
  'Cyberpunk',
  'Cozy Family',
  'Flooded',
];

const thumbnailClasses: Record<Vibe, string> = {
  Original: 'thumb-original',
  'Zombie Apocalypse': 'thumb-zombie',
  'Luxury Staging': 'thumb-luxury',
  Cyberpunk: 'thumb-cyberpunk',
  'Cozy Family': 'thumb-cozy',
  Flooded: 'thumb-flooded',
};

function App() {
  const [vibe, setVibe] = useState<Vibe>('Cyberpunk');
  const [pointSize, setPointSize] = useState(3);
  const [density, setDensity] = useState(0.75);
  const [mode, setMode] = useState<ViewerMode>('split');
  const [renderMode, setRenderMode] = useState<RenderMode>('pano');
  const [cameraView, setCameraView] = useState<CameraView>('inside');
  const [compare, setCompare] = useState(0.52);
  const [resetSignal, setResetSignal] = useState(0);
  const [explodeSignal, setExplodeSignal] = useState(0);
  const [assetStatus, setAssetStatus] = useState<AssetStatus>({
    original: true,
    transformed: true,
    depth: true,
  });

  const missingAssets = useMemo(
    () =>
      [
        !assetStatus.original && 'pano-original.jpg',
        !assetStatus.transformed && 'pano-transformed.jpg',
        !assetStatus.depth && 'depth-map.jpg',
      ].filter(Boolean) as string[],
    [assetStatus],
  );

  const handleAssetStatusChange = useCallback((status: AssetStatus) => {
    setAssetStatus(status);
  }, []);

  return (
    <main className="app-shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />

      <header className="hero-header">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>
          <div>
            <h1>Matterport Dream Splat</h1>
            <p>Turn a static 360 room scan into a navigable splat-style world.</p>
          </div>
        </div>
        <div className="hero-stat">
          <Camera size={18} />
          <span>Local-only browser demo</span>
        </div>
      </header>

      <PipelineStrip />

      {missingAssets.length > 0 && (
        <div className="asset-warning" role="status">
          <AlertTriangle size={17} />
          <span>{missingAssets.includes('depth-map.jpg')
            ? 'Depth map missing — using preview sphere mode.'
            : <>Add {missingAssets.join(', ')} to <code>/public/assets</code>.</>}
          </span>
        </div>
      )}

      <section className="workspace">
        <ControlPanel
          density={density}
          pointSize={pointSize}
          renderMode={renderMode}
          vibe={vibe}
          vibes={vibes}
          cameraView={cameraView}
          onDensityChange={setDensity}
          onExplodeToSplat={() => {
            setRenderMode('splat');
            setExplodeSignal((value) => value + 1);
          }}
          onCameraViewChange={setCameraView}
          onPointSizeChange={setPointSize}
          onRenderModeChange={setRenderMode}
          onResetCamera={() => setResetSignal((value) => value + 1)}
          onVibeChange={(nextVibe) => {
            setVibe(nextVibe);
            if (nextVibe === 'Original') setMode('original');
            else if (mode === 'original') setMode('split');
          }}
        />

        <SplatViewer
          compare={compare}
          density={density}
          mode={mode}
          pointSize={pointSize}
          renderMode={renderMode}
          resetSignal={resetSignal}
          vibe={vibe}
          cameraView={cameraView}
          explodeSignal={explodeSignal}
          onAssetStatusChange={handleAssetStatusChange}
          onCompareChange={setCompare}
          onCameraViewChange={setCameraView}
          onModeChange={setMode}
          onRenderModeChange={setRenderMode}
        />
      </section>

      <section className="thumbnail-rail" aria-label="Vibe previews">
        {vibes.map((item) => (
          <button
            className={item === vibe ? 'thumbnail-card active' : 'thumbnail-card'}
            key={item}
            type="button"
            onClick={() => {
              setVibe(item);
              setMode(item === 'Original' ? 'original' : 'split');
            }}
          >
            <span className={`thumbnail-image ${thumbnailClasses[item]}`}>
              <Sparkles size={16} />
            </span>
            <span>{item}</span>
          </button>
        ))}
      </section>
    </main>
  );
}

export default App;
