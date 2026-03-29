import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}

/**
 * Parse a postgres connection string manually to avoid Node URL parser
 * choking on special characters in the password (e.g., commas, slashes).
 *
 * Format: postgresql://user:password@host:port/database
 */
function parseConnectionString(url: string): {
    user: string;
    password: string;
    host: string;
    port: number;
    database: string;
} {
    // Strip scheme
    const withoutScheme = url.replace(/^postgresql:\/\/|^postgres:\/\//, '');

    // Split user:password@rest
    const atIdx = withoutScheme.lastIndexOf('@');
    const userInfo = withoutScheme.slice(0, atIdx);
    const hostInfo = withoutScheme.slice(atIdx + 1);

    // Split user:password — password may contain colons, so split at first colon only
    const colonIdx = userInfo.indexOf(':');
    const user = userInfo.slice(0, colonIdx);
    const password = userInfo.slice(colonIdx + 1);

    // Split host:port/database
    const slashIdx = hostInfo.indexOf('/');
    const hostPort = hostInfo.slice(0, slashIdx);
    const database = hostInfo.slice(slashIdx + 1);

    const lastColon = hostPort.lastIndexOf(':');
    const host = hostPort.slice(0, lastColon);
    const port = parseInt(hostPort.slice(lastColon + 1), 10) || 5432;

    return { user, password, host, port, database };
}

const connParams = parseConnectionString(process.env.DATABASE_URL);

// Use individual params so pg doesn't try to URL-parse the connection string
const pool = new Pool({
    ...connParams,
    ssl: { rejectUnauthorized: false }, // required for Supabase pooler
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('Unexpected postgres pool error:', err);
});

export default pool;

// ─── Typed query helper ───────────────────────────────────────────────────────

export async function query<T = unknown>(
    text: string,
    params?: unknown[]
): Promise<T[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result.rows as T[];
    } finally {
        client.release();
    }
}

export async function queryOne<T = unknown>(
    text: string,
    params?: unknown[]
): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows[0] ?? null;
}
