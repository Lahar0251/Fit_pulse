import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import DashboardPage from './components/DashboardPage';
import WorkoutPlanPage from './components/WorkoutPlanPage';
import ExerciseLibraryPage from './components/ExerciseLibraryPage';
import AttendancePage from './components/AttendancePage';
import ConsistencyReportPage from './components/ConsistencyReportPage';
import ProfilePage from './components/ProfilePage';
import TrainerWorkoutAssignment from './components/TrainerWorkoutAssignment';

function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);

  // Restore session from localStorage on initial load
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('fitpulse_user');
      const storedToken = localStorage.getItem('fitpulse_token');

      if (storedUser && storedToken) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setCurrentView('dashboard');
      }
    } catch (err) {
      console.error('Failed to parse stored session:', err);
      localStorage.removeItem('fitpulse_user');
      localStorage.removeItem('fitpulse_token');
    }
  }, []);

  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    localStorage.setItem('fitpulse_user', JSON.stringify(user));
    localStorage.setItem('fitpulse_token', token);
    // After login/registration, route automatically to role dashboard
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fitpulse_user');
    localStorage.removeItem('fitpulse_token');
    setCurrentView('landing');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Shared Navbar across all pages and roles */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* View Routing */}
      {currentView === 'landing' && <LandingPage onNavigate={setCurrentView} />}
      {currentView === 'login' && (
        <LoginPage onNavigate={setCurrentView} onAuthSuccess={handleAuthSuccess} />
      )}
      {currentView === 'register' && (
        <RegisterPage onNavigate={setCurrentView} onAuthSuccess={handleAuthSuccess} />
      )}
      {currentView === 'dashboard' && (
        <DashboardPage currentUser={currentUser} onLogout={handleLogout} onNavigate={setCurrentView} />
      )}
      {currentView === 'trainer-workouts' && <TrainerWorkoutAssignment />}
      {currentView === 'workouts' && <WorkoutPlanPage />}
      {currentView === 'exercises' && <ExerciseLibraryPage />}
      {currentView === 'attendance' && <AttendancePage />}
      {currentView === 'consistency' && <ConsistencyReportPage />}
      {currentView === 'profile' && <ProfilePage currentUser={currentUser} />}

      {/* Clean Minimal Footer */}
      <footer className="w-full border-t border-gray-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>&copy; {new Date().getFullYear()} FitPulse. All rights reserved.</span>
          <span>Clean Full-Stack College Project</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
