// src/components/Layout.js
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [showUserInfo, setShowUserInfo] = useState(true);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', permission: 'analytics:read' },
    { path: '/assets', label: 'Assets', permission: 'campaign:read' },
    { path: '/campaigns', label: 'Campaigns', permission: 'campaign:read' },
    { path: '/approvals', label: 'Approvals', permission: 'campaign:read' },
    { path: '/reports', label: 'Reports', permission: 'analytics:read' },
  ].filter(item => !item.permission || hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Ad Server SaaS
              </h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(item.path)
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium">{user.email}</div>
                    <div className="text-xs text-gray-500">
                      {user.roles?.map(role => role.name).join(', ')}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive(item.path)
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* User Info Panel (for debugging) */}
      {user && process.env.NODE_ENV === 'development' && showUserInfo && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-sm">User Info (Dev)</h3>
            <button
              onClick={() => setShowUserInfo(false)}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold leading-none"
              title="Dismiss"
            >
              ×
            </button>
          </div>
          <div className="text-xs space-y-1">
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Organization:</strong> {user.organization_id || 'None'}</div>
            <div><strong>Roles:</strong> {user.roles?.map(r => r.name).join(', ')}</div>
            <div><strong>Permissions:</strong> {user.permissions?.slice(0, 5).join(', ')}...</div>
            <div className="text-xs text-gray-500">
              {user.permissions?.length} total permissions
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;