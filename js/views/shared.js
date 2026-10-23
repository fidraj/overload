// Opened from a shared link: preview the workout, then save it or start it.

import { state, getEx } from '../store.js';
import { estimateMinutes, saveTemplate, startWorkout } from '../engine.js';
import { h, icon, toast, copyText } from '../ui.js';
import { thumb } from '../components.js';
import { decodeShare, importCustom } from '../share.js';
import { doseText } from './today.js';

export function renderShared(el, code) {
  const d = decodeShare(code);
  if (!d || !d.items.length) {
    el.innerHTML = String(h`
      <a class="back" href="#/">${icon('back')} Workout</a>
      <div class="empty">
        <p>This link doesn't contain a workout. It may have been cut off when it was copied, so ask for the link again.</p>
        <a class="btn primary" href="#/">Go to today's workout</a>
      </div>`);
    return;
  }

  const customById = new Map(d.custom.map((c) => [c.id, c]));
  const exOf = (id) => customById.get(id) || getEx(id);
  const sets = d.items.reduce((a, it) => a + it.sets, 0);
  const saved = state.templates.some((t) => t.name === d.name && JSON.stringify(t.items) === JSON.stringify(d.items));

  el.innerHTML = String(h`
    <a class="back" href="#/">${icon('back')} Workout</a>
    <header class="hero">
      <p class="hero-date">Shared with you</p>
      <h1 class="display">${d.name}</h1>
      <p class="muted">${d.items.length} exercises, ${sets} sets, about ${estimateMinutes(d.items)} min</p>
    </header>
    ${'standalone' in navigator && !navigator.standalone ? h`<div class="card ios-note">
      <p class="hint">Use Overload from your home screen? It keeps its own data, separate from Safari. Copy this link, open the app, then tap <b>Add from a shared link</b> under Saved workouts.</p>
      <button class="btn small" data-act="copy">${icon('copy')} Copy link</button>
    </div>` : ''}
    ${d.skipped ? h`<p class="hint">${d.skipped} ${d.skipped === 1 ? 'exercise' : 'exercises'} in this link aren't in your version of the app and were left out.</p>` : ''}

    <ul class="ex-list shared-list">${d.items.map((it) => {
      const ex = exOf(it.exId);
      const body = h`${thumb(ex)}<span class="ex-text"><span class="ex-title">${ex.name}</span><span class="ex-meta">${doseText(it, ex)}</span></span>`;
      return h`<li class="ex-item">${customById.has(it.exId) ? h`<span class="ex-link">${body}</span>` : h`<a class="ex-link" href="#/exercise/${it.exId}">${body}</a>`}</li>`;
    })}</ul>

    <div class="cta-bar">
      <button class="btn primary big" data-act="save" ${saved ? 'disabled' : ''}>${icon('bookmark')} ${saved ? 'Already saved' : 'Save to my workouts'}</button>
      <button class="btn big" data-act="start">${icon('play')} Start now</button>
    </div>`);

  el.onclick = (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'copy') {
      copyText(location.href).then((ok) => toast(ok ? 'Link copied' : 'Copy the link from the address bar'));
    } else if (b.dataset.act === 'save') {
      importCustom(d.custom);
      saveTemplate(d.name, d.items);
      toast(`"${d.name}" is in your saved workouts`);
      location.hash = '#/';
    } else if (b.dataset.act === 'start') {
      if (state.active) {
        toast('Finish or end your current workout first');
        return;
      }
      importCustom(d.custom);
      startWorkout(d.items, { name: d.name });
      location.hash = '#/';
    }
  };
}
