import fetch from 'node-fetch';

async function testCustomersAPI() {
  try {
    console.log('🔍 Testing customers API...\n');
    
    // Test without auth
    console.log('1️⃣ Test without authentication:');
    const res1 = await fetch('http://localhost:3001/api/customers');
    const data1 = await res1.json();
    console.log('Status:', res1.status);
    console.log('Response:', JSON.stringify(data1, null, 2));
    
    // Note: For real testing, you need to login first and get a token
    console.log('\n📝 Note: You need to login first to get a valid token');
    console.log('Then test with: Authorization: Bearer <token>');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCustomersAPI();
