import React, { useState } from 'react';
import NoticeBanner from './NoticeBanner';

function LoginPage({ onNavigate, onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Invalid email or password.');
      }

      // Successful login: pass user object and token to app
      onAuthSuccess(data.data.user, data.data.token);
    } catch (err) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Helper for fast test filling
  const fillCredentials = (testEmail, testPassword) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setError(null);
  };

  return (
    <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 shadow-sm">
          {/* Card Header */}
          <div className="mb-6">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
              Authentication Portal
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Sign In to FitPulse</h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access your personalized role dashboard.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <NoticeBanner
              variant="error"
              title="Authentication Error"
              message={error}
              className="mb-5"
            />
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="you@fitpulse.com"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-50 shadow-sm cursor-pointer transition-colors"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>


          {/* Link to Registration */}
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-600">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                Sign Up as a Member
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
