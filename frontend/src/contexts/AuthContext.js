// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    console.log('🔐 AuthContext: Initializing...');
    const token = localStorage.getItem('token');
    console.log('🔑 AuthContext: Token found:', token ? 'Yes' : 'No');
    
    if (token) {
      console.log('🔑 AuthContext: Setting Authorization header');
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      verifyToken();
    } else {
      console.log('🔑 AuthContext: No token, setting loading to false');
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      console.log('🔐 AuthContext: Verifying token...');
      const response = await apiClient.post('/auth/verify');
      console.log('🔐 AuthContext: Token verification response:', response.data);
      
      if (response.data.valid) {
        const userData = response.data.user;
        console.log('👤 AuthContext: Setting user data:', userData);
        setUser(userData);
        setPermissions(userData.permissions || []);
        setRoles(userData.roles || []);
        console.log('🔐 AuthContext: User authenticated successfully');
      } else {
        console.log('❌ AuthContext: Token invalid, logging out');
        logout();
      }
    } catch (error) {
      console.error('❌ AuthContext: Token verification failed:', error);
      logout();
    } finally {
      setLoading(false);
      console.log('🔐 AuthContext: Token verification completed');
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Attempting login for:', email);
      const response = await apiClient.post('/auth/login', { email, password });
      console.log('🔐 AuthContext: Login response:', response.data);
      
      const { token, user: userData } = response.data;
      
      console.log('🔑 AuthContext: Storing token in localStorage');
      localStorage.setItem('token', token);
      console.log('🔑 AuthContext: Setting Authorization header');
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('👤 AuthContext: Setting user data:', userData);
      setUser(userData);
      setPermissions(userData.permissions || []);
      setRoles(userData.roles || []);
      
      console.log('✅ AuthContext: Login successful');
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (email, password, organization_id) => {
    try {
      const response = await apiClient.post('/auth/register', { 
        email, 
        password, 
        organization_id 
      });
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      setPermissions(userData.permissions || []);
      setRoles(userData.roles || []);
      
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setPermissions([]);
    setRoles([]);
  };

  // RBAC Helper Functions
  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(permission => permissions.includes(permission));
  };

  const hasRole = (roleName) => {
    return roles.some(role => role.name === roleName);
  };

  const hasAnyRole = (roleNames) => {
    return roles.some(role => roleNames.includes(role.name));
  };

  const isPlatformAdmin = () => {
    return hasRole('platform_admin');
  };

  const isOrgAdmin = () => {
    return hasRole('org_admin');
  };

  const isAdmin = () => {
    return hasRole('admin') || hasRole('platform_admin');
  };

  const canManageCampaigns = () => {
    return hasAnyPermission(['campaign:create', 'campaign:update', 'campaign:delete']);
  };

  const canViewAnalytics = () => {
    return hasPermission('analytics:read');
  };

  const canManageUsers = () => {
    return hasAnyPermission(['user:create', 'user:update', 'user:delete', 'user:assign_roles']);
  };

  const value = {
    user,
    loading,
    permissions,
    roles,
    login,
    register,
    logout,
    // RBAC helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isPlatformAdmin,
    isOrgAdmin,
    isAdmin,
    canManageCampaigns,
    canViewAnalytics,
    canManageUsers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};