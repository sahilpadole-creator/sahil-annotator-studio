export type SkillLabel =
  | 'toss'
  | 'serve'
  | 'reception'
  | 'set'
  | 'dig'
  | 'attack'
  | 'block'
  | 'touch';

export type SetStyle = 'overhead' | 'underhead';
export type SetDirection = 'forward' | 'backward';

export interface SetAnnotationDetails {
  style: SetStyle;
  direction: SetDirection;
  player_id?: number;
}

export interface SkillEvent {
  id: string;
  frame: number;
  skill: SkillLabel;
  source?: 'auto' | 'manual';
  player_id?: number;
  confidence?: number; // model confidence, used by the duplicate rule
  ruleNote?: string; // set when a post-processing rule changed this skill
  // Specific to Set skills
  setStyle?: SetStyle;
  setDirection?: SetDirection;
}

export type PrecedingTouchType = 'none' | 'block' | 'dig';
export type LandingOutcome = 'in' | 'out';

export interface Point2D {
  x: number; // normalized 0..1 or pixel coord
  y: number;
}

export interface BallLandingAnnotation {
  landingFrame: number | null;
  landingCoord: Point2D | null; // [x, y] normalized 0..1 on video
  landingOutcome: LandingOutcome;
  precedingTouch: PrecedingTouchType;
  touchFrame: number | null;
  touchCoord: Point2D | null; // [x, y] normalized 0..1 on video
  isAnnotated: boolean;
}

export type PointWinner = 'team_left' | 'team_right' | 'none';
export type UmpireSide = 'left' | 'right' | 'both' | 'none';
export type FlagDecision = 'in' | 'out' | 'touch' | 'antenna' | 'none';

// Normalized (0..1) rectangle on the video
export interface BoxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UmpireFlagRecord {
  boxes?: BoxRect[]; // up to 2 line umpires
  hasFlag: boolean;
  frame: number | null;
  side: UmpireSide;
  decision: FlagDecision;
}

export interface RefereeActionsAnnotation {
  mainRefereeBoxes?: BoxRect[]; // up to 2 (first / second referee)
  mainRefereeSignalFrame: number | null;
  pointWinner: PointWinner;
  umpireFlag: UmpireFlagRecord;
  isAnnotated: boolean;
}

export interface RallyBounds {
  startFrame: number | null;
  endFrame: number | null;
}

export interface VideoMetadata {
  filename: string;
  fps: number;
  width: number;
  height: number;
  duration: number;
  frameCount: number;
}

export interface PlaylistItem {
  id: string;
  name: string;
  videoFile?: File;
  videoUrl?: string;
  xmlFile?: File;
  rawXml?: string;
  videoMetadata: VideoMetadata | null;
  rally: RallyBounds;
  events: SkillEvent[];
  ballLanding: BallLandingAnnotation;
  refereeActions: RefereeActionsAnnotation;
  currentFrame: number;
  isCompleted: boolean;
  lastUpdated: string;
}

export type AnnotationStep = 'set' | 'landing' | 'referee';

export interface AppSettings {
  theme: 'dark' | 'light';
  playbackFps: number;
  autoAdvanceOnTag: boolean;
  jumpFrameStep: number;
}
