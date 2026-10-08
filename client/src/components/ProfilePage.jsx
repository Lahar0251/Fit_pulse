import React, { useState, useEffect } from 'react';
import NoticeBanner from './NoticeBanner';

function ProfilePage({ currentUser, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [trainerChoice, setTrainerChoice] = useState(false);
  const [trainerSaving, setTrainerSaving] = useState(false);
  const [trainerMsg, setTrainerMsg] = useState({ type: '', text: '' });
  const [availableTrainers, setAvailableTrainers] = useState([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState(null);
  const [isChangingTrainer, setIsChangingTrainer] = useState(false);

  // Editable form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    age: '',
    height: '',
    weight: '',
    experienceLevel: 'intermediate',
    plannedDaysPerWeek: 5,
    preferredSchedule: 'morning',
    trainerRequested: false,
    wantsTrainer: false,
  });

  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/profile', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });
      const result = await res.json();

      if (res.ok && result.status === 'success' && result.data) {
        setProfile(result.data);
        populateFormData(result.data);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to load member profile data.',
        });
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setMessage({
        type: 'error',
        text: 'Network error while fetching profile. Please verify server connection.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainers = async () => {
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/trainers', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });
      const result = await res.json();
      if (res.ok && result.status === 'success' && Array.isArray(result.data)) {
        setAvailableTrainers(result.data);
      }
    } catch (err) {
      console.error('Error fetching trainers:', err);
    }
  };

  const populateFormData = (data) => {
    const rawTrainerId = data.fitness?.trainerId || data.fitness?.trainer?._id || data.fitness?.trainer?.id || null;
    const isTrainerWanted = Boolean(rawTrainerId && (data.fitness?.trainerRequested ?? data.fitness?.wantsTrainer ?? true));
    const initialTrainerId = isTrainerWanted ? rawTrainerId : null;
    setTrainerChoice(isTrainerWanted);
    setSelectedTrainerId(initialTrainerId);
    setIsChangingTrainer(false);
    setFormData({
      fullName: data.account?.fullName || '',
      phone: data.account?.phone || '',
      age: data.fitness?.age || '',
      height: data.fitness?.height || '',
      weight: data.fitness?.weight !== undefined && data.fitness?.weight !== null ? data.fitness.weight : '',
      fitnessGoal: data.fitness?.fitnessGoal || 'muscle_gain',
      experienceLevel: data.fitness?.experienceLevel || 'intermediate',
      plannedDaysPerWeek: data.fitness?.plannedDaysPerWeek || '',
      preferredSchedule: data.fitness?.preferredSchedule || 'morning',
      trainerRequested: isTrainerWanted,
      wantsTrainer: isTrainerWanted,
    });
  };

  const handleSaveTrainerPreference = async () => {
    if (trainerChoice && !selectedTrainerId) {
      setTrainerMsg({
        type: 'error',
        text: 'Please select a personal trainer from the list.',
      });
      return;
    }
    setTrainerSaving(true);
    setTrainerMsg({ type: '', text: '' });
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const targetTrainerId = trainerChoice ? selectedTrainerId : null;
      const payload = {
        wantsTrainer: Boolean(targetTrainerId),
        trainerRequested: Boolean(targetTrainerId),
        trainerId: targetTrainerId,
      };
      const res = await fetch('/api/member/trainer-preference', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && result.status === 'success') {
        const savedTrainerId = result.data?.trainerId || targetTrainerId;
        const assignedTrainer =
          result.data?.trainer ||
          (savedTrainerId ? availableTrainers.find((t) => (t._id || t.id) === savedTrainerId) : null);
        setProfile((prev) => ({
          ...prev,
          fitness: {
            ...prev?.fitness,
            trainerRequested: Boolean(savedTrainerId),
            wantsTrainer: Boolean(savedTrainerId),
            trainerId: savedTrainerId,
            trainer: assignedTrainer,
            activeWorkoutSource: savedTrainerId ? 'trainer' : (prev?.fitness?.previousPersonalSource || 'recommended'),
          },
        }));
        setSelectedTrainerId(savedTrainerId);
        setTrainerChoice(Boolean(savedTrainerId));
        setIsChangingTrainer(false);
        setTrainerMsg({
          type: 'success',
          text: savedTrainerId
            ? `Trainer preference saved: Assigned to ${assignedTrainer?.fullName || 'personal trainer'}.`
            : 'Trainer preference saved: No Trainer Selected.',
        });
      } else {
        setTrainerMsg({
          type: 'error',
          text: result.message || 'Failed to update trainer preference.',
        });
      }
    } catch (err) {
      console.error('Error saving trainer preference:', err);
      setTrainerMsg({
        type: 'error',
        text: 'Network error while saving trainer preference.',
      });
    } finally {
      setTrainerSaving(false);
    }
  };

  const handleRemoveTrainer = async () => {
    setTrainerSaving(true);
    setTrainerMsg({ type: '', text: '' });
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/trainer-preference', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({ wantsTrainer: false, trainerRequested: false, trainerId: null }),
      });
      const result = await res.json();
      if (res.ok && result.status === 'success') {
        setTrainerChoice(false);
        setSelectedTrainerId(null);
        setIsChangingTrainer(false);
        setProfile((prev) => ({
          ...prev,
          fitness: {
            ...prev.fitness,
            trainerRequested: false,
            wantsTrainer: false,
            trainerId: null,
            trainer: null,
            activeWorkoutSource: result.data?.activeWorkoutSource || 'recommended',
          },
        }));
        setTrainerMsg({
          type: 'success',
          text: 'Personal trainer removed successfully.',
        });
      } else {
        setTrainerMsg({
          type: 'error',
          text: result.message || 'Failed to remove trainer.',
        });
      }
    } catch (err) {
      console.error('Error removing trainer:', err);
      setTrainerMsg({
        type: 'error',
        text: 'Network error while removing trainer.',
      });
    } finally {
      setTrainerSaving(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchTrainers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const isFormDirty = () => {
    if (!profile) return false;
    return (
      formData.fullName !== (profile.account?.fullName || '') ||
      formData.phone !== (profile.account?.phone || '') ||
      String(formData.age) !== String(profile.fitness?.age || '') ||
      String(formData.height) !== String(profile.fitness?.height || '') ||
      String(formData.weight) !== String(profile.fitness?.weight || '') ||
      formData.fitnessGoal !== (profile.fitness?.fitnessGoal || 'muscle_gain') ||
      formData.experienceLevel !== (profile.fitness?.experienceLevel || 'intermediate') ||
      String(formData.plannedDaysPerWeek) !== String(profile.fitness?.plannedDaysPerWeek || '') ||
      formData.preferredSchedule !== (profile.fitness?.preferredSchedule || 'morning')
    );
  };

  const handleCancel = () => {
    if (isFormDirty()) {
      setShowDiscardModal(true);
      return;
    }
    if (profile) {
      populateFormData(profile);
    }
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  const handleDiscardChanges = () => {
    setShowDiscardModal(false);
    if (profile) {
      populateFormData(profile);
    }
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    // Client-side validations
    if (!formData.fullName.trim()) {
      setMessage({ type: 'error', text: 'Full name cannot be empty.' });
      setSaving(false);
      return;
    }

    if (!formData.phone.trim()) {
      setMessage({ type: 'error', text: 'Phone number cannot be empty.' });
      setSaving(false);
      return;
    }

    const ageNum = Number(formData.age);
    if (isNaN(ageNum) || ageNum < 14 || ageNum > 100) {
      setMessage({ type: 'error', text: 'Age must be between 14 and 100 years.' });
      setSaving(false);
      return;
    }

    const heightNum = Number(formData.height);
    if (isNaN(heightNum) || heightNum < 50 || heightNum > 260) {
      setMessage({ type: 'error', text: 'Height must be between 50 and 260 cm.' });
      setSaving(false);
      return;
    }

    const weightNum = Number(formData.weight);
    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      setMessage({ type: 'error', text: 'Weight must be between 30 and 300 kg.' });
      setSaving(false);
      return;
    }

    const daysNum = Number(formData.plannedDaysPerWeek);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 7) {
      setMessage({ type: 'error', text: 'Planned days per week must be between 1 and 7.' });
      setSaving(false);
      return;
    }

    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          age: ageNum,
          height: heightNum,
          weight: weightNum,
          fitnessGoal: formData.fitnessGoal,
          experienceLevel: formData.experienceLevel,
          plannedDaysPerWeek: daysNum,
          preferredSchedule: formData.preferredSchedule,
          trainerRequested: Boolean(formData.trainerRequested),
          wantsTrainer: Boolean(formData.trainerRequested),
        }),
      });

      const result = await res.json();
      if (res.ok && result.status === 'success' && result.data) {
        setProfile(result.data);
        populateFormData(result.data);
        setIsEditing(false);
        setMessage({
          type: 'success',
          text: 'Profile updated successfully!',
        });

        // Update stored user if fullName changed
        try {
          const storedUser = sessionStorage.getItem('fitpulse_user') || localStorage.getItem('fitpulse_user');
          if (storedUser) {
            const userObj = JSON.parse(storedUser);
            userObj.fullName = result.data.account.fullName;
            userObj.phone = result.data.account.phone;
            sessionStorage.setItem('fitpulse_user', JSON.stringify(userObj));
          }
        } catch (err) {
          // ignore session sync error
        }
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to update profile.',
        });
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setMessage({
        type: 'error',
        text: 'Network error while saving profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const formatGoal = (goal) => {
    const map = {
      muscle_gain: 'Muscle Gain',
      fat_loss: 'Fat Loss',
      strength: 'Strength & Power',
      general_fitness: 'General Fitness',
      endurance: 'Endurance & Cardio',
    };
    return map[goal] || goal || '—';
  };

  const formatLevel = (level) => {
    const map = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return map[level] || level || '—';
  };

  const getInitials = (name) => {
    if (!name) return 'FP';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-base font-semibold text-slate-900">Loading Member Profile...</h2>
          <p className="text-xs text-slate-500 mt-1">Fetching your records from the database.</p>
        </div>
      </main>
    );
  }

  const account = profile?.account || {};
  const membership = profile?.membership || {};
  const fitness = profile?.fitness || {};

  const now = new Date();
  const expiryDate = membership.expiryDate ? new Date(membership.expiryDate) : null;
  const isExpired = membership.status === 'Expired' || (expiryDate && expiryDate <= now);
  const daysUntilExpiry =
    expiryDate && !isExpired ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null;
  const isNearExpiry =
    !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg flex items-center justify-center border border-emerald-200 flex-shrink-0">
            {getInitials(account.fullName || currentUser?.fullName)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {account.fullName || currentUser?.fullName || 'Member Profile'}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {membership.status || 'Active'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Member ID: {account.id || 'N/A'} &bull; Member since {formatDate(account.memberSince)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isEditing ? (
            <>
              <button
                id="edit-profile-btn"
                onClick={() => {
                  setIsEditing(true);
                  setMessage({ type: '', text: '' });
                }}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md border border-emerald-700 shadow-sm transition-colors"
              >
                Edit Profile
              </button>
              <button
                type="button"
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-md border border-gray-300 shadow-sm transition-colors"
                onClick={() => alert('Change password functionality coming soon.')}
              >
                Change Password
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="w-1/2 sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-md border border-gray-300 shadow-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-1/2 sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md border border-emerald-700 shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Notifications */}
      {message.text && (
        <NoticeBanner
          variant={message.type === 'error' ? 'error' : 'success'}
          title={message.type === 'error' ? 'Unable to save profile' : 'Profile Updated'}
          message={message.text}
          onClose={() => setMessage({ type: '', text: '' })}
        />
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Account Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Account Information</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Personal contact details registered with FitPulse.
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Personal Identity
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label htmlFor="fullName" className="text-xs font-medium text-slate-600 block mb-1">
                Full Name {isEditing && <span className="text-emerald-700 font-bold">*</span>}
              </label>
              {isEditing ? (
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g. John Doe"
                />
              ) : (
                <span className="font-semibold text-slate-900 text-sm block">
                  {account.fullName || '—'}
                </span>
              )}
            </div>

            {/* Email Address (Read-only) */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Email Address</label>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 text-slate-400 bg-white border border-gray-200 rounded">
                  Read Only
                </span>
              </div>
              <span className="font-semibold text-slate-900 text-sm block">
                {account.email || '—'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Official FitPulse login identity
              </span>
            </div>

            {/* Phone Number */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label htmlFor="phone" className="text-xs font-medium text-slate-600 block mb-1">
                Phone Number {isEditing && <span className="text-emerald-700 font-bold">*</span>}
              </label>
              {isEditing ? (
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g. +1 555-0199"
                />
              ) : (
                <span className="font-semibold text-slate-900 text-sm block">
                  {account.phone || '—'}
                </span>
              )}
            </div>

            {/* Member ID */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Member ID
              </label>
              <span className="font-semibold text-slate-900 text-sm block">
                {account.id || '—'}
              </span>
            </div>

            {/* Member Since (Read-only) */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Member Since
              </label>
              <span className="font-semibold text-slate-900 text-sm block">
                {formatDate(account.memberSince)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Membership Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Membership Information</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current gym subscription tier, active standing, and expiration date.
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                membership.status === 'Active' && !isExpired
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {membership.status === 'Active' && !isExpired ? 'Active' : isExpired ? 'Expired' : 'Pending'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {membership.status === 'Active' && !isExpired ? (
              <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                      Current Plan
                    </span>
                    <p className="text-base font-bold text-slate-900">{membership.plan || '12 Months'}</p>
                    <div className="pt-0.5">
                      <span className="text-xs font-medium text-slate-600">Accumulated Duration:</span>{' '}
                      <span className="text-xs font-bold text-emerald-800">
                        {membership.accumulatedDurationMonths || 12} Months
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right space-y-1">
                    <p className="text-xs text-slate-600">
                      <span className="font-medium text-slate-900">Membership Start:</span>{' '}
                      {formatDate(membership.startDate || account.memberSince)}
                    </p>
                    <p className="text-xs text-slate-600">
                      <span className="font-medium text-slate-900">Membership End:</span>{' '}
                      {formatDate(membership.expiryDate)}
                    </p>
                  </div>
                </div>

                {isNearExpiry && (
                  <NoticeBanner
                    variant="warning"
                    title="Membership Warning"
                    message={`Your membership expires on ${formatDate(membership.expiryDate)} (${daysUntilExpiry} days remaining).`}
                    actionLabel="Renew Now"
                    onAction={() => onNavigate && onNavigate('membership')}
                  />
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-200/60">
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('membership')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                  >
                    Renew Membership
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('membership')}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-gray-300 shadow-sm transition-colors cursor-pointer"
                  >
                    Change / Upgrade Plan
                  </button>
                </div>
              </div>
            ) : isExpired ? (
              <NoticeBanner
                variant="error"
                title="Subscription Expired"
                message={`Your membership expired on ${formatDate(membership.expiryDate)}. Gym features are currently locked.`}
                actionLabel="Renew Membership"
                onAction={() => onNavigate && onNavigate('membership')}
              />
            ) : (
              <NoticeBanner
                variant="warning"
                title="No Active Membership"
                message="You currently do not have an active gym pass. Select a plan to unlock all features."
                actionLabel="Select Membership Plan"
                onAction={() => onNavigate && onNavigate('membership')}
              />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-4 italic">
            * Note: Membership fees are non-refundable and memberships can only be extended according to the available membership plans.
          </p>
        </div>

        {/* Section 3: Fitness Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Fitness Information</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Biometrics and gym workout goals used to generate your personalized program.
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Training Metrics
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Age */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label htmlFor="age" className="text-xs font-medium text-slate-600 block mb-1">
                Age (years) {isEditing && <span className="text-emerald-700 font-bold">*</span>}
              </label>
              {isEditing ? (
                <input
                  id="age"
                  name="age"
                  type="number"
                  min="14"
                  max="100"
                  value={formData.age}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <span className="font-semibold text-slate-900 text-sm block">
                  {fitness.age ? `${fitness.age} yrs` : '—'}
                </span>
              )}
            </div>

            {/* Height */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label htmlFor="height" className="text-xs font-medium text-slate-600 block mb-1">
                Height (cm) {isEditing && <span className="text-emerald-700 font-bold">*</span>}
              </label>
              {isEditing ? (
                <input
                  id="height"
                  name="height"
                  type="number"
                  min="50"
                  max="260"
                  value={formData.height}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <span className="font-semibold text-slate-900 text-sm block">
                  {fitness.height ? `${fitness.height} cm` : '—'}
                </span>
              )}
            </div>

            {/* Weight */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label htmlFor="weight" className="text-xs font-medium text-slate-600 block mb-1">
                Weight (kg) {isEditing && <span className="text-emerald-700 font-bold">*</span>}
              </label>
              {isEditing ? (
                <input
                  id="weight"
                  name="weight"
                  type="number"
                  min="30"
                  max="300"
                  value={formData.weight}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <span className="font-semibold text-slate-900 text-sm block">
                  {fitness.weight ? `${fitness.weight} kg` : '—'}
                </span>
              )}
            </div>

            {/* Fitness Goal */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label htmlFor="fitnessGoal" className="text-xs font-medium text-slate-600 block mb-1">
                Fitness Goal {isEditing && <span className="text-emerald-700 font-bold">*</span>}
              </label>
              {isEditing ? (
                <select
                  id="fitnessGoal"
                  name="fitnessGoal"
                  value={formData.fitnessGoal}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="fat_loss">Fat Loss</option>
                  <option value="strength">Strength & Power</option>
                  <option value="general_fitness">General Fitness</option>
                  <option value="endurance">Endurance & Cardio</option>
                </select>
              ) : (
                <span className="font-semibold text-emerald-700 text-sm block">
                  {formatGoal(fitness.fitnessGoal)}
                </span>
              )}
            </div>

            {/* Experience Level */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label
                htmlFor="experienceLevel"
                className="text-xs font-medium text-slate-600 block mb-1"
              >
                Experience Level {isEditing && <span className="text-emerald-700 font-bold">*</span>}
              </label>
              {isEditing ? (
                <select
                  id="experienceLevel"
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="beginner">Beginner (0-1 yrs)</option>
                  <option value="intermediate">Intermediate (1-3 yrs)</option>
                  <option value="advanced">Advanced (3+ yrs)</option>
                </select>
              ) : (
                <span className="font-semibold text-slate-900 text-sm block">
                  {formatLevel(fitness.experienceLevel)}
                </span>
              )}
            </div>

            {/* Planned Training Days */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label
                htmlFor="plannedDaysPerWeek"
                className="text-xs font-medium text-slate-600 block mb-1"
              >
                Planned Training Days {isEditing && <span className="text-emerald-700 font-bold">*</span>}
              </label>
              {isEditing ? (
                <select
                  id="plannedDaysPerWeek"
                  name="plannedDaysPerWeek"
                  value={formData.plannedDaysPerWeek}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value={1}>1 Day / week</option>
                  <option value={2}>2 Days / week</option>
                  <option value={3}>3 Days / week</option>
                  <option value={4}>4 Days / week</option>
                  <option value={5}>5 Days / week</option>
                  <option value={6}>6 Days / week</option>
                  <option value={7}>7 Days / week</option>
                </select>
              ) : (
                <span className="font-semibold text-slate-900 text-sm block">
                  {fitness.plannedDaysPerWeek ? `${fitness.plannedDaysPerWeek} Days / week` : '—'}
                </span>
              )}
            </div>
            {/* Preferred Workout Time */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-md">
              <label
                htmlFor="preferredSchedule"
                className="text-xs font-medium text-slate-600 block mb-1"
              >
                Preferred Workout Time {isEditing && <span className="text-emerald-700 font-bold">*</span>}
              </label>
              {isEditing ? (
                <select
                  id="preferredSchedule"
                  name="preferredSchedule"
                  value={formData.preferredSchedule}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              ) : (
                <span className="font-semibold text-slate-900 text-sm block">
                  {fitness.preferredSchedule ? fitness.preferredSchedule.charAt(0).toUpperCase() + fitness.preferredSchedule.slice(1) : '—'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Trainer Support */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">TRAINER SUPPORT</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Personal trainer assignment and professional workout coaching
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                profile?.fitness?.trainer
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {profile?.fitness?.trainer ? 'Trainer Assigned' : 'Self-Guided'}
            </span>
          </div>

          {/* Current Trainer Display if assigned and not actively changing */}
          {profile?.fitness?.trainer && !isChangingTrainer ? (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    Current Assigned Trainer
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {profile.fitness.trainer.fullName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600">
                    <p>
                      Trainer: <strong className="text-slate-800">{profile.fitness.trainer.fullName}</strong>
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Specialization: <strong className="text-slate-800">{profile.fitness.trainer.specialization || 'Strength Training'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {profile.fitness.trainer.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    id="change-trainer-btn"
                    onClick={() => {
                      setIsChangingTrainer(true);
                      setTrainerChoice(true);
                      const currentAssignedId =
                        profile?.fitness?.trainer?._id ||
                        profile?.fitness?.trainer?.id ||
                        profile?.fitness?.trainerId ||
                        null;
                      setSelectedTrainerId(currentAssignedId);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 rounded hover:bg-emerald-50 cursor-pointer shadow-xs"
                  >
                    Change Trainer
                  </button>
                  <button
                    type="button"
                    id="remove-trainer-btn"
                    onClick={handleRemoveTrainer}
                    disabled={trainerSaving}
                    className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded hover:bg-rose-50 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    Remove Trainer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-700">
                Would you like a personal trainer?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                <label
                  onClick={() => {
                    setTrainerChoice(false);
                    setSelectedTrainerId(null);
                    setTrainerMsg({ type: '', text: '' });
                  }}
                  className={`flex items-center space-x-3 p-3.5 rounded-md border cursor-pointer transition-colors ${
                    !trainerChoice || selectedTrainerId === null
                      ? 'bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-400'
                      : 'bg-white border-gray-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="trainerChoiceOption"
                    id="no-trainer-radio"
                    value="no"
                    checked={!trainerChoice || selectedTrainerId === null}
                    onChange={() => {
                      setTrainerChoice(false);
                      setSelectedTrainerId(null);
                      setTrainerMsg({ type: '', text: '' });
                    }}
                    className="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">
                      No Trainer
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Independent workout sessions using system routines
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => {
                    setTrainerChoice(true);
                    setTrainerMsg({ type: '', text: '' });
                    if (!selectedTrainerId && availableTrainers.length > 0) {
                      const firstId = availableTrainers[0]._id || availableTrainers[0].id;
                      setSelectedTrainerId(firstId);
                    }
                  }}
                  className={`flex items-center space-x-3 p-3.5 rounded-md border cursor-pointer transition-colors ${
                    trainerChoice && selectedTrainerId !== null
                      ? 'bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-400'
                      : 'bg-white border-gray-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="trainerChoiceOption"
                    id="choose-trainer-radio"
                    value="yes"
                    checked={trainerChoice && selectedTrainerId !== null}
                    onChange={() => {
                      setTrainerChoice(true);
                      setTrainerMsg({ type: '', text: '' });
                      if (!selectedTrainerId && availableTrainers.length > 0) {
                        const firstId = availableTrainers[0]._id || availableTrainers[0].id;
                        setSelectedTrainerId(firstId);
                      }
                    }}
                    className="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">
                      Choose a Trainer
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Select a dedicated certified coach from our team
                    </span>
                  </div>
                </label>
              </div>

              {/* Available Trainers List */}
              {trainerChoice && (
                <div className="pt-2 space-y-2.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Available Certified Trainers ({availableTrainers.length})
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {availableTrainers.map((t) => {
                      const tId = t._id || t.id;
                      const isSelected = Boolean(selectedTrainerId && selectedTrainerId === tId && trainerChoice);
                      return (
                        <div
                          key={tId}
                          id={`trainer-card-${tId}`}
                          onClick={() => {
                            setTrainerChoice(true);
                            setSelectedTrainerId(tId);
                            setTrainerMsg({ type: '', text: '' });
                          }}
                          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 shadow-xs'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{t.fullName}</h4>
                              <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                                {t.specialization || 'Strength Training'}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1">{t.email}</p>
                            </div>
                            <div className="flex items-center ml-2 shrink-0">
                              <input
                                type="radio"
                                name="trainerCardRadio"
                                id={`trainer-radio-${tId}`}
                                value={tId}
                                checked={isSelected}
                                onChange={() => {
                                  setTrainerChoice(true);
                                  setSelectedTrainerId(tId);
                                  setTrainerMsg({ type: '', text: '' });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {trainerMsg.text && (
                <NoticeBanner
                  variant={trainerMsg.type === 'error' ? 'error' : 'success'}
                  title={trainerMsg.type === 'error' ? 'Trainer Preference Error' : 'Trainer Preference Updated'}
                  message={trainerMsg.text}
                  onClose={() => setTrainerMsg({ type: '', text: '' })}
                />
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    id="save-trainer-preference-btn"
                    onClick={handleSaveTrainerPreference}
                    disabled={trainerSaving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {trainerSaving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving Preference...</span>
                      </>
                    ) : (
                      'Save Trainer Preference'
                    )}
                  </button>
                  {isChangingTrainer && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingTrainer(false);
                        const currId =
                          profile?.fitness?.trainer?._id ||
                          profile?.fitness?.trainer?.id ||
                          profile?.fitness?.trainerId ||
                          null;
                        setSelectedTrainerId(currId);
                        setTrainerChoice(Boolean(currId));
                      }}
                      className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-600">
                  Current status:{' '}
                  <span className="font-bold text-slate-900">
                    {profile?.fitness?.trainer
                      ? `Assigned to ${profile.fitness.trainer.fullName} (Workout Source: Trainer Assigned Workout)`
                      : `No Trainer Assigned (Workout Source: ${profile?.fitness?.activeWorkoutSource === 'custom' ? 'My Custom Workout' : 'FitPulse Recommended'})`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action button bar when editing */}
        {isEditing && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-md border border-gray-300 shadow-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md border border-emerald-700 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Profile Changes'
              )}
            </button>
          </div>
        )}

        {/* Unsaved changes confirmation modal */}
        {showDiscardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Unsaved Changes</h3>
              <p className="text-sm text-slate-600 mb-6">You have unsaved changes.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDiscardModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}

export default ProfilePage;
