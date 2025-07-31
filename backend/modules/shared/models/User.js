// models/User.js
const db = require('../../../config/db');
const bcrypt = require('bcryptjs');

class User {
  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findAll() {
    const result = await db.query('SELECT id, email, organization_id FROM users ORDER BY id');
    return result.rows;
  }

  static async create(userData) {
    const { email, password, organization_id } = userData;
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      'INSERT INTO users (email, password_hash, organization_id) VALUES ($1, $2, $3) RETURNING *',
      [email, passwordHash, organization_id]
    );
    return result.rows[0];
  }

  static async update(id, userData) {
    const { email, organization_id } = userData;
    const result = await db.query(
      'UPDATE users SET email = $1, organization_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [email, organization_id, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  // RBAC Methods
  static async getUserRoles(userId) {
    const result = await db.query(`
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system_role,
        o.name as organization_name,
        o.id as organization_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN organizations o ON ur.organization_id = o.id
      WHERE ur.user_id = $1
      ORDER BY r.is_system_role DESC, r.name
    `, [userId]);
    return result.rows;
  }

  static async getUserPermissions(userId) {
    const result = await db.query(`
      SELECT DISTINCT
        p.id,
        p.name,
        p.description,
        p.resource,
        p.action
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
      ORDER BY p.resource, p.action
    `, [userId]);
    return result.rows;
  }

  static async hasPermission(userId, permissionName) {
    const result = await db.query(`
      SELECT COUNT(*) as count
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1 AND p.name = $2
    `, [userId, permissionName]);
    return result.rows[0].count > 0;
  }

  static async hasAnyPermission(userId, permissionNames) {
    const result = await db.query(`
      SELECT COUNT(*) as count
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1 AND p.name = ANY($2)
    `, [userId, permissionNames]);
    return result.rows[0].count > 0;
  }

  static async hasAllPermissions(userId, permissionNames) {
    const result = await db.query(`
      SELECT COUNT(DISTINCT p.name) as count
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1 AND p.name = ANY($2)
    `, [userId, permissionNames]);
    return result.rows[0].count === permissionNames.length;
  }

  static async getUserWithRoles(userId) {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return null;

    const user = userResult.rows[0];
    const roles = await this.getUserRoles(userId);
    const permissions = await this.getUserPermissions(userId);

    return {
      ...user,
      roles,
      permissions: permissions.map(p => p.name)
    };
  }

  static async assignRole(userId, roleId, organizationId) {
    const result = await db.query(
      `INSERT INTO user_roles (user_id, role_id, organization_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id, organization_id) DO NOTHING
       RETURNING *`,
      [userId, roleId, organizationId]
    );
    return result.rows[0];
  }

  static async removeRole(userId, roleId, organizationId) {
    const result = await db.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 AND organization_id = $3 RETURNING *',
      [userId, roleId, organizationId]
    );
    return result.rows[0];
  }

  static async getUsersByOrganization(organizationId) {
    const result = await db.query(`
      SELECT 
        u.id,
        u.email,
        u.organization_id,
        o.name as organization_name,
        array_agg(r.name) as roles
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.organization_id = $1
      GROUP BY u.id, u.email, u.organization_id, o.name
      ORDER BY u.email
    `, [organizationId]);
    return result.rows;
  }

  static async validatePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

module.exports = User;