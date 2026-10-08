/**
 * Authoritative Global Exercise Image Source for FitPulse
 * 
 * Maps all FitPulse exercises across Recommended, Custom, Trainer, Library,
 * and Attendance views to the authoritative SVG assets in /exercises/*.svg.
 */

export const EXERCISE_IMAGE_MAP = {
  // Chest
  'barbell flat bench press': '/exercises/bench-press.svg',
  'barbell bench press': '/exercises/bench-press.svg',
  'bench press': '/exercises/bench-press.svg',
  'incline dumbbell press': '/exercises/incline-press.svg',
  'incline dumbbell chest press': '/exercises/incline-press.svg',
  'incline press': '/exercises/incline-press.svg',
  'standard push-ups': '/exercises/pushup.svg',
  'push-ups': '/exercises/pushup.svg',
  'push ups': '/exercises/pushup.svg',
  'dumbbell chest flyes': '/exercises/bench-press.svg',
  'dumbbell flyes': '/exercises/bench-press.svg',
  'dumbbell bench press': '/exercises/bench-press.svg',

  // Back
  'wide-grip lat pulldown': '/exercises/lat-pulldown.svg',
  'lat pulldown': '/exercises/lat-pulldown.svg',
  'bent-over barbell row': '/exercises/cable-row.svg',
  'barbell row': '/exercises/cable-row.svg',
  'seated cable row': '/exercises/cable-row.svg',
  'cable row': '/exercises/cable-row.svg',
  'single-arm dumbbell row': '/exercises/cable-row.svg',
  'dumbbell row': '/exercises/cable-row.svg',

  // Legs & Glutes
  'barbell back squats': '/exercises/squats.svg',
  'barbell back squat': '/exercises/squats.svg',
  'barbell squats': '/exercises/squats.svg',
  'squats': '/exercises/squats.svg',
  'dumbbell goblet squats': '/exercises/squats.svg',
  'goblet squats': '/exercises/squats.svg',
  'goblet squat': '/exercises/squats.svg',
  'conventional barbell deadlift': '/exercises/deadlift.svg',
  'barbell deadlift': '/exercises/deadlift.svg',
  'deadlift': '/exercises/deadlift.svg',
  'romanian deadlifts (rdl)': '/exercises/deadlift.svg',
  'romanian deadlifts': '/exercises/deadlift.svg',
  'romanian deadlift': '/exercises/deadlift.svg',
  'leg press machine': '/exercises/leg-press.svg',
  'leg press': '/exercises/leg-press.svg',
  'walking dumbbell lunges': '/exercises/lunges.svg',
  'dumbbell lunges': '/exercises/lunges.svg',
  'lunges': '/exercises/lunges.svg',
  'standing calf raises': '/exercises/leg-press.svg',
  'calf raises': '/exercises/leg-press.svg',

  // Shoulders & Arms
  'overhead dumbbell press': '/exercises/shoulder-press.svg',
  'dumbbell shoulder press': '/exercises/shoulder-press.svg',
  'shoulder press': '/exercises/shoulder-press.svg',
  'dumbbell lateral raises': '/exercises/lateral-raise.svg',
  'lateral raises': '/exercises/lateral-raise.svg',
  'standing barbell curls': '/exercises/bicep-curl.svg',
  'barbell curls': '/exercises/bicep-curl.svg',
  'bicep curls': '/exercises/bicep-curl.svg',
  'dumbbell hammer curls': '/exercises/bicep-curl.svg',
  'dumbbell hammer curl': '/exercises/bicep-curl.svg',
  'hammer curls': '/exercises/bicep-curl.svg',
  'cable triceps rope pushdown': '/exercises/tricep-pushdown.svg',
  'tricep rope pushdown': '/exercises/tricep-pushdown.svg',
  'cable tricep pushdown': '/exercises/tricep-pushdown.svg',
  'triceps pushdown': '/exercises/tricep-pushdown.svg',
  'parallel bar tricep dips': '/exercises/tricep-pushdown.svg',
  'parallel bar dips': '/exercises/tricep-pushdown.svg',
  'tricep dips': '/exercises/tricep-pushdown.svg',
  'dips': '/exercises/tricep-pushdown.svg',

  // Core & Conditioning
  'isometric core plank': '/exercises/plank.svg',
  'plank hold': '/exercises/plank.svg',
  'plank': '/exercises/plank.svg',
  'hanging knee raises': '/exercises/plank.svg',
  'knee raises': '/exercises/plank.svg',
  'dynamic mountain climbers': '/exercises/plank.svg',
  'mountain climbers': '/exercises/plank.svg',
};

/**
 * Resolves authoritative image URL for any exercise name or object.
 * Checks explicit imageUrl first, then maps via normalized name.
 * @param {string|object} exerciseOrName 
 * @returns {string} Relative asset path e.g. '/exercises/bench-press.svg' or ''
 */
export function getExerciseImageUrl(exerciseOrName) {
  if (!exerciseOrName) return '';

  if (typeof exerciseOrName === 'object') {
    if (exerciseOrName.imageUrl && typeof exerciseOrName.imageUrl === 'string' && exerciseOrName.imageUrl.trim()) {
      return exerciseOrName.imageUrl.trim();
    }
    return getExerciseImageUrl(exerciseOrName.exerciseName || exerciseOrName.name);
  }

  const clean = String(exerciseOrName).toLowerCase().trim();
  if (EXERCISE_IMAGE_MAP[clean]) {
    return EXERCISE_IMAGE_MAP[clean];
  }

  // Keyword / Substring fallback
  if (clean.includes('bench') || clean.includes('fly')) return '/exercises/bench-press.svg';
  if (clean.includes('incline')) return '/exercises/incline-press.svg';
  if (clean.includes('push-up') || clean.includes('pushup') || clean.includes('push up')) return '/exercises/pushup.svg';
  if (clean.includes('lat pull')) return '/exercises/lat-pulldown.svg';
  if (clean.includes('row')) return '/exercises/cable-row.svg';
  if (clean.includes('squat')) return '/exercises/squats.svg';
  if (clean.includes('deadlift') || clean.includes('rdl')) return '/exercises/deadlift.svg';
  if (clean.includes('leg press') || clean.includes('calf')) return '/exercises/leg-press.svg';
  if (clean.includes('lunge')) return '/exercises/lunges.svg';
  if (clean.includes('shoulder') || clean.includes('overhead')) return '/exercises/shoulder-press.svg';
  if (clean.includes('lateral')) return '/exercises/lateral-raise.svg';
  if (clean.includes('curl')) return '/exercises/bicep-curl.svg';
  if (clean.includes('tricep') || clean.includes('dip')) return '/exercises/tricep-pushdown.svg';
  if (clean.includes('plank') || clean.includes('knee raise') || clean.includes('climber')) return '/exercises/plank.svg';

  return '';
}
