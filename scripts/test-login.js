const bcrypt = require('bcrypt');
require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/config/db');

async function testLogin() {
    console.log('🔐 Testing User Authentication...\n');
    
    try {
        // Test users
        const testUsers = [
            { email: 'admin@assetscheduler.com', password: 'password123' },
            { email: 'manager@apollo.com', password: 'password123' },
            { email: 'user@techcorp.com', password: 'password123' }
        ];

        for (const user of testUsers) {
            console.log(`Testing login for: ${user.email}`);
            
            // Get user from database
            const result = await db.query(
                'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
                [user.email]
            );

            if (result.rows.length === 0) {
                console.log(`❌ User not found: ${user.email}`);
                continue;
            }

            const dbUser = result.rows[0];
            console.log(`✅ User found: ${dbUser.first_name} ${dbUser.last_name} (${dbUser.role})`);

            // Test password verification
            const isValidPassword = await bcrypt.compare(user.password, dbUser.password_hash);
            
            if (isValidPassword) {
                console.log(`✅ Password verification successful for ${user.email}`);
            } else {
                console.log(`❌ Password verification failed for ${user.email}`);
            }

            // Get user roles
            const roleResult = await db.query(`
                SELECT r.name as role_name 
                FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = $1
            `, [dbUser.id]);

            if (roleResult.rows.length > 0) {
                console.log(`✅ User roles: ${roleResult.rows.map(r => r.role_name).join(', ')}`);
            } else {
                console.log(`⚠️  No roles assigned to user`);
            }

            console.log('---');
        }

        console.log('\n🎉 Authentication test completed!');
        
    } catch (error) {
        console.error('❌ Error testing authentication:', error);
    } finally {
        await db.close();
    }
}

testLogin(); 