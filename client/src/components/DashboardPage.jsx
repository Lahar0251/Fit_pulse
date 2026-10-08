import React from 'react';
import MemberDashboard from './MemberDashboard';
import TrainerDashboard from './TrainerDashboard';
import AdminDashboard from './AdminDashboard';

function DashboardPage({ currentUser, onNavigate }) {
  if (!currentUser) {
    return null;
  }

  const role = currentUser.role || 'member';

  if (role === 'member') {
    return <MemberDashboard currentUser={currentUser} onNavigate={onNavigate} />;
  }

  if (role === 'trainer') {
    return <TrainerDashboard currentUser={currentUser} />;
  }

  if (role === 'admin') {
    return <AdminDashboard currentUser={currentUser} onNavigate={onNavigate} />;
  }

  return null;
}

export default DashboardPage;
