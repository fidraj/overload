// Custom SVG artwork: body maps for muscle groups and movement pictograms for exercises.

// ---- Body map -----------------------------------------------------------------------
// One stylised figure, front and back, viewBox 0 0 100 200. Paths describe the figure's
// left half (viewer's left); the right half is mirrored.

const FRONT = {
  base: [
    '<ellipse cx="50" cy="14" rx="8.5" ry="10.5"/>',
    '<path d="M45 23h10v9H45z"/>',
    '<ellipse cx="23" cy="103" rx="3.6" ry="4.6"/>',
    '<path d="M43 93h14l-4 10h-6z"/>',
    '<ellipse cx="41.5" cy="146" rx="4.2" ry="4"/>',
    '<ellipse cx="42" cy="187" rx="5.5" ry="3.5"/>',
  ],
  muscles: {
    traps: ['M45 27 36 33.5 45 33.5Z'],
    shoulders: ['M37 34C29.5 34 25 39.5 25 47l1 5c3-5 7-9 13-11.5V34Z'],
    chest: ['M49 36h-8.5C35.5 38 33 43 33 49c3.5 6 11 7 16 5Z'],
    biceps: ['M26 54c-2 6-2 13 0 19h5c1-6 1-13 0-20Z'],
    forearms: ['M25 76c-3 8-4 15-4 22h5c2-7 4-14 5-22Z'],
    abs: ['M45.5 58h3.5v9h-5.5v-7a2 2 0 0 1 2-2Z', 'M43.5 68.5H49v9h-5.5Z', 'M43.5 79H49v11h-3.5a2 2 0 0 1-2-2Z'],
    obliques: ['M34 56c2 10 3 22 5 35h3V58c-3-1-5.5-2-8-2Z'],
    abductors: ['M38 93c-3 6-4 12-3 19l3.5-6L40.5 95Z'],
    quads: ['M40.5 96c-5 12-6.5 29-3.5 45h8c2-14 2-29 0-39Z'],
    adductors: ['M46 103c2 8 2.5 17 1.5 25L45.5 131c1-10 1-19-.5-27Z'],
    calves: ['M37 151c-1 11 0 21 2 30h5c2-9 2-19 1-30Z'],
  },
};

const BACK = {
  base: [
    '<ellipse cx="50" cy="14" rx="8.5" ry="10.5"/>',
    '<path d="M45 23h10v6H45z"/>',
    '<ellipse cx="23" cy="103" rx="3.6" ry="4.6"/>',
    '<ellipse cx="41.5" cy="149" rx="4" ry="3"/>',
    '<ellipse cx="42" cy="187" rx="5.5" ry="3.5"/>',
  ],
  muscles: {
    traps: ['M50 25 40.5 33 45 41l5 19Z'],
    shoulders: ['M37 34C29.5 34 25 39.5 25 47l1 5c3-5 7-9 13-11.5V34Z'],
    upper_back: ['M43.5 39 38 40.5c-2.5 4.5-2.5 10-.5 14.5L46 60l2.5-5Z'],
    lats: ['M36.5 57c-2 8-.5 18 5.5 28h4.5V63Z'],
    lower_back: ['M47.5 63 50 61.5V95h-6c0-9 1-21 3.5-32Z'],
    triceps: ['M26 54c-2 6-2 13 0 19h5c1-6 1-13 0-20Z'],
    forearms: ['M25 76c-3 8-4 15-4 22h5c2-7 4-14 5-22Z'],
    abductors: ['M41.5 88c-4 1.5-6 4.5-6.5 9l7-1.5Z'],
    glutes: ['M50 97h-8.5c-5 4-6.5 11-4.5 18 4 4 10 3.5 13 0Z'],
    hamstrings: ['M37 118c-1 10 0 20 3 28h7c1-10 1-20 0-27Z'],
    calves: ['M37 152c-3.5 8-3 17 2 26h5c3-9 3-18 1-26Z'],
  },
};

const MIRROR = 'matrix(-1 0 0 1 100 0)';

// Which side shows each muscle best, and the square crop used for its icon.
export const MUSCLE_VIEW = {
  chest: ['front', [22, 22, 56, 56]],
  shoulders: ['front', [14, 20, 72, 72]],
  biceps: ['front', [8, 40, 44, 44]],
  triceps: ['back', [8, 40, 44, 44]],
  forearms: ['front', [6, 64, 42, 42]],
  lats: ['back', [24, 38, 52, 52]],
  upper_back: ['back', [24, 22, 52, 52]],
  traps: ['back', [26, 16, 48, 48]],
  lower_back: ['back', [26, 54, 48, 48]],
  abs: ['front', [26, 50, 48, 48]],
  obliques: ['front', [24, 48, 52, 52]],
  quads: ['front', [20, 90, 60, 60]],
  hamstrings: ['back', [20, 106, 60, 60]],
  glutes: ['back', [22, 82, 56, 56]],
  calves: ['back', [22, 138, 56, 56]],
  adductors: ['front', [24, 88, 52, 52]],
  abductors: ['back', [20, 78, 60, 60]],
};

function figure(view, primary, secondary) {
  const def = view === 'front' ? FRONT : BACK;
  const half = Object.entries(def.muscles).map(([m, paths]) => {
    const cls = primary.includes(m) ? 'm-pri' : secondary.includes(m) ? 'm-sec' : 'm';
    return paths.map((d) => `<path class="${cls}" d="${d}"/>`).join('');
  }).join('');
  const base = def.base.join('');
  return `<g class="m-base">${base}<g transform="${MIRROR}">${base}</g></g>${half}<g transform="${MIRROR}">${half}</g>`;
}

// Full body map. view: 'front' | 'back' | 'both'.
export function bodyMap({ primary = [], secondary = [], view = 'both', label = '' } = {}) {
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  if (view === 'both') {
    return `<svg class="bodymap" viewBox="0 0 210 200" ${aria}>
      <g>${figure('front', primary, secondary)}</g>
      <g transform="translate(110 0)">${figure('back', primary, secondary)}</g>
    </svg>`;
  }
  return `<svg class="bodymap" viewBox="0 0 100 200" ${aria}>${figure(view, primary, secondary)}</svg>`;
}

// Square close-up of one muscle (used for muscle group icons).
export function muscleIcon(muscle, secondary = []) {
  const [view, box] = MUSCLE_VIEW[muscle] || ['front', [0, 0, 100, 200]];
  return `<svg class="muscle-icon" viewBox="${box.join(' ')}" aria-hidden="true">${figure(view, [muscle], secondary)}</svg>`;
}

// ---- Exercise pictograms --------------------------------------------------------------
// 64×64 stick figures, mostly side view facing right. Body strokes use the ink colour,
// weights use plate blue, benches and machines a muted tone.

const P = (...pts) => {
  let d = '';
  for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${pts[i]} ${pts[i + 1]}`;
  return `<path d="${d}"/>`;
};
const head = (x, y) => `<circle class="p-head" cx="${x}" cy="${y}" r="4.6"/>`;
const plate = (x, y, r = 5.5) => `<circle class="p-plate" cx="${x}" cy="${y}" r="${r}"/>`;
const db = (x1, y1, x2, y2) => `<path class="p-db" d="M${x1} ${y1}L${x2} ${y2}"/>`;
const kit = (...parts) => `<g class="p-kit">${parts.join('')}</g>`;
const cable = (...pts) => `<g class="p-cable">${P(...pts)}</g>`;

const PICTOS = {
  bench: () => kit(P(8, 40, 46, 40), P(12, 40, 12, 52), P(42, 40, 42, 52))
    + head(11, 31) + P(16, 34, 36, 35) + P(36, 35, 46, 28, 50, 46, 55, 46) + P(19, 34, 19, 19) + plate(19, 15),
  incline: () => kit(P(14, 50, 34, 30), P(30, 44, 44, 44), P(36, 44, 36, 54))
    + head(15, 22) + P(19, 28, 32, 40) + P(32, 40, 44, 38, 46, 53, 51, 53) + P(21, 29, 25, 13) + plate(25, 9),
  fly: () => cable(5, 4, 15, 31) + cable(59, 4, 49, 31)
    + head(32, 12) + P(32, 18, 32, 37) + P(26, 21, 38, 21) + P(26, 21, 15, 31) + P(38, 21, 49, 31)
    + P(29, 37, 35, 37) + P(29, 37, 28, 58) + P(35, 37, 36, 58),
  pushup: () => head(51, 27) + P(45, 31, 25, 39, 8, 46) + P(8, 46, 5, 48) + P(44, 32, 45, 47),
  dip: () => kit(P(10, 36, 22, 36), P(42, 36, 54, 36), P(14, 36, 14, 60), P(50, 36, 50, 60))
    + head(32, 10) + P(32, 16, 32, 36) + P(25, 20, 39, 20) + P(25, 20, 20, 35) + P(39, 20, 44, 35)
    + P(29, 36, 35, 36) + P(29, 36, 28, 48, 31, 55) + P(35, 36, 36, 48, 33, 55),
  press: () => kit(P(13, 8, 51, 8)) + plate(13, 8, 5) + plate(51, 8, 5)
    + head(32, 17) + P(32, 23, 32, 41) + P(26, 25, 38, 25) + P(26, 25, 23, 9) + P(38, 25, 41, 9)
    + P(29, 41, 35, 41) + P(29, 41, 28, 60) + P(35, 41, 36, 60),
  raise: () => head(32, 13) + P(32, 19, 32, 38) + P(26, 22, 38, 22) + P(26, 22, 11, 22) + P(38, 22, 53, 22)
    + db(9, 17, 9, 27) + db(55, 17, 55, 27)
    + P(29, 38, 35, 38) + P(29, 38, 28, 59) + P(35, 38, 36, 59),
  pull_high: () => head(32, 15) + P(32, 21, 32, 40) + P(26, 23, 38, 23) + P(26, 23, 15, 19, 20, 9) + P(38, 23, 49, 19, 44, 9)
    + db(17, 9, 23, 9) + db(41, 9, 47, 9)
    + P(29, 40, 35, 40) + P(29, 40, 28, 60) + P(35, 40, 36, 60),
  extension: () => head(37, 15) + P(31, 21, 31, 39) + P(31, 22, 29, 6, 19, 15) + db(15, 12, 22, 19)
    + P(31, 39, 32, 49, 31, 59) + P(31, 59, 36, 59),
  pushdown: () => cable(44, 2, 43, 36) + head(30, 10) + P(31, 16, 31, 35) + P(31, 18, 32, 29, 42, 36)
    + P(31, 35, 32, 46, 31, 57) + P(31, 57, 36, 57),
  curl: () => head(30, 10) + P(30, 16, 30, 35) + P(30, 18, 30, 29, 40, 22) + db(38, 18, 43, 25)
    + P(30, 35, 31, 46, 30, 57) + P(30, 57, 35, 57),
  carry: () => head(32, 9) + P(32, 15, 32, 33) + P(32, 17, 33, 33) + db(33, 30, 33, 40)
    + P(32, 33, 38, 44, 41, 56) + P(32, 33, 27, 44, 22, 54),
  pullup: () => kit(P(10, 5, 54, 5))
    + head(32, 14) + P(32, 20, 32, 39) + P(26, 21, 38, 21) + P(26, 21, 19, 13, 23, 5) + P(38, 21, 45, 13, 41, 5)
    + P(29, 39, 35, 39) + P(29, 39, 29, 51, 26, 59) + P(35, 39, 35, 51, 38, 59),
  pulldown: () => cable(32, 2, 32, 11) + kit(P(10, 11, 54, 11), P(22, 44, 42, 44))
    + head(32, 22) + P(32, 28, 32, 47) + P(26, 30, 38, 30) + P(26, 30, 18, 21, 19, 11) + P(38, 30, 46, 21, 45, 11)
    + P(29, 47, 35, 47) + P(29, 47, 26, 60) + P(35, 47, 38, 60),
  row: () => head(48, 17) + P(42, 21, 21, 31) + P(21, 31, 27, 43, 23, 55) + P(23, 55, 28, 55)
    + P(40, 23, 31, 25, 35, 35) + plate(35, 37),
  seated_row: () => cable(42, 33, 60, 33) + kit(P(8, 47, 28, 47), P(50, 33, 50, 49))
    + head(18, 16) + P(18, 22, 20, 44) + P(20, 44, 34, 37, 46, 44) + P(19, 26, 40, 33),
  deadlift: () => head(44, 15) + P(39, 20, 22, 30) + P(22, 30, 30, 41, 26, 54) + P(26, 54, 31, 54)
    + P(37, 21, 37, 41) + plate(37, 46, 6.5),
  squat: () => head(35, 12) + P(32, 18, 20, 36) + P(20, 36, 36, 41, 31, 56) + P(31, 56, 36, 56)
    + P(31, 20, 38, 26, 30, 22) + plate(28, 20, 6),
  lunge: () => head(32, 9) + P(32, 15, 32, 33) + P(32, 33, 44, 36, 44, 53) + P(44, 53, 49, 53)
    + P(32, 33, 24, 49, 12, 47) + P(32, 17, 33, 33) + db(33, 31, 33, 40),
  leg_press: () => kit(P(8, 30, 22, 48), P(22, 48, 36, 48), P(50, 20, 54, 42))
    + head(11, 22) + P(14, 28, 26, 42) + P(26, 42, 34, 26, 49, 30) + P(16, 30, 26, 36),
  leg_ext: () => kit(P(15, 40, 37, 40), P(15, 40, 15, 18), P(26, 40, 26, 56)) + plate(52, 32, 3.5)
    + head(22, 11) + P(22, 17, 22, 36) + P(22, 36, 36, 36, 50, 32) + P(22, 19, 27, 35),
  leg_curl: () => kit(P(6, 41, 46, 41), P(10, 41, 10, 54), P(42, 41, 42, 54)) + plate(9, 18, 3.5)
    + head(52, 32) + P(46, 35, 28, 37) + P(28, 37, 15, 37, 10, 22) + P(46, 36, 51, 44),
  calf: () => kit(P(26, 57, 44, 57))
    + head(32, 8) + P(32, 14, 32, 32) + P(32, 16, 33, 31) + db(33, 29, 33, 38)
    + P(32, 32, 32, 44, 31, 51, 37, 55),
  thrust: () => kit(P(5, 36, 17, 36), P(10, 36, 10, 52)) + plate(32, 23, 5.5)
    + head(9, 27) + P(14, 31, 32, 30) + P(32, 30, 44, 33, 44, 51) + P(44, 51, 50, 51),
  kickback: () => kit(P(50, 26, 50, 60))
    + head(42, 13) + P(38, 18, 27, 30) + P(36, 20, 49, 28) + P(27, 30, 29, 43, 28, 57) + P(28, 57, 33, 57)
    + P(27, 30, 15, 24, 6, 22),
  swing: () => head(30, 11) + P(30, 17, 28, 35) + P(29, 19, 46, 23) + `<circle class="p-plate" cx="50" cy="25" r="4.5"/>`
    + P(28, 35, 34, 45, 30, 57) + P(30, 57, 35, 57),
  plank: () => head(52, 28) + P(46, 32, 26, 37, 8, 43) + P(8, 43, 5, 46) + P(45, 33, 45, 45, 54, 45),
  side_plank: () => head(49, 15) + P(44, 21, 8, 50) + P(44, 22, 45, 47) + P(44, 22, 43, 5) + P(8, 50, 4, 52),
  crunch: () => head(14, 25) + P(19, 30, 30, 45) + P(30, 45, 42, 33, 49, 47) + P(49, 47, 54, 47) + P(20, 31, 26, 24, 17, 22),
  leg_raise: () => kit(P(18, 4, 46, 4))
    + P(31, 4, 31, 19) + head(37, 15) + P(31, 19, 31, 37) + P(31, 37, 53, 37),
  twist: () => plate(39, 32, 4.5) + head(19, 15) + P(21, 21, 29, 43) + P(29, 43, 41, 34, 52, 39)
    + P(22, 24, 30, 33, 37, 31),
  superman: () => head(14, 37) + P(19, 40, 38, 44) + P(38, 44, 58, 35) + P(20, 40, 5, 31),
  abduction: () => kit(P(22, 37, 42, 37)) + `<circle class="p-plate" cx="13" cy="42" r="3.5"/><circle class="p-plate" cx="51" cy="42" r="3.5"/>`
    + head(32, 9) + P(32, 15, 32, 34) + P(26, 18, 38, 18) + P(26, 18, 24, 32) + P(38, 18, 40, 32)
    + P(29, 34, 35, 34) + P(29, 34, 17, 42, 21, 58) + P(35, 34, 47, 42, 43, 58),
};

const PICTO_BY_ID = {
  bench: 'bb_bench db_bench smith_bench machine_chest_press close_grip_bench kb_floor_press band_chest_press bb_decline_bench db_pullover skull_crusher',
  incline: 'bb_incline_bench db_incline_press smith_incline',
  fly: 'db_fly db_incline_fly cable_crossover cable_fly_low pec_deck',
  pushup: 'push_up decline_push_up diamond_push_up pike_push_up mountain_climber',
  dip: 'dip_chest dip_triceps bench_dip',
  press: 'bb_ohp db_shoulder_press arnold_press machine_shoulder_press smith_ohp kb_press band_ohp',
  raise: 'db_lateral_raise cable_lateral_raise machine_lateral_raise band_lateral_raise db_front_raise band_pull_apart',
  pull_high: 'reverse_pec_deck face_pull bb_upright_row',
  extension: 'overhead_cable_ext db_overhead_ext machine_tricep_ext',
  pushdown: 'tricep_pushdown rope_pushdown band_pushdown db_kickback',
  curl: 'bb_curl ez_curl db_curl hammer_curl incline_db_curl preacher_curl concentration_curl cable_curl machine_curl kb_curl band_curl wrist_curl reverse_curl',
  carry: 'farmers_carry bb_shrug db_shrug',
  pullup: 'pull_up chin_up dead_hang',
  pulldown: 'lat_pulldown close_grip_pulldown straight_arm_pulldown band_pulldown',
  row: 'db_row kb_row bb_row pendlay_row t_bar_row chest_supported_row inverted_row db_rear_delt_fly',
  seated_row: 'seated_cable_row machine_row band_row',
  superman: 'ytw_raise superman back_extension bird_dog',
  deadlift: 'deadlift rdl db_rdl single_leg_rdl good_morning sumo_deadlift trap_bar_deadlift',
  squat: 'bb_squat front_squat goblet_squat kb_goblet_squat hack_squat smith_squat bw_squat jump_squat wall_sit sumo_goblet_squat',
  leg_press: 'leg_press',
  lunge: 'bulgarian_split_squat db_lunge walking_lunge step_up',
  leg_ext: 'leg_extension',
  leg_curl: 'lying_leg_curl seated_leg_curl nordic_curl',
  swing: 'kb_swing',
  thrust: 'hip_thrust glute_bridge single_leg_glute_bridge',
  kickback: 'cable_kickback',
  abduction: 'hip_abduction hip_adduction band_lateral_walk side_lying_leg_raise',
  side_plank: 'side_plank copenhagen_plank',
  calf: 'standing_calf_raise seated_calf_raise db_calf_raise smith_calf_raise leg_press_calf_raise bw_calf_raise',
  plank: 'plank ab_wheel',
  crunch: 'crunch cable_crunch machine_crunch dead_bug bicycle_crunch',
  twist: 'russian_twist pallof_press cable_woodchop db_side_bend',
};

const PICTO_FOR = {};
for (const [key, ids] of Object.entries(PICTO_BY_ID)) for (const id of ids.split(' ')) PICTO_FOR[id] = key;

// Fallback for custom exercises: a typical movement for the main muscle.
const PICTO_FOR_MUSCLE = {
  chest: 'bench', shoulders: 'press', triceps: 'pushdown', biceps: 'curl', forearms: 'curl',
  lats: 'pulldown', upper_back: 'row', traps: 'carry', lower_back: 'superman', abs: 'crunch',
  obliques: 'twist', quads: 'squat', hamstrings: 'deadlift', glutes: 'thrust', calves: 'calf',
  adductors: 'abduction', abductors: 'abduction',
};

export const PICTO_KEYS = Object.keys(PICTOS);

export function pictogram(key) {
  return `<svg class="picto" viewBox="0 0 64 64" aria-hidden="true"><g class="p-body">${(PICTOS[key] || PICTOS.press)()}</g></svg>`;
}

export function exerciseArt(ex) {
  return pictogram(PICTO_FOR[ex.id] || ex.picto || PICTO_FOR_MUSCLE[ex.primary[0]] || 'press');
}
