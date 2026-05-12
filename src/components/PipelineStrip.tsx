import { Box, BrainCircuit, Cuboid } from 'lucide-react';

const steps = [
  { label: 'Matterport 360 Pano', Icon: Box },
  { label: 'AI Depth Map', Icon: BrainCircuit },
  { label: 'Splat 3D World', Icon: Cuboid },
];

export function PipelineStrip() {
  return (
    <section className="pipeline-strip" aria-label="Fake splat pipeline">
      {steps.map(({ label, Icon }, index) => (
        <div className="pipeline-step" key={label}>
          <span className="pipeline-icon">
            <Icon size={18} strokeWidth={1.8} />
          </span>
          <span>{label}</span>
          {index < steps.length - 1 && <span className="pipeline-arrow" aria-hidden="true" />}
        </div>
      ))}
    </section>
  );
}
