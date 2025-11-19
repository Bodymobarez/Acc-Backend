// Temporary script to reset invoice status to UNPAID for testing
const API_URL = 'http://localhost:3001/api';

// Get auth token from localStorage
const authToken = localStorage.getItem('auth-token');

if (!authToken) {
  console.error('❌ No auth token found. Please login first.');
} else {
  // Update invoice status to UNPAID
  fetch(`${API_URL}/invoices/cmh9bkqoe0001nbfrlmnk0po3`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ status: 'UNPAID' })
  })
  .then(response => response.json())
  .then(data => {
    console.log('✅ Invoice status reset to UNPAID:', data);
    console.log('🔄 Now refresh the page and try creating a receipt!');
  })
  .catch(error => {
    console.error('❌ Error updating invoice:', error);
  });
}
