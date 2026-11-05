import { SkillEvent, SkillLabel } from '../types';

// How many frames either side of an event still count as "at" that event
export const NEAR_FRAMES = 2;

export const SKILL_INFO: Partial<Record<SkillLabel, { letter: string; name: string; chip: string }>> = {
  serve: { letter: 'V', name: 'Serve', chip: 'bg-blue-500' },
  toss: { letter: 'T', name: 'Toss', chip: 'bg-slate-500' },
  reception: { letter: 'R', name: 'Reception', chip: 'bg-emerald-500' },
  set: { letter: 'S', name: 'Set', chip: 'bg-cyan-500' },
  dig: { letter: 'D', name: 'Dig', chip: 'bg-amber-500' },
  attack: { letter: 'A', name: 'Attack', chip: 'bg-red-500' },
  block: { letter: 'B', name: 'Block', chip: 'bg-purple-500' },
};

// Hotkey = Shift + the skill's letter
export const LETTER_TO_SKILL: Record<string, SkillLabel> = Object.fromEntries(
  (Object.keys(SKILL_INFO) as SkillLabel[]).map((s) => [SKILL_INFO[s]!.letter.toLowerCase(), s])
);

export function skillLetter(skill: SkillLabel): string {
  return SKILL_INFO[skill]?.letter ?? skill.charAt(0).toUpperCase();
}

export function skillName(skill: SkillLabel): string {
  return SKILL_INFO[skill]?.name ?? skill;
}

/** Events within ±radius frames of `frame`, nearest first. */
export function eventsNearFrame(events: SkillEvent[], frame: number, radius = NEAR_FRAMES): SkillEvent[] {
  return events
    .filter((e) => Math.abs(e.frame - frame) <= radius)
    .sort((a, b) => Math.abs(a.frame - frame) - Math.abs(b.frame - frame));
}
