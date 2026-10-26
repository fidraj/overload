// Rest timer, elapsed clock, end-of-rest alert, screen wake lock, and the sounds and taps
// that confirm a set. The dock (above the tab bar) shows the rest timer and a "resume
// workout" bar.

import { state, save } from './store.js';
import { h, icon, clock } from './ui.js';

let audio = null;
let wakeLock = null;

export function unlockAudio() {
  if (!state.settings.sound || audio) return;
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    audio = null;
  }
}

function beep() {
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume();
  const t0 = audio.currentTime;
  [0, 0.22, 0.44].forEach((d, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, t0 + d);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0 + d);
    osc.stop(t0 + d + 0.2);
  });
}

// Short rising notes: a soft tick for a set, a brighter run for a record or a finished
// exercise, and a full arpeggio for a finished workout.
const CHIMES = {
  set: [[660, 0], [990, 0.06]],
  pr: [[784, 0], [988, 0.08], [1319, 0.16]],
  done: [[523, 0], [659, 0.09], [784, 0.18]],
  finish: [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3]],
};

export function chime(kind) {
  if (!state.settings.sound) return;
  unlockAudio();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume();
  const t0 = audio.currentTime + 0.01;
  for (const [freq, d] of CHIMES[kind] || CHIMES.set) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + d);
    gain.gain.exponentialRampToValueAtTime(kind === 'set' ? 0.12 : 0.16, t0 + d + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.22);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0 + d);
    osc.stop(t0 + d + 0.25);
  }
}

// A short tap. Android vibrates. iPhones (iOS 18+) tick when a switch control is toggled,
// so toggle a hidden one; that only works inside a tap handler.
export function haptic(ms = 12) {
  if (!state.settings.vibrate) return;
  if (navigator.vibrate) {
    navigator.vibrate(ms);
    return;
  }
  try {
    const label = document.createElement('label');
    label.ariaHidden = 'true';
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.append(input);
    document.head.append(label);
    label.click();
    label.remove();
  } catch {
    // No haptics here.
  }
}

function alarm() {
  if (state.settings.sound) beep();
  if (state.settings.vibrate && navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// next: what's up after the rest, e.g. "Next: set 3, 60 kg × 8".
export function startRest(sec, next = '') {
  if (!state.active || !(sec > 0)) return;
  state.active.rest = { endsAt: Date.now() + sec * 1000, total: sec, alerted: false, next };
  save('active');
  renderDock();
}

function adjustRest(delta) {
  const r = state.active?.rest;
  if (!r) return;
  r.endsAt += delta * 1000;
  r.total = Math.max(1, r.total + delta);
  r.alerted = false;
  save('active');
  tick();
}

export function stopRest() {
  if (!state.active) return;
  state.active.rest = null;
  save('active');
  renderDock();
}

const dock = () => document.getElementById('dock');

export function renderDock() {
  const a = state.active;
  const hash = location.hash || '#/';
  const onWorkout = hash === '#/' || hash.startsWith('#/workout/');
  let out = '';
  if (a?.rest) {
    out += String(h`
      <div class="rest" data-rest role="timer" aria-label="Rest timer">
        <div class="rest-bar"><i data-rest-bar></i></div>
        <div class="rest-row">
          <span class="rest-label">Rest</span>
          <span class="rest-time" data-rest-time>0:00</span>
          <button class="btn small" data-rest-act="-15" aria-label="15 seconds less">−15</button>
          <button class="btn small" data-rest-act="15" aria-label="15 seconds more">+15</button>
          <button class="btn small" data-rest-act="skip">Skip</button>
        </div>
        ${a.rest.next ? h`<p class="rest-next">${a.rest.next}</p>` : ''}
      </div>`);
  }
  if (a && !onWorkout) {
    out += String(h`
      <a class="resume" href="#/">
        ${icon('play')}
        <span class="resume-text">${a.name}</span>
        <span class="resume-time" data-elapsed>${clock(Date.now() - a.startedAt)}</span>
        <span class="resume-cta">Resume</span>
      </a>`);
  }
  const el = dock();
  el.innerHTML = out;
  document.documentElement.style.setProperty('--dock-h', `${el.offsetHeight}px`);
  tick();
  syncWakeLock();
}

export function tick() {
  const a = state.active;
  if (!a) return;
  const now = Date.now();
  for (const el of document.querySelectorAll('[data-elapsed]')) el.textContent = clock(now - a.startedAt);
  const r = a.rest;
  if (!r) return;
  const left = Math.ceil((r.endsAt - now) / 1000);
  if (left <= 0 && !r.alerted) {
    r.alerted = true;
    save('active');
    alarm();
  }
  if (left <= -3) {
    stopRest();
    return;
  }
  const time = document.querySelector('[data-rest-time]');
  const bar = document.querySelector('[data-rest-bar]');
  if (!time) return;
  time.textContent = left > 0 ? clock(left * 1000) : 'Go';
  document.querySelector('[data-rest]').classList.toggle('over', left <= 0);
  bar.style.width = `${Math.max(0, Math.min(100, (left / r.total) * 100))}%`;
}

async function syncWakeLock() {
  const want = !!state.active && state.settings.wakeLock && document.visibilityState === 'visible';
  if (!('wakeLock' in navigator)) return;
  try {
    if (want && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!want && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}

export function initTimer() {
  dock().addEventListener('click', (e) => {
    const b = e.target.closest('[data-rest-act]');
    if (!b) return;
    const act = b.dataset.restAct;
    if (act === 'skip') stopRest();
    else adjustRest(Number(act));
  });
  document.addEventListener('visibilitychange', () => {
    syncWakeLock();
    tick();
  });
  setInterval(tick, 250);
}
