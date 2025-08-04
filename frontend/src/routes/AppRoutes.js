// src/routes/AppRoutes.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Assets from '../pages/Assets';
import Bookings from '../pages/Bookings';
import Bidding from '../pages/Bidding';
import Approvals from '../pages/Approvals';
import Reports from '../pages/Reports';
import Campaigns from '../pages/AdServer/Campaigns';
import CreateCampaign from '../pages/AdServer/CreateCampaign';

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
        <Route path="/dashboard" element={
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
        <Route path="/bidding" element={
          <PrivateRoute>
            <Bidding />
          </PrivateRoute>
        } />
        <Route path="/approvals" element={
          <PrivateRoute>
            <Approvals />
          </PrivateRoute>
        } />
        <Route path="/reports" element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        } />
        <Route path="/ad-server/campaigns" element={
          <PrivateRoute>
            <Campaigns />
          </PrivateRoute>
        } />
        <Route path="/ad-server/campaigns/create" element={
          <PrivateRoute>
            <CreateCampaign />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
};

export default AppRoutes;