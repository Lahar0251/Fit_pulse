import React, { useState } from 'react';

function Navbar({ currentView, onNavigate, currentUser, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const memberNavItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'workouts', label: 'Workout Plan' },
    { key: 'exercises', label: 'Exercise Library' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'consistency', label: 'Consistency Report' },
    { key: 'profile', label: 'Profile' },
  ];

  const trainerNavItems = [
    { key: 'dashboard', label: 'Trainer Portal' },
    { key: 'exercises', label: 'Exercise Library' },
  ];

  const adminNavItems = [
    { key: 'dashboard', label: 'Admin Center' },
    { key: 'admin-users', label: 'Users' },
    { key: 'admin-plans', label: 'Membership Plans' },
    { key: 'admin-schedule', label: 'Gym Operating Schedule' },
  ];

  const activeNavItems =
    currentUser?.role === 'admin'
      ? adminNavItems
      : currentUser?.role === 'trainer'
      ? trainerNavItems
      : currentUser?.role === 'member'
      ? memberNavItems
      : [];

  const handleNavClick = (viewKey) => {
    onNavigate(viewKey);
    setMobileMenuOpen(false);
  };

  return (
    <header className="w-full border-b border-gray-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* FitPulse Logo */}
        <button
          type="button"
          onClick={() => handleNavClick(currentUser ? 'dashboard' : 'landing')}
          className="flex items-center space-x-2 focus:outline-none cursor-pointer"
          aria-label="FitPulse Home"
        >
          <img src="/logo.svg" alt="FitPulse Logo" className="h-8 sm:h-9 w-auto" />
        </button>

        {/* Center Navigation Links for Authenticated Member & Trainer */}
        {currentUser && activeNavItems.length > 0 && (
          <nav className="hidden lg:flex items-center space-x-1">
            {activeNavItems.map((item) => {
              const isActive = currentView === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item.key)}
                  className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Side Actions */}
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <div className="flex items-center space-x-3">
              {/* Role Badge */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                {currentUser.role || 'MEMBER'}
              </span>

              {/* Logout Button */}
              <button
                type="button"
                id="logout-btn"
                onClick={onLogout}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none cursor-pointer"
              >
                Logout
              </button>

              {/* Mobile menu hamburger button */}
              {activeNavItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-1.5 rounded-md text-slate-600 hover:text-slate-900 border border-gray-200 focus:outline-none cursor-pointer"
                  aria-label="Toggle navigation menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              )}
            </div>
          ) : (
            // Public Navbar
            <div className="flex items-center space-x-3">
              {currentView !== 'login' && (
                <button
                  type="button"
                  onClick={() => handleNavClick('login')}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none cursor-pointer"
                >
                  Sign In
                </button>
              )}

              {currentView !== 'register' && (
                <button
                  type="button"
                  onClick={() => handleNavClick('register')}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none shadow-sm cursor-pointer"
                >
                  Get Started
                </button>
              )}

              {currentView !== 'landing' && (
                <button
                  type="button"
                  onClick={() => handleNavClick('landing')}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 focus:outline-none cursor-pointer"
                >
                  Home
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown for Member & Trainer */}
      {currentUser && activeNavItems.length > 0 && mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {activeNavItems.map((item) => {
            const isActive = currentView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavClick(item.key)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              id="mobile-logout-btn"
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
