import React, { useState } from 'react';
import NoticeBanner from './NoticeBanner';

function RegisterPage({ onNavigate, onAuthSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    age: '',
    height: '',
    weight: '',
    fitnessGoal: 'muscle_gain',
    experienceLevel: 'beginner',
    plannedDaysPerWeek: 5,
    preferredSchedule: 'morning',
    wantsTrainer: 'no',
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };

  // Password criteria checklist
  const criteria = [
    { label: 'Minimum 8 characters', met: formData.password.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(formData.password) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(formData.password) },
    { label: 'At least one number (0-9)', met: /[0-9]/.test(formData.password) },
    { label: 'At least one special character (!@#$...)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) },
  ];

  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!/^\d{10}$/.test(formData.phone.trim())) {
      setError('Phone number must be exactly 10 digits (numbers only).');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const allCriteriaMet = criteria.every((c) => c.met);
    if (!allCriteriaMet) {
      setError('Please ensure your password satisfies all security criteria.');
      return;
    }

    setLoading(true);

    try {
      // NOTE: Strictly no role property is passed to backend from frontend registration!
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        age: Number(formData.age),
        height: Number(formData.height),
        weight: Number(formData.weight),
        fitnessGoal: formData.fitnessGoal,
        experienceLevel: formData.experienceLevel,
        plannedDaysPerWeek: Number(formData.plannedDaysPerWeek),
        preferredSchedule: formData.preferredSchedule,
        wantsTrainer: formData.wantsTrainer === 'yes',
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }

      // Successful registration: passes user & token to root handler
      onAuthSuccess(data.data.user, data.data.token);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Registration Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 shadow-sm">
          {/* Header */}
          <div className="mb-6">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
              Public Registration
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Create Member Account</h1>
            <p className="text-xs text-slate-500 mt-1">
              Join FitPulse today to track workouts and access member facilities.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <NoticeBanner
              variant="error"
              title="Registration Error"
              message={error}
              className="mb-5"
            />
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Sarah Connor"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="member@fitpulse.com"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Age, Height, Weight Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="age" className="block text-xs font-semibold text-slate-700 mb-1">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  min="14"
                  max="100"
                  required
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="25"
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="height" className="block text-xs font-semibold text-slate-700 mb-1">
                  Height (cm) <span className="text-red-500">*</span>
                </label>
                <input
                  id="height"
                  name="height"
                  type="number"
                  min="50"
                  max="260"
                  required
                  value={formData.height}
                  onChange={handleChange}
                  placeholder="175"
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="weight" className="block text-xs font-semibold text-slate-700 mb-1">
                  Weight (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  id="weight"
                  name="weight"
                  type="number"
                  min="30"
                  max="300"
                  required
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="72"
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Fitness Goal & Experience */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="fitnessGoal" className="block text-xs font-semibold text-slate-700 mb-1">
                  Fitness Goal <span className="text-red-500">*</span>
                </label>
                <select
                  id="fitnessGoal"
                  name="fitnessGoal"
                  value={formData.fitnessGoal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="fat_loss">Fat Loss</option>
                  <option value="strength">Strength</option>
                  <option value="general_fitness">General Fitness</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>
              <div>
                <label htmlFor="experienceLevel" className="block text-xs font-semibold text-slate-700 mb-1">
                  Experience Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="experienceLevel"
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Planned Days */}
            <div>
              <label htmlFor="plannedDaysPerWeek" className="block text-xs font-semibold text-slate-700 mb-1">
                Days Per Week <span className="text-red-500">*</span>
              </label>
              <input
                id="plannedDaysPerWeek"
                name="plannedDaysPerWeek"
                type="number"
                min="1"
                max="7"
                required
                value={formData.plannedDaysPerWeek}
                onChange={handleChange}
                placeholder="5"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Schedule & Trainer Preference */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="preferredSchedule" className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Time <span className="text-red-500">*</span>
                </label>
                <select
                  id="preferredSchedule"
                  name="preferredSchedule"
                  value={formData.preferredSchedule}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </div>
              <div>
                <label htmlFor="wantsTrainer" className="block text-xs font-semibold text-slate-700 mb-1">
                  Do you want a trainer? <span className="text-red-500">*</span>
                </label>
                <select
                  id="wantsTrainer"
                  name="wantsTrainer"
                  value={formData.wantsTrainer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Password Security Criteria Guide */}
            {formData.password.length > 0 && (
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-md space-y-1">
                <p className="text-[11px] font-semibold text-slate-700 mb-1">Password Requirements:</p>
                {criteria.map((c, i) => (
                  <div key={i} className="flex items-center text-[11px] space-x-1.5">
                    <span className={c.met ? 'text-emerald-600 font-bold' : 'text-slate-400 font-bold'}>
                      {c.met ? '✓' : '○'}
                    </span>
                    <span className={c.met ? 'text-emerald-800' : 'text-slate-500'}>
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-3 py-2 text-sm bg-white border rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                  formData.confirmPassword && !passwordsMatch
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
              {formData.confirmPassword && (
                <p className={`text-[11px] mt-1 ${passwordsMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                  {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                </p>
              )}
            </div>

            {/* Role Notice */}
            <div className="pt-1">
              <p className="text-[11px] text-slate-500 italic">
                * Note: All public registrations are automatically assigned the <strong>Member</strong> role.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-50 shadow-sm cursor-pointer transition-colors"
            >
              {loading ? 'Creating Member Account...' : 'Complete Member Registration'}
            </button>
          </form>

          {/* Navigation link to Login */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                Sign In here
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default RegisterPage;
