'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getLeads, createLead } from '../../services/api';

function CreateLeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', customerName: '', revenue: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const revenue = parseFloat(form.revenue);
      if (isNaN(revenue) || revenue <= 0) {
        throw new Error('Revenue must be a positive number.');
      }
      const res = await createLead({
        title: form.title.trim(),
        customerName: form.customerName.trim(),
        revenue,
      });
      onCreated(res.data);
    } catch (err) {
      setError(err.message || 'Failed to create lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Create Lead</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Website Development"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                className="form-input"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="e.g. ABC Ltd"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Revenue (₹) *</label>
              <input
                className="form-input"
                type="number"
                name="revenue"
                value={form.revenue}
                onChange={handleChange}
                placeholder="e.g. 100000"
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLeads();
      setLeads(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreated = () => {
    setShowModal(false);
    fetchLeads();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Track and manage your sales leads and commissions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Create Lead
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          Loading leads...
        </div>
      ) : leads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">No leads yet. Create the first lead.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Customer</th>
                <th>Revenue</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.title}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{lead.customerName}</td>
                  <td>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {formatCurrency(lead.revenue)}
                    </span>
                  </td>
                  <td>
                    {lead.assignedUser ? (
                      <span>{lead.assignedUser.name}</span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${lead.status.toLowerCase()}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <Link href={`/leads/${lead.id}`} className="btn btn-ghost btn-sm">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CreateLeadModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
