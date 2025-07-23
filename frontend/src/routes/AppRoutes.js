// src/routes/AppRoutes.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Assets from '../pages/Assets';
import Bookings from '../pages/Bookings';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path="/assets" element={
          <PrivateRoute>
            <Assets />
          </PrivateRoute>
        } />
        <Route path="/bookings" element={
          <PrivateRoute>
            <Bookings />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
};

export default AppRoutes;