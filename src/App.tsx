import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PanoViewer } from './components/PanoViewer';
import type { AssetStatus, CameraView, ViewerMode } from './types';

function App() {
  const [mode, setMode] = useState<ViewerMode>('split');
  const [cameraView, setCameraView] = useState<CameraView>('inside');
  const [compare, setCompare] = useState(0.52);
  const [resetSignal, setResetSignal] = useState(0);
  const [assetStatus, setAssetStatus] = useState<AssetStatus>({
    original: true,
    transformed: true,
  });

  const missingAssets = useMemo(
    () =>
      [
        !assetStatus.original && 'pano-original.jpg',
        !assetStatus.transformed && 'pano-transformed.jpg',
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
          <div>
            <h1>Matterport Dream Pano</h1>
            <p>Preview a static 360 room scan across original, transformed, and split panorama modes.</p>
          </div>
        </div>
      </header>

      {missingAssets.length > 0 && (
        <div className="asset-warning" role="status">
          <AlertTriangle size={17} />
          <span>Add {missingAssets.join(', ')} to <code>/public/assets</code>.</span>
        </div>
      )}

      <section className="workspace">
        <PanoViewer
          compare={compare}
          mode={mode}
          resetSignal={resetSignal}
          cameraView={cameraView}
          onAssetStatusChange={handleAssetStatusChange}
          onCompareChange={setCompare}
          onCameraViewChange={setCameraView}
          onModeChange={setMode}
        />
      </section>
    </main>
  );
}

export default App;
