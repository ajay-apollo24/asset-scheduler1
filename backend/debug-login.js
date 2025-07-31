//test script to debug login process

const User = require('./modules/shared/models/User');

const debugLogin = async () => {
  try {
    console.log('🔍 Debugging login process...');
    
    const email = 'campaigns@healthfirst.com';
    const password = 'campaigns123';
    
    // Step 1: Find user
    console.log('\n1. Finding user by email...');
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log('✅ User found:', { id: user.id, email: user.email, organization_id: user.organization_id });
    
    // Step 2: Validate password
    console.log('\n2. Validating password...');
    const isValidPassword = await User.validatePassword(password, user.password_hash);
    console.log('✅ Password validation:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return;
    }
    
    // Step 3: Get user roles
    console.log('\n3. Getting user roles...');
    const roles = await User.getUserRoles(user.id);
    console.log('✅ User roles:', roles);
    
    // Step 4: Get user permissions
    console.log('\n4. Getting user permissions...');
    const permissions = await User.getUserPermissions(user.id);
    console.log('✅ User permissions:', permissions);
    
    // Step 5: Create response data
    console.log('\n5. Creating response data...');
    const responseData = {
      message: 'Login successful',
      token: 'mock-token',
      user: {
        id: user.id,
        email: user.email,
        organization_id: user.organization_id,
        roles,
        permissions: permissions.map(p => p.name)
      }
    };
    
    console.log('✅ Response data:', JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    process.exit(0);
  }
};

debugLogin(); 