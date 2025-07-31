// controllers/userController.js
const User = require('../models/User');
const logger = require('../../shared/utils/logger');

const UserController = {
  async create(req, res) {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'email, password and role are required' });
    }

    try {
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ message: 'User already exists' });
      }

      const newUser = await User.create({ email, password, role });
      res.status(201).json(newUser);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to create user' });
    }
  },

  async getAll(req, res) {
    try {
      const result = await User.findAll(); // you can implement this in model if needed
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
      const updated = await User.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: 'User not found' });
      res.json(updated);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to update user' });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await User.delete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User deleted' });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  },

  async getUserRoles(req, res) {
    try {
      const roles = await User.getUserRoles(req.params.id);
      res.json(roles);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to get user roles' });
    }
  },

  async assignRole(req, res) {
    const { role_id, organization_id } = req.body;
    try {
      const result = await User.assignRole(req.params.id, role_id, organization_id);
      res.status(201).json(result);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to assign role' });
    }
  },

  async removeRole(req, res) {
    const { roleId } = req.params;
    const { organization_id } = req.body;
    try {
      const result = await User.removeRole(req.params.id, roleId, organization_id);
      if (!result) return res.status(404).json({ message: 'Role not found' });
      res.json(result);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to remove role' });
    }
  }
};

module.exports = UserController;