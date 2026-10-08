import React, { useState, useEffect } from 'react';
import NoticeBanner from './NoticeBanner';

function ConsistencyReportPage({ isPreview, onNavigate }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch consistency report from backend
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/consistency', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (res.ok && result.status === 'success' && result.data) {
        setReport(result.data);
      } else {
        setError(result.message || 'Failed to load consistency data.');
      }
    } catch (err) {
      console.error('Fetch consistency error:', err);
      setError('Unable to load consistency report. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const consistencyRate = report?.consistencyPercentage ?? 0;
  const badgeStyle =
    consistencyRate >= 80
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : consistencyRate >= 60
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : consistencyRate >= 40
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-50 text-slate-700 border-gray-200';

  const badgeText =
    consistencyRate >= 80
      ? 'Excellent'
      : consistencyRate >= 60
      ? 'Good Progress'
      : consistencyRate >= 40
      ? 'Moderate'
      : 'New / Baseline';

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Preview Mode Alert */}
      {isPreview && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                Feature Preview Mode
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              Your consistency report will appear here after you begin recording workouts.
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Consistency tracks daily exercise completions vs planned workout days with monthly ratings and insights.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('membership')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-sm self-start sm:self-auto"
          >
            Activate Membership
          </button>
        </div>
      )}

      {/* Title Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded inline-block mb-2">
          Member Portal &bull; Consistency Report
        </span>
        <h1 className="text-2xl font-bold text-slate-900">Workout Consistency</h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Exercise-completion driven consistency calculation measuring completed assigned movements against your target schedule.
        </p>
      </div>

      {error && (
        <NoticeBanner
          variant="error"
          title="Consistency Report Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-xs text-slate-500 shadow-sm">
          Calculating workout consistency metrics...
        </div>
      ) : (
        <>
          {/* Core Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Consistency Percentage */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Consistency
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badgeStyle}`}>
                    {badgeText}
                  </span>
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600 mt-1">
                  {report?.consistencyPercentage}%
                </p>
              </div>
            </div>

            {/* 2. Expected Workout Days */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Expected Workout Days
                </span>
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
                  {report?.expectedWorkoutDays}{' '}
                  <span className="text-base font-medium text-slate-500">Days</span>
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-gray-100">
                {report?.gymClosuresDeducted > 0
                  ? `Target weekly training frequency (${report.gymClosuresDeducted} gym closure${report.gymClosuresDeducted > 1 ? 's' : ''} excluded)`
                  : 'Target weekly training frequency'}
              </p>
            </div>

            {/* 3. Completed Workout Days */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Completed Workout Days
                </span>
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
                  {report?.completedWorkoutDays || 0}{' '}
                  <span className="text-base font-medium text-slate-500">Days</span>
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-gray-100">
                Logged gym sessions this month
              </p>
            </div>

            {/* 4. Exercise Completion */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Exercise Completion
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {report?.exerciseCompletion || '0 / 5'}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-gray-100 font-mono">
                Average completed per session
              </p>
            </div>

            {/* 5. Total Gym Time */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Total Gym Time
                </span>
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
                  {report?.totalGymTime || '0m'}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-gray-100">
                Total duration logged across completed sessions
              </p>
            </div>

            {/* 6. Average Session Duration */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Average Session Duration
                </span>
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
                  {report?.averageSessionDuration || '0m'}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-gray-100">
                Average duration per session (no minimum required)
              </p>
            </div>
          </div>

          {/* Feedback Message Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start space-x-3">
              <span className="text-emerald-600 text-lg font-bold leading-none mt-0.5">&bull;</span>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                  Feedback
                </span>
                <p className="text-sm sm:text-base font-medium text-slate-900 mt-1">
                  &ldquo;{report?.feedback}&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Consistency Realism Explanation Card */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-emerald-700 text-xs font-bold">i</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block mb-1">
                  How Consistency Is Calculated
                </span>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {report?.explanationNotice || "Your consistency considers both completed exercises and the actual duration of your workout session. Longer sessions are not required, but extremely short sessions receive a lower session score."}
                </p>
              </div>
            </div>
          </div>

          {/* Daily Session Breakdown */}
          {report?.dayScores && report.dayScores.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-gray-100">
                Completed Sessions Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Duration</th>
                      <th className="py-2.5 px-4">Exercises (Done / Assigned)</th>
                      <th className="py-2.5 px-4">Session Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.dayScores.map((day, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium text-slate-900">{day.dateKey}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{day.duration}m</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700">
                          {day.completed} / {day.assigned}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-emerald-700">
                          {day.score}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default ConsistencyReportPage;
