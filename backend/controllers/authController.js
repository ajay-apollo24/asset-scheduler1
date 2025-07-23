// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const AuthController = {
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    let user;
    try {
      user = await User.findByEmail(email);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: 'Error retrieving user' });
    }

    if (!user) {
      logger.warn(`Invalid credentials for email ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logger.warn(`Invalid credentials for email ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { user_id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token });
  },

  async me(req, res) {
    const { user } = req;
    const fullUser = await User.findById(user.user_id);
    return res.json(fullUser);
  }
};

module.exports = AuthController;