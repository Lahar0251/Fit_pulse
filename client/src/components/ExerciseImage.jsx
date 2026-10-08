import React, { useState } from 'react';
import { getExerciseImageUrl } from '../utils/exerciseImages';

/**
 * Reusable authoritative exercise image component with graceful fallback.
 * Guarantees identical image across Recommended, Custom, Trainer, Library, and Attendance.
 */
function ExerciseImage({
  exercise,
  name,
  imageUrl,
  alt,
  className = 'w-16 h-16 sm:w-20 sm:h-20 shrink-0 object-contain rounded border border-gray-200 bg-slate-50 p-1',
  fallbackClassName = 'w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded border border-gray-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-bold select-none',
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const displayName = name || exercise?.exerciseName || exercise?.name || 'Exercise';
  const resolvedUrl = imageUrl || (exercise && getExerciseImageUrl(exercise)) || getExerciseImageUrl(displayName);

  if (!resolvedUrl || imgFailed) {
    return (
      <div className={fallbackClassName} aria-label={`${displayName} (no image)`}>
        GYM
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt || displayName}
      className={className}
      onError={() => setImgFailed(true)}
      loading="lazy"
    />
  );
}

export default ExerciseImage;
