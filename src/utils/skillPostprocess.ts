import { SkillEvent, SkillLabel } from '../types';

/**
 * Skill post-processing rules (same rules as the original annotator / Docker pipeline).
 *
 * "block" events are NOT considered: they are never changed, never removed, and they are
 * ignored when looking for patterns (the rules only look at the other touches in order).
 * Skills you set by hand (source 'manual') are never changed or removed either.
 *
 *  R0  First reception/dig after the serve -> reception; every later reception/dig -> dig
 *      (only one reception per rally)
 *  R4  Same label twice in a row for toss / serve / attack -> keep one (higher confidence)
 *  R5  Two digs in a row less than 10 frames apart -> keep one (higher confidence)
 *  R3  toss -> serve -> set|dig                     =>  third becomes reception
 *  R2  reception|dig -> dig -> attack               =>  middle dig becomes set
 *  R1  reception -> dig                             =>  dig becomes set
 */

const DEFENSIVE: SkillLabel[] = ['reception', 'dig'];
const DEDUPE: SkillLabel[] = ['toss', 'serve', 'attack'];
const DIG_GAP = 10; // two digs closer than this many frames are the same touch

export interface PostprocessResult {
  events: SkillEvent[];
  changes: string[];
}

export function applySkillPostprocess(input: SkillEvent[]): PostprocessResult {
  const changes: string[] = [];
  const sorted = [...input].sort((a, b) => a.frame - b.frame).map((e) => ({ ...e }));
  const blocks = sorted.filter((e) => e.skill === 'block');
  let seq = sorted.filter((e) => e.skill !== 'block');

  const isManual = (e: SkillEvent) => e.source === 'manual';
  const relabel = (e: SkillEvent, to: SkillLabel, why: string) => {
    if (isManual(e) || e.skill === to) return;
    changes.push(`frame ${e.frame}: ${e.skill} → ${to} (${why})`);
    e.skill = to;
    e.ruleNote = why;
  };

  // R0: serve-anchored reception / dig split
  const serveIdx = seq.findIndex((e) => e.skill === 'serve');
  let seenReception = false;
  seq.forEach((e, i) => {
    if (!DEFENSIVE.includes(e.skill)) return;
    const afterServe = serveIdx >= 0 && i > serveIdx;
    if (!seenReception && (afterServe || serveIdx < 0)) {
      relabel(e, 'reception', 'Rule 0: first touch after serve');
      seenReception = true;
    } else {
      relabel(e, 'dig', 'Rule 0: one reception per rally');
    }
  });

  // R4: drop consecutive duplicates of toss / serve / attack
  const deduped: SkillEvent[] = [];
  for (const e of seq) {
    const prev = deduped[deduped.length - 1];
    const sameLabel = prev && prev.skill === e.skill;
    const isDupe =
      sameLabel &&
      (DEDUPE.includes(e.skill) || (e.skill === 'dig' && e.frame - prev.frame < DIG_GAP)) &&
      !isManual(prev) &&
      !isManual(e);
    if (prev && isDupe) {
      const keepNew = (e.confidence ?? 1) > (prev.confidence ?? 1);
      const dropped = keepNew ? prev : e;
      changes.push(
        `frame ${dropped.frame}: duplicate ${dropped.skill} removed (${e.skill === 'dig' ? 'Rule 5: two digs <10 frames' : 'Rule 4'})`
      );
      if (keepNew) deduped[deduped.length - 1] = e;
      continue;
    }
    deduped.push(e);
  }
  seq = deduped;

  // R3 / R2 / R1 walk through the sequence
  for (let i = 0; i < seq.length; i++) {
    const [e1, e2, e3] = [seq[i], seq[i + 1], seq[i + 2]];
    if (e1 && e2 && e3) {
      if (e1.skill === 'toss' && e2.skill === 'serve' && (e3.skill === 'set' || e3.skill === 'dig')) {
        relabel(e3, 'reception', 'Rule 3: toss → serve → reception');
      }
      if (DEFENSIVE.includes(e1.skill) && e2.skill === 'dig' && e3.skill === 'attack') {
        relabel(e2, 'set', 'Rule 2: dig before attack is a set');
      }
    }
    if (e1 && e2 && e1.skill === 'reception' && e2.skill === 'dig') {
      relabel(e2, 'set', 'Rule 1: reception → dig is a set');
    }
  }

  const events = [...seq, ...blocks].sort((a, b) => a.frame - b.frame);
  return { events, changes };
}
