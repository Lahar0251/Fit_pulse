/**
 * Rule-Based Workout Generation Service
 * 
 * Rules:
 * - Fitness Goal: muscle_gain, fat_loss, strength, general_fitness, endurance
 * - Experience Level: beginner, intermediate, advanced
 * - Planned Days Per Week: 1 to 7 (typically 3, 4, 5, or 6)
 * 
 * Generates structured workout routines with exercise names, targeted muscle groups,
 * prescribed sets, target reps, rest times, instructions, and visual asset references.
 */

// Shared exercise dictionary with form instructions, muscle groups, and SVGs
export const EXERCISES = {
  // Chest
  BENCH_PRESS: {
    name: 'Barbell Flat Bench Press',
    muscleGroup: 'Chest',
    instructions: 'Lower bar with control to mid-chest. Press upward firmly while keeping shoulder blades retracted.',
    imageUrl: '/exercises/bench-press.svg',
  },
  INCLINE_DUMBBELL_PRESS: {
    name: 'Incline Dumbbell Press',
    muscleGroup: 'Upper Chest',
    instructions: 'Set bench to 30 degrees. Press dumbbells overhead smoothly without clanking them together.',
    imageUrl: '/exercises/incline-press.svg',
  },
  PUSH_UPS: {
    name: 'Standard Push-Ups',
    muscleGroup: 'Chest & Core',
    instructions: 'Maintain a rigid straight plank line. Lower chest to floor and push up with controlled tempo.',
    imageUrl: '/exercises/pushup.svg',
  },
  DUMBBELL_FLY: {
    name: 'Dumbbell Chest Flyes',
    muscleGroup: 'Chest',
    instructions: 'Open arms wide with a slight elbow bend, feeling a deep chest stretch, then bring weights together.',
    imageUrl: '/exercises/bench-press.svg',
  },

  // Back
  LAT_PULLDOWN: {
    name: 'Wide-Grip Lat Pulldown',
    muscleGroup: 'Back (Lats)',
    instructions: 'Pull bar down toward upper collarbone. Drive elbows downward and squeeze lats at the bottom.',
    imageUrl: '/exercises/lat-pulldown.svg',
  },
  BARBELL_ROW: {
    name: 'Bent-Over Barbell Row',
    muscleGroup: 'Upper Back',
    instructions: 'Hinge forward at 45 degrees with flat spine. Pull barbell towards lower ribcage.',
    imageUrl: '/exercises/cable-row.svg',
  },
  SEATED_CABLE_ROW: {
    name: 'Seated Cable Row',
    muscleGroup: 'Mid Back',
    instructions: 'Sit tall with chest proud. Pull handle into lower abdomen while keeping shoulders down.',
    imageUrl: '/exercises/cable-row.svg',
  },
  ONE_ARM_ROW: {
    name: 'Single-Arm Dumbbell Row',
    muscleGroup: 'Lats & Rhomboids',
    instructions: 'Place knee and hand on bench. Pull dumbbell to hip crease with a tight elbow path.',
    imageUrl: '/exercises/cable-row.svg',
  },

  // Legs & Glutes
  SQUAT: {
    name: 'Barbell Back Squats',
    muscleGroup: 'Quads & Glutes',
    instructions: 'Keep chest high and brace abdominal wall. Squat until hips are level with knees and drive up.',
    imageUrl: '/exercises/squats.svg',
  },
  GOBLET_SQUAT: {
    name: 'Dumbbell Goblet Squats',
    muscleGroup: 'Quads & Glutes',
    instructions: 'Hold single dumbbell at chest height. Keep torso upright and sink deep into hips.',
    imageUrl: '/exercises/squats.svg',
  },
  DEADLIFT: {
    name: 'Conventional Barbell Deadlift',
    muscleGroup: 'Posterior Chain',
    instructions: 'Keep bar close to shins, brace core tightly, and drive through heels to full standing lockout.',
    imageUrl: '/exercises/deadlift.svg',
  },
  ROMANIAN_DEADLIFT: {
    name: 'Romanian Deadlifts (RDL)',
    muscleGroup: 'Hamstrings & Glutes',
    instructions: 'Hinge hips backwards with slight knee bend until hamstrings stretch. Drive hips forward to finish.',
    imageUrl: '/exercises/deadlift.svg',
  },
  LEG_PRESS: {
    name: 'Leg Press Machine',
    muscleGroup: 'Quads & Hamstrings',
    instructions: 'Feet shoulder-width apart on platform. Lower carriage under control, avoiding knee lock at top.',
    imageUrl: '/exercises/leg-press.svg',
  },
  LUNGES: {
    name: 'Walking Dumbbell Lunges',
    muscleGroup: 'Quads & Calves',
    instructions: 'Step forward landing heel first. Lower trailing knee towards ground and drive forward smoothly.',
    imageUrl: '/exercises/lunges.svg',
  },
  CALF_RAISE: {
    name: 'Standing Calf Raises',
    muscleGroup: 'Calves',
    instructions: 'Rise high onto balls of feet, hold peak contraction for 1 second, and lower fully.',
    imageUrl: '/exercises/leg-press.svg',
  },

  // Shoulders & Arms
  SHOULDER_PRESS: {
    name: 'Overhead Dumbbell Press',
    muscleGroup: 'Deltoids',
    instructions: 'Press dumbbells vertically upward from shoulder height without overarching lower back.',
    imageUrl: '/exercises/shoulder-press.svg',
  },
  LATERAL_RAISE: {
    name: 'Dumbbell Lateral Raises',
    muscleGroup: 'Lateral Deltoids',
    instructions: 'Raise dumbbells outwards to shoulder height with elbows slightly bent and pinkies tilted upward.',
    imageUrl: '/exercises/lateral-raise.svg',
  },
  BICEP_CURL: {
    name: 'Standing Barbell Curls',
    muscleGroup: 'Biceps',
    instructions: 'Keep elbows pinned to torso. Curl bar upwards smoothly and squeeze biceps at peak.',
    imageUrl: '/exercises/bicep-curl.svg',
  },
  HAMMER_CURL: {
    name: 'Dumbbell Hammer Curls',
    muscleGroup: 'Biceps & Forearms',
    instructions: 'Hold dumbbells with neutral palms-in grip. Curl simultaneously with strict posture.',
    imageUrl: '/exercises/bicep-curl.svg',
  },
  TRICEP_PUSHDOWN: {
    name: 'Cable Triceps Rope Pushdown',
    muscleGroup: 'Triceps',
    instructions: 'Lock upper arms beside torso. Push rope down and flare ends apart at full extension.',
    imageUrl: '/exercises/tricep-pushdown.svg',
  },
  DIPS: {
    name: 'Parallel Bar Tricep Dips',
    muscleGroup: 'Triceps & Chest',
    instructions: 'Lower body until elbows reach 90 degrees. Push through palms to return to top position.',
    imageUrl: '/exercises/tricep-pushdown.svg',
  },

  // Core & Conditioning
  PLANK: {
    name: 'Isometric Core Plank',
    muscleGroup: 'Abdominals & Core',
    instructions: 'Brace abdominals firmly, keep glutes squeezed, and maintain a straight line from head to heels.',
    imageUrl: '/exercises/plank.svg',
  },
  KNEE_RAISES: {
    name: 'Hanging Knee Raises',
    muscleGroup: 'Lower Abdominals',
    instructions: 'Hang from pullup bar without swinging. Flex hips and curl knees up to chest level.',
    imageUrl: '/exercises/plank.svg',
  },
  MOUNTAIN_CLIMBERS: {
    name: 'Dynamic Mountain Climbers',
    muscleGroup: 'Core & Conditioning',
    instructions: 'From high plank position, drive knees alternately forward in a fast, rhythmic cadence.',
    imageUrl: '/exercises/plank.svg',
  },
};

/**
 * Generate plan title and description
 */
export const getPlanTitle = (level, goal, daysCount) => {
  const levelNames = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    pro: 'Pro',
  };
  const goalNames = {
    muscle_gain: 'Muscle Gain Hypertrophy',
    fat_loss: 'Fat Loss & Conditioning',
    strength: 'Strength Foundations',
    general_fitness: 'General Fitness & Mobility',
    endurance: 'Muscular Endurance',
  };

  const lvl = levelNames[level] || 'Personalized';
  const g = goalNames[goal] || 'Fitness';
  return `${lvl} ${g} (${daysCount}-Day Plan)`;
};

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const buildWeeklySchedule = (daysCount, daysList = [], joinDayIndex = null) => {
  const count = Math.min(7, Math.max(1, Number(daysCount) || (daysList.length > 0 ? daysList.length : 5)));
  const schedule = [];

  // Determine workout days indices (0 = Monday ... 6 = Sunday)
  let workoutDayIndices = [];
  if (joinDayIndex !== null && joinDayIndex !== undefined && Number.isInteger(joinDayIndex) && joinDayIndex >= 0 && joinDayIndex < 7) {
    // PART 3: Join Date = Day 1 of first workout cycle
    // Assign count workout slots sequentially starting from joinDayIndex
    for (let c = 0; c < count; c++) {
      workoutDayIndices.push((joinDayIndex + c) % 7);
    }
  } else {
    // Standard calendar week distribution
    if (count === 1) {
      workoutDayIndices = [0]; // Mon
    } else if (count === 2) {
      workoutDayIndices = [0, 3]; // Mon, Thu
    } else if (count === 3) {
      workoutDayIndices = [0, 2, 4]; // Mon, Wed, Fri (Wed is Day 2)
    } else if (count === 4) {
      workoutDayIndices = [0, 1, 3, 4]; // Mon, Tue, Thu, Fri (Wed, Sat, Sun are Rest Days)
    } else if (count === 5) {
      workoutDayIndices = [0, 1, 2, 3, 4]; // Mon, Tue, Wed, Thu, Fri (Sat, Sun are Rest Days)
    } else if (count === 6) {
      workoutDayIndices = [0, 1, 2, 3, 4, 5]; // Mon-Sat (Sun is Rest Day)
    } else {
      workoutDayIndices = [0, 1, 2, 3, 4, 5, 6]; // All 7 days
    }
  }

  // Determine chronological ordering for assigning workout slots 1..count
  const order = (joinDayIndex !== null && joinDayIndex !== undefined && Number.isInteger(joinDayIndex) && joinDayIndex >= 0 && joinDayIndex < 7)
    ? Array.from({ length: 7 }, (_, i) => (joinDayIndex + i) % 7)
    : [0, 1, 2, 3, 4, 5, 6];

  const assignedMap = new Map();
  let workoutIndexCounter = 0;

  for (const dayIdx of order) {
    if (workoutDayIndices.includes(dayIdx) && workoutIndexCounter < count) {
      const assignedDay = daysList[workoutIndexCounter] || {
        dayNumber: workoutIndexCounter + 1,
        dayName: `Day ${workoutIndexCounter + 1}`,
        focus: 'Workout',
        isCompleted: false,
      };
      assignedMap.set(dayIdx, {
        type: 'workout',
        workoutDayNumber: assignedDay.dayNumber || workoutIndexCounter + 1,
        workoutDayName: assignedDay.dayName || `Day ${workoutIndexCounter + 1}`,
        focus: assignedDay.focus || 'Workout',
        status: assignedDay.isCompleted ? 'completed' : 'scheduled',
        completedAt: assignedDay.completedAt || null,
        workoutId: assignedDay._id ? assignedDay._id.toString() : null,
        workoutSource: 'recommended',
      });
      workoutIndexCounter++;
    } else {
      assignedMap.set(dayIdx, {
        type: 'rest',
        workoutDayNumber: null,
        workoutDayName: 'Rest Day',
        focus: 'Rest & Recovery',
        status: 'rest',
        completedAt: null,
        workoutId: null,
        workoutSource: 'recommended',
      });
    }
  }

  for (let i = 0; i < 7; i++) {
    const dayName = DAYS_OF_WEEK[i];
    const data = assignedMap.get(i);
    schedule.push({
      dayOfWeek: dayName,
      dayIndex: i,
      type: data.type,
      workoutDayNumber: data.workoutDayNumber,
      workoutDayName: data.workoutDayName,
      focus: data.focus,
      status: data.status,
      completedAt: data.completedAt,
      workoutId: data.workoutId,
      workoutSource: data.workoutSource,
    });
  }

  return schedule;
};

/**
 * Main Rule-Based Workout Plan Generator
 * 
 * Rules:
 * 1. Beginner + Muscle Gain -> Controlled volume, foundational compound patterns, 3 sets x 8-12 reps, 60-90s rest
 * 2. Intermediate + Muscle Gain -> Split routine (Push/Pull/Legs or Upper/Lower), 4 sets x 8-12 reps, 75-90s rest
 * 3. Advanced + Muscle Gain -> High volume, targeted isolation and heavy compound splits, 4-5 sets
 * 4. Beginner + Fat Loss -> Metabolic full-body circuits, 3 sets x 12-15 reps, shorter 45s rest
 * 5. Intermediate + Fat Loss -> High-density supersets and compound circuits, 3-4 sets x 12-15 reps, 45s rest
 * 6. Strength -> Low reps (5-8), heavy compounds, longer rest (90-120s)
 * 7. Endurance / General -> Higher reps (12-18), dynamic core & balance, 45-60s rest
 */
export const generateRuleBasedPlan = (
  { fitnessGoal = 'muscle_gain', experienceLevel = 'intermediate', plannedDaysPerWeek = 5 },
  joinDayIndex = null
) => {
  const goal = (fitnessGoal || 'muscle_gain').toLowerCase();
  const level = (experienceLevel || 'intermediate').toLowerCase();
  const daysCount = Math.max(1, Math.min(7, Number(plannedDaysPerWeek) || 5));

  const planName = getPlanTitle(level, goal, daysCount);
  const days = [];

  // Helper to construct an exercise item with rules
  const buildItem = (base, sets, reps, restSeconds, customInstruction = null) => ({
    exerciseName: base.name,
    muscleGroup: base.muscleGroup,
    sets,
    reps: String(reps),
    restSeconds,
    instructions: customInstruction || base.instructions,
    imageUrl: base.imageUrl,
    isCompleted: false,
  });

  // RULE 1: MUSCLE GAIN
  if (goal === 'muscle_gain') {
    if (level === 'beginner') {
      // Beginner Muscle Gain Templates
      const templateDays = [
        {
          name: 'Full Body Intro A',
          focus: 'Chest, Quads, Back & Core',
          exercises: [
            buildItem(EXERCISES.BENCH_PRESS, 3, '8-10', 90, 'Focus on steady control down to mid-chest before pressing.'),
            buildItem(EXERCISES.GOBLET_SQUAT, 3, '10-12', 75, 'Stand tall, hold dumbbell securely at chest, squat to parallel.'),
            buildItem(EXERCISES.LAT_PULLDOWN, 3, '10-12', 60, 'Squeeze upper lats at collarbone level with upright torso.'),
            buildItem(EXERCISES.SHOULDER_PRESS, 3, '10-12', 60, 'Smooth overhead press without excessive lumbar arch.'),
            buildItem(EXERCISES.PLANK, 3, '45-60s', 45, 'Brace core firmly and breathe steadily.'),
          ],
        },
        {
          name: 'Full Body Intro B',
          focus: 'Hamstrings, Upper Back & Arms',
          exercises: [
            buildItem(EXERCISES.ROMANIAN_DEADLIFT, 3, '10', 90, 'Hinge at hips feeling hamstring tension, keep back straight.'),
            buildItem(EXERCISES.INCLINE_DUMBBELL_PRESS, 3, '10-12', 60, 'Press smoothly on 30-degree incline to target upper chest.'),
            buildItem(EXERCISES.SEATED_CABLE_ROW, 3, '10-12', 60, 'Pull handle into stomach while pinching shoulder blades.'),
            buildItem(EXERCISES.BICEP_CURL, 3, '12', 45, 'Strict curls without swinging momentum.'),
            buildItem(EXERCISES.TRICEP_PUSHDOWN, 3, '12', 45, 'Lock upper arms beside ribs, extend fully downward.'),
          ],
        },
        {
          name: 'Lower & Upper Hypertrophy',
          focus: 'Legs, Shoulders & Arms',
          exercises: [
            buildItem(EXERCISES.LEG_PRESS, 3, '10-12', 75, 'Smooth controlled depth, do not lock out knees abruptly.'),
            buildItem(EXERCISES.PUSH_UPS, 3, '12-15', 60, 'Full range of motion with chest touching close to floor.'),
            buildItem(EXERCISES.LATERAL_RAISE, 3, '12-15', 45, 'Controlled raise to shoulder level for deltoid width.'),
            buildItem(EXERCISES.HAMMER_CURL, 3, '12', 45, 'Neutral grip curls for forearm and bicep thickness.'),
            buildItem(EXERCISES.CALF_RAISE, 3, '15-20', 45, 'Pause 1 second at top stretch.'),
          ],
        },
        {
          name: 'Upper Body Hypertrophy',
          focus: 'Chest, Back & Shoulders',
          exercises: [
            buildItem(EXERCISES.BENCH_PRESS, 3, '10', 75, 'Moderate weight with continuous tension on pectoral fibers.'),
            buildItem(EXERCISES.ONE_ARM_ROW, 3, '10-12', 60, 'Keep chest parallel to floor, drive elbow back.'),
            buildItem(EXERCISES.SHOULDER_PRESS, 3, '10', 60, 'Press overhead with controlled tempo.'),
            buildItem(EXERCISES.DUMBBELL_FLY, 3, '12', 60, 'Feel chest opening wide, squeeze at top.'),
            buildItem(EXERCISES.KNEE_RAISES, 3, '12-15', 45, 'Lift knees to abdominal level under control.'),
          ],
        },
        {
          name: 'Lower Body & Core Foundations',
          focus: 'Quads, Hamstrings & Abs',
          exercises: [
            buildItem(EXERCISES.GOBLET_SQUAT, 3, '12', 75, 'Steady rhythm with deep hip descent.'),
            buildItem(EXERCISES.LUNGES, 3, '10 each leg', 60, 'Step smoothly forward with upright torso.'),
            buildItem(EXERCISES.ROMANIAN_DEADLIFT, 3, '10', 75, 'Keep barbell skimming close along thighs.'),
            buildItem(EXERCISES.TRICEP_PUSHDOWN, 3, '12-15', 45, 'Full extension with flared rope ends.'),
            buildItem(EXERCISES.PLANK, 3, '60s', 45, 'Total body tension hold.'),
          ],
        },
        {
          name: 'Functional Arms & Symmetry',
          focus: 'Delts, Biceps & Triceps',
          exercises: [
            buildItem(EXERCISES.LATERAL_RAISE, 3, '15', 45, 'Isolate medial deltoids with minimal body sway.'),
            buildItem(EXERCISES.BICEP_CURL, 3, '10-12', 45, 'Squeeze peak bicep contraction.'),
            buildItem(EXERCISES.TRICEP_PUSHDOWN, 3, '12-15', 45, 'Burnout triceps with strict form.'),
            buildItem(EXERCISES.HAMMER_CURL, 3, '12', 45, 'Control the negative eccentric descent.'),
            buildItem(EXERCISES.PUSH_UPS, 3, '15', 60, 'Steady bodyweight push-up repetitions.'),
          ],
        },
        {
          name: 'Active Mobility & Recovery',
          focus: 'Full Body Mobility & Core',
          exercises: [
            buildItem(EXERCISES.PLANK, 3, '60s', 45, 'Core activation hold.'),
            buildItem(EXERCISES.GOBLET_SQUAT, 2, '15', 60, 'Light tempo squat for joint mobility.'),
            buildItem(EXERCISES.PUSH_UPS, 2, '12', 60, 'Light chest and shoulder activation.'),
            buildItem(EXERCISES.CALF_RAISE, 2, '20', 30, 'Ankle mobility and calf circulation.'),
          ],
        },
      ];

      for (let i = 0; i < daysCount; i++) {
        const t = templateDays[i % templateDays.length];
        days.push({
          dayNumber: i + 1,
          dayName: `Day ${i + 1}: ${t.name}`,
          focus: t.focus,
          isCompleted: false,
          exercises: t.exercises,
        });
      }
    } else {
      // Intermediate / Advanced Muscle Gain (Push/Pull/Legs Split)
      const sets = level === 'advanced' ? 4 : 4;
      const templateDays = [
        {
          name: 'Chest, Shoulders & Triceps (Push A)',
          focus: 'Pectorals, Anterior Deltoids & Triceps',
          exercises: [
            buildItem(EXERCISES.BENCH_PRESS, sets, '8-10', 90, 'Heavier barbell press focusing on chest overload.'),
            buildItem(EXERCISES.INCLINE_DUMBBELL_PRESS, sets, '10-12', 75, 'Upper chest volume with full lockout.'),
            buildItem(EXERCISES.DUMBBELL_FLY, 3, '12-15', 60, 'Deep chest stretch at bottom of range.'),
            buildItem(EXERCISES.SHOULDER_PRESS, sets, '8-10', 75, 'Overhead pressing power.'),
            buildItem(EXERCISES.TRICEP_PUSHDOWN, sets, '12', 60, 'Lock out triceps with rope flare.'),
          ],
        },
        {
          name: 'Back & Biceps (Pull A)',
          focus: 'Lats, Rhomboids, Traps & Biceps',
          exercises: [
            buildItem(EXERCISES.BARBELL_ROW, sets, '8-10', 90, 'Heavy bent-over rowing with flat back.'),
            buildItem(EXERCISES.LAT_PULLDOWN, sets, '10-12', 75, 'Vertical pulling power focusing on wide lats.'),
            buildItem(EXERCISES.SEATED_CABLE_ROW, 3, '10-12', 60, 'Horizontal mid-back thickness.'),
            buildItem(EXERCISES.BICEP_CURL, sets, '10-12', 60, 'Strict barbell curls for bicep hypertrophy.'),
            buildItem(EXERCISES.HAMMER_CURL, 3, '12-15', 45, 'Brachialis and forearm development.'),
          ],
        },
        {
          name: 'Legs & Calves (Legs A)',
          focus: 'Quads, Glutes, Hamstrings & Calves',
          exercises: [
            buildItem(EXERCISES.SQUAT, sets, '8-10', 120, 'Heavy back squats driving through midfoot.'),
            buildItem(EXERCISES.ROMANIAN_DEADLIFT, sets, '8-10', 90, 'Hamstring loading with controlled hinge.'),
            buildItem(EXERCISES.LEG_PRESS, sets, '10-12', 90, 'Quad hypertrophy volume.'),
            buildItem(EXERCISES.CALF_RAISE, 4, '15-20', 45, 'Peak calf contraction.'),
            buildItem(EXERCISES.KNEE_RAISES, 3, '15', 60, 'Hanging abdominal flexion.'),
          ],
        },
        {
          name: 'Upper Body Hypertrophy (Push/Pull B)',
          focus: 'Chest, Upper Back & Shoulders',
          exercises: [
            buildItem(EXERCISES.INCLINE_DUMBBELL_PRESS, sets, '8-10', 75, 'Progressive overload on incline press.'),
            buildItem(EXERCISES.ONE_ARM_ROW, sets, '10-12', 60, 'Unilateral lat development.'),
            buildItem(EXERCISES.LATERAL_RAISE, 4, '12-15', 45, 'Medial deltoid cap definition.'),
            buildItem(EXERCISES.DIPS, 3, '10-12', 60, 'Compound tricep and chest dips.'),
            buildItem(EXERCISES.PLANK, 3, '60s', 45, 'Deep core stability.'),
          ],
        },
        {
          name: 'Lower Body & Posterior Chain (Legs B)',
          focus: 'Hamstrings, Glutes, Quads & Calves',
          exercises: [
            buildItem(EXERCISES.DEADLIFT, sets, '6-8', 120, 'Heavy conventional pulling from the floor.'),
            buildItem(EXERCISES.LUNGES, 3, '10 each leg', 75, 'Unilateral quad and glute strength.'),
            buildItem(EXERCISES.GOBLET_SQUAT, 3, '12', 60, 'Deep quad burning burnout sets.'),
            buildItem(EXERCISES.CALF_RAISE, 4, '15', 45, 'Heavy calf overload.'),
            buildItem(EXERCISES.KNEE_RAISES, 3, '15', 45, 'Hanging leg raises for lower abs.'),
          ],
        },
        {
          name: 'Shoulders & Arms Specialization',
          focus: 'Deltoids, Biceps & Triceps',
          exercises: [
            buildItem(EXERCISES.SHOULDER_PRESS, sets, '8-10', 75, 'Overhead dumbbell pressing.'),
            buildItem(EXERCISES.LATERAL_RAISE, 4, '15', 45, 'High volume lateral raises.'),
            buildItem(EXERCISES.BICEP_CURL, 4, '10', 45, 'Peak bicep contraction.'),
            buildItem(EXERCISES.TRICEP_PUSHDOWN, 4, '12', 45, 'Tricep cable extensions.'),
            buildItem(EXERCISES.HAMMER_CURL, 3, '12', 45, 'Hammer curls to complete arm workout.'),
          ],
        },
        {
          name: 'Active Mobility & Recovery',
          focus: 'Recovery, Joint Mobility & Core',
          exercises: [
            buildItem(EXERCISES.PLANK, 3, '60s', 45, 'Core bracing hold.'),
            buildItem(EXERCISES.PUSH_UPS, 2, '15', 60, 'Blood flow push-up repetitions.'),
            buildItem(EXERCISES.GOBLET_SQUAT, 2, '15', 60, 'Mobility squatting.'),
          ],
        },
      ];

      for (let i = 0; i < daysCount; i++) {
        const t = templateDays[i % templateDays.length];
        days.push({
          dayNumber: i + 1,
          dayName: `Day ${i + 1}: ${t.name}`,
          focus: t.focus,
          isCompleted: false,
          exercises: t.exercises,
        });
      }
    }
  }

  // RULE 2: FAT LOSS
  else if (goal === 'fat_loss') {
    const isBeginner = level === 'beginner';
    const rest = isBeginner ? 45 : 40;
    const reps = isBeginner ? '12-15' : '15';

    const fatLossDays = [
      {
        name: 'Full-Body Metabolic Circuit',
        focus: 'High-Density Calorie Burning & Resistance',
        exercises: [
          buildItem(EXERCISES.GOBLET_SQUAT, 3, reps, rest, 'Maintain fast pace and clean squat depth to elevate heart rate.'),
          buildItem(EXERCISES.PUSH_UPS, 3, reps, rest, 'Continuous tempo push-ups for chest and core activation.'),
          buildItem(EXERCISES.LAT_PULLDOWN, 3, reps, rest, 'Rapid yet controlled vertical lat pull.'),
          buildItem(EXERCISES.MOUNTAIN_CLIMBERS, 3, '30-40s', rest, 'Drive knees quickly to maximize aerobic calorie expenditure.'),
          buildItem(EXERCISES.PLANK, 3, '45s', rest, 'Core stabilization hold with controlled nasal breathing.'),
        ],
      },
      {
        name: 'Lower Body & Core Burn',
        focus: 'Quads, Glutes & Abdominal Conditioning',
        exercises: [
          buildItem(EXERCISES.LUNGES, 3, '12 each leg', rest, 'Dynamic walking lunges with steady upright torso.'),
          buildItem(EXERCISES.ROMANIAN_DEADLIFT, 3, reps, rest, 'Moderate weight with deep hamstring activation.'),
          buildItem(EXERCISES.LEG_PRESS, 3, '15', rest, 'Pump repetitions without full knee lock.'),
          buildItem(EXERCISES.KNEE_RAISES, 3, reps, rest, 'Controlled knee tucks targeting lower abs.'),
          buildItem(EXERCISES.CALF_RAISE, 3, '20', rest, 'High-cadence calf raises.'),
        ],
      },
      {
        name: 'Upper Body & Conditioning',
        focus: 'Chest, Back & Shoulder Endurance',
        exercises: [
          buildItem(EXERCISES.INCLINE_DUMBBELL_PRESS, 3, reps, rest, 'Incline pressing keeping chest pumped.'),
          buildItem(EXERCISES.SEATED_CABLE_ROW, 3, reps, rest, 'Continuous pulling cadence for upper back.'),
          buildItem(EXERCISES.SHOULDER_PRESS, 3, reps, rest, 'Overhead pressing with light to moderate load.'),
          buildItem(EXERCISES.TRICEP_PUSHDOWN, 3, '15', rest, 'Short rest triceps burnout.'),
          buildItem(EXERCISES.MOUNTAIN_CLIMBERS, 3, '40s', rest, 'Explosive core drive.'),
        ],
      },
      {
        name: 'Metabolic Torso & Stamina',
        focus: 'Full Body Endurance & Core Density',
        exercises: [
          buildItem(EXERCISES.PUSH_UPS, 3, reps, rest, 'Rhythmic bodyweight pushing sets.'),
          buildItem(EXERCISES.ONE_ARM_ROW, 3, reps, rest, 'Unilateral rowing to challenge balance and core.'),
          buildItem(EXERCISES.LATERAL_RAISE, 3, '15-20', rest, 'Shoulder burnout sets with short rest.'),
          buildItem(EXERCISES.BICEP_CURL, 3, '15', rest, 'Continuous arm contraction.'),
          buildItem(EXERCISES.PLANK, 3, '60s', rest, 'Isometric abdominal wall brace.'),
        ],
      },
      {
        name: 'Lower Body Calorie Shifter',
        focus: 'Hips, Hamstrings & Functional Burn',
        exercises: [
          buildItem(EXERCISES.GOBLET_SQUAT, 4, reps, rest, 'Speed squats with solid bottom turnaround.'),
          buildItem(EXERCISES.LUNGES, 3, '12 each leg', rest, 'Unilateral glute and hamstring burn.'),
          buildItem(EXERCISES.DEADLIFT, 3, '10-12', 60, 'Moderate weight deadlift for high metabolic demand.'),
          buildItem(EXERCISES.MOUNTAIN_CLIMBERS, 3, '45s', rest, 'High intensity knee drives.'),
          buildItem(EXERCISES.KNEE_RAISES, 3, reps, rest, 'Abdominal flexion finisher.'),
        ],
      },
      {
        name: 'Total Athletic Conditioning',
        focus: 'Full Body Circuit & Stamina',
        exercises: [
          buildItem(EXERCISES.PUSH_UPS, 3, reps, rest, 'Full chest pump.'),
          buildItem(EXERCISES.LAT_PULLDOWN, 3, reps, rest, 'Lat pulldowns with steady cadence.'),
          buildItem(EXERCISES.LUNGES, 3, '10 each leg', rest, 'Leg burnout.'),
          buildItem(EXERCISES.LATERAL_RAISE, 3, '15', rest, 'Deltoid definition.'),
          buildItem(EXERCISES.PLANK, 3, '60s', rest, 'Final core stabilization.'),
        ],
      },
      {
        name: 'Active Mobility & Stretch',
        focus: 'Mobility, Flexibility & Light Recovery',
        exercises: [
          buildItem(EXERCISES.PLANK, 3, '45s', 45, 'Gentle core activation.'),
          buildItem(EXERCISES.GOBLET_SQUAT, 2, '15', 45, 'Bodyweight hip opener squats.'),
          buildItem(EXERCISES.PUSH_UPS, 2, '10', 45, 'Light movement.'),
        ],
      },
    ];

    for (let i = 0; i < daysCount; i++) {
      const t = fatLossDays[i % fatLossDays.length];
      days.push({
        dayNumber: i + 1,
        dayName: `Day ${i + 1}: ${t.name}`,
        focus: t.focus,
        isCompleted: false,
        exercises: t.exercises,
      });
    }
  }

  // RULE 3: STRENGTH
  else if (goal === 'strength') {
    const strengthDays = [
      {
        name: 'Bench Press & Upper Strength',
        focus: 'Pectorals, Anterior Deltoids & Triceps Overload',
        exercises: [
          buildItem(EXERCISES.BENCH_PRESS, 4, '5-6', 120, 'Heavy barbell press with pause at chest and powerful drive.'),
          buildItem(EXERCISES.INCLINE_DUMBBELL_PRESS, 3, '6-8', 90, 'Incline pressing for supplementary upper chest strength.'),
          buildItem(EXERCISES.BARBELL_ROW, 4, '6-8', 90, 'Heavy back rowing to support pressing stability.'),
          buildItem(EXERCISES.DIPS, 3, '8', 90, 'Bodyweight or weighted triceps dips.'),
          buildItem(EXERCISES.PLANK, 3, '60s', 60, 'Heavy intra-abdominal pressure bracing.'),
        ],
      },
      {
        name: 'Squat & Lower Body Power',
        focus: 'Quadriceps, Glutes & Core Stability',
        exercises: [
          buildItem(EXERCISES.SQUAT, 4, '5-6', 150, 'Low-rep heavy squats with deep hip drive.'),
          buildItem(EXERCISES.ROMANIAN_DEADLIFT, 3, '6-8', 90, 'Supplementary hamstring strength.'),
          buildItem(EXERCISES.LEG_PRESS, 3, '8-10', 90, 'Quad hypertrophy assistance.'),
          buildItem(EXERCISES.CALF_RAISE, 3, '12', 60, 'Calf foundation stability.'),
          buildItem(EXERCISES.KNEE_RAISES, 3, '12', 60, 'Hanging core brace.'),
        ],
      },
      {
        name: 'Deadlift & Posterior Chain',
        focus: 'Lats, Glutes, Hamstrings & Spinal Erectors',
        exercises: [
          buildItem(EXERCISES.DEADLIFT, 4, '5', 180, 'Heavy conventional pulling with maximum lat lock.'),
          buildItem(EXERCISES.LAT_PULLDOWN, 3, '8', 75, 'Vertical pulling strength.'),
          buildItem(EXERCISES.SHOULDER_PRESS, 4, '6-8', 90, 'Overhead pressing power.'),
          buildItem(EXERCISES.BICEP_CURL, 3, '8-10', 60, 'Arm flexor strength.'),
          buildItem(EXERCISES.PLANK, 3, '60s', 60, 'Rigid torso brace.'),
        ],
      },
      {
        name: 'Overhead Press & Upper Body Power',
        focus: 'Shoulders, Upper Chest & Triceps',
        exercises: [
          buildItem(EXERCISES.SHOULDER_PRESS, 4, '5-6', 120, 'Heavy vertical pressing.'),
          buildItem(EXERCISES.BENCH_PRESS, 3, '6-8', 90, 'Supplementary bench press sets.'),
          buildItem(EXERCISES.SEATED_CABLE_ROW, 3, '8', 75, 'Back foundation.'),
          buildItem(EXERCISES.LATERAL_RAISE, 3, '10-12', 45, 'Shoulder joint health.'),
          buildItem(EXERCISES.TRICEP_PUSHDOWN, 3, '8-10', 60, 'Tricep lockout strength.'),
        ],
      },
      {
        name: 'Squat & Pull Assistance',
        focus: 'Legs, Lats & Functional Core',
        exercises: [
          buildItem(EXERCISES.SQUAT, 3, '6-8', 120, 'Volume squatting.'),
          buildItem(EXERCISES.BARBELL_ROW, 4, '6-8', 90, 'Heavy rowing.'),
          buildItem(EXERCISES.LUNGES, 3, '8 each leg', 75, 'Single leg stability.'),
          buildItem(EXERCISES.CALF_RAISE, 3, '12', 45, 'Calf power.'),
          buildItem(EXERCISES.KNEE_RAISES, 3, '12', 60, 'Core flexion.'),
        ],
      },
      {
        name: 'Posterior Strength & Accessory',
        focus: 'Hamstrings, Upper Back & Arms',
        exercises: [
          buildItem(EXERCISES.ROMANIAN_DEADLIFT, 3, '6-8', 90, 'Posterior chain loading.'),
          buildItem(EXERCISES.LAT_PULLDOWN, 3, '8', 75, 'Vertical pulling.'),
          buildItem(EXERCISES.BICEP_CURL, 3, '8', 60, 'Bicep power.'),
          buildItem(EXERCISES.TRICEP_PUSHDOWN, 3, '8', 60, 'Tricep extension.'),
        ],
      },
      {
        name: 'Active Mobility & Deload',
        focus: 'Mobility & Recovery',
        exercises: [
          buildItem(EXERCISES.GOBLET_SQUAT, 2, '10', 60, 'Mobility movement.'),
          buildItem(EXERCISES.PUSH_UPS, 2, '10', 60, 'Shoulder activation.'),
          buildItem(EXERCISES.PLANK, 2, '45s', 45, 'Core activation.'),
        ],
      },
    ];

    for (let i = 0; i < daysCount; i++) {
      const t = strengthDays[i % strengthDays.length];
      days.push({
        dayNumber: i + 1,
        dayName: `Day ${i + 1}: ${t.name}`,
        focus: t.focus,
        isCompleted: false,
        exercises: t.exercises,
      });
    }
  }

  // RULE 4: GENERAL FITNESS & ENDURANCE (Default Fallback)
  else {
    const generalDays = [
      {
        name: 'Full Body Conditioning A',
        focus: 'Muscular Stamina & Aerobic Capacity',
        exercises: [
          buildItem(EXERCISES.GOBLET_SQUAT, 3, '12-15', 60, 'Controlled tempo with continuous muscular tension.'),
          buildItem(EXERCISES.PUSH_UPS, 3, '12-15', 60, 'Paced push-ups focusing on chest and core control.'),
          buildItem(EXERCISES.LAT_PULLDOWN, 3, '12-15', 60, 'Vertical pulling for postural alignment.'),
          buildItem(EXERCISES.SHOULDER_PRESS, 3, '12-15', 60, 'Controlled overhead dumbbell movement.'),
          buildItem(EXERCISES.PLANK, 3, '60s', 45, 'Total body endurance plank.'),
        ],
      },
      {
        name: 'Lower Body & Core Stamina',
        focus: 'Legs, Glutes & Abdominals',
        exercises: [
          buildItem(EXERCISES.LUNGES, 3, '12 each leg', 60, 'Continuous walking lunges.'),
          buildItem(EXERCISES.ROMANIAN_DEADLIFT, 3, '12', 60, 'Hamstring flexibility and strength.'),
          buildItem(EXERCISES.LEG_PRESS, 3, '15', 60, 'Paced leg press sets.'),
          buildItem(EXERCISES.CALF_RAISE, 3, '20', 45, 'Calf stamina.'),
          buildItem(EXERCISES.KNEE_RAISES, 3, '15', 45, 'Core flexion endurance.'),
        ],
      },
      {
        name: 'Upper Body Muscular Endurance',
        focus: 'Chest, Back & Arms',
        exercises: [
          buildItem(EXERCISES.INCLINE_DUMBBELL_PRESS, 3, '12-15', 60, 'Upper chest volume.'),
          buildItem(EXERCISES.SEATED_CABLE_ROW, 3, '12-15', 60, 'Mid back endurance.'),
          buildItem(EXERCISES.LATERAL_RAISE, 3, '15', 45, 'Deltoid stamina.'),
          buildItem(EXERCISES.BICEP_CURL, 3, '15', 45, 'Continuous arm conditioning.'),
          buildItem(EXERCISES.TRICEP_PUSHDOWN, 3, '15', 45, 'Tricep cable fatigue resistance.'),
        ],
      },
      {
        name: 'Dynamic Functional Movement',
        focus: 'Coordination, Core & Conditioning',
        exercises: [
          buildItem(EXERCISES.GOBLET_SQUAT, 3, '15', 60, 'Deep mobility squats.'),
          buildItem(EXERCISES.PUSH_UPS, 3, '15', 60, 'Upper body strength endurance.'),
          buildItem(EXERCISES.ONE_ARM_ROW, 3, '12-15', 60, 'Unilateral pulling.'),
          buildItem(EXERCISES.MOUNTAIN_CLIMBERS, 3, '30s', 45, 'Dynamic core drive.'),
          buildItem(EXERCISES.PLANK, 3, '45s', 45, 'Stability hold.'),
        ],
      },
      {
        name: 'Athletic Full-Body Stamina',
        focus: 'Stamina, Hamstrings & Chest',
        exercises: [
          buildItem(EXERCISES.ROMANIAN_DEADLIFT, 3, '12', 60, 'Hamstring endurance.'),
          buildItem(EXERCISES.BENCH_PRESS, 3, '12', 60, 'Smooth pressing tempo.'),
          buildItem(EXERCISES.LAT_PULLDOWN, 3, '12', 60, 'Back endurance.'),
          buildItem(EXERCISES.LUNGES, 3, '10 each leg', 60, 'Leg conditioning.'),
          buildItem(EXERCISES.KNEE_RAISES, 3, '15', 45, 'Abdominal control.'),
        ],
      },
      {
        name: 'Total Body Mobility Circuit',
        focus: 'Mobility & Heart Rate Elevation',
        exercises: [
          buildItem(EXERCISES.GOBLET_SQUAT, 3, '15', 45, 'Mobility squat.'),
          buildItem(EXERCISES.PUSH_UPS, 3, '12', 45, 'Light push-up cadence.'),
          buildItem(EXERCISES.LATERAL_RAISE, 3, '15', 45, 'Shoulder circulation.'),
          buildItem(EXERCISES.PLANK, 3, '60s', 45, 'Endurance hold.'),
        ],
      },
      {
        name: 'Active Recovery & Stretching',
        focus: 'Recovery & Balance',
        exercises: [
          buildItem(EXERCISES.PLANK, 2, '45s', 45, 'Core activation.'),
          buildItem(EXERCISES.CALF_RAISE, 2, '15', 30, 'Circulation.'),
          buildItem(EXERCISES.GOBLET_SQUAT, 2, '10', 45, 'Joint mobility.'),
        ],
      },
    ];

    for (let i = 0; i < daysCount; i++) {
      const t = generalDays[i % generalDays.length];
      days.push({
        dayNumber: i + 1,
        dayName: `Day ${i + 1}: ${t.name}`,
        focus: t.focus,
        isCompleted: false,
        exercises: t.exercises,
      });
    }
  }

  return {
    name: planName,
    goal,
    experienceLevel: level,
    daysPerWeek: daysCount,
    isActive: true,
    days,
    weekSchedule: buildWeeklySchedule(daysCount, days, joinDayIndex),
  };
};

/**
 * Authoritative exercise image resolution helper based on standard FitPulse exercise dictionary
 * @param {string} exerciseName
 * @returns {string} Relative asset URL e.g. '/exercises/bench-press.svg'
 */
export const getExerciseImageUrl = (exerciseName) => {
  if (!exerciseName) return '';
  const clean = String(exerciseName).toLowerCase().trim();

  for (const key of Object.keys(EXERCISES)) {
    const item = EXERCISES[key];
    if (item.name.toLowerCase() === clean) {
      return item.imageUrl;
    }
  }

  // Keyword / Substring mapping for variations
  if (clean.includes('bench') || clean.includes('fly')) return '/exercises/bench-press.svg';
  if (clean.includes('incline')) return '/exercises/incline-press.svg';
  if (clean.includes('push-up') || clean.includes('pushup')) return '/exercises/pushup.svg';
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
};

