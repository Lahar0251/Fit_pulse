import React, { useState, useEffect, useRef } from 'react';
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
import AdminDashboard from './components/AdminDashboard';
import AdminUsersPage from './components/AdminUsersPage';
import AdminSchedulePage from './components/AdminSchedulePage';
import AdminPlansPage from './components/AdminPlansPage';
import MembershipPage from './components/MembershipPage';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import NoticeBanner from './components/NoticeBanner';
import {
  getAuthToken,
  getAuthUser,
  setAuthSession,
  clearAuthSession,
  getTabSessionId,
  getAuthHeaders,
} from './utils/authStorage';

function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [memberStatus, setMemberStatus] = useState(null);

  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Shared data change notification
  const [dataChangeNotice, setDataChangeNotice] = useState(false);
  const lastAckVersionRef = useRef(0);

  // Restore session from tab-isolated sessionStorage on initial load
  useEffect(() => {
    try {
      let user = getAuthUser();
      let token = getAuthToken();

      // Legacy localStorage fallback for smooth initial migration
      if (!user || !token) {
        const legacyUser = localStorage.getItem('fitpulse_user');
        const legacyToken = localStorage.getItem('fitpulse_token');
        if (legacyUser && legacyToken) {
          user = JSON.parse(legacyUser);
          token = legacyToken;
          setAuthSession(user, token);
        }
      }

      if (user && token) {
        setCurrentUser(user);
        const hash = window.location.hash.replace('#', '');
        const targetView = (hash && hash !== 'landing' && hash !== 'login' && hash !== 'register') ? hash : 'dashboard';
        setCurrentView(targetView);
        if (!window.history.state?.view) {
          window.history.replaceState({ view: targetView }, '', `#${targetView}`);
        }
      } else {
        const hash = window.location.hash.replace('#', '');
        const targetView = (hash === 'login' || hash === 'register') ? hash : 'landing';
        if (!window.history.state?.view) {
          window.history.replaceState({ view: targetView }, '', `#${targetView}`);
        }
      }
    } catch (err) {
      console.error('Failed to parse stored session:', err);
      clearAuthSession();
    }
  }, []);

  // Handle normal browser back / forward navigation
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && e.state.view) {
        setCurrentView(e.state.view);
      } else {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
          setCurrentView(hash);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check member status against backend on load and view change
  useEffect(() => {
    if (currentUser?.role === 'member') {
      const token = getAuthToken();
      if (token) {
        fetch('/api/member/profile', {
          headers: getAuthHeaders(),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.data?.membership?.status) {
              setMemberStatus(data.data.membership.status);
            }
          })
          .catch(() => {});
      }
    } else {
      setMemberStatus(null);
    }
  }, [currentUser, currentView]);

  // Periodic lightweight change detection across sessions
  useEffect(() => {
    if (!currentUser) {
      setDataChangeNotice(false);
      lastAckVersionRef.current = 0;
      return;
    }

    let isMounted = true;
    let intervalId = null;

    const checkSync = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const tabId = getTabSessionId();
        const currentVer = lastAckVersionRef.current;
        const res = await fetch(`/api/sync/status?clientVersion=${currentVer}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tab-Session-Id': tabId,
          },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!isMounted) return;

        if (json?.data) {
          const { hasChanges, latestVersion } = json.data;
          if (currentVer === 0) {
            // Initial baseline hydration
            lastAckVersionRef.current = latestVersion;
          } else if (hasChanges) {
            setDataChangeNotice(true);
          } else {
            lastAckVersionRef.current = latestVersion;
          }
        }
      } catch (err) {
        // Silently catch network errors
      }
    };

    checkSync();

    intervalId = setInterval(() => {
      if (!document.hidden) {
        checkSync();
      }
    }, 20000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentUser]);

  const handleNavigate = (view) => {
    // Normal React Router / history navigation between pages
    if (currentView !== view) {
      window.history.pushState({ view }, '', `#${view}`);
      setCurrentView(view);
    }
  };

  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthSession(user, token);
    window.history.pushState({ view: 'dashboard' }, '', '#dashboard');
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    // If member logs out while session is active, finalize session upon logout
    try {
      const token = getAuthToken();
      if (token && currentUser?.role === 'member') {
        await fetch('/api/member/attendance/check-out', {
          method: 'POST',
          headers: getAuthHeaders(),
        });
      }
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    setMemberStatus(null);
    clearAuthSession();
    window.history.pushState({ view: 'landing' }, '', '#landing');
    setCurrentView('landing');
  };

  const handlePromptLogout = () => {
    setShowLogoutModal(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    handleLogout();
  };

  const handleDismissNotice = async () => {
    setDataChangeNotice(false);
    try {
      const token = getAuthToken();
      const tabId = getTabSessionId();
      const res = await fetch('/api/sync/status?clientVersion=0', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tab-Session-Id': tabId,
        },
      });
      const json = await res.json();
      if (json?.data?.latestVersion) {
        lastAckVersionRef.current = json.data.latestVersion;
      }
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Shared Navbar across all pages and roles */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handlePromptLogout}
      />

      {/* Shared Data Change Notification Banner */}
      {dataChangeNotice && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <NoticeBanner
            variant="info"
            title="Data changed in another session"
            message="Please reload the application to see the latest information."
            action={
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                >
                  Reload Now
                </button>
                <button
                  type="button"
                  onClick={handleDismissNotice}
                  className="px-3.5 py-1.5 bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                >
                  Later
                </button>
              </div>
            }
          />
        </div>
      )}

      {/* Shared Logout Confirmation Modal */}
      {showLogoutModal && (
        <LogoutConfirmModal
          onCancel={handleCancelLogout}
          onConfirm={handleConfirmLogout}
        />
      )}

      {/* View Routing */}
      {currentView === 'landing' && <LandingPage onNavigate={handleNavigate} />}
      {currentView === 'login' && (
        <LoginPage onNavigate={handleNavigate} onAuthSuccess={handleAuthSuccess} />
      )}
      {currentView === 'register' && (
        <RegisterPage onNavigate={handleNavigate} onAuthSuccess={handleAuthSuccess} />
      )}
      {currentView === 'dashboard' && (
        <DashboardPage currentUser={currentUser} onNavigate={handleNavigate} />
      )}

      {/* Member Features with Feature Preview Mode support */}
      {currentView === 'workouts' && (
        <WorkoutPlanPage
          isPreview={currentUser?.role === 'member' && memberStatus !== 'Active'}
          onNavigate={handleNavigate}
        />
      )}
      {currentView === 'exercises' && (
        <ExerciseLibraryPage
          currentUser={currentUser}
          isPreview={currentUser?.role === 'member' && memberStatus !== 'Active'}
          onNavigate={handleNavigate}
        />
      )}
      {currentView === 'attendance' && (
        <AttendancePage
          isPreview={currentUser?.role === 'member' && memberStatus !== 'Active'}
          onNavigate={handleNavigate}
        />
      )}
      {currentView === 'consistency' && (
        <ConsistencyReportPage
          isPreview={currentUser?.role === 'member' && memberStatus !== 'Active'}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'profile' && <ProfilePage currentUser={currentUser} onNavigate={handleNavigate} />}
      {currentView === 'membership' && <MembershipPage currentUser={currentUser} onNavigate={handleNavigate} />}
      {currentView === 'admin-users' && (
        <AdminUsersPage
          currentUser={currentUser}
          onNavigate={handleNavigate}
        />
      )}
      {currentView === 'admin-plans' && (
        <AdminPlansPage
          currentUser={currentUser}
          onNavigate={handleNavigate}
        />
      )}
      {currentView === 'admin-schedule' && (
        <AdminSchedulePage
          currentUser={currentUser}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}

export default App;
