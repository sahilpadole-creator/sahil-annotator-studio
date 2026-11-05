import {
  VideoMetadata,
  RallyBounds,
  SkillEvent,
  BallLandingAnnotation,
  RefereeActionsAnnotation,
} from '../types';

export function generateJsonAnnotations(
  metadata: VideoMetadata | null,
  rally: RallyBounds,
  events: SkillEvent[],
  ballLanding: BallLandingAnnotation,
  refereeActions: RefereeActionsAnnotation
): string {
  const sortedEvents = [...events].sort((a, b) => a.frame - b.frame);

  const payload = {
    video: metadata?.filename || 'rally.mp4',
    fps: metadata?.fps || 30,
    width: metadata?.width || 1920,
    height: metadata?.height || 1080,
    frame_count: metadata?.frameCount || 0,
    frame_index_base: 0,
    rally: {
      start_frame: rally.startFrame !== null ? rally.startFrame : 0,
      end_frame: rally.endFrame !== null ? rally.endFrame : (metadata?.frameCount ? metadata.frameCount - 1 : 0),
    },
    events: sortedEvents.map((ev) => ({
      frame: ev.frame,
      skill: ev.skill,
      source: ev.source || 'manual',
      ...(ev.player_id !== undefined ? { player_id: ev.player_id } : {}),
      ...(ev.skill === 'set' && ev.setStyle ? { set_style: ev.setStyle } : {}),
      ...(ev.skill === 'set' && ev.setDirection ? { set_direction: ev.setDirection } : {}),
    })),
    ball_landing: ballLanding.isAnnotated && ballLanding.landingFrame !== null
      ? {
          frame: ballLanding.landingFrame,
          preceding_touch: ballLanding.precedingTouch,
          touch_frame: ballLanding.touchFrame,
          touch_xy: ballLanding.touchCoord ? [ballLanding.touchCoord.x, ballLanding.touchCoord.y] : null,
          landing_result: ballLanding.landingOutcome,
          xy: ballLanding.landingCoord ? [ballLanding.landingCoord.x, ballLanding.landingCoord.y] : null,
        }
      : null,
    referee_actions: refereeActions.isAnnotated
      ? {
          signal_frame: refereeActions.mainRefereeSignalFrame,
          point_winner: refereeActions.pointWinner,
          referee_boxes: (refereeActions.mainRefereeBoxes || []).map((b) => [b.x, b.y, b.w, b.h]),
          umpire_flags: refereeActions.umpireFlag.hasFlag
            ? [
                {
                  frame: refereeActions.umpireFlag.frame,
                  side: refereeActions.umpireFlag.side,
                  decision: refereeActions.umpireFlag.decision,
                  boxes: (refereeActions.umpireFlag.boxes || []).map((b) => [b.x, b.y, b.w, b.h]),
                },
              ]
            : [],
        }
      : null,
    exported_at: new Date().toISOString(),
  };

  return JSON.stringify(payload, null, 2);
}

export function downloadJsonFile(jsonString: string, filename: string): void {
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
