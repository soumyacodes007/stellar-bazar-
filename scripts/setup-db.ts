/**
 * Database Setup Script
 * Run with: npx tsx scripts/setup-db.ts
 *
 * Creates the services table and all indexes in your Supabase postgres database.
 */

import dotenv from 'dotenv';
dotenv.config();

import pool from '../src/db.js';

const SQL = `
-- Drop and recreate for clean setup
DROP TABLE IF EXISTS services;

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',

  -- x402 endpoint
  resource TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'http',
  x402_version INTEGER DEFAULT 1,

  -- Payment config
  facilitator_url TEXT NOT NULL,
  network TEXT NOT NULL,
  asset TEXT DEFAULT 'USDC',
  amount TEXT DEFAULT '0',
  pay_to TEXT DEFAULT '',
  scheme TEXT DEFAULT 'exact',
  max_timeout_seconds INTEGER DEFAULT 60,

  -- Bazaar metadata (for AI agents to understand the API)
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  output_example JSONB DEFAULT '{}',

  -- Reputation signals
  verified BOOLEAN DEFAULT false,
  settle_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Full-text search (populated by trigger below — NOT GENERATED ALWAYS AS)
  fts tsvector
);

-- Indexes
CREATE INDEX services_fts_idx    ON services USING GIN(fts);
CREATE INDEX services_network_idx ON services(network);
CREATE INDEX services_pay_to_idx  ON services(pay_to);
CREATE INDEX services_status_idx  ON services(status);

-- Trigger function: keep fts in sync with name + description + tags
CREATE OR REPLACE FUNCTION services_fts_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fts := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS services_fts_trigger ON services;

CREATE TRIGGER services_fts_trigger
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION services_fts_update();

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS services_updated_at ON services;

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
`;

async function setupDb(): Promise<void> {
    console.log('🔧 Setting up Stellar Bazaar database...\n');
    const client = await pool.connect();
    try {
        await client.query(SQL);
        console.log('✅ Table `services` created successfully');
        console.log('✅ Indexes created (fts, network, pay_to, status)');
        console.log('✅ Auto-update trigger set on updated_at');
        console.log('\n🎉 Database setup complete! Run `npm run seed` to populate test data.\n');
    } catch (err) {
        console.error('❌ Setup failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

setupDb();
