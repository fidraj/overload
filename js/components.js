// Small rendering pieces shared by several screens.

import { exerciseArt, muscleIcon } from './art.js';
import { h, raw, icon, muscleName } from './ui.js';

export const thumb = (ex, size = '') => h`<span class="thumb ${size}">${raw(exerciseArt(ex))}</span>`;

export const recLevel = (p) => (p >= 80 ? 'fresh' : p >= 50 ? 'mid' : 'low');

// Horizontal strip of muscle cards: body-map icon, name and recovery.
export function muscleStrip(muscles, rec, { edit = false } = {}) {
  return h`<ul class="muscle-strip">
    ${muscles.map((m) => h`<li class="muscle-card">
      <span class="muscle-thumb">${raw(muscleIcon(m))}</span>
      <span class="mc-text"><span class="mc-name">${muscleName(m)}</span>
      ${rec ? h`<span class="mc-pct ${recLevel(rec[m])}">${rec[m]}% recovered</span>` : ''}</span>
    </li>`)}
    ${edit ? h`<li><button class="muscle-card add" data-act="muscles">${icon('edit')}<span>Change muscles</span></button></li>` : ''}
  </ul>`;
}
