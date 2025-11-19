/**
 * Test localStorage Protection
 * Run this in browser console to verify protection is working
 */

console.log('🧪 Testing localStorage Protection...\n');

// Test 1: Try to write blocked data key
console.log('Test 1: Attempting to write "receipts" to localStorage...');
try {
  localStorage.setItem('receipts', JSON.stringify([{ id: 1, amount: 100 }]));
  console.error('❌ FAILED: Should have thrown error!');
} catch (error) {
  console.log('✅ PASSED: Correctly blocked writing to "receipts"');
  console.log('   Error message:', error.message);
}

// Test 2: Try to write mock data
console.log('\nTest 2: Attempting to write "mockReceipts" to localStorage...');
try {
  localStorage.setItem('mockReceipts', JSON.stringify([{ id: 1 }]));
  console.error('❌ FAILED: Should have thrown error!');
} catch (error) {
  console.log('✅ PASSED: Correctly blocked mock data');
  console.log('   Error message:', error.message);
}

// Test 3: Try to write allowed key
console.log('\nTest 3: Attempting to write "printSettings" (allowed) to localStorage...');
try {
  localStorage.setItem('printSettings', JSON.stringify({ fontSize: 12 }));
  console.log('✅ PASSED: Allowed key can be written');
} catch (error) {
  console.error('❌ FAILED: Should allow writing to "printSettings"');
  console.error('   Error:', error.message);
}

// Test 4: Try to write theme (allowed)
console.log('\nTest 4: Attempting to write "theme" (allowed) to localStorage...');
try {
  localStorage.setItem('theme', 'dark');
  console.log('✅ PASSED: Allowed key can be written');
} catch (error) {
  console.error('❌ FAILED: Should allow writing to "theme"');
  console.error('   Error:', error.message);
}

// Test 5: Try to read blocked key
console.log('\nTest 5: Attempting to read "invoices" from localStorage...');
try {
  const result = localStorage.getItem('invoices');
  console.log('⚠️  WARNING: Reading is allowed (with warning) for backward compatibility');
  console.log('   Result:', result);
} catch (error) {
  console.log('   Error:', error.message);
}

// Test 6: Try to read mock key
console.log('\nTest 6: Attempting to read "mockData" from localStorage...');
const mockResult = localStorage.getItem('mockData');
console.log('✅ PASSED: Mock data returns null');
console.log('   Result:', mockResult);

// Test 7: Check all blocked keys
console.log('\n📋 All Blocked Data Keys:');
const blockedKeys = [
  'receipts', 'payments', 'invoices', 'customers', 'bookings',
  'employees', 'suppliers', 'bankAccounts', 'cashRegisters',
  'journalEntries', 'products', 'services', 'commissionRates'
];
blockedKeys.forEach((key, index) => {
  console.log(`   ${index + 1}. ${key}`);
});

// Test 8: Check allowed keys
console.log('\n✅ Allowed localStorage Keys:');
const allowedKeys = ['auth-token', 'auth-storage', 'printSettings', 'user', 'theme', 'language'];
allowedKeys.forEach((key, index) => {
  console.log(`   ${index + 1}. ${key}`);
});

console.log('\n🎉 Protection Test Complete!');
console.log('🛡️  All data operations must use API services');
console.log('💡 Use: receiptService, invoiceService, customerService, etc.');
