import React, { useState, useEffect } from 'react';
import NoticeBanner from './NoticeBanner';

const ALL_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DEFAULT_HOURS = ALL_DAYS.map((day) => ({
  day,
  openingTime: '06:00 AM',
  closingTime: '10:00 PM',
}));

function AdminSchedulePage({ currentUser, onNavigate }) {
  const [dailyHours, setDailyHours] = useState(DEFAULT_HOURS);
  const [closures, setClosures] = useState([]);
  const [notes, setNotes] = useState('Standard facility operating schedule (7 Days Available)');
  const [lastUpdated, setLastUpdated] = useState(null);

  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Closure modal state
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [closureModalMode, setClosureModalMode] = useState('create'); // 'create' | 'edit'
  const [editingClosureId, setEditingClosureId] = useState(null);
  const [closureForm, setClosureForm] = useState({
    date: '',
    reason: '',
    announcement: '',
  });
  const [savingClosure, setSavingClosure] = useState(false);

  // Helper to calculate next calendar date for a given day name
  const getNextDateForDay = (dayName) => {
    const dayMap = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    const targetDay = dayMap[dayName];
    if (targetDay === undefined) return new Date().toISOString().slice(0, 10);

    const now = new Date();
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7; // Next occurrence
    const targetDate = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
    return targetDate.toISOString().slice(0, 10);
  };

  // Role guard: Only admin users allowed
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-red-200 rounded-lg p-8 text-center max-w-md mx-auto shadow-sm space-y-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
            Access Restricted
          </span>
          <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have administrative privileges to configure gym operating hours or closures.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Fetch current schedule and upcoming closures from MongoDB
  const fetchScheduleAndClosures = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
      };

      const res = await fetch('/api/admin/schedule', { headers });
      const result = await res.json();

      if (res.ok && result.status === 'success' && result.data) {
        const data = result.data;

        // Build guaranteed 7-day array
        let fetchedDaily = [];
        if (Array.isArray(data.dailyHours) && data.dailyHours.length > 0) {
          fetchedDaily = ALL_DAYS.map((day) => {
            const found = data.dailyHours.find((h) => h.day === day);
            return {
              day,
              openingTime: found?.openingTime || data.openingTime || '06:00 AM',
              closingTime: found?.closingTime || data.closingTime || '10:00 PM',
            };
          });
        } else {
          fetchedDaily = ALL_DAYS.map((day) => ({
            day,
            openingTime: data.openingTime || '06:00 AM',
            closingTime: data.closingTime || '10:00 PM',
          }));
        }

        setDailyHours(fetchedDaily);
        setNotes(data.notes || 'Standard facility operating schedule (7 Days Available)');
        setLastUpdated(data.updatedAt || null);
        setClosures(Array.isArray(data.closures) ? data.closures : []);
      } else {
        throw new Error(result.message || 'Failed to load schedule from server.');
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError(err.message || 'Network error while retrieving operating schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleAndClosures();
  }, []);

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 4500);
  };

  // Handle local input changes for a specific day
  const handleTimeChange = (dayName, field, value) => {
    setDailyHours((prev) =>
      prev.map((item) => (item.day === dayName ? { ...item, [field]: value } : item))
    );
  };

  // Save operating hours for a SINGLE DAY to MongoDB
  const handleSaveDay = async (dayName) => {
    setError('');
    const target = dailyHours.find((h) => h.day === dayName);
    if (!target) return;

    if (!target.openingTime.trim() || !target.closingTime.trim()) {
      setError(`Opening and closing times are required for ${dayName}.`);
      return;
    }

    setSavingDay(dayName);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/admin/schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({
          day: dayName,
          openingTime: target.openingTime.trim(),
          closingTime: target.closingTime.trim(),
          dailyHours,
          notes,
        }),
      });

      const result = await res.json();
      if (res.ok && result.status === 'success') {
        setLastUpdated(result.data?.updatedAt || new Date().toISOString());
        showNotification(
          `${dayName} operating hours saved: ${target.openingTime.trim()} – ${target.closingTime.trim()}`
        );
      } else {
        throw new Error(result.message || `Failed to save hours for ${dayName}.`);
      }
    } catch (err) {
      console.error(`Save hours error for ${dayName}:`, err);
      setError(err.message || `Failed to update hours for ${dayName}.`);
    } finally {
      setSavingDay(null);
    }
  };

  // Save ALL 7 DAYS operating hours to MongoDB in bulk
  const handleSaveAllHours = async () => {
    setError('');
    // Validation
    for (const h of dailyHours) {
      if (!h.openingTime.trim() || !h.closingTime.trim()) {
        setError(`Opening and closing times must not be empty for ${h.day}.`);
        return;
      }
    }

    setSavingDay('all');
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/admin/schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({
          dailyHours,
          notes,
        }),
      });

      const result = await res.json();
      if (res.ok && result.status === 'success') {
        setLastUpdated(result.data?.updatedAt || new Date().toISOString());
        showNotification('All 7 days operating hours successfully saved to MongoDB.');
      } else {
        throw new Error(result.message || 'Failed to save operating schedule.');
      }
    } catch (err) {
      console.error('Save all schedule error:', err);
      setError(err.message || 'Failed to update schedule in database.');
    } finally {
      setSavingDay(null);
    }
  };

  // Open modal to schedule closure for a specific day or date
  const handleOpenScheduleClosure = (dayName) => {
    const suggestedDate = dayName ? getNextDateForDay(dayName) : '';
    setClosureModalMode('create');
    setEditingClosureId(null);
    setClosureForm({
      date: suggestedDate,
      reason: '',
      announcement: '',
    });
    setIsClosureModalOpen(true);
  };

  // Open modal to edit an existing closure
  const handleOpenEditClosure = (closure) => {
    setClosureModalMode('edit');
    setEditingClosureId(closure._id);
    setClosureForm({
      date: closure.date,
      reason: closure.reason,
      announcement: closure.announcement || '',
    });
    setIsClosureModalOpen(true);
  };

  // Submit Closure (Create or Edit)
  const handleSubmitClosure = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!closureForm.date || !/^\d{4}-\d{2}-\d{2}$/.test(closureForm.date)) {
      setError('Please select a valid date (YYYY-MM-DD) for the closure.');
      return;
    }

    if (!closureForm.reason.trim()) {
      setError('Please specify a reason for the facility closure.');
      return;
    }

    setSavingClosure(true);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const url =
        closureModalMode === 'edit'
          ? `/api/admin/closures/${editingClosureId}`
          : '/api/admin/closures';
      const method = closureModalMode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({
          date: closureForm.date.trim(),
          reason: closureForm.reason.trim(),
          announcement: closureForm.announcement.trim(),
        }),
      });

      const result = await res.json();
      if (res.ok && result.status === 'success') {
        setIsClosureModalOpen(false);
        showNotification(
          closureModalMode === 'edit'
            ? 'Gym closure updated successfully.'
            : `Gym closure scheduled for ${closureForm.date}. Members and trainers will see this notice.`
        );
        fetchScheduleAndClosures();
      } else {
        throw new Error(result.message || 'Failed to save gym closure.');
      }
    } catch (err) {
      console.error('Save closure error:', err);
      setError(err.message || 'Network error while saving closure.');
    } finally {
      setSavingClosure(false);
    }
  };

  // Cancel/Delete a scheduled closure
  const handleCancelClosure = async (closureId, dateStr) => {
    if (!window.confirm(`Are you sure you want to cancel the scheduled closure on ${dateStr}? Normal gym hours will resume.`)) {
      return;
    }

    setError('');
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/admin/closures/${closureId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (res.ok && result.status === 'success') {
        showNotification(`Closure on ${dateStr} cancelled. Normal operating hours restored.`);
        setClosures((prev) => prev.filter((c) => c._id !== closureId));
      } else {
        throw new Error(result.message || 'Failed to cancel closure.');
      }
    } catch (err) {
      console.error('Cancel closure error:', err);
      setError(err.message || 'Failed to cancel closure.');
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                Admin Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Gym Operating Hours & Closures
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Configure daily opening and closing hours for Monday through Sunday. Schedule specific-date closures with announcements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchScheduleAndClosures}
              disabled={loading || savingDay !== null}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => handleOpenScheduleClosure(null)}
              className="px-4 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md shadow-sm transition-colors cursor-pointer"
            >
              + Schedule Closure
            </button>
            <button
              type="button"
              onClick={handleSaveAllHours}
              disabled={loading || savingDay !== null}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1"
            >
              {savingDay === 'all' ? <span>Saving All...</span> : <span>Save All Hours</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <NoticeBanner
          variant="success"
          title="Schedule Updated"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}

      {error && (
        <NoticeBanner
          variant="error"
          title="Schedule Error"
          message={error}
          onClose={() => setError('')}
        />
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-xs text-slate-500 shadow-sm">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
          Loading gym operating schedule from database...
        </div>
      ) : (
        <>
          {/* Status info bar */}
          <div className="bg-slate-50 border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-900">Standard Operational Model:</span>
              <span className="text-slate-600">Available 7 Days a Week (Monday – Sunday)</span>
            </div>
            <div className="text-slate-500">
              {lastUpdated ? `Last synchronized: ${new Date(lastUpdated).toLocaleString()}` : 'Default Database Config'}
            </div>
          </div>

          {/* Section: Daily Gym Operating Hours (Monday through Sunday) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Daily Operating Hours</h2>
                <p className="text-xs text-slate-500">
                  Gym is available 7 days a week. Set opening and closing times for each day and commit changes to MongoDB.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                7 Days Available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {ALL_DAYS.map((dayName) => {
                const dayHour = dailyHours.find((h) => h.day === dayName) || {
                  day: dayName,
                  openingTime: '06:00 AM',
                  closingTime: '10:00 PM',
                };
                const isSavingThisDay = savingDay === dayName;

                return (
                  <div
                    key={dayName}
                    id={`schedule-card-${dayName.toLowerCase()}`}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors"
                  >
                    <div>
                      {/* Day Header */}
                      <div className="border-b border-gray-100 pb-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                          Day
                        </span>
                        <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                          {dayName}
                        </h3>
                      </div>

                      {/* Opening Time */}
                      <div className="space-y-1 mb-3">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Opening Time
                        </label>
                        <input
                          type="text"
                          value={dayHour.openingTime}
                          onChange={(e) => handleTimeChange(dayName, 'openingTime', e.target.value)}
                          placeholder="06:00 AM"
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-gray-300 rounded font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Closing Time */}
                      <div className="space-y-1 mb-4">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Closing Time
                        </label>
                        <input
                          type="text"
                          value={dayHour.closingTime}
                          onChange={(e) => handleTimeChange(dayName, 'closingTime', e.target.value)}
                          placeholder="10:00 PM"
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-gray-300 rounded font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Day Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleSaveDay(dayName)}
                        disabled={isSavingThisDay || savingDay === 'all'}
                        className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                      >
                        {isSavingThisDay ? <span>Saving...</span> : <span>Save Hours</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenScheduleClosure(dayName)}
                        className="w-full py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-medium cursor-pointer transition-colors"
                      >
                        Schedule Closure
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Upcoming Gym Closures */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Upcoming Facility Closures</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scheduled single-date closures override normal weekly operating hours. Members and trainers receive advance notice and attendance check-in is blocked.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenScheduleClosure(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-sm cursor-pointer self-start sm:self-auto"
              >
                + Schedule Date Closure
              </button>
            </div>

            {closures.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/60 rounded-md border border-dashed border-gray-200 text-xs text-slate-500">
                <span className="text-slate-400 text-base block mb-1">&bull; &bull; &bull;</span>
                No upcoming gym closures scheduled. The gym operates 7 days a week according to the configured daily hours.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                      <th className="py-3 px-4">Closure Date</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Announcement Notice</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {closures.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {c.date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-amber-900">
                          {c.reason}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-md">
                          {c.announcement || 'Normal gym timings resume tomorrow.'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            FULL DAY CLOSED
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditClosure(c)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-gray-300 rounded hover:bg-slate-50 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelClosure(c._id, c.date)}
                            className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Schedule / Edit Closure Modal */}
      {isClosureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-gray-200 rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {closureModalMode === 'edit' ? 'Edit Gym Closure' : 'Schedule Specific-Date Closure'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full-day facility closure for this specific date only.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClosureModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitClosure} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Closure Date (YYYY-MM-DD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={closureForm.date}
                  onChange={(e) => setClosureForm({ ...closureForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  e.g. 2026-10-21 (Affects this specific date only, not recurring weekdays)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Closure <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. College Annual Event, Facility Maintenance"
                  value={closureForm.reason}
                  onChange={(e) => setClosureForm({ ...closureForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Announcement Notice for Members & Trainers
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. The gym is closed today due to the annual college fest. Normal gym timings resume tomorrow."
                  value={closureForm.announcement}
                  onChange={(e) => setClosureForm({ ...closureForm, announcement: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  This message will appear in popup modals and dashboard banners for members and trainers.
                </span>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsClosureModalOpen(false)}
                  disabled={savingClosure}
                  className="px-4 py-2 text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClosure}
                  className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-md font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingClosure
                    ? 'Saving...'
                    : closureModalMode === 'edit'
                      ? 'Update Closure'
                      : 'Create Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminSchedulePage;
