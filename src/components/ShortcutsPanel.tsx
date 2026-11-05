import React from 'react';
import { Settings } from 'lucide-react';

const HOTKEYS: { keys: string[]; desc: string }[] = [
  { keys: ['Space'], desc: 'Play / pause' },
  { keys: ['←', '→'], desc: 'Step frame' },
  { keys: ['⇧', '←→'], desc: 'Jump 10' },
  { keys: ['<', '>'], desc: 'Prev/next set' },
  { keys: ['N', 'M'], desc: 'Prev/next skill' },
  { keys: ['Q', 'A'], desc: 'Over / underhead' },
  { keys: ['W', 'S'], desc: 'Fwd / backward' },
  { keys: ['E', 'D'], desc: 'In / out + click' },
  { keys: ['R', 'T'], desc: 'Team L / R + box' },
  { keys: ['1', '2', '3'], desc: 'Flag in/out/touch + box' },
  { keys: ['⇧', 'VTR'], desc: 'Fix skill' },
  { keys: ['⇧', 'SDAB'], desc: 'Fix skill' },
  { keys: ['Del'], desc: 'Delete skill' },
  { keys: ['Esc'], desc: 'Cancel' },
];

export const ShortcutsPanel: React.FC = () => (
  <div className="shrink-0 mx-2 mb-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow p-2 select-none">
    <div className="flex items-center space-x-1.5 pb-1 mb-1.5 border-b border-slate-200 dark:border-white/10">
      <Settings className="w-3 h-3 text-slate-600 dark:text-slate-300" />
      <h3 className="text-[11px] font-bold text-slate-800 dark:text-white">Hotkeys</h3>
    </div>

    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
      {HOTKEYS.map((h, i) => (
        <div key={i} className="flex items-center gap-1 text-[10px] leading-tight min-w-0">
          <span className="flex items-center gap-0.5 shrink-0">
            {h.keys.map((k, j) => (
              <kbd
                key={j}
                className="px-1 py-px rounded bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-100 font-mono text-[10px] font-semibold"
              >
                {k}
              </kbd>
            ))}
          </span>
          <span className="text-slate-600 dark:text-slate-400 truncate">{h.desc}</span>
        </div>
      ))}
    </div>
  </div>
);
