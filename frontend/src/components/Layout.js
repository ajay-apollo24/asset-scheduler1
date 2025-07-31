// src/components/Layout.js
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="navbar bg-base-100 shadow px-6">
        <div className="flex-1">
          <a className="text-xl font-bold">Asset Scheduler</a>
        </div>
        <div className="flex-none gap-4">
          <span className="text-sm">Hi, {user?.email}</span>
          <button onClick={handleLogout} className="btn btn-sm btn-error text-white">Logout</button>
        </div>
      </header>

      <nav className="bg-base-200 px-6 py-2 flex gap-2 text-sm">
        <Link to="/" className="btn btn-ghost btn-sm">Dashboard</Link>
        <Link to="/assets" className="btn btn-ghost btn-sm">Assets</Link>
        <Link to="/bookings" className="btn btn-ghost btn-sm">Bookings</Link>
        <Link to="/bidding" className="btn btn-ghost btn-sm">Bidding</Link>
        <Link to="/approvals" className="btn btn-ghost btn-sm">Approvals</Link>
        <Link to="/reports" className="btn btn-ghost btn-sm">Reports</Link>
        <Link to="/ad-server/campaigns" className="btn btn-ghost btn-sm">Campaigns</Link>
      </nav>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default Layout;