// Anonymous usage stats with GoatCounter (no cookies, no personal data).
// Only screen names and a few events are sent, never workout contents.

import { state } from './store.js';

// Your GoatCounter endpoint: https://<code>.goatcounter.com/count. Empty disables counting.
const ENDPOINT = 'https://overload.goatcounter.com/count';

export const hasAnalytics = !!ENDPOINT;

let status = 'off'; // off | loading | ready
const queue = [];
let lastPath = null;

export function initAnalytics() {
  if (status !== 'off' || !ENDPOINT || !state.settings.analytics || ['localhost', '127.0.0.1'].includes(location.hostname)) return;
  status = 'loading';
  window.goatcounter = { no_onload: true };
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = ENDPOINT;
  script.onload = () => {
    status = 'ready';
    queue.splice(0).forEach(send);
  };
  script.onerror = () => {
    status = 'off';
    queue.length = 0;
  };
  document.head.append(script);
}

function send(vars) {
  try {
    window.goatcounter.count(vars);
  } catch {
    // Blocked by an ad blocker or offline: nothing to do.
  }
}

function track(vars) {
  if (status === 'off' || !state.settings.analytics) return;
  if (status === 'ready') send(vars);
  else queue.push(vars);
}

// Route paths with ids or shared workout data collapsed, e.g. /share/<data> -> /share.
function cleanPath(route) {
  return route
    .replace(/^\/share\/.*/, '/share')
    .replace(/^\/history\/[^/]+(\/done)?$/, (_, done) => (done ? '/history/finished' : '/history/workout'))
    .replace(/^\/workout\/.+/, '/workout/exercise')
    .replace(/^\/plan\/.+/, '/plan/exercise')
    .replace(/^\/exercise\/c_.+/, '/exercise/custom')
    .replace(/^\/exercise-edit\/.+/, '/exercise-edit');
}

export function trackPage(route) {
  const path = cleanPath(route);
  if (path === lastPath) return;
  lastPath = path;
  track({ path, title: path });
}

export function trackEvent(name) {
  track({ path: name, title: name, event: true });
}
