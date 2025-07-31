// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await User.validatePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Get user roles and permissions
      const roles = await User.getUserRoles(user.id);
      const permissions = await User.getUserPermissions(user.id);

      // Create JWT payload with RBAC info
      const payload = {
        user_id: user.id,
        email: user.email,
        organization_id: user.organization_id,
        roles: roles.map(r => r.name),
        permissions: permissions.map(p => p.name)
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        roles: roles.map(r => r.name)
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          organization_id: user.organization_id,
          roles,
          permissions: permissions.map(p => p.name)
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async register(req, res) {
    try {
      const { email, password, organization_id } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create user
      const user = await User.create({ email, password, organization_id });

      // Get user roles and permissions (will be empty for new users)
      const roles = await User.getUserRoles(user.id);
      const permissions = await User.getUserPermissions(user.id);

      // Create JWT payload
      const payload = {
        user_id: user.id,
        email: user.email,
        organization_id: user.organization_id,
        roles: roles.map(r => r.name),
        permissions: permissions.map(p => p.name)
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email
      });

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          organization_id: user.organization_id,
          roles,
          permissions: permissions.map(p => p.name)
        }
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getProfile(req, res) {
    try {
      const userId = req.user.user_id;
      const userWithRoles = await User.getUserWithRoles(userId);

      if (!userWithRoles) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        user: {
          id: userWithRoles.id,
          email: userWithRoles.email,
          organization_id: userWithRoles.organization_id,
          roles: userWithRoles.roles,
          permissions: userWithRoles.permissions
        }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async verifyToken(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const userWithRoles = await User.getUserWithRoles(decoded.user_id);

      if (!userWithRoles) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      res.json({
        valid: true,
        user: {
          id: userWithRoles.id,
          email: userWithRoles.email,
          organization_id: userWithRoles.organization_id,
          roles: userWithRoles.roles,
          permissions: userWithRoles.permissions
        }
      });

    } catch (error) {
      logger.error('Token verification error:', error);
      res.status(401).json({ message: 'Invalid token' });
    }
  }
};

module.exports = authController;