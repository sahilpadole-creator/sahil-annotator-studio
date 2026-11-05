import {
  SkillEvent,
  SkillLabel,
  SetStyle,
  SetDirection,
  BallLandingAnnotation,
  RefereeActionsAnnotation,
  RallyBounds,
  PrecedingTouchType,
  LandingOutcome,
  PointWinner,
  UmpireSide,
  FlagDecision,
  BoxRect,
} from '../types';

export interface ParsedXmlResult {
  rally: RallyBounds;
  events: SkillEvent[];
  ballLanding: BallLandingAnnotation;
  refereeActions: RefereeActionsAnnotation;
  detectedFrameCount?: number;
  fps?: number;
  width?: number;
  height?: number;
}

function readBox(attrMap: Map<string, string>, prefix = 'box'): BoxRect | null {
  const x = parseFloat(attrMap.get(`${prefix}_x`) ?? '');
  const y = parseFloat(attrMap.get(`${prefix}_y`) ?? '');
  const w = parseFloat(attrMap.get(`${prefix}_w`) ?? '');
  const h = parseFloat(attrMap.get(`${prefix}_h`) ?? '');
  return [x, y, w, h].every((n) => Number.isFinite(n)) && w > 0 && h > 0 ? { x, y, w, h } : null;
}

export function parseXmlAnnotations(xmlString: string): ParsedXmlResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const rally: RallyBounds = { startFrame: null, endFrame: null };
  const events: SkillEvent[] = [];

  let ballLanding: BallLandingAnnotation = {
    landingFrame: null,
    landingCoord: null,
    landingOutcome: 'in',
    precedingTouch: 'none',
    touchFrame: null,
    touchCoord: null,
    isAnnotated: false,
  };

  let refereeActions: RefereeActionsAnnotation = {
    mainRefereeSignalFrame: null,
    pointWinner: 'none',
    umpireFlag: {
      hasFlag: false,
      frame: null,
      side: 'none',
      decision: 'none',
    },
    isAnnotated: false,
  };

  let maxFrameFound = 0;

  const images = xmlDoc.getElementsByTagName('image');
  for (let i = 0; i < images.length; i++) {
    const imageNode = images[i];
    const frameIdAttr = imageNode.getAttribute('id');
    if (!frameIdAttr) continue;
    const frame = parseInt(frameIdAttr, 10);
    if (isNaN(frame)) continue;

    if (frame > maxFrameFound) maxFrameFound = frame;

    const tags = imageNode.getElementsByTagName('tag');
    for (let j = 0; j < tags.length; j++) {
      const tagNode = tags[j];
      const tagLabel = (tagNode.getAttribute('label') || '').toLowerCase().trim();
      const source = (tagNode.getAttribute('source') || 'auto') as 'auto' | 'manual';

      // Read all attributes for this tag
      const attributes = tagNode.getElementsByTagName('attribute');
      const attrMap = new Map<string, string>();
      for (let k = 0; k < attributes.length; k++) {
        const name = (attributes[k].getAttribute('name') || '').toLowerCase().trim();
        const value = (attributes[k].textContent || '').trim();
        attrMap.set(name, value);
      }

      if (tagLabel === 'start_rally') {
        rally.startFrame = frame;
      } else if (tagLabel === 'end_rally') {
        rally.endFrame = frame;
      } else if (tagLabel === 'ball_landing') {
        const precTouch = (attrMap.get('preceding_touch') || 'none') as PrecedingTouchType;
        const touchFrameStr = attrMap.get('touch_frame');
        const touchFrame = touchFrameStr ? parseInt(touchFrameStr, 10) : null;
        const touchXStr = attrMap.get('touch_x');
        const touchYStr = attrMap.get('touch_y');
        const landingResult = (attrMap.get('landing_result') || 'in') as LandingOutcome;
        const xStr = attrMap.get('x');
        const yStr = attrMap.get('y');

        ballLanding = {
          landingFrame: frame,
          landingCoord: (xStr && yStr) ? { x: parseFloat(xStr), y: parseFloat(yStr) } : null,
          landingOutcome: landingResult === 'out' ? 'out' : 'in',
          precedingTouch: ['block', 'dig'].includes(precTouch) ? precTouch : 'none',
          touchFrame: touchFrame,
          touchCoord: (touchXStr && touchYStr) ? { x: parseFloat(touchXStr), y: parseFloat(touchYStr) } : null,
          isAnnotated: true,
        };
      } else if (tagLabel === 'referee_point') {
        const winner = attrMap.get('point_winner') as PointWinner;
        refereeActions.mainRefereeSignalFrame = frame;
        refereeActions.mainRefereeBoxes = [readBox(attrMap, 'box'), readBox(attrMap, 'box2')].filter(
          (b): b is BoxRect => b !== null
        );
        refereeActions.pointWinner = ['team_left', 'team_right'].includes(winner) ? winner : 'none';
        refereeActions.isAnnotated = true;
      } else if (tagLabel === 'umpire_flag') {
        const side = attrMap.get('umpire_side') as UmpireSide;
        const decision = attrMap.get('flag_decision') as FlagDecision;
        refereeActions.umpireFlag = {
          hasFlag: true,
          boxes: [readBox(attrMap, 'box'), readBox(attrMap, 'box2')].filter((b): b is BoxRect => b !== null),
          frame: frame,
          side: ['left', 'right', 'both'].includes(side) ? side : 'none',
          decision: ['in', 'out', 'touch', 'antenna'].includes(decision) ? decision : 'none',
        };
        refereeActions.isAnnotated = true;
      } else {
        // Skill events: toss, serve, reception, set, attack, block, dig, touch
        const normalizedSkill = tagLabel === 'spike' ? 'attack' : (tagLabel as SkillLabel);
        const validSkills: SkillLabel[] = ['toss', 'serve', 'reception', 'set', 'dig', 'attack', 'block', 'touch'];

        if (validSkills.includes(normalizedSkill)) {
          const playerIdStr = attrMap.get('player_id');
          const playerId = playerIdStr ? parseInt(playerIdStr, 10) : undefined;

          let setStyle: SetStyle | undefined;
          let setDirection: SetDirection | undefined;

          if (normalizedSkill === 'set') {
            const rawStyle = (attrMap.get('set_style') || '').toLowerCase();
            if (rawStyle === 'overhead' || rawStyle === 'underhead') {
              setStyle = rawStyle;
            }
            const rawDir = (attrMap.get('set_direction') || '').toLowerCase();
            if (rawDir === 'forward' || rawDir === 'backward') {
              setDirection = rawDir;
            }
          }

          events.push({
            id: `event-${frame}-${normalizedSkill}-${Math.random().toString(36).substring(2, 6)}`,
            frame,
            skill: normalizedSkill,
            source,
            player_id: !isNaN(playerId as number) ? playerId : undefined,
            setStyle,
            setDirection,
          });
        }
      }
    }
  }

  // Sort events by frame
  events.sort((a, b) => a.frame - b.frame);

  return {
    rally,
    events,
    ballLanding,
    refereeActions,
    detectedFrameCount: maxFrameFound > 0 ? maxFrameFound + 1 : undefined,
  };
}

/**
 * Parses the JSON written by the touch/skill/block Docker pipeline
 * (<rally>_touch_skill_block.json): { fps, width, height, frame_count, touch_skill_block: [{frame, skill, ...}] }
 */
export function parseJsonAnnotations(text: string): ParsedXmlResult {
  const data = JSON.parse(text);
  const list: any[] = Array.isArray(data) ? data : data.touch_skill_block || data.events || [];
  const validSkills: SkillLabel[] = ['toss', 'serve', 'reception', 'set', 'dig', 'attack', 'block', 'touch'];

  const events: SkillEvent[] = [];
  let maxFrame = 0;
  for (const ev of list) {
    const frame = Number(ev.frame);
    if (!Number.isFinite(frame)) continue;
    const label = String(ev.skill ?? '').toLowerCase().trim();
    const skill = (label === 'spike' ? 'attack' : label) as SkillLabel;
    if (frame > maxFrame) maxFrame = frame;
    if (!validSkills.includes(skill)) continue;
    const setStyle = ev.set_style === 'overhead' || ev.set_style === 'underhead' ? ev.set_style : undefined;
    const setDirection = ev.set_direction === 'forward' || ev.set_direction === 'backward' ? ev.set_direction : undefined;
    events.push({
      id: `event-${frame}-${skill}-${Math.random().toString(36).substring(2, 6)}`,
      frame,
      skill,
      source: 'auto',
      player_id: Number.isFinite(Number(ev.player_id)) && ev.player_id !== undefined ? Number(ev.player_id) : undefined,
      setStyle,
      setDirection,
    });
  }
  events.sort((a, b) => a.frame - b.frame);

  const frameCount = Number(data.frame_count);
  return {
    rally: { startFrame: null, endFrame: null },
    events,
    ballLanding: {
      landingFrame: null,
      landingCoord: null,
      landingOutcome: 'in',
      precedingTouch: 'none',
      touchFrame: null,
      touchCoord: null,
      isAnnotated: false,
    },
    refereeActions: {
      mainRefereeSignalFrame: null,
      pointWinner: 'none',
      umpireFlag: { hasFlag: false, frame: null, side: 'none', decision: 'none' },
      isAnnotated: false,
    },
    detectedFrameCount: Number.isFinite(frameCount) && frameCount > 0 ? frameCount : maxFrame > 0 ? maxFrame + 1 : undefined,
    fps: Number(data.fps) > 0 ? Number(data.fps) : undefined,
    width: Number(data.width) > 0 ? Number(data.width) : undefined,
    height: Number(data.height) > 0 ? Number(data.height) : undefined,
  };
}

/** Accepts either XML or the pipeline JSON. */
export function parseAnnotations(text: string): ParsedXmlResult {
  const t = text.trimStart();
  return t.startsWith('{') || t.startsWith('[') ? parseJsonAnnotations(text) : parseXmlAnnotations(text);
}
