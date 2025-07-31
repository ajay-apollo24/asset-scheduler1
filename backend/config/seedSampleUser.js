const db = require('./db');
const bcrypt = require('bcryptjs');

const seedUsers = async () => {
  try {
    console.log('🌱 Seeding sample users...');

    const users = [
      {
        email: 'admin@company.com',
        password: 'admin123',
        role: 'admin',
        description: 'System Administrator'
      },
      {
        email: 'credit.card@company.com',
        password: 'credit123',
        role: 'requestor',
        description: 'Credit Card Division Manager'
      },
      {
        email: 'diagnostics@company.com',
        password: 'diag123',
        role: 'requestor',
        description: 'Diagnostics Division Manager'
      },
      {
        email: 'pharma@company.com',
        password: 'pharma123',
        role: 'requestor',
        description: 'Pharma Division Manager'
      },
      {
        email: 'analyst@company.com',
        password: 'analyst123',
        role: 'requestor',
        description: 'Marketing Analyst'
      },
      {
        email: 'marketing.ops@company.com',
        password: 'ops123',
        role: 'requestor',
        description: 'Marketing Operations'
      }
    ];

    for (const user of users) {
      const pwHash = await bcrypt.hash(user.password, 10);
      
      await db.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role`,
        [user.email, pwHash, user.role]
      );
      
      console.log(`✅ ${user.description} (${user.email}) - ${user.role}`);
    }

    console.log('\n🎉 Sample users created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    users.forEach(user => {
      console.log(`${user.description}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log(`  Role: ${user.role}`);
      console.log('');
    });

    console.log('🔐 Test the campaign management with different roles!');
    
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    process.exit(0);
  }
};

// Run the seeding
seedUsers();