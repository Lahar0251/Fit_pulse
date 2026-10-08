/**
 * Tab-Isolated Authentication and Session Utilities
 * Uses sessionStorage to ensure each browser tab maintains its own independent session.
 */

const TOKEN_KEY = 'fitpulse_token';
const USER_KEY = 'fitpulse_user';
const TAB_ID_KEY = 'fitpulse_tab_id';

/**
 * Returns or generates a unique session ID for the current browser tab
 * @returns {string}
 */
export const getTabSessionId = () => {
  let tabId = sessionStorage.getItem(TAB_ID_KEY);
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  }
  return tabId;
};

/**
 * Retrieves the current tab's authentication token
 * @returns {string|null}
 */
export const getAuthToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || null;
  } catch (err) {
    console.error('Error reading auth token from sessionStorage:', err);
    return null;
  }
};

/**
 * Retrieves the current tab's authenticated user object
 * @returns {object|null}
 */
export const getAuthUser = () => {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error parsing auth user from sessionStorage:', err);
    return null;
  }
};

/**
 * Persists an authenticated session in the current tab's sessionStorage
 * Also cleans up any legacy shared localStorage to prevent cross-tab leaks
 * @param {object} user
 * @param {string} token
 */
export const setAuthSession = (user, token) => {
  try {
    if (user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
    // Clear shared localStorage keys so other tabs are not overwritten
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('Error saving auth session in sessionStorage:', err);
  }
};

/**
 * Clears the authentication session strictly for the current tab
 */
export const clearAuthSession = () => {
  try {
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('Error clearing auth session from sessionStorage:', err);
  }
};

/**
 * Generates standard headers including Bearer token and X-Tab-Session-Id
 * @param {object} [customHeaders={}]
 * @returns {object}
 */
export const getAuthHeaders = (customHeaders = {}) => {
  const token = getAuthToken();
  const tabId = getTabSessionId();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-Tab-Session-Id': tabId,
    ...customHeaders,
  };
};
