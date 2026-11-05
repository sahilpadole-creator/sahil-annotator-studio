import {
  VideoMetadata,
  RallyBounds,
  SkillEvent,
  BallLandingAnnotation,
  RefereeActionsAnnotation,
} from '../types';

function boxAttrs(box?: { x: number; y: number; w: number; h: number } | null, prefix = 'box'): string {
  if (!box) return '';
  return (
    `      <attribute name="${prefix}_x">${box.x.toFixed(4)}</attribute>\n` +
    `      <attribute name="${prefix}_y">${box.y.toFixed(4)}</attribute>\n` +
    `      <attribute name="${prefix}_w">${box.w.toFixed(4)}</attribute>\n` +
    `      <attribute name="${prefix}_h">${box.h.toFixed(4)}</attribute>\n`
  );
}

export function generateXmlAnnotations(
  metadata: VideoMetadata | null,
  rally: RallyBounds,
  events: SkillEvent[],
  ballLanding: BallLandingAnnotation,
  refereeActions: RefereeActionsAnnotation
): string {
  const width = metadata?.width || 1920;
  const height = metadata?.height || 1080;

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n<annotations>\n  <version>1.1</version>\n`;

  // Collect all unique frames that need an <image> tag
  const framesToOutput = new Set<number>();

  if (rally.startFrame !== null) framesToOutput.add(rally.startFrame);
  if (rally.endFrame !== null) framesToOutput.add(rally.endFrame);

  events.forEach((ev) => framesToOutput.add(ev.frame));

  if (ballLanding.isAnnotated && ballLanding.landingFrame !== null) {
    framesToOutput.add(ballLanding.landingFrame);
  }

  if (refereeActions.isAnnotated) {
    if (refereeActions.mainRefereeSignalFrame !== null && refereeActions.pointWinner !== 'none') {
      framesToOutput.add(refereeActions.mainRefereeSignalFrame);
    }
    if (refereeActions.umpireFlag.hasFlag && refereeActions.umpireFlag.frame !== null) {
      framesToOutput.add(refereeActions.umpireFlag.frame);
    }
  }

  const sortedFrames = Array.from(framesToOutput).sort((a, b) => a - b);

  for (const frame of sortedFrames) {
    const padFrame = frame.toString().padStart(6, '0');
    xml += `  <image id="${frame}" name="frame_${padFrame}" width="${width}" height="${height}">\n`;

    // Start rally tag
    if (rally.startFrame === frame) {
      xml += `    <tag label="start_rally" source="manual"></tag>\n`;
    }

    // Skill events on this frame
    const frameEvents = events.filter((e) => e.frame === frame);
    for (const ev of frameEvents) {
      const src = ev.source || 'manual';
      const hasAttributes =
        ev.player_id !== undefined ||
        (ev.skill === 'set' && (ev.setStyle || ev.setDirection));

      if (!hasAttributes) {
        xml += `    <tag label="${ev.skill}" source="${src}"></tag>\n`;
      } else {
        xml += `    <tag label="${ev.skill}" source="${src}">\n`;
        if (ev.player_id !== undefined) {
          xml += `      <attribute name="player_id">${ev.player_id}</attribute>\n`;
        }
        if (ev.skill === 'set') {
          if (ev.setStyle) {
            xml += `      <attribute name="set_style">${ev.setStyle}</attribute>\n`;
          }
          if (ev.setDirection) {
            xml += `      <attribute name="set_direction">${ev.setDirection}</attribute>\n`;
          }
        }
        xml += `    </tag>\n`;
      }
    }

    // Ball landing tag
    if (ballLanding.isAnnotated && ballLanding.landingFrame === frame) {
      xml += `    <tag label="ball_landing" source="manual">\n`;
      xml += `      <attribute name="preceding_touch">${ballLanding.precedingTouch}</attribute>\n`;
      if (ballLanding.precedingTouch !== 'none' && ballLanding.touchFrame !== null) {
        xml += `      <attribute name="touch_frame">${ballLanding.touchFrame}</attribute>\n`;
        if (ballLanding.touchCoord) {
          xml += `      <attribute name="touch_x">${ballLanding.touchCoord.x.toFixed(4)}</attribute>\n`;
          xml += `      <attribute name="touch_y">${ballLanding.touchCoord.y.toFixed(4)}</attribute>\n`;
        }
      }
      xml += `      <attribute name="landing_result">${ballLanding.landingOutcome}</attribute>\n`;
      if (ballLanding.landingCoord) {
        xml += `      <attribute name="x">${ballLanding.landingCoord.x.toFixed(4)}</attribute>\n`;
        xml += `      <attribute name="y">${ballLanding.landingCoord.y.toFixed(4)}</attribute>\n`;
      }
      xml += `    </tag>\n`;
    }

    // Referee Point tag
    if (
      refereeActions.isAnnotated &&
      refereeActions.mainRefereeSignalFrame === frame &&
      refereeActions.pointWinner !== 'none'
    ) {
      xml += `    <tag label="referee_point" source="manual">\n`;
      xml += `      <attribute name="point_winner">${refereeActions.pointWinner}</attribute>\n`;
      // first referee: box_*, optional second referee: box2_*
      xml += boxAttrs(refereeActions.mainRefereeBoxes?.[0], 'box');
      xml += boxAttrs(refereeActions.mainRefereeBoxes?.[1], 'box2');
      xml += `    </tag>\n`;
    }

    // Line Umpire Flag tag
    if (
      refereeActions.isAnnotated &&
      refereeActions.umpireFlag.hasFlag &&
      refereeActions.umpireFlag.frame === frame
    ) {
      xml += `    <tag label="umpire_flag" source="manual">\n`;
      xml += `      <attribute name="umpire_side">${refereeActions.umpireFlag.side}</attribute>\n`;
      xml += `      <attribute name="flag_decision">${refereeActions.umpireFlag.decision}</attribute>\n`;
      xml += boxAttrs(refereeActions.umpireFlag.boxes?.[0], 'box');
      xml += boxAttrs(refereeActions.umpireFlag.boxes?.[1], 'box2');
      xml += `    </tag>\n`;
    }

    // End rally tag
    if (rally.endFrame === frame) {
      xml += `    <tag label="end_rally" source="manual"></tag>\n`;
    }

    xml += `  </image>\n`;
  }

  xml += `</annotations>\n`;
  return xml;
}

export function downloadXmlFile(xmlString: string, filename: string): void {
  const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xml') ? filename : `${filename}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
