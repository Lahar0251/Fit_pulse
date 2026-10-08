import React, { useState, useEffect } from 'react';

function AdminDashboard({ currentUser, onNavigate }) {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalTrainers: 0,
    activeMemberships: 0,
    todaysAttendance: 0,
  });
  const [users, setUsers] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
      };

      // Fetch actual statistics from MongoDB
      const statsRes = await fetch('/api/admin/system-overview', { headers });
      const statsResult = await statsRes.json();

      if (statsRes.ok && statsResult.status === 'success' && statsResult.data) {
        setStats(statsResult.data);
      } else {
        throw new Error(statsResult.message || 'Failed to load system statistics.');
      }

      // Fetch users list for Users section
      const usersRes = await fetch('/api/admin/users', { headers });
      const usersResult = await usersRes.json();
      if (usersRes.ok && usersResult.status === 'success' && Array.isArray(usersResult.data)) {
        setUsers(usersResult.data);
      }

      // Fetch operating schedule
      const schedRes = await fetch('/api/admin/schedule', { headers });
      const schedResult = await schedRes.json();
      if (schedRes.ok && schedResult.status === 'success' && schedResult.data) {
        setSchedule(schedResult.data);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError(err.message || 'Network error while connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const formatRole = (role) => {
    if (!role) return 'Member';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading system overview...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center max-w-lg mx-auto shadow-sm">
          <p className="text-sm font-semibold text-red-600 mb-2">Unable to load dashboard data</p>
          <p className="text-xs text-slate-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchAdminData}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                Admin Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              System Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              High-level operational metrics and member platform statistics.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={fetchAdminData}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-slate-50 shadow-sm cursor-pointer"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* 4 Simple Platform Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Members */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Total Members
          </span>
          <p className="text-2xl font-bold text-slate-900">{stats.totalMembers}</p>
          <p className="text-xs text-slate-500 mt-1">Registered gym trainees</p>
        </div>

        {/* Card 2: Total Trainers */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Total Trainers
          </span>
          <p className="text-2xl font-bold text-slate-900">{stats.totalTrainers}</p>
          <p className="text-xs text-slate-500 mt-1">Certified gym instructors</p>
        </div>

        {/* Card 3: Active Memberships */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Active Memberships
          </span>
          <p className="text-2xl font-bold text-emerald-700">{stats.activeMemberships}</p>
          <p className="text-xs text-slate-500 mt-1">Enrolled active accounts</p>
        </div>

        {/* Card 4: Today's Attendance */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Today's Attendance
          </span>
          <p className="text-2xl font-bold text-emerald-700">{stats.todaysAttendance}</p>
          <p className="text-xs text-slate-500 mt-1">Total visits logged today</p>
        </div>
      </div>

      {/* Section View: Users List */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registered Platform Users</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of current members, trainers, and administrative accounts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {users.length} Users
              </span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin-users')}
                  className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
                >
                  Manage Users &rarr;
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u, idx) => (
                  <tr key={u._id || idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{u.fullName}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${u.role === 'admin'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : u.role === 'trainer'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                      >
                        {formatRole(u.role)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Section View: Membership Plans */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Membership Plans & Pricing</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Administer active subscription packages, rates, and validity periods.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin-plans')}
                  className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
                >
                  Manage Plans &rarr;
                </button>
              )}
            </div>
          </div>
          <div className="p-4 bg-slate-50 border border-gray-200 rounded-md flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Live Membership Catalog</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Create new plans, adjust INR pricing, change duration, and toggle availability.
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('admin-plans')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm cursor-pointer"
              >
                Open Plans Manager
              </button>
            )}
          </div>
        </div>


      {/* Section View: Gym Operating Schedule */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Gym Operating Schedule</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard facility hours and training availability.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Active Schedule
              </span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin-schedule')}
                  className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
                >
                  Configure Schedule &rarr;
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-gray-200 rounded-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Facility Availability
              </span>
              <p className="text-sm font-bold text-slate-900">
                7 Days a Week (Mon &ndash; Sun)
              </p>
              <p className="text-xs text-emerald-700 font-medium mt-1">Full Operations Available</p>
            </div>

            <div className="p-4 bg-slate-50 border border-gray-200 rounded-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Standard Facility Hours
              </span>
              <p className="text-sm font-bold text-slate-900">
                {schedule?.openingTime || '06:00 AM'} &ndash; {schedule?.closingTime || '10:00 PM'}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Configurable per day in Schedule Center
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-gray-200 rounded-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Scheduled Closures
              </span>
              <p className="text-sm font-bold text-slate-900">
                {Array.isArray(schedule?.closures) && schedule.closures.length > 0
                  ? `${schedule.closures.length} Upcoming Closure${schedule.closures.length > 1 ? 's' : ''}`
                  : '0 Active Closures'}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Overrides weekly hours for specific dates
              </p>
            </div>
          </div>
        </div>
    </main>
  );
}

export default AdminDashboard;
