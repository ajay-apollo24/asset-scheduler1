const db = require('./db');
const bcrypt = require('bcrypt');

(async () => {
  const pwHash = await bcrypt.hash('admin_2025', 10);
  await db.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1,$2,$3)
     ON CONFLICT (email) DO NOTHING`,
    ['admin_2025@localhost', pwHash, 'admin']
  );
  console.log('✅ admin_2025 user inserted');
  process.exit(0);
})();