'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getLeadById, getUsers, assignLead, closeLead } from '../../../services/api';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

// ─── Hierarchy Visualization ───────────────────────────────────────────────
function HierarchyDisplay({ hierarchy }) {
  const levels = [
    { key: 'level1', label: 'Level 1', desc: 'Assigned Agent' },
    { key: 'level2', label: 'Level 2', desc: 'Manager' },
    { key: 'level3', label: 'Level 3', desc: "Manager's Manager" },
  ];

  return (
    <div className="hierarchy-tree">
      {levels.map((lvl, idx) => {
        const user = hierarchy?.[lvl.key];
        return (
          <div key={lvl.key}>
            <div className={`hierarchy-node ${!user ? 'empty' : ''}`}>
              <span className="hierarchy-level-badge">{lvl.label}</span>
              <div style={{ flex: 1 }}>
                {user ? (
                  <>
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <div style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>
                      {user.email} &middot; {user.role}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>
                    {lvl.desc} — not available
                  </div>
                )}
              </div>
              {user && (
                <span className={`badge badge-${user.role.toLowerCase()}`}>{user.role}</span>
              )}
            </div>
            {idx < levels.length - 1 && (
              <div className="hierarchy-connector" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Commission Breakdown Table ────────────────────────────────────────────
function CommissionBreakdown({ commissions, revenue }) {
  const totalAmount = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

  const getLabel = (c) => {
    if (c.beneficiaryType === 'COMPANY') return 'Company';
    return c.user?.name || 'Unknown';
  };

  const getLevelLabel = (c) => {
    if (c.beneficiaryType === 'COMPANY') return '—';
    return `Level ${c.level}`;
  };

  return (
    <div className="commission-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Beneficiary</th>
            <th>Level</th>
            <th>Percentage</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {commissions.map((c) => (
            <tr key={c.id}>
              <td>
                <strong>{getLabel(c)}</strong>
                {c.beneficiaryType === 'COMPANY' && (
                  <span style={{ marginLeft: '6px', color: 'var(--text-faint)', fontSize: '0.78rem' }}>
                    (Company)
                  </span>
                )}
              </td>
              <td style={{ color: 'var(--text-muted)' }}>{getLevelLabel(c)}</td>
              <td style={{ color: 'var(--warning)' }}>
                {Number(c.percentage).toFixed(2)}%
              </td>
              <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                {formatCurrency(c.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="commission-total-row">
            <td colSpan={3}><strong>Total Revenue</strong></td>
            <td style={{ color: 'var(--primary)' }}>
              <strong>{formatCurrency(revenue)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Assign Lead Modal ────────────────────────────────────────────────────
function AssignModal({ leadId, users, onClose, onAssigned }) {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) { setError('Please select a user.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await assignLead(leadId, userId);
      onAssigned(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Assign Lead</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Select User *</label>
              <select
                className="form-select"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">— Select a user —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}){u.manager ? ` — mgr: ${u.manager.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Close Lead Confirm Modal ─────────────────────────────────────────────
function CloseConfirmModal({ lead, onClose, onClosed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await closeLead(lead.id);
      onClosed(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Close Lead</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
            Are you sure you want to close this lead and distribute the commission?
          </p>
          <div className="card-sm" style={{ marginBottom: '8px' }}>
            <p style={{ fontWeight: 600 }}>{lead.title}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{lead.customerName}</p>
            <p style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '6px' }}>
              Revenue: {formatCurrency(lead.revenue)}
            </p>
          </div>
          <p style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>
            ⚠️ This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Closing...' : 'Confirm Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Lead Detail Page ────────────────────────────────────────────────
export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id;

  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadRes, usersRes] = await Promise.all([
        getLeadById(id),
        getUsers(),
      ]);
      setData(leadRes.data);
      setUsers(usersRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssigned = (updatedLead) => {
    setShowAssign(false);
    setSuccessMsg(`Lead assigned to ${updatedLead.assignedUser?.name}.`);
    fetchData();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleClosed = (result) => {
    setShowClose(false);
    if (result.alreadyClosed) {
      setSuccessMsg('Lead was already closed. Showing existing commission breakdown.');
    } else {
      setSuccessMsg('Lead closed and commissions distributed successfully!');
    }
    fetchData();
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading"><div className="spinner" /> Loading lead details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Link href="/leads" className="back-link">← Back to Leads</Link>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const { lead, hierarchy, commissionBreakdown } = data;
  const isClosed = lead.status === 'CLOSED';

  return (
    <div className="page">
      <Link href="/leads" className="back-link">← Back to Leads</Link>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Lead Info */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 className="page-title">{lead.title}</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>{lead.customerName}</p>
          </div>
          <span className={`badge badge-${lead.status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
            {lead.status}
          </span>
        </div>

        <div className="detail-grid">
          <div className="detail-field">
            <label>Revenue</label>
            <p className="detail-revenue">{formatCurrency(lead.revenue)}</p>
          </div>
          <div className="detail-field">
            <label>Assigned To</label>
            <p>{lead.assignedUser?.name || <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Unassigned</span>}</p>
          </div>
          <div className="detail-field">
            <label>Status</label>
            <p>{lead.status}</p>
          </div>
          {lead.closedAt && (
            <div className="detail-field">
              <label>Closed At</label>
              <p>{new Date(lead.closedAt).toLocaleString()}</p>
            </div>
          )}
          <div className="detail-field">
            <label>Created</label>
            <p>{new Date(lead.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="section">
          <div className="section-title">Actions</div>
          <div className="action-bar">
            <button
              className="btn btn-ghost"
              onClick={() => setShowAssign(true)}
              disabled={isClosed}
              title={isClosed ? 'Cannot assign a closed lead' : ''}
            >
              👤 Assign Lead
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setShowClose(true)}
              disabled={isClosed}
              title={isClosed ? 'Lead already closed' : 'Close and distribute commission'}
            >
              {isClosed ? '✅ Lead Closed' : '🔒 Close Lead'}
            </button>
          </div>
        </div>
      </div>

      {/* Hierarchy */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-title">Commission Hierarchy</div>
        <HierarchyDisplay hierarchy={hierarchy} />
      </div>

      {/* Commission Breakdown (if closed) */}
      {isClosed && commissionBreakdown && commissionBreakdown.length > 0 && (
        <div className="card">
          <div className="section-title">Commission Breakdown</div>
          <CommissionBreakdown commissions={commissionBreakdown} revenue={lead.revenue} />
        </div>
      )}

      {/* Modals */}
      {showAssign && (
        <AssignModal
          leadId={lead.id}
          users={users}
          onClose={() => setShowAssign(false)}
          onAssigned={handleAssigned}
        />
      )}
      {showClose && (
        <CloseConfirmModal
          lead={lead}
          onClose={() => setShowClose(false)}
          onClosed={handleClosed}
        />
      )}
    </div>
  );
}
