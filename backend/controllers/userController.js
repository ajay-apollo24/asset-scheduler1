// controllers/userController.js
const User = require('../models/User');
const logger = require('../utils/logger');

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
  }
};

module.exports = UserController;