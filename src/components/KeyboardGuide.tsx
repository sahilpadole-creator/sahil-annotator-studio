import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

type Group = 'nav' | 'set' | 'land' | 'ref';

const GROUP_STYLE: Record<Group, { key: string; chip: string; label: string }> = {
  nav: {
    key: 'bg-slate-100 border-slate-400 dark:bg-slate-700/40 dark:border-slate-500',
    chip: 'bg-slate-500',
    label: 'Video navigation',
  },
  set: {
    key: 'bg-cyan-50 border-cyan-500 dark:bg-cyan-950/60 dark:border-cyan-500',
    chip: 'bg-cyan-500',
    label: 'Set style & direction',
  },
  land: {
    key: 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/60 dark:border-emerald-500',
    chip: 'bg-emerald-500',
    label: 'Ball landing',
  },
  ref: {
    key: 'bg-purple-50 border-purple-500 dark:bg-purple-950/60 dark:border-purple-500',
    chip: 'bg-purple-500',
    label: 'Referee & umpire flags',
  },
};

const MAP: Record<string, { fn: string; group: Group }> = {
  '1': { fn: 'Flag: Ball IN + draw box', group: 'ref' },
  '2': { fn: 'Flag: Ball OUT + draw box', group: 'ref' },
  '3': { fn: 'Flag: Touch + OUT + draw box', group: 'ref' },
  Q: { fn: 'Overhead set', group: 'set' },
  W: { fn: 'Forward set', group: 'set' },
  E: { fn: 'IN court, then click ball', group: 'land' },
  R: { fn: 'Team LEFT wins + draw referee box', group: 'ref' },
  T: { fn: 'Team RIGHT wins + draw referee box', group: 'ref' },
  '[': { fn: 'Back 1 frame', group: 'nav' },
  ']': { fn: 'Next 1 frame', group: 'nav' },
  A: { fn: 'Underhead set', group: 'set' },
  S: { fn: 'Backward set', group: 'set' },
  D: { fn: 'OUT of court, then click ball', group: 'land' },
  ',': { fn: 'Previous SET', group: 'nav' },
  N: { fn: 'Previous SKILL (any)', group: 'nav' },
  M: { fn: 'Next SKILL (any)', group: 'nav' },
  '.': { fn: 'Next SET', group: 'nav' },
  Esc: { fn: 'Cancel picking', group: 'nav' },
  Space: { fn: 'Play / Pause', group: 'nav' },
  '←': { fn: 'Back 1 frame', group: 'nav' },
  '→': { fn: 'Next 1 frame', group: 'nav' },
  Shift: { fn: '+ ← → = 10 frames. + V T R S D A B = fix skill', group: 'nav' },
};

const ROWS: { keys: string[]; offset: string }[] = [
  { keys: ['Esc'], offset: '' },
  { keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], offset: '' },
  { keys: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '['], offset: 'ml-5' },
  { keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'], offset: 'ml-9' },
  { keys: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.'], offset: 'ml-14' },
];

const KeyCap: React.FC<{ k: string; wide?: string }> = ({ k, wide = 'w-[4.5rem]' }) => {
  const m = MAP[k];
  return (
    <div
      className={`${wide} h-[4.5rem] shrink-0 rounded-lg border-2 flex flex-col items-center justify-center px-1 text-center ${
        m
          ? GROUP_STYLE[m.group].key
          : 'bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700/60 opacity-50'
      }`}
    >
      <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100">{k}</span>
      {m && (
        <span className="text-[9px] leading-tight mt-0.5 text-slate-600 dark:text-slate-300">{m.fn}</span>
      )}
    </div>
  );
};

const DETAILS: { title: string; group: Group; lines: [string, string][] }[] = [
  {
    title: 'Video navigation',
    group: 'nav',
    lines: [
      ['Space', 'Play or pause the video.'],
      ['N  /  M', 'Jump to the previous / next skill of ANY kind (toss → serve → reception → …). Set-to-set stays on < > or , .'],
      ['← / →   or   [ / ]', 'Move back or forward exactly 1 frame.'],
      ['Shift + ← →   or   Shift + [ ]', 'Jump 10 frames at once.'],
      ['<  /  >   or   ,  /  .', 'Jump to the previous / next SET from the XML.'],
      ['Esc', 'Cancel “pick the ball” mode.'],
    ],
  },
  {
    title: 'Fix a wrong skill (hold Shift)',
    group: 'nav',
    lines: [
      ['Shift + S', 'Change the skill at this frame to SET (timeline letter S).'],
      ['Shift + T', 'TOSS (T).'],
      ['Shift + V', 'SERVE (V).'],
      ['Shift + R', 'RECEPTION (R).'],
      ['Shift + D', 'DIG (D).'],
      ['Shift + A', 'ATTACK (A).'],
      ['Shift + B', 'BLOCK (B).'],
      ['Delete', 'Remove the skill at this frame (model false alarm).'],
      ['How it works', 'A skill pops up at the top of the video when you are within ±2 frames of it. Shift + letter changes that skill; if none is near, it adds a new one at the current frame.'],
    ],
  },
  {
    title: 'Set style & direction  (applies to the set nearest the current frame)',
    group: 'set',
    lines: [
      ['Q', 'Overhead set.'],
      ['A', 'Underhead set.'],
      ['W', 'Forward direction.'],
      ['S', 'Backward direction.'],
    ],
  },
  {
    title: 'Ball landing',
    group: 'land',
    lines: [
      ['E', 'Ball landed IN court. The pick tool turns on straight away: click the ball on the video and the landing point AND current frame are saved.'],
      ['D', 'Ball landed OUT of court. Same: pick tool turns on, click the ball.'],
    ],
  },
  {
    title: 'Referee & line umpires',
    group: 'ref',
    lines: [
      ['R', 'Team LEFT wins the point. Also marks the current frame as the referee signal frame, then the box tool turns on: drag a box around the main referee. If a second referee is visible drag another box; if only one is visible, press Enter (or Done) after the first. The boxes show on the video for ±10 frames around that frame. Esc skips it.'],
      ['T', 'Team RIGHT wins the point. Also marks the current frame as the referee signal frame.'],
      ['1', 'Line umpire flag: ball IN. Turns the flag on at this frame and the box tool on: drag a box on each line umpire you can see (2 max). If only one is visible, draw one and press Enter. Same key again clears it.'],
      ['2', 'Flag: ball OUT (same box steps).'],
      ['3', 'Flag: ball touched the hand and went out (same box steps).'],
      ['No flag', 'If no flag is raised, press nothing.'],
    ],
  },
];

export const KeyboardGuide: React.FC<KeyboardGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-white dark:bg-studio-darkPanel border border-slate-200 dark:border-studio-darkBorder rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-studio-darkBorder">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-100 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Keyboard Guide</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coloured keys do something. Grey keys are not used. Keep your left hand on Q W E R / A S D F / Z X C V.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-darkCard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {(Object.keys(GROUP_STYLE) as Group[]).map((g) => (
              <span key={g} className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300">
                <span className={`w-3 h-3 rounded-full ${GROUP_STYLE[g].chip}`} />
                <span>{GROUP_STYLE[g].label}</span>
              </span>
            ))}
          </div>

          {/* Visual keyboard */}
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-1.5 p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-studio-darkBorder">
              {ROWS.map((row, i) => (
                <div key={i} className={`flex gap-1.5 ${row.offset}`}>
                  {row.keys.map((k) => (
                    <KeyCap key={k} k={k} />
                  ))}
                </div>
              ))}
              <div className="flex gap-1.5 ml-5 items-center">
                <KeyCap k="Shift" wide="w-[7rem]" />
                <KeyCap k="Space" wide="w-[18rem]" />
                <KeyCap k="←" />
                <KeyCap k="→" />
              </div>
            </div>
          </div>

          {/* Detailed explanations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {DETAILS.map((d) => (
              <section
                key={d.title}
                className="rounded-xl border border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkCard/50 p-4"
              >
                <h4 className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200 mb-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${GROUP_STYLE[d.group].chip}`} />
                  <span>{d.title}</span>
                </h4>
                <div className="space-y-2">
                  {d.lines.map(([k, text]) => (
                    <div key={k} className="flex items-start gap-3 text-xs">
                      <kbd className="shrink-0 min-w-[2rem] text-center px-2 py-0.5 rounded-md bg-white dark:bg-studio-darkBorder border border-slate-300 dark:border-slate-600 font-mono font-bold text-slate-800 dark:text-slate-100">
                        {k}
                      </kbd>
                      <span className="text-slate-600 dark:text-slate-300 pt-0.5">{text}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
