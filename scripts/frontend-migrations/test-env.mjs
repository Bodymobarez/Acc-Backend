import dotenv from 'dotenv';
dotenv.config();

console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL value:', process.env.DATABASE_URL ? 'EXISTS' : 'MISSING');
