/**
 * Centralized API utility for all backend communication.
 * All calls go through the Express backend — no Next.js API routes.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.errors = data.errors;
    throw err;
  }

  return data;
}

// --- Users ---
export const getUsers = () => request('/api/users');
export const createUser = (body) => request('/api/users', { method: 'POST', body });

// --- Leads ---
export const getLeads = () => request('/api/leads');
export const createLead = (body) => request('/api/leads', { method: 'POST', body });
export const getLeadById = (id) => request(`/api/leads/${id}`);
export const assignLead = (id, userId) =>
  request(`/api/leads/${id}/assign`, { method: 'POST', body: { userId } });
export const closeLead = (id) => request(`/api/leads/${id}/close`, { method: 'POST' });
