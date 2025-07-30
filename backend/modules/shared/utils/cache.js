const redis = require('redis');
const logger = require('../../shared/utils/logger');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => logger.error('Redis Client Error', err));
client.connect().catch(err => logger.error('Redis connection error', err));

const cache = {
  async get(key) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  },

  async set(key, value, ttl = 300) {
    try {
      await client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
    }
  },

  async del(key) {
    try {
      await client.del(key);
    } catch (error) {
      logger.error('Cache del error', { key, error: error.message });
    }
  },

  getClient() {
    return client;
  }
};

module.exports = cache;
