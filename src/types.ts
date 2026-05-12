export type Vibe =
  | 'Original'
  | 'Zombie Apocalypse'
  | 'Luxury Staging'
  | 'Cyberpunk'
  | 'Cozy Family'
  | 'Flooded';

export type ViewerMode = 'original' | 'transformed' | 'split';

export type RenderMode = 'pano' | 'splat';

export type CameraView = 'inside' | 'outside';

export type AssetStatus = {
  original: boolean;
  transformed: boolean;
  depth: boolean;
};
