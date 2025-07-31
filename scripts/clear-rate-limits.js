// clear-rate-limits.js
// Script to clear rate limit cache and help with development

const redis = require('redis');

async function clearRateLimits() {
  console.log('🧹 Clearing rate limit cache...');
  
  try {
    // If using Redis for rate limiting
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    await client.connect();
    
    // Clear all rate limit keys
    const keys = await client.keys('rl:*');
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`✅ Cleared ${keys.length} rate limit keys`);
    } else {
      console.log('ℹ️  No rate limit keys found');
    }
    
    await client.disconnect();
  } catch (error) {
    console.log('⚠️  Could not clear Redis cache (may not be using Redis):', error.message);
  }
  
  console.log('📝 Rate limit configuration:');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Multiplier: ${process.env.NODE_ENV === 'development' ? '10x' : '1x'}`);
  console.log(`   Bypass: ${process.env.BYPASS_RATE_LIMIT === 'true' ? 'Yes' : 'No'}`);
  console.log('');
  console.log('🔧 To bypass rate limiting in development, set:');
  console.log('   BYPASS_RATE_LIMIT=true npm start');
  console.log('');
  console.log('🎯 Current rate limits (development):');
  console.log('   Ad Requests: 100,000/min');
  console.log('   Impressions: 500,000/min');
  console.log('   Clicks: 10,000/min');
  console.log('   Asset Management: 3,000/min');
  console.log('   Auth: 1,000/15min');
  console.log('   Reports: 1,000/min');
  console.log('   Admin: 500/min');
}

clearRateLimits().catch(console.error); 