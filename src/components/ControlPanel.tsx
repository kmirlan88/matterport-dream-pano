import { Orbit, RotateCcw, Sparkles } from 'lucide-react';
import type { CameraView, RenderMode, Vibe } from '../types';

type ControlPanelProps = {
  vibes: Vibe[];
  vibe: Vibe;
  pointSize: number;
  density: number;
  renderMode: RenderMode;
  cameraView: CameraView;
  onVibeChange: (vibe: Vibe) => void;
  onPointSizeChange: (value: number) => void;
  onDensityChange: (value: number) => void;
  onRenderModeChange: (mode: RenderMode) => void;
  onCameraViewChange: (view: CameraView) => void;
  onExplodeToSplat: () => void;
  onResetCamera: () => void;
};

export function ControlPanel({
  vibes,
  vibe,
  pointSize,
  density,
  renderMode,
  cameraView,
  onVibeChange,
  onPointSizeChange,
  onDensityChange,
  onRenderModeChange,
  onCameraViewChange,
  onExplodeToSplat,
  onResetCamera,
}: ControlPanelProps) {
  return (
    <aside className="control-panel" aria-label="Splat controls">
      <div className="panel-heading">
        <span className="panel-kicker">Dream Controls</span>
        <h2>Vibe transfer</h2>
      </div>

      <div className="vibe-grid">
        {vibes.map((item) => (
          <button
            className={item === vibe ? 'vibe-button active' : 'vibe-button'}
            key={item}
            type="button"
            onClick={() => onVibeChange(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="segmented-block" aria-label="Viewer rendering mode">
        <span>Viewer</span>
        <div className="segmented-control">
          <button className={renderMode === 'pano' ? 'active' : ''} type="button" onClick={() => onRenderModeChange('pano')}>
            Pano Sphere
          </button>
          <button className={renderMode === 'splat' ? 'active' : ''} type="button" onClick={() => onRenderModeChange('splat')}>
            Splat
          </button>
        </div>
      </div>

      <div className="segmented-block" aria-label="Camera perspective">
        <span>Camera</span>
        <div className="segmented-control">
          <button className={cameraView === 'inside' ? 'active' : ''} type="button" onClick={() => onCameraViewChange('inside')}>
            Inside
          </button>
          <button className={cameraView === 'outside' ? 'active' : ''} type="button" onClick={() => onCameraViewChange('outside')}>
            Outside
          </button>
        </div>
      </div>

      <label className="range-control">
        <span>
          Point size <strong>{pointSize.toFixed(1)}</strong>
        </span>
        <input
          min="0.6"
          max="3.2"
          step="0.1"
          type="range"
          value={pointSize}
          onChange={(event) => onPointSizeChange(Number(event.target.value))}
        />
      </label>

      <label className="range-control">
        <span>
          Density <strong>{Math.round(density * 100)}%</strong>
        </span>
        <input
          min="0.08"
          max="1"
          step="0.04"
          type="range"
          value={density}
          onChange={(event) => onDensityChange(Number(event.target.value))}
        />
      </label>

      <button className="reset-button primary-action" type="button" onClick={onExplodeToSplat}>
        <Sparkles size={16} />
        Explode to Splat
      </button>

      <button className="reset-button" type="button" onClick={onResetCamera}>
        {cameraView === 'inside' ? <RotateCcw size={16} /> : <Orbit size={16} />}
        Reset camera
      </button>
    </aside>
  );
}
