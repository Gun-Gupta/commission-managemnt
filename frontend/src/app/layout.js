import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Commission Management System',
  description: 'Lead and commission tracking for sales teams',
};

function Navbar() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          💼 <span>CommissionOS</span>
        </Link>
        <Link href="/users" className="nav-link">Users</Link>
        <Link href="/leads" className="nav-link">Leads</Link>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
