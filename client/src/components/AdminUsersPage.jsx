import React, { useState, useEffect, useMemo } from 'react';
import NoticeBanner from './NoticeBanner';

function AdminUsersPage({ currentUser, onNavigate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [roleChangeModal, setRoleChangeModal] = useState(null);
  const [deleteUserModal, setDeleteUserModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Role guard: Do not allow ordinary members to access this page
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-red-200 rounded-lg p-8 text-center max-w-md mx-auto shadow-sm space-y-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
            Access Restricted
          </span>
          <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have administrative privileges to inspect or manage the platform user directory.
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

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/admin/users', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (res.ok && result.status === 'success' && Array.isArray(result.data)) {
        setUsers(result.data);
      } else {
        throw new Error(result.message || 'Failed to load user directory.');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Network error while connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  // Manage user status according to intended application permissions
  const handleUpdateStatus = async (userId, newStatus) => {
    setUpdatingUserId(userId);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({ membershipStatus: newStatus }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to update user status.');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, membershipStatus: newStatus } : u))
      );
      showNotification(`Membership status updated to ${newStatus}.`);
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update user status.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Request role change with modal confirmation
  const handleRoleSelect = (user, newRole) => {
    if (!newRole || newRole === user.role) return;
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    const targetUserId = String(user?.id || user?._id || '');
    const currentEmail = String(currentUser?.email || '').trim().toLowerCase();
    const targetEmail = String(user?.email || '').trim().toLowerCase();

    const isSelf = Boolean(
      (currentUserId && targetUserId && currentUserId === targetUserId) ||
      (currentEmail && targetEmail && currentEmail === targetEmail)
    );
    setRoleChangeModal({ user, newRole, isSelf });
  };

  // Confirm and save role change to MongoDB via Express API
  const handleConfirmRoleChange = async () => {
    if (!roleChangeModal) return;
    const { user, newRole } = roleChangeModal;
    setRoleChangeModal(null);
    setUpdatingUserId(user.id);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to update user role.');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...result.data, role: newRole } : u))
      );
      showNotification(`${user.fullName}'s role updated to ${formatRole(newRole)}.`);
    } catch (err) {
      console.error('Error updating role:', err);
      alert(err.message || 'Failed to update user role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUserModal) return;
    setDeleting(true);
    setError('');
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const userId = deleteUserModal.id || deleteUserModal._id;
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to delete user.');
      }

      setUsers((prev) => prev.filter((u) => (u.id || u._id) !== userId));
      showNotification(result.message || `User ${deleteUserModal.fullName} has been removed.`);
      setDeleteUserModal(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(err.message || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered users by search query and role filter
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.membershipStatus && u.membershipStatus.toLowerCase().includes(q));

      const matchesRole =
        selectedRoleFilter === 'All' ||
        (u.role && u.role.toLowerCase() === selectedRoleFilter.toLowerCase());

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRoleFilter]);

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

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                Admin Center
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">User Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Platform Users
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Inspect registered members, instructors, and system administrators. Manage enrollment statuses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-md border border-gray-300 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              Refresh Directory
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <NoticeBanner
          variant="success"
          title="User Action Successful"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}

      {/* Error alert banner */}
      {error && (
        <NoticeBanner
          variant="error"
          title="User Management Error"
          message={error}
          onClose={() => setError('')}
        />
      )}

      {/* Search and Role Filter Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Simple search bar */}
          <div className="flex-1 relative">
            <input
              id="admin-users-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user name, email, or role..."
              className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['All', 'Member', 'Trainer', 'Admin'].map((role) => {
              const isSelected = selectedRoleFilter === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                      : 'bg-white text-slate-700 border-gray-200 hover:bg-slate-50'
                  }`}
                >
                  {role === 'All' ? 'All Roles' : `${role}s`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Directory Listing
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            Showing {filteredUsers.length} of {users.length} Users
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900">Loading user records...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">No users found matching your search.</p>
            <p className="text-xs text-slate-500">
              Try adjusting your search terms or clearing the role filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedRoleFilter('All');
              }}
              className="mt-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Membership Details</th>
                  <th className="py-3 px-4">Registration Date</th>
                  <th className="py-3 px-4">Status Action</th>
                  <th className="py-3 px-4 text-center w-28">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user, idx) => {
                  const isUpdating = updatingUserId === user.id;
                  const currentUserId = String(currentUser?.id || currentUser?._id || '');
                  const targetUserId = String(user?.id || user?._id || '');
                  const currentEmail = String(currentUser?.email || '').trim().toLowerCase();
                  const targetEmail = String(user?.email || '').trim().toLowerCase();

                  const isSelf = Boolean(
                    (currentUserId && targetUserId && currentUserId === targetUserId) ||
                    (currentEmail && targetEmail && currentEmail === targetEmail)
                  );
                  return (
                    <tr key={user.id || user._id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{user.fullName}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5">
                          <select
                            disabled={isUpdating}
                            value={user.role}
                            onChange={(e) => handleRoleSelect(user, e.target.value)}
                            className="text-xs bg-white border border-gray-300 rounded px-2.5 py-1 text-slate-700 font-semibold focus:outline-none focus:border-emerald-600 cursor-pointer disabled:opacity-50"
                            title="Change user role"
                          >
                            <option value="member">Member</option>
                            <option value="trainer">Trainer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {user.role === 'member' ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  user.membershipStatus === 'Active'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : user.membershipStatus === 'Frozen'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : user.membershipStatus === 'Expired'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {user.membershipStatus || 'Active'}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {user.membershipPlan || '12 Months Plan'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              <span>Start: {formatDate(user.membershipStartDate || user.createdAt)}</span>
                              <span className="mx-1 text-slate-400">&bull;</span>
                              <span>End: {formatDate(user.membershipExpiry)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Staff (N/A)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {user.role === 'member' ? (
                          <div className="inline-flex items-center gap-1">
                            <select
                              disabled={isUpdating}
                              value={user.membershipStatus || 'Active'}
                              onChange={(e) => handleUpdateStatus(user.id || user._id, e.target.value)}
                              className="text-xs bg-white border border-gray-300 rounded px-2 py-1 text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer disabled:opacity-50"
                              title="Update membership status"
                            >
                              <option value="Active">Active</option>
                              <option value="Frozen">Frozen</option>
                              <option value="Expired">Expired</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isSelf ? (
                          <button
                            type="button"
                            id={`delete-user-${user.id || user._id}`}
                            onClick={() => setDeleteUserModal({ ...user, isSelf: true })}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer"
                            title="Active Admin (Currently Logged In)"
                          >
                            Active Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            id={`delete-user-${user.id || user._id}`}
                            onClick={() => setDeleteUserModal({ ...user, isSelf: false })}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors cursor-pointer"
                            title={`Delete ${user.fullName}`}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Change Confirmation / Self Warning Modal */}
      {roleChangeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 space-y-4">
            {roleChangeModal.isSelf ? (
              <>
                <div className="flex items-center space-x-2.5 text-amber-600">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <h3 className="text-base font-bold text-slate-900">Warning: Changing Your Own Role</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  You are changing your own role. Your current Admin access will end the next time your authorization is refreshed or you log in.
                </p>
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setRoleChangeModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRoleChange}
                    className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-sm transition-colors cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2 text-slate-900">
                  <h3 className="text-base font-bold">Confirm Role Change</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Change <strong>{roleChangeModal.user.fullName}</strong>'s role from{' '}
                  <span className="font-semibold text-slate-800">{formatRole(roleChangeModal.user.role)}</span> to{' '}
                  <span className="font-bold text-emerald-700">{formatRole(roleChangeModal.newRole)}</span>?
                </p>
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setRoleChangeModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRoleChange}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors cursor-pointer"
                  >
                    Confirm Change
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 space-y-4">
            {deleteUserModal.isSelf ? (
              <>
                <div className="flex items-center space-x-2.5 text-amber-600">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <h3 className="text-base font-bold text-slate-900">Active Administrator Account</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  You are currently logged in as <strong>{deleteUserModal.fullName}</strong> ({deleteUserModal.email}).
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 leading-relaxed">
                  <strong>Protected Action:</strong> To prevent immediate session lockout, an administrator cannot delete their own active account while signed in. To delete this account, sign in from another administrator account.
                </div>
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeleteUserModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2.5 text-red-600">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <h3 className="text-base font-bold text-slate-900">Delete User Account</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to permanently remove <strong>{deleteUserModal.fullName}</strong> ({deleteUserModal.email})?
                </p>
                {deleteUserModal.role === 'trainer' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 leading-relaxed">
                    <strong>Note:</strong> Deleting this trainer will reassign any assigned members back to default FitPulse recommended plans.
                  </div>
                )}
                {deleteUserModal.role === 'admin' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 leading-relaxed">
                    <strong>Admin Notice:</strong> You are removing another platform administrator. Their administrative privileges will be revoked permanently.
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  This action will permanently delete all associated account data from the database.
                </p>
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteUserModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="confirm-delete-user-btn"
                    disabled={deleting}
                    onClick={handleConfirmDeleteUser}
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminUsersPage;
