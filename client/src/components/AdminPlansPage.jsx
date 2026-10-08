import React, { useState, useEffect } from 'react';
import NoticeBanner from './NoticeBanner';

function AdminPlansPage({ currentUser, onNavigate }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form modal state for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    durationMonths: 1,
    price: 999,
    description: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/admin/plans', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });
      const data = await res.json();
      if (res.ok && data.status === 'success' && Array.isArray(data.data)) {
        setPlans(data.data);
      } else {
        throw new Error(data.message || 'Failed to load membership plans.');
      }
    } catch (err) {
      console.error('Error fetching admin plans:', err);
      setError(err.message || 'Unable to load membership plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openAddModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      durationMonths: 1,
      price: 999,
      description: '',
      isActive: true,
    });
    setIsModalOpen(true);
    setError('');
    setSuccessMsg('');
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      durationMonths: plan.durationMonths,
      price: plan.price,
      description: plan.description || '',
      isActive: plan.isActive,
    });
    setIsModalOpen(true);
    setError('');
    setSuccessMsg('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    if (!formData.name.trim()) {
      setError('Plan name is required.');
      setSubmitting(false);
      return;
    }

    const duration = Number(formData.durationMonths);
    if (isNaN(duration) || duration < 1) {
      setError('Duration must be at least 1 month.');
      setSubmitting(false);
      return;
    }

    const priceNum = Number(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Price must be a positive number.');
      setSubmitting(false);
      return;
    }

    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const url = editingPlan
        ? `/api/admin/plans/${editingPlan._id}`
        : '/api/admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          durationMonths: duration,
          price: priceNum,
          description: formData.description.trim(),
          isActive: Boolean(formData.isActive),
        }),
      });

      const result = await res.json();
      if (!res.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to save membership plan.');
      }

      setSuccessMsg(
        editingPlan
          ? `Plan "${formData.name}" updated successfully!`
          : `New plan "${formData.name}" created successfully!`
      );
      closeModal();
      await fetchPlans();
    } catch (err) {
      console.error('Plan submit error:', err);
      setError(err.message || 'Failed to save plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/admin/plans/${plan._id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (!res.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to update plan status.');
      }

      setSuccessMsg(`Plan "${plan.name}" is now ${result.data?.isActive ? 'Active' : 'Inactive'}.`);
      await fetchPlans();
    } catch (err) {
      console.error('Toggle status error:', err);
      setError(err.message || 'Failed to toggle status.');
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                Admin Center
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500">Subscription Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Membership Plans Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Configure official membership pricing, durations, and availability for all gym members.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              id="add-plan-btn"
              onClick={openAddModal}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>+ Add New Plan</span>
            </button>
            <button
              type="button"
              onClick={fetchPlans}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-slate-50 shadow-sm cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <NoticeBanner
          variant="error"
          title="Plan Management Error"
          message={error}
          onClose={() => setError('')}
        />
      )}
      {successMsg && (
        <NoticeBanner
          variant="success"
          title="Membership Updated"
          message={successMsg}
          onClose={() => setSuccessMsg('')}
        />
      )}

      {/* Plans List Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Database Membership Plans</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only active plans appear on the member subscription checkout page.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            {plans.length} Plans Configured
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading plans from database...
          </div>
        ) : plans.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No membership plans found in database. Click "Add New Plan" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Price (INR)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700">
                      {p.durationMonths} {p.durationMonths === 1 ? 'Month' : 'Months'}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700">₹{p.price}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                          p.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {p.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded border border-gray-300 shadow-sm cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p)}
                        className={`px-3 py-1 text-xs font-semibold rounded border shadow-sm cursor-pointer transition-colors ${
                          p.isActive
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingPlan ? 'Edit Membership Plan' : 'Add Membership Plan'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Plan Name <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. 1 Month, 3 Months, Annual Pro"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Duration (Months) <span className="text-emerald-600">*</span>
                  </label>
                  <input
                    type="number"
                    name="durationMonths"
                    min="1"
                    value={formData.durationMonths}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Price (INR) <span className="text-emerald-600">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows="2"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of member features"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Active Plan (Visible to members for purchase)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminPlansPage;
