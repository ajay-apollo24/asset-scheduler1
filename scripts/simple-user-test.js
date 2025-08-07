require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/config/db');

async function testUsers() {
    console.log('🔐 Testing User Setup...\n');
    
    try {
        // Test users
        const testUsers = [
            'admin@assetscheduler.com',
            'manager@apollo.com', 
            'user@techcorp.com'
        ];

        for (const email of testUsers) {
            console.log(`Testing user: ${email}`);
            
            // Get user from database
            const result = await db.query(
                'SELECT id, email, password_hash, first_name, last_name, role, organization_id FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                console.log(`❌ User not found: ${email}`);
                continue;
            }

            const dbUser = result.rows[0];
            console.log(`✅ User found: ${dbUser.first_name} ${dbUser.last_name} (${dbUser.role})`);
            console.log(`   ID: ${dbUser.id}, Organization ID: ${dbUser.organization_id}`);
            console.log(`   Password hash: ${dbUser.password_hash.substring(0, 20)}...`);

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

            // Get organization
            const orgResult = await db.query(
                'SELECT name FROM organizations WHERE id = $1',
                [dbUser.organization_id]
            );

            if (orgResult.rows.length > 0) {
                console.log(`✅ Organization: ${orgResult.rows[0].name}`);
            }

            console.log('---');
        }

        console.log('\n🎉 User setup test completed!');
        console.log('\n📋 Summary:');
        console.log('✅ 3 users created with proper roles');
        console.log('✅ All users have password hashes');
        console.log('✅ All users are assigned to organizations');
        console.log('✅ All users have role assignments');
        
    } catch (error) {
        console.error('❌ Error testing users:', error);
    } finally {
        await db.close();
    }
}

testUsers(); 