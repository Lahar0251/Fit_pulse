import React, { useState, useMemo } from 'react';
import ExerciseImage from './ExerciseImage';

const EXERCISE_CATALOG = [
  // Chest
  {
    id: 1,
    name: 'Barbell Flat Bench Press',
    target: 'Chest (Mid / Lower)',
    muscleGroup: 'Chest',
    equipment: 'Barbell',
    setsReps: '4 sets × 8-10 reps',
    rest: '90s',
    instructions: 'Lower bar with control to mid-chest. Press upward firmly while keeping shoulder blades retracted.',
  },
  {
    id: 2,
    name: 'Incline Dumbbell Chest Press',
    target: 'Upper Chest',
    muscleGroup: 'Chest',
    equipment: 'Dumbbells',
    setsReps: '3 sets × 10-12 reps',
    rest: '60s',
    instructions: 'Set bench to 30 degrees. Press dumbbells overhead smoothly without clanking them together at top.',
  },
  {
    id: 3,
    name: 'Standard Push-Ups',
    target: 'Chest & Core',
    muscleGroup: 'Chest',
    equipment: 'Bodyweight',
    setsReps: '3 sets × 12-15 reps',
    rest: '60s',
    instructions: 'Maintain a rigid straight plank line. Lower chest to floor and push up with controlled tempo.',
  },
  {
    id: 4,
    name: 'Dumbbell Chest Flyes',
    target: 'Chest',
    muscleGroup: 'Chest',
    equipment: 'Dumbbells',
    setsReps: '3 sets × 12 reps',
    rest: '60s',
    instructions: 'Open arms wide with slight elbow bend feeling a deep chest stretch, then bring weights together.',
  },

  // Back
  {
    id: 5,
    name: 'Wide-Grip Lat Pulldown',
    target: 'Back (Lats)',
    muscleGroup: 'Back',
    equipment: 'Cable Machine',
    setsReps: '4 sets × 10-12 reps',
    rest: '60s',
    instructions: 'Pull bar down toward upper collarbone. Drive elbows downward and squeeze lats at the bottom.',
  },
  {
    id: 6,
    name: 'Bent-Over Barbell Row',
    target: 'Upper Back',
    muscleGroup: 'Back',
    equipment: 'Barbell',
    setsReps: '4 sets × 8-10 reps',
    rest: '90s',
    instructions: 'Hinge forward at 45 degrees with flat spine. Pull barbell towards lower ribcage with control.',
  },
  {
    id: 7,
    name: 'Seated Cable Row',
    target: 'Mid Back',
    muscleGroup: 'Back',
    equipment: 'Cable Machine',
    setsReps: '3 sets × 10-12 reps',
    rest: '60s',
    instructions: 'Sit tall with chest proud. Pull handle into lower abdomen while keeping shoulders depressed.',
  },
  {
    id: 8,
    name: 'Single-Arm Dumbbell Row',
    target: 'Lats & Rhomboids',
    muscleGroup: 'Back',
    equipment: 'Dumbbells',
    setsReps: '3 sets × 10-12 reps',
    rest: '60s',
    instructions: 'Place knee and hand on flat bench. Pull dumbbell to hip crease with a tight elbow path.',
  },

  // Legs & Glutes
  {
    id: 9,
    name: 'Barbell Back Squats',
    target: 'Quads & Glutes',
    muscleGroup: 'Legs',
    equipment: 'Barbell',
    setsReps: '4 sets × 8-10 reps',
    rest: '120s',
    instructions: 'Keep chest high and brace abdominal wall. Squat until thighs reach parallel and drive through midfoot.',
  },
  {
    id: 10,
    name: 'Romanian Deadlifts (RDL)',
    target: 'Hamstrings & Glutes',
    muscleGroup: 'Legs',
    equipment: 'Barbell',
    setsReps: '4 sets × 8-10 reps',
    rest: '90s',
    instructions: 'Hinge hips backwards with slight knee bend until hamstrings stretch. Drive hips forward to finish.',
  },
  {
    id: 11,
    name: 'Conventional Barbell Deadlift',
    target: 'Posterior Chain',
    muscleGroup: 'Legs',
    equipment: 'Barbell',
    setsReps: '4 sets × 5 reps',
    rest: '120s',
    instructions: 'Keep bar close to shins, brace core tightly, and drive through floor to full standing lockout.',
  },
  {
    id: 12,
    name: 'Leg Press Machine',
    target: 'Quads & Hamstrings',
    muscleGroup: 'Legs',
    equipment: 'Machine',
    setsReps: '3 sets × 12 reps',
    rest: '75s',
    instructions: 'Feet shoulder-width apart on platform. Lower carriage with control, avoiding locking out knees.',
  },
  {
    id: 13,
    name: 'Dumbbell Goblet Squats',
    target: 'Quads & Glutes',
    muscleGroup: 'Legs',
    equipment: 'Dumbbells',
    setsReps: '3 sets × 12 reps',
    rest: '60s',
    instructions: 'Hold single dumbbell at chest height. Keep torso upright and sink deep into hips.',
  },
  {
    id: 14,
    name: 'Walking Dumbbell Lunges',
    target: 'Quads & Glutes',
    muscleGroup: 'Legs',
    equipment: 'Dumbbells',
    setsReps: '3 sets × 12 reps/leg',
    rest: '60s',
    instructions: 'Step forward landing heel first. Lower trailing knee towards ground and drive forward smoothly.',
  },
  {
    id: 15,
    name: 'Standing Calf Raises',
    target: 'Calves',
    muscleGroup: 'Legs',
    equipment: 'Machine',
    setsReps: '4 sets × 15-20 reps',
    rest: '45s',
    instructions: 'Rise high onto balls of feet, hold peak contraction for 1 second, and lower fully.',
  },

  // Shoulders
  {
    id: 16,
    name: 'Overhead Dumbbell Shoulder Press',
    target: 'Deltoids',
    muscleGroup: 'Shoulders',
    equipment: 'Dumbbells',
    setsReps: '4 sets × 8-10 reps',
    rest: '60s',
    instructions: 'Press dumbbells vertically upward from shoulder height without overarching lower back.',
  },
  {
    id: 17,
    name: 'Dumbbell Lateral Raises',
    target: 'Side Deltoids',
    muscleGroup: 'Shoulders',
    equipment: 'Dumbbells',
    setsReps: '4 sets × 12-15 reps',
    rest: '45s',
    instructions: 'Raise dumbbells outwards to shoulder height with elbows slightly bent and pinkies tilted upward.',
  },
  {
    id: 18,
    name: 'Barbell Overhead Military Press',
    target: 'Front Deltoids',
    muscleGroup: 'Shoulders',
    equipment: 'Barbell',
    setsReps: '3 sets × 8-10 reps',
    rest: '90s',
    instructions: 'Press bar overhead with tight glutes and braced core, locking out directly over mid-foot.',
  },

  // Arms
  {
    id: 19,
    name: 'Standing Barbell Bicep Curls',
    target: 'Biceps',
    muscleGroup: 'Arms',
    equipment: 'Barbell',
    setsReps: '3 sets × 10-12 reps',
    rest: '45s',
    instructions: 'Keep elbows pinned to torso. Curl bar upwards smoothly and squeeze biceps at peak contraction.',
  },
  {
    id: 20,
    name: 'Dumbbell Hammer Curls',
    target: 'Biceps & Forearms',
    muscleGroup: 'Arms',
    equipment: 'Dumbbells',
    setsReps: '3 sets × 12 reps',
    rest: '45s',
    instructions: 'Hold dumbbells with neutral palms-in grip. Curl simultaneously with strict upright posture.',
  },
  {
    id: 21,
    name: 'Cable Triceps Rope Pushdown',
    target: 'Triceps',
    muscleGroup: 'Arms',
    equipment: 'Cable Machine',
    setsReps: '3 sets × 12 reps',
    rest: '45s',
    instructions: 'Lock upper arms beside torso. Push rope down and flare ends apart at full extension.',
  },
  {
    id: 22,
    name: 'Parallel Bar Tricep Dips',
    target: 'Triceps & Chest',
    muscleGroup: 'Arms',
    equipment: 'Bodyweight',
    setsReps: '3 sets × 10-12 reps',
    rest: '60s',
    instructions: 'Lower body until elbows reach 90 degrees. Push through palms to return to top lockout.',
  },

  // Core & Conditioning
  {
    id: 23,
    name: 'Isometric Core Plank',
    target: 'Abdominals & Core',
    muscleGroup: 'Core',
    equipment: 'Bodyweight',
    setsReps: '3 sets × 45-60s',
    rest: '45s',
    instructions: 'Brace abdominals firmly, keep glutes squeezed, and maintain a straight line from head to heels.',
  },
  {
    id: 24,
    name: 'Hanging Knee Raises',
    target: 'Lower Abdominals',
    muscleGroup: 'Core',
    equipment: 'Bodyweight',
    setsReps: '3 sets × 15 reps',
    rest: '45s',
    instructions: 'Hang from pull-up bar without swinging. Flex hips and curl knees up to chest level.',
  },
  {
    id: 25,
    name: 'Dynamic Mountain Climbers',
    target: 'Core & Conditioning',
    muscleGroup: 'Core',
    equipment: 'Bodyweight',
    setsReps: '3 sets × 30s',
    rest: '45s',
    instructions: 'From high plank position, drive knees alternately forward in a fast, rhythmic cadence.',
  },
];

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
const EQUIPMENT_OPTIONS = ['All', 'Barbell', 'Dumbbells', 'Cable Machine', 'Bodyweight', 'Machine'];

function ExerciseLibraryPage({ currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState('All');

  // Filtered exercises based on search query, muscle group, and equipment
  const filteredExercises = useMemo(() => {
    return EXERCISE_CATALOG.filter((item) => {
      // Search matching name, target, equipment, or instructions
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        item.name.toLowerCase().includes(q) ||
        item.target.toLowerCase().includes(q) ||
        item.equipment.toLowerCase().includes(q) ||
        item.muscleGroup.toLowerCase().includes(q) ||
        item.instructions.toLowerCase().includes(q);

      // Muscle group filter
      const matchesMuscle =
        selectedMuscle === 'All' ||
        item.muscleGroup.toLowerCase() === selectedMuscle.toLowerCase() ||
        item.target.toLowerCase().includes(selectedMuscle.toLowerCase());

      // Equipment filter
      const matchesEquipment =
        selectedEquipment === 'All' ||
        item.equipment.toLowerCase().includes(selectedEquipment.toLowerCase());

      return matchesSearch && matchesMuscle && matchesEquipment;
    });
  }, [searchQuery, selectedMuscle, selectedEquipment]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedMuscle !== 'All' || selectedEquipment !== 'All';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedMuscle('All');
    setSelectedEquipment('All');
  };

  const isTrainer = currentUser?.role === 'trainer';

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            {isTrainer && (
              <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded inline-block mb-2">
                Trainer Exercise Reference
              </span>
            )}
            <h1 className="text-2xl font-bold text-slate-900">Exercise Library</h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Explore gym movements, target muscle groups, required equipment, and standard prescribed ranges.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
            Showing {filteredExercises.length} of {EXERCISE_CATALOG.length} Exercises
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
        {/* Search Input & Equipment Dropdown */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search box */}
          <div className="flex-1 relative">
            <input
              id="exercise-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises by name, muscle, or equipment..."
              className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                aria-label="Clear search query"
              >
                &times;
              </button>
            )}
          </div>

          {/* Equipment Dropdown */}
          <div className="sm:w-56 flex items-center gap-2">
            <label htmlFor="equipment-filter-select" className="text-xs font-semibold text-slate-600 shrink-0">
              Equipment:
            </label>
            <select
              id="equipment-filter-select"
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
            >
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>
                  {eq === 'All' ? 'All Equipment' : eq}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-gray-300 rounded-md transition-colors cursor-pointer shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Target Muscle Group Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs font-semibold text-slate-500 mr-1">Target Muscle:</span>
          {MUSCLE_GROUPS.map((mg) => {
            const isSelected = selectedMuscle === mg;
            return (
              <button
                key={mg}
                type="button"
                onClick={() => setSelectedMuscle(mg)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-white text-slate-700 border-gray-200 hover:bg-slate-50'
                }`}
              >
                {mg}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exercise Results Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {filteredExercises.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">No exercises found matching your search.</p>
            <p className="text-xs text-slate-500">
              Try adjusting your search terms or clearing muscle group/equipment filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Exercise Name</th>
                  <th className="py-3 px-4">Target Muscle</th>
                  <th className="py-3 px-4">Equipment</th>
                  <th className="py-3 px-4">Standard Prescribed Range</th>
                  <th className="py-3 px-4">Form Guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExercises.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center space-x-3">
                        <ExerciseImage
                          exercise={item}
                          name={item.name}
                          className="w-10 h-10 rounded border border-gray-200 bg-white p-1 object-contain shrink-0"
                        />
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {item.target}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-600">
                      {item.equipment}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-mono text-xs">
                      {item.setsReps}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs leading-relaxed">
                      {item.instructions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

export default ExerciseLibraryPage;
