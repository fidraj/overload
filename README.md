# Overload

A workout generator and lifting log that runs entirely in the browser. It's static files with no build step, so it can be hosted on GitHub Pages. Your data stays in your browser's localStorage.

## What it does

- **Generates workouts.** Choose a split (Smart, Push, Pull, Legs, Upper, Lower, Full body, Arms, Core, or pick your own muscles), how long you have, and a goal (strength, muscle growth or endurance). Smart mode rotates push, pull and legs based on which muscles have recovered since your last sessions.
- **Logs every set.** Each set row shows what you lifted last time and prefills it. Tick a set to save it and start the rest timer. A set can also be marked as a warm-up.
- **Gives progressive overload hints.** When you hit the top of the rep range on every set last time, the exercise shows "Try 62.5 kg". Tap it to fill the heavier weight in, or ignore it. You decide when to add weight. The step sizes can be changed in Settings.
- **Saves workouts.** Save any generated workout, or any past one, as a template and start it again with one tap.
- **Keeps history and progress.** Every workout is kept with its sets, volume and new records. You can edit or delete past workouts. Each exercise has a chart of estimated 1-rep max, heaviest set or volume, plus its full session list.
- **Has ~140 built-in exercises** for barbells, dumbbells, kettlebells, cables, machines, bands and bodyweight. You can add your own.
- **Works offline and installs to your home screen.** Use "Add to Home Screen" on your phone.

## Put it on GitHub Pages

1. Create a new repository on GitHub, for example `overload`.
2. Push this folder to it:
   ```sh
   cd overload
   git init
   git add .
   git commit -m "Overload workout tracker"
   git branch -M main
   git remote add origin git@github.com:<your-username>/overload.git
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**, then the `main` branch and the `/ (root)` folder. Save.
4. After a minute the app is live at `https://<your-username>.github.io/overload/`.

To run it locally, serve the folder with any static server. It uses ES modules, so opening `index.html` straight from disk won't work:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Your data

Everything is stored in the browser you use the app in, so your phone and laptop each keep their own data. Back up and move data with **Settings → Export backup** and **Import backup**. **Export history as CSV** gives you a spreadsheet-friendly copy.

Clearing your browser's site data for `github.io` deletes your workouts, so export a backup now and then.

## Privacy and stats

The app counts anonymous visits with [GoatCounter](https://www.goatcounter.com): which screen was opened, plus a few events (workout started, finished, shared). It uses no cookies and collects no personal data, and workout contents are never sent. Share links and other ids are stripped before counting. Anyone can turn it off in **Settings → Your data**. To use your own counter, or none, set `ENDPOINT` in `js/analytics.js`.

## Updating

Edit the files and push. The app loads fresh files whenever it's online and only falls back to its cache offline, so changes show up on the next load. Open tabs reload themselves when a new version is deployed. If you add or rename a JS or CSS file, also add it to the `SHELL` list in `sw.js` and bump `CACHE` (e.g. `overload-v6`).

## Code map

| File | What's in it |
|---|---|
| `js/data.js` | Muscles, equipment, splits and the exercise library (one line per exercise) |
| `js/engine.js` | Muscle recovery, workout generation, progression hints, records |
| `js/store.js` | State, localStorage persistence, kg/lb conversion |
| `js/views/*.js` | The four tabs: workout (planner + logger), history, exercises, settings |
| `js/timer.js` | Rest timer, alert beep and screen wake lock |
| `css/app.css` | All styles, with light and dark themes |

To add a built-in exercise, add a line to the `RAW` table in `js/data.js`:

```
id|Name|primary muscles|secondary muscles|equipment|c or i|track|tier
```

`track` is what you log: `wr` (weight × reps), `bw` (bodyweight reps, optional added weight), `r` (reps only), `t` (seconds) or `wt` (weight × seconds). `tier` is 1–3, and higher tiers get picked more often by the generator.
