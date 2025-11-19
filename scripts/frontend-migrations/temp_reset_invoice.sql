-- Reset invoice status to UNPAID
UPDATE invoices 
SET status = 'UNPAID' 
WHERE "invoiceNumber" = 'INV-2025-000001';
