// Share a workout as a link. The workout is encoded in the URL itself, so no server is needed.

import { MUSCLES, EQUIPMENT, TRACKS } from './data.js';
import { state, save, getEx, isCustom } from './store.js';
import { toast, copyText, sheet, h, icon } from './ui.js';
import { trackEvent } from './analytics.js';

function toBase64Url(text) {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
  let s = code.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
}

const int = (v, min, max, fallback) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.round(Number(v)))) : fallback);
const list = (v, allowed) => (Array.isArray(v) ? v.map(String).filter((x) => x in allowed) : []);

export function shareUrl(name, items) {
  const ids = [...new Set(items.map((it) => it.exId))];
  const data = { v: 1, n: name, i: items.map((it) => [it.exId, it.sets, it.min, it.max, it.rest]) };
  const custom = ids.filter(isCustom).map((id) => {
    const e = getEx(id);
    return [id, e.name, e.primary, e.secondary, e.equipment, e.kind, e.track];
  });
  if (custom.length) data.c = custom;
  return `${location.origin}${location.pathname}#/share/${toBase64Url(JSON.stringify(data))}`;
}

// Returns { name, items, custom, skipped } or null when the link can't be read.
export function decodeShare(code) {
  let d;
  try {
    // Messaging apps sometimes add punctuation or spaces around a pasted link.
    d = JSON.parse(fromBase64Url(String(code).replace(/[^A-Za-z0-9_-]/g, '')));
  } catch {
    return null;
  }
  if (d?.v !== 1 || !Array.isArray(d.i)) return null;
  const custom = (Array.isArray(d.c) ? d.c : []).filter(Array.isArray).map(([id, name, primary, secondary, equipment, kind, track]) => {
    const main = list(primary, MUSCLES).slice(0, 3);
    return {
      id: String(id).slice(0, 40),
      name: String(name || 'Custom exercise').slice(0, 60),
      primary: main.length ? main : ['chest'],
      secondary: list(secondary, MUSCLES),
      equipment: list(equipment, EQUIPMENT),
      kind: kind === 'i' ? 'i' : 'c',
      track: track in TRACKS ? track : 'wr',
      tier: 2,
    };
  }).filter((c) => c.id.startsWith('c_'));
  const known = new Set(custom.map((c) => c.id));
  const items = d.i.filter(Array.isArray)
    .map(([exId, sets, min, max, rest]) => {
      const lo = int(min, 1, 999, 8);
      return { exId: String(exId), sets: int(sets, 1, 12, 3), min: lo, max: Math.max(lo, int(max, 1, 999, 12)), rest: int(rest, 0, 600, 90) };
    })
    .filter((it) => !getEx(it.exId).missing || known.has(it.exId));
  return { name: String(d.n || 'Shared workout').slice(0, 60), items, custom, skipped: d.i.length - items.length };
}

// Add custom exercises from a shared link that this device doesn't have yet.
export function importCustom(custom) {
  const missing = custom.filter((c) => getEx(c.id).missing);
  if (!missing.length) return;
  state.custom.push(...missing);
  save('custom');
}

// Opens a sheet with the link and buttons to copy or send it. Copying and sharing run
// straight from a button tap, which Safari requires.
export function shareWorkout(name, items) {
  const url = shareUrl(name, items);
  trackEvent('workout-shared');
  sheet({
    title: 'Share workout',
    body: h`<p class="sheet-text">Anyone who opens this link sees "${name}" and can save it to their own workouts.</p>
      <input class="text-in share-url" value="${url}" readonly aria-label="Link to this workout">
      <div class="sheet-stack">
        <button class="btn big primary" data-copy>${icon('copy')} Copy link</button>
        ${navigator.share ? h`<button class="btn big" data-send>${icon('share')} Send with another app</button>` : ''}
      </div>`,
    onMount(body, close) {
      const inp = body.querySelector('input');
      inp.addEventListener('focus', () => inp.select());
      const copyBtn = body.querySelector('[data-copy]');
      copyBtn.addEventListener('click', async () => {
        if (await copyText(url)) {
          copyBtn.innerHTML = String(h`${icon('check')} Link copied`);
        } else {
          inp.focus();
          toast('Copying was blocked. The link is selected, so copy it from there.');
        }
      });
      body.querySelector('[data-send]')?.addEventListener('click', () => {
        navigator.share({ title: name, text: `${name}, a workout from Overload`, url }).then(() => close(), () => {});
      });
    },
  });
}

// Pull the workout code out of a pasted link (or a bare code).
export function codeFromText(text) {
  const t = String(text).trim();
  const m = t.match(/#\/share\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{20,}$/.test(t) ? t : null;
}
