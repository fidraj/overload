// Static reference data: muscles, equipment, splits and the built-in exercise library.

export const MUSCLES = {
  chest:      { name: 'Chest',      size: 3, hours: 72 },
  shoulders:  { name: 'Shoulders',  size: 2, hours: 48 },
  triceps:    { name: 'Triceps',    size: 1, hours: 48 },
  biceps:     { name: 'Biceps',     size: 1, hours: 48 },
  forearms:   { name: 'Forearms',   size: 1, hours: 36 },
  lats:       { name: 'Lats',       size: 3, hours: 72 },
  upper_back: { name: 'Upper back', size: 3, hours: 72 },
  traps:      { name: 'Traps',      size: 1, hours: 48 },
  lower_back: { name: 'Lower back', size: 2, hours: 72 },
  abs:        { name: 'Abs',        size: 1, hours: 36 },
  obliques:   { name: 'Obliques',   size: 1, hours: 36 },
  quads:      { name: 'Quads',      size: 3, hours: 72 },
  hamstrings: { name: 'Hamstrings', size: 3, hours: 72 },
  glutes:     { name: 'Glutes',     size: 3, hours: 72 },
  calves:     { name: 'Calves',     size: 1, hours: 36 },
  adductors:  { name: 'Adductors',  size: 1, hours: 48 },
  abductors:  { name: 'Abductors',  size: 1, hours: 48 },
};

export const EQUIPMENT = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  bench: 'Bench',
  kettlebell: 'Kettlebells',
  cable: 'Cable station',
  machine: 'Machines',
  smith: 'Smith machine',
  ezbar: 'EZ bar',
  trapbar: 'Trap bar',
  pullup: 'Pull-up bar',
  dip: 'Dip bars',
  band: 'Resistance bands',
};

export const EQUIPMENT_PRESETS = {
  gym: { name: 'Full gym', items: Object.keys(EQUIPMENT) },
  home: { name: 'Home gym', items: ['dumbbell', 'bench', 'kettlebell', 'pullup', 'band'] },
  none: { name: 'Bodyweight only', items: [] },
};

// Muscle weights decide how many exercises each muscle gets in a generated workout.
export const SPLITS = {
  full:  { name: 'Full body',  title: 'Full body',  muscles: { quads: 3, chest: 3, lats: 2.5, hamstrings: 2, upper_back: 2, shoulders: 2, glutes: 1.5, biceps: 1, triceps: 1, abs: 1, calves: 0.5 } },
  upper: { name: 'Upper body', title: 'Upper body', muscles: { chest: 3, lats: 3, upper_back: 2, shoulders: 2, triceps: 1.5, biceps: 1.5, traps: 0.5 } },
  lower: { name: 'Lower body', title: 'Lower body', muscles: { quads: 3, hamstrings: 3, glutes: 2.5, calves: 1.5, abs: 1, adductors: 0.5, abductors: 0.5 } },
  push:  { name: 'Push',       title: 'Push day',   muscles: { chest: 3, shoulders: 2.5, triceps: 2 } },
  pull:  { name: 'Pull',       title: 'Pull day',   muscles: { lats: 3, upper_back: 3, biceps: 2, traps: 1, lower_back: 1, forearms: 0.5 } },
  legs:  { name: 'Legs',       title: 'Leg day',    muscles: { quads: 3, hamstrings: 2.5, glutes: 2.5, calves: 1.5, adductors: 0.5, abductors: 0.5 } },
  arms:  { name: 'Arms',       title: 'Arm day',    muscles: { biceps: 3, triceps: 3, forearms: 1, shoulders: 1 } },
  core:  { name: 'Core',       title: 'Core',       muscles: { abs: 3, obliques: 2, lower_back: 1.5 } },
};

export const GOALS = {
  strength: { name: 'Strength', desc: 'Heavy sets of 3–8 reps with long rests.' },
  hypertrophy: { name: 'Muscle growth', desc: 'Moderate weight for 6–15 reps.' },
  endurance: { name: 'Endurance', desc: 'Lighter weight, 12–20+ reps, short rests.' },
};

// "How did that feel?" after an exercise. Feeds the next session's weight suggestion.
export const FEELS = {
  easy: { name: 'Easy', desc: 'Could do more', tag: 'Felt easy' },
  right: { name: 'Just right', desc: 'Last reps were tough', tag: 'Felt just right' },
  hard: { name: 'Hard', desc: 'Barely made it', tag: 'Felt hard' },
  max: { name: 'Too much', desc: 'Missed reps', tag: 'Felt too heavy' },
};

// Tracking types: wr = weight × reps, bw = bodyweight reps (+ optional added weight),
// r = reps only, t = time hold, wt = weight × time.
// Columns: id | name | primary muscles | secondary muscles | equipment | c(ompound)/i(solation) | track | tier (3 = staple)
const RAW = `
bb_bench|Barbell Bench Press|chest|triceps shoulders|barbell bench|c|wr|3
bb_incline_bench|Incline Barbell Bench Press|chest|shoulders triceps|barbell bench|c|wr|3
bb_decline_bench|Decline Barbell Bench Press|chest|triceps|barbell bench|c|wr|1
db_bench|Dumbbell Bench Press|chest|triceps shoulders|dumbbell bench|c|wr|3
db_incline_press|Incline Dumbbell Press|chest|shoulders triceps|dumbbell bench|c|wr|3
db_fly|Dumbbell Fly|chest|shoulders|dumbbell bench|i|wr|2
db_incline_fly|Incline Dumbbell Fly|chest|shoulders|dumbbell bench|i|wr|1
cable_crossover|Cable Crossover|chest|shoulders|cable|i|wr|3
cable_fly_low|Low-to-High Cable Fly|chest|shoulders|cable|i|wr|2
machine_chest_press|Machine Chest Press|chest|triceps shoulders|machine|c|wr|2
pec_deck|Pec Deck Fly|chest|shoulders|machine|i|wr|2
smith_bench|Smith Machine Bench Press|chest|triceps shoulders|smith bench|c|wr|2
smith_incline|Smith Machine Incline Press|chest|shoulders triceps|smith bench|c|wr|1
push_up|Push-Up|chest|triceps shoulders abs|bodyweight|c|bw|2
decline_push_up|Decline Push-Up|chest|shoulders triceps|bodyweight|c|bw|1
dip_chest|Chest Dip|chest|triceps shoulders|dip|c|bw|2
db_pullover|Dumbbell Pullover|chest|lats triceps|dumbbell bench|i|wr|1
kb_floor_press|Kettlebell Floor Press|chest|triceps|kettlebell|c|wr|1
band_chest_press|Band Chest Press|chest|triceps shoulders|band|c|r|1
bb_ohp|Overhead Press|shoulders|triceps traps|barbell|c|wr|3
db_shoulder_press|Dumbbell Shoulder Press|shoulders|triceps|dumbbell|c|wr|3
arnold_press|Arnold Press|shoulders|triceps|dumbbell|c|wr|2
machine_shoulder_press|Machine Shoulder Press|shoulders|triceps|machine|c|wr|2
smith_ohp|Smith Machine Shoulder Press|shoulders|triceps|smith|c|wr|1
kb_press|Kettlebell Overhead Press|shoulders|triceps|kettlebell|c|wr|1
pike_push_up|Pike Push-Up|shoulders|triceps|bodyweight|c|bw|2
band_ohp|Band Overhead Press|shoulders|triceps|band|c|r|1
db_lateral_raise|Dumbbell Lateral Raise|shoulders||dumbbell|i|wr|3
cable_lateral_raise|Cable Lateral Raise|shoulders||cable|i|wr|2
machine_lateral_raise|Machine Lateral Raise|shoulders||machine|i|wr|1
band_lateral_raise|Band Lateral Raise|shoulders||band|i|r|1
db_front_raise|Dumbbell Front Raise|shoulders|chest|dumbbell|i|wr|1
db_rear_delt_fly|Bent-Over Rear Delt Fly|shoulders|upper_back|dumbbell|i|wr|2
reverse_pec_deck|Reverse Pec Deck|shoulders|upper_back|machine|i|wr|2
face_pull|Face Pull|shoulders|upper_back traps|cable|i|wr|3
band_pull_apart|Band Pull-Apart|shoulders|upper_back|band|i|r|1
bb_upright_row|Barbell Upright Row|shoulders|traps biceps|barbell|c|wr|1
close_grip_bench|Close-Grip Bench Press|triceps|chest shoulders|barbell bench|c|wr|3
tricep_pushdown|Tricep Pushdown|triceps||cable|i|wr|3
rope_pushdown|Rope Pushdown|triceps||cable|i|wr|3
overhead_cable_ext|Overhead Cable Extension|triceps||cable|i|wr|2
db_overhead_ext|Dumbbell Overhead Extension|triceps||dumbbell|i|wr|2
skull_crusher|EZ-Bar Skull Crusher|triceps||ezbar bench|i|wr|2
db_kickback|Dumbbell Kickback|triceps||dumbbell|i|wr|1
machine_tricep_ext|Machine Tricep Extension|triceps||machine|i|wr|1
dip_triceps|Tricep Dip|triceps|chest shoulders|dip|c|bw|3
bench_dip|Bench Dip|triceps|shoulders|bench|i|bw|1
diamond_push_up|Diamond Push-Up|triceps|chest|bodyweight|c|bw|2
band_pushdown|Band Pushdown|triceps||band|i|r|1
bb_curl|Barbell Curl|biceps|forearms|barbell|i|wr|3
ez_curl|EZ-Bar Curl|biceps|forearms|ezbar|i|wr|2
db_curl|Dumbbell Curl|biceps|forearms|dumbbell|i|wr|3
hammer_curl|Hammer Curl|biceps|forearms|dumbbell|i|wr|3
incline_db_curl|Incline Dumbbell Curl|biceps||dumbbell bench|i|wr|2
preacher_curl|EZ-Bar Preacher Curl|biceps||ezbar bench|i|wr|2
concentration_curl|Concentration Curl|biceps||dumbbell|i|wr|1
cable_curl|Cable Curl|biceps|forearms|cable|i|wr|2
machine_curl|Machine Curl|biceps||machine|i|wr|1
kb_curl|Kettlebell Curl|biceps|forearms|kettlebell|i|wr|1
band_curl|Band Curl|biceps||band|i|r|1
wrist_curl|Dumbbell Wrist Curl|forearms||dumbbell|i|wr|2
reverse_curl|Reverse Barbell Curl|forearms|biceps|barbell|i|wr|2
farmers_carry|Farmer's Carry|forearms|traps abs|dumbbell|c|wt|2
dead_hang|Dead Hang|forearms|lats|pullup|i|t|2
pull_up|Pull-Up|lats|biceps upper_back|pullup|c|bw|3
chin_up|Chin-Up|lats|biceps|pullup|c|bw|3
lat_pulldown|Lat Pulldown|lats|biceps upper_back|cable|c|wr|3
close_grip_pulldown|Close-Grip Pulldown|lats|biceps|cable|c|wr|2
straight_arm_pulldown|Straight-Arm Pulldown|lats||cable|i|wr|2
db_row|One-Arm Dumbbell Row|lats|upper_back biceps|dumbbell bench|c|wr|3
kb_row|Kettlebell Row|lats|upper_back biceps|kettlebell|c|wr|1
band_pulldown|Band Lat Pulldown|lats|biceps|band|c|r|1
bb_row|Barbell Row|upper_back|lats biceps lower_back|barbell|c|wr|3
pendlay_row|Pendlay Row|upper_back|lats lower_back|barbell|c|wr|1
t_bar_row|T-Bar Row|upper_back|lats biceps|barbell|c|wr|2
seated_cable_row|Seated Cable Row|upper_back|lats biceps|cable|c|wr|3
chest_supported_row|Chest-Supported Dumbbell Row|upper_back|lats biceps|dumbbell bench|c|wr|2
machine_row|Machine Row|upper_back|lats biceps|machine|c|wr|2
inverted_row|Inverted Row|upper_back|lats biceps|barbell|c|bw|1
band_row|Band Row|upper_back|lats biceps|band|c|r|1
ytw_raise|Prone Y-T-W Raise|upper_back|shoulders traps|bodyweight|i|r|1
bb_shrug|Barbell Shrug|traps|forearms|barbell|i|wr|2
db_shrug|Dumbbell Shrug|traps|forearms|dumbbell|i|wr|3
deadlift|Deadlift|hamstrings glutes lower_back|quads traps forearms upper_back|barbell|c|wr|3
back_extension|Back Extension|lower_back|glutes hamstrings|machine|i|bw|2
good_morning|Good Morning|hamstrings lower_back|glutes|barbell|c|wr|1
superman|Superman Hold|lower_back|glutes|bodyweight|i|t|1
bird_dog|Bird Dog|lower_back|abs glutes|bodyweight|i|r|1
bb_squat|Barbell Back Squat|quads glutes|hamstrings adductors lower_back|barbell|c|wr|3
front_squat|Front Squat|quads|glutes abs upper_back|barbell|c|wr|2
goblet_squat|Goblet Squat|quads|glutes|dumbbell|c|wr|2
kb_goblet_squat|Kettlebell Goblet Squat|quads|glutes|kettlebell|c|wr|1
leg_press|Leg Press|quads|glutes hamstrings|machine|c|wr|3
hack_squat|Hack Squat|quads|glutes|machine|c|wr|2
smith_squat|Smith Machine Squat|quads|glutes hamstrings|smith|c|wr|1
bulgarian_split_squat|Bulgarian Split Squat|quads glutes|hamstrings adductors|dumbbell bench|c|wr|2
db_lunge|Dumbbell Lunge|quads|glutes hamstrings|dumbbell|c|wr|2
walking_lunge|Walking Lunge|quads|glutes hamstrings|bodyweight|c|bw|1
step_up|Dumbbell Step-Up|quads|glutes|dumbbell bench|c|wr|1
leg_extension|Leg Extension|quads||machine|i|wr|3
bw_squat|Bodyweight Squat|quads|glutes|bodyweight|c|bw|1
jump_squat|Jump Squat|quads|glutes calves|bodyweight|c|bw|1
wall_sit|Wall Sit|quads|glutes|bodyweight|i|t|1
rdl|Romanian Deadlift|hamstrings|glutes lower_back|barbell|c|wr|3
db_rdl|Dumbbell Romanian Deadlift|hamstrings|glutes lower_back|dumbbell|c|wr|2
single_leg_rdl|Single-Leg Romanian Deadlift|hamstrings|glutes|dumbbell|c|wr|1
lying_leg_curl|Lying Leg Curl|hamstrings||machine|i|wr|3
seated_leg_curl|Seated Leg Curl|hamstrings||machine|i|wr|2
nordic_curl|Nordic Hamstring Curl|hamstrings||bodyweight|i|bw|1
kb_swing|Kettlebell Swing|glutes hamstrings|lower_back|kettlebell|c|wr|2
hip_thrust|Barbell Hip Thrust|glutes|hamstrings|barbell bench|c|wr|3
glute_bridge|Glute Bridge|glutes|hamstrings|bodyweight|i|bw|2
single_leg_glute_bridge|Single-Leg Glute Bridge|glutes|hamstrings|bodyweight|i|bw|1
cable_kickback|Cable Glute Kickback|glutes||cable|i|wr|2
sumo_deadlift|Sumo Deadlift|glutes quads|adductors hamstrings lower_back|barbell|c|wr|1
trap_bar_deadlift|Trap Bar Deadlift|quads glutes|hamstrings lower_back traps|trapbar|c|wr|2
hip_abduction|Hip Abduction Machine|abductors|glutes|machine|i|wr|2
hip_adduction|Hip Adduction Machine|adductors||machine|i|wr|2
band_lateral_walk|Banded Lateral Walk|abductors|glutes|band|i|r|1
side_lying_leg_raise|Side-Lying Leg Raise|abductors|glutes|bodyweight|i|r|1
sumo_goblet_squat|Sumo Goblet Squat|adductors quads|glutes|dumbbell|c|wr|1
copenhagen_plank|Copenhagen Plank|adductors|obliques|bench|i|t|1
standing_calf_raise|Standing Calf Raise|calves||machine|i|wr|3
seated_calf_raise|Seated Calf Raise|calves||machine|i|wr|2
db_calf_raise|Dumbbell Calf Raise|calves||dumbbell|i|wr|2
smith_calf_raise|Smith Machine Calf Raise|calves||smith|i|wr|1
leg_press_calf_raise|Leg Press Calf Raise|calves||machine|i|wr|1
bw_calf_raise|Single-Leg Calf Raise|calves||bodyweight|i|bw|1
plank|Plank|abs|obliques lower_back|bodyweight|i|t|3
side_plank|Side Plank|obliques|abs|bodyweight|i|t|2
crunch|Crunch|abs||bodyweight|i|bw|2
hanging_leg_raise|Hanging Leg Raise|abs|obliques|pullup|i|bw|3
lying_leg_raise|Lying Leg Raise|abs||bodyweight|i|bw|2
cable_crunch|Cable Crunch|abs||cable|i|wr|3
machine_crunch|Ab Crunch Machine|abs||machine|i|wr|1
ab_wheel|Ab Wheel Rollout|abs|lower_back shoulders|bodyweight|i|r|2
dead_bug|Dead Bug|abs||bodyweight|i|r|1
mountain_climber|Mountain Climber|abs|shoulders quads|bodyweight|i|r|1
russian_twist|Russian Twist|obliques|abs|bodyweight|i|bw|2
bicycle_crunch|Bicycle Crunch|obliques|abs|bodyweight|i|r|2
pallof_press|Pallof Press|obliques|abs|cable|i|wr|2
cable_woodchop|Cable Woodchop|obliques|abs|cable|i|wr|2
db_side_bend|Dumbbell Side Bend|obliques||dumbbell|i|wr|1
`;

const words = (s) => (s ? s.trim().split(/\s+/) : []);

export const EXERCISES = RAW.trim().split('\n').map((line) => {
  const [id, name, primary, secondary, equipment, kind, track, tier] = line.split('|');
  return {
    id,
    name,
    primary: words(primary),
    secondary: words(secondary),
    equipment: words(equipment).filter((e) => e !== 'bodyweight'),
    kind,
    track,
    tier: Number(tier),
  };
});

export const TRACKS = {
  wr: { name: 'Weight and reps', fields: ['w', 'r'] },
  bw: { name: 'Bodyweight reps (optional added weight)', fields: ['w', 'r'] },
  r: { name: 'Reps only', fields: ['r'] },
  t: { name: 'Time', fields: ['s'] },
  wt: { name: 'Weight and time', fields: ['w', 's'] },
};
