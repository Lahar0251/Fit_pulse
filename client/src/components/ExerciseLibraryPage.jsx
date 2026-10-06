import React, { useState, useEffect } from 'react';

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced'];

function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  // Selected exercise for detail modal
  const [selectedExercise, setSelectedExercise] = useState(null);

  const fetchExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedMuscle !== 'All') params.append('muscleGroup', selectedMuscle);
      if (selectedDifficulty !== 'All') params.append('difficulty', selectedDifficulty);

      const token = localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/exercises?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to load exercises');
      }

      if (result.status === 'success' && Array.isArray(result.data)) {
        setExercises(result.data);
      }
    } catch (err) {
      console.error('Error loading exercises from MongoDB:', err);
      setError(err.message || 'Unable to load exercises from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search slightly for pleasant typing
    const timer = setTimeout(() => {
      fetchExercises();
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedMuscle, selectedDifficulty]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedMuscle('All');
    setSelectedDifficulty('All');
  };

  const getDifficultyBadgeClass = (diff) => {
    switch (diff) {
      case 'Beginner':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Intermediate':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Advanced':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded inline-block mb-2">
          Knowledge Base
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Exercise Library</h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Explore gym movements, target muscle groups, required equipment, and standard execution cues from the database.
        </p>
      </div>

      {/* Search and Filters Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Simple Search Input */}
          <div className="sm:col-span-1">
            <label htmlFor="search-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Search Exercises
            </label>
            <div className="relative">
              <input
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, muscle, equipment..."
                className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Muscle Group Filter */}
          <div>
            <label htmlFor="muscle-select" className="block text-xs font-semibold text-slate-700 mb-1">
              Filter by Muscle Group
            </label>
            <select
              id="muscle-select"
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
            >
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>
                  {m === 'All' ? 'All Muscle Groups' : m}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label htmlFor="difficulty-select" className="block text-xs font-semibold text-slate-700 mb-1">
              Filter by Difficulty
            </label>
            <select
              id="difficulty-select"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Difficulties' : d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Indicators & Reset Action */}
        {(searchTerm || selectedMuscle !== 'All' || selectedDifficulty !== 'All') && (
          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-100 text-xs text-slate-600 gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-700">Active Filters:</span>
              {searchTerm && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                  Query: "{searchTerm}"
                </span>
              )}
              {selectedMuscle !== 'All' && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                  Muscle: {selectedMuscle}
                </span>
              )}
              {selectedDifficulty !== 'All' && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                  Difficulty: {selectedDifficulty}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900 font-semibold">{exercises.length}</strong> exercise{exercises.length === 1 ? '' : 's'} from database
        </span>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium text-slate-600">Loading exercises from MongoDB...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center max-w-lg mx-auto shadow-sm">
          <p className="text-sm font-semibold text-red-600 mb-1">Failed to load exercise library</p>
          <p className="text-xs text-slate-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchExercises}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty Search Result State */}
      {!loading && !error && exercises.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-900">No Exercises Found</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            No movements matched your search for <strong>"{searchTerm}"</strong> or selected filters. Try broadening your criteria or reset the filters.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Clear Filters & View All
          </button>
        </div>
      )}

      {/* Exercises Grid */}
      {!loading && !error && exercises.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exercises.map((exercise) => (
            <div
              key={exercise._id}
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start space-x-4">
                {/* Exercise Image */}
                {exercise.imageUrl ? (
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 object-contain rounded border border-gray-200 bg-slate-50 p-1"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded border border-gray-200 bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
                    GYM
                  </div>
                )}

                {/* Exercise Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {exercise.name}
                  </h3>

                  {/* Muscle, Difficulty & Equipment Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {exercise.muscleGroup}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${getDifficultyBadgeClass(
                        exercise.difficulty
                      )}`}
                    >
                      {exercise.difficulty}
                    </span>
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-slate-50 text-slate-600 border border-gray-200">
                      {exercise.equipment}
                    </span>
                  </div>

                  {/* Short Instructions */}
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {exercise.instructions}
                  </p>
                </div>
              </div>

              {/* View Details Action Button */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Target: <strong className="text-slate-600">{exercise.muscleGroup}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedExercise(exercise)}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exercise Detail Display Modal */}
      {selectedExercise && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedExercise(null)}
        >
          <div
            className="bg-white border border-gray-200 rounded-lg max-w-lg w-full p-6 shadow-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Exercise Details
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedExercise.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExercise(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 cursor-pointer leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Image & Specs */}
            <div className="flex items-center space-x-4 p-3 bg-slate-50 border border-gray-200 rounded-lg">
              {selectedExercise.imageUrl && (
                <img
                  src={selectedExercise.imageUrl}
                  alt={selectedExercise.name}
                  className="w-20 h-20 object-contain rounded border border-gray-200 bg-white p-1 shrink-0"
                />
              )}
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Muscle Group: </span>
                  <span className="font-bold text-slate-900">{selectedExercise.muscleGroup}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Difficulty Level: </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded border inline-block ${getDifficultyBadgeClass(
                      selectedExercise.difficulty
                    )}`}
                  >
                    {selectedExercise.difficulty}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Equipment Needed: </span>
                  <span className="font-bold text-slate-900">{selectedExercise.equipment}</span>
                </div>
              </div>
            </div>

            {/* Full Form Instructions */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Execution Instructions
              </h3>
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-md text-xs sm:text-sm text-slate-700 leading-relaxed">
                {selectedExercise.instructions}
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedExercise(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ExerciseLibraryPage;
