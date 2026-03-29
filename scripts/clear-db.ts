import dotenv from 'dotenv';
dotenv.config();

import pool from '../src/db.js';

async function clearDb() {
    console.log('🗑️ Clearing all data from the services table...');
    const client = await pool.connect();
    try {
        await client.query('TRUNCATE services;');
        console.log('✅ All data successfully deleted.');
    } catch (err) {
        console.error('❌ Failed to clear database:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

clearDb();
