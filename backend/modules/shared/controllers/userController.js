// controllers/userController.js
const User = require('../models/User');
const logger = require('../utils/logger');

const userController = {
  async create(req, res) {
    const { email, password, organization_id } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ message: 'User already exists' });
      }

      const newUser = await User.create({ email, password, organization_id });
      res.status(201).json(newUser);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to create user' });
    }
  },

  async getAll(req, res) {
    try {
      const result = await User.findAll();
      res.json(result);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  },

  async getById(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Error retrieving user' });
    }
  },

  async update(req, res) {
    try {
      const { email, organization_id } = req.body;
      const userId = req.params.id;

      const updatedUser = await User.update(userId, { email, organization_id });
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(updatedUser);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to update user' });
    }
  },

  async delete(req, res) {
    try {
      const userId = req.params.id;
      const deletedUser = await User.delete(userId);
      
      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  },

  async getUserRoles(req, res) {
    try {
      const userId = req.params.id;
      const roles = await User.getUserRoles(userId);
      res.json(roles);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to fetch user roles' });
    }
  },

  async assignRole(req, res) {
    try {
      const userId = req.params.id;
      const { role_id, organization_id } = req.body;

      if (!role_id) {
        return res.status(400).json({ message: 'Role ID is required' });
      }

      const result = await User.assignRole(userId, role_id, organization_id);
      res.json(result);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to assign role' });
    }
  },

  async removeRole(req, res) {
    try {
      const userId = req.params.id;
      const { role_id, organization_id } = req.body;

      if (!role_id) {
        return res.status(400).json({ message: 'Role ID is required' });
      }

      const result = await User.removeRole(userId, role_id, organization_id);
      if (!result) {
        return res.status(404).json({ message: 'Role assignment not found' });
      }

      res.json({ message: 'Role removed successfully' });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to remove role' });
    }
  }
};

module.exports = userController;