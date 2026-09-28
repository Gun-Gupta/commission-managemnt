import Link from 'next/link';

export default function Home() {
  return (
    <div className="page">
      <div style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💼</div>
        <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: '12px' }}>
          Commission Management System
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '36px', maxWidth: '500px', margin: '0 auto 36px' }}>
          Manage leads, assign agents, and automatically distribute commissions
          across your sales hierarchy.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/users" className="btn btn-ghost">
            👥 Manage Users
          </Link>
          <Link href="/leads" className="btn btn-primary">
            📋 View Leads
          </Link>
        </div>
      </div>
    </div>
  );
}
