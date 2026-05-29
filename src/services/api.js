const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://maccweb.onrender.com/api/v1';
const SESSION_KEY = 'macc.session';

function normalizeErrorDetail(detail) {
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || item.message || String(item)).join(', ');
  }
  if (typeof detail === 'object' && detail !== null) {
    return detail.message || JSON.stringify(detail);
  }
  return detail;
}

async function request(path, options = {}) {
  const { token, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    ...rest,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(normalizeErrorDetail(payload.detail) || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function userFromTokenResponse(response) {
  return {
    name: response.user.full_name,
    email: response.user.email,
    role: response.user.roles?.[0] || 'user',
    permissions: response.user.permissions || [],
    token: response.access_token,
  };
}

export const ApiClient = {
  baseUrl: API_BASE_URL,

  async login(email, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  me(token) {
    return request('/auth/me', { token });
  },

  dashboardSummary(token) {
    return request('/dashboard/summary', { token });
  },

  accounts(token) {
    return request('/accounting/accounts', { token });
  },

  journalEntries(token) {
    return request('/accounting/journal-entries', { token });
  },

  createJournalEntry(token, payload) {
    return request('/accounting/journal-entries', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  trialBalance(token) {
    return request('/accounting/trial-balance', { token });
  },

  partners(token) {
    return request('/parties/partners', { token });
  },

  warehouses(token) {
    return request('/inventory/warehouses', { token });
  },

  items(token) {
    return request('/inventory/items', { token });
  },

  salesInvoices(token) {
    return request('/sales/invoices', { token });
  },

  purchaseInvoices(token) {
    return request('/purchases/invoices', { token });
  },

  employees(token) {
    return request('/hr/employees', { token });
  },

  reportsOverview(token) {
    return request('/reports/overview', { token });
  },

  systemModules() {
    return request('/system/modules');
  },

  systemAdminCompanies(token) {
    return request('/system-admin/companies', { token });
  },

  systemAdminUsers(token) {
    return request('/system-admin/users', { token });
  },

  createCompanyAccount(token, payload) {
    return request('/system-admin/companies', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  activateCompany(token, companyId) {
    return request(`/system-admin/companies/${companyId}/activate`, {
      method: 'POST',
      token,
    });
  },

  deactivateCompany(token, companyId) {
    return request(`/system-admin/companies/${companyId}/deactivate`, {
      method: 'POST',
      token,
    });
  },

  deleteCompany(token, companyId) {
    return request(`/system-admin/companies/${companyId}`, {
      method: 'DELETE',
      token,
    });
  },

  activateUser(token, userId) {
    return request(`/system-admin/users/${userId}/activate`, {
      method: 'POST',
      token,
    });
  },

  deactivateUser(token, userId) {
    return request(`/system-admin/users/${userId}/deactivate`, {
      method: 'POST',
      token,
    });
  },

  saveSession(response) {
    const session = userFromTokenResponse(response);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  getSession() {
    try {
      const saved = window.localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  clearSession() {
    window.localStorage.removeItem(SESSION_KEY);
  },
};
