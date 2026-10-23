// Entry point: boot, hash router and tab bar.

import { load, flush, hooks, state } from './store.js';
import { app, toast } from './ui.js';
import { initTimer, renderDock } from './timer.js';
import { renderToday, renderPlanItem } from './views/today.js';
import { renderWorkout, renderLogExercise } from './views/workout.js';
import { renderHistory, renderHistoryDetail } from './views/history.js';
import { renderExercises, renderExerciseDetail, renderExerciseForm } from './views/exercises.js';
import { renderSettings, applyTheme } from './views/settings.js';

const routes = [
  [/^\/$/, (el) => (state.active ? renderWorkout(el) : renderToday(el)), 'workout'],
  [/^\/plan\/(\d+)$/, (el, i) => (state.active ? location.replace('#/') : renderPlanItem(el, i)), 'workout'],
  [/^\/workout\/([^/]+)$/, renderLogExercise, 'workout'],
  [/^\/history$/, renderHistory, 'history'],
  [/^\/history\/([^/]+)(?:\/(done))?$/, renderHistoryDetail, 'history'],
  [/^\/exercises$/, renderExercises, 'exercises'],
  [/^\/exercise\/([^/]+)$/, renderExerciseDetail, 'exercises'],
  [/^\/exercise-new$/, (el) => renderExerciseForm(el), 'exercises'],
  [/^\/exercise-edit\/([^/]+)$/, renderExerciseForm, 'exercises'],
  [/^\/settings$/, renderSettings, 'settings'],
];

const main = document.getElementById('view');

function render() {
  const path = location.hash.replace(/^#/, '') || '/';
  let match = null;
  for (const [re, view, tab] of routes) {
    const m = path.match(re);
    if (m) { match = { view, tab, params: m.slice(1).map((p) => (p ? decodeURIComponent(p) : p)) }; break; }
  }
  if (!match) {
    location.replace('#/');
    return;
  }
  main.onclick = main.oninput = main.onchange = main.onkeydown = main.onfocusin = null;
  match.view(main, ...match.params);
  for (const a of document.querySelectorAll('#tabs a')) {
    if (a.dataset.tab === match.tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  renderDock();
}

app.refresh = render;
hooks.onSaveError = () => toast('Storage is full. Export a backup in Settings and delete old workouts.');

load();
applyTheme();
initTimer();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
window.addEventListener('hashchange', () => {
  document.getElementById('toast-root').innerHTML = '';
  render();
  window.scrollTo(0, 0);
});
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
// Another tab changed the data: reload to stay in sync.
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith('overload.')) {
    load();
    render();
  }
});
render();

if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
