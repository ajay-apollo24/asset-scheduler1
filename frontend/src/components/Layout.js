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
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="text-xl font-semibold">Asset Scheduler</div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">Hi, {user?.email}</span>
          <button onClick={handleLogout} className="text-red-600 text-sm hover:underline">
            Logout
          </button>
        </div>
      </header>

      <nav className="bg-gray-200 px-6 py-2 flex gap-6 text-sm font-medium text-gray-700">
        <Link to="/" className="hover:underline">Dashboard</Link>
        <Link to="/assets" className="hover:underline">Assets</Link>
        <Link to="/bookings" className="hover:underline">Bookings</Link>
        <Link to="/approvals" className="hover:underline">Approvals</Link>
      </nav>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default Layout;