import React, { useState, useEffect } from 'react';
import NoticeBanner from './NoticeBanner';

function MembershipPage({ currentUser, onNavigate }) {
  const [plans, setPlans] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const fetchPlansAndProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
      };

      // 1. Fetch active plans from database
      const plansRes = await fetch('/api/member/membership/plans', { headers });
      const plansJson = await plansRes.json();
      if (plansRes.ok && plansJson.status === 'success' && Array.isArray(plansJson.data)) {
        setPlans(plansJson.data);
      } else {
        throw new Error(plansJson.message || 'Failed to fetch membership plans.');
      }

      // 2. Fetch current member profile for renewal context
      const profileRes = await fetch('/api/member/profile', { headers });
      const profileJson = await profileRes.json();
      if (profileRes.ok && profileJson.status === 'success' && profileJson.data) {
        setProfile(profileJson.data);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err.message || 'Unable to connect to server to retrieve membership plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAndProfile();
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

  // Helper to calculate projected new expiry date based on current status
  const calculateProjectedExpiry = (durationMonths) => {
    const now = new Date();
    const currentExpiry = profile?.membership?.expiryDate ? new Date(profile.membership.expiryDate) : null;
    let baseDate = now;

    if (profile?.membership?.status === 'Active' && currentExpiry && currentExpiry > now) {
      baseDate = new Date(currentExpiry);
    }

    const projected = new Date(baseDate);
    projected.setMonth(projected.getMonth() + Number(durationMonths));
    return projected;
  };

  const handleSimulatePayment = async () => {
    if (!selectedPlan) return;
    setPayLoading(true);
    setError(null);

    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      // Secure backend flow: only planId sent. Backend determines actual price and calculates extension from DB.
      const res = await fetch('/api/member/membership/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({
          planId: selectedPlan._id,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.status !== 'success') {
        throw new Error(result.message || 'Payment simulation failed.');
      }

      setSuccessData({
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        expiryDate: result.data?.membershipExpiry,
      });

      setTimeout(() => {
        if (onNavigate) {
          onNavigate('profile');
        }
      }, 2500);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'An error occurred during payment.');
    } finally {
      setPayLoading(false);
    }
  };

  const membership = profile?.membership || {};
  const isCurrentlyActive = membership.status === 'Active';
  const currentExpiry = membership.expiryDate ? new Date(membership.expiryDate) : null;
  const isExpiringSoon =
    isCurrentlyActive && currentExpiry && (currentExpiry - new Date()) / (1000 * 60 * 60 * 24) <= 30;

  if (successData) {
    return (
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
        <div className="bg-white border border-emerald-200 rounded-lg p-8 shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
          <p className="text-sm text-slate-600 mb-2">
            Your <strong>{successData.planName}</strong> plan (₹{successData.amount}) has been activated.
          </p>
          <p className="text-xs text-emerald-700 font-semibold mb-6">
            Membership Valid Until: {formatDate(successData.expiryDate)}
          </p>
          <div className="w-6 h-6 border-2 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-[11px] text-slate-400 mt-3">Redirecting to your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Current Standing Notice if user has active/expiring plan */}
      {isCurrentlyActive && (
        <NoticeBanner
          variant={isExpiringSoon ? 'warning' : 'success'}
          title={`Current Membership: ${membership.plan}`}
          message={`Active through ${formatDate(membership.expiryDate)}${isExpiringSoon ? ' (Renewal Window Open)' : ''}`}
          secondaryText="Renewing now extends your current expiration date"
        />
      )}

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gym Membership Plans</h1>
        <p className="text-sm text-slate-600">
          Select an official plan from the FitPulse catalog to activate or extend your gym access.
        </p>
      </div>

      {error && (
        <NoticeBanner
          variant="error"
          title="Membership Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-xs text-slate-500 shadow-sm max-w-md mx-auto">
          <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading membership plans from database...
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center max-w-md mx-auto shadow-sm">
          <p className="text-sm font-semibold text-slate-700">No active membership plans available.</p>
          <p className="text-xs text-slate-500 mt-1">Please check back later or contact gym administration.</p>
        </div>
      ) : !selectedPlan ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative"
            >
              {plan.durationMonths === 6 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  Recommended
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 text-center mb-1">{plan.name}</h3>
              <p className="text-xs text-slate-500 text-center mb-4">
                {plan.description || `${plan.durationMonths} Month standard access`}
              </p>

              <div className="text-center mb-6">
                <span className="text-3xl font-extrabold text-emerald-700">₹{plan.price}</span>
                <span className="text-xs text-slate-400 block mt-1">
                  for {plan.durationMonths} {plan.durationMonths === 1 ? 'Month' : 'Months'}
                </span>
              </div>

              <div className="space-y-3 mb-8 flex-1">
                {[
                  'Full workout program access',
                  'Attendance logging & verification',
                  'Time-based consistency metrics',
                  'Trainer support option',
                  'Facility operating hours access',
                ].map((feature, i) => (
                  <div key={i} className="flex items-start space-x-2 text-xs text-slate-600">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                {isCurrentlyActive ? 'Extend with this Plan' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Plan Review & Mock Payment Confirmation Card */
        <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Membership Review</h2>
              <span className="text-xs text-slate-500">Verify details before confirmation</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Change Plan
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Selected Plan</span>
              <span className="font-semibold text-slate-900">{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Duration</span>
              <span className="font-semibold text-slate-900">{selectedPlan.durationMonths} Months</span>
            </div>

            {/* Projected Expiry Calculation */}
            <div className="p-3 bg-slate-50 border border-gray-200 rounded-md space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Action Type:</span>
                <span className="font-semibold text-slate-900">
                  {isCurrentlyActive ? 'Renewal / Extension' : 'New Subscription'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>New Expiry Date:</span>
                <span className="font-bold text-emerald-700">
                  {formatDate(calculateProjectedExpiry(selectedPlan.durationMonths))}
                </span>
              </div>
              {isCurrentlyActive && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Accumulated Duration:</span>
                  <span className="font-bold text-slate-900">
                    {(profile?.membership?.accumulatedDurationMonths || 12) + Number(selectedPlan.durationMonths)} Months
                  </span>
                </div>
              )}
              {isCurrentlyActive && (
                <p className="text-[10px] text-slate-500 pt-1 border-t border-gray-200 mt-1">
                  * Extends consecutively from current expiry ({formatDate(membership.expiryDate)})
                </p>
              )}
            </div>

            <div className="flex justify-between text-base pt-3 border-t border-gray-100">
              <span className="font-bold text-slate-900">Total Price</span>
              <span className="font-extrabold text-emerald-700 text-xl">₹{selectedPlan.price}</span>
            </div>
          </div>

          <button
            type="button"
            id="confirm-payment-btn"
            onClick={handleSimulatePayment}
            disabled={payLoading}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            {payLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              'Confirm Mock Payment'
            )}
          </button>
          <p className="text-center text-[11px] text-slate-500 mt-3 font-medium">
            Please note: All membership plans and renewals are non-refundable and can only be extended consecutively upon enrollment.
          </p>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            Simulated educational mock payment flow. No real credit card or bank is charged.
          </p>
        </div>
      )}
    </main>
  );
}

export default MembershipPage;
