import { Router, type Request, type Response } from 'express';
import { query, queryOne } from '../db.js';
import type {
    ServiceRow,
    BazaarItem,
    BazaarDiscoveryResponse,
    BazaarMerchantResponse,
} from '../types.js';

const router = Router();

// ─── Shape a DB row into Bazaar v2 item ───────────────────────────────────────

function toBazaarItem(s: ServiceRow): BazaarItem {
    return {
        resource: s.resource,
        type: s.type ?? 'http',
        x402Version: s.x402_version ?? 1,
        accepts: [
            {
                scheme: s.scheme ?? 'exact',
                network: s.network,
                amount: s.amount,
                asset: s.asset,
                payTo: s.pay_to,
                maxTimeoutSeconds: s.max_timeout_seconds ?? 60,
            },
        ],
        lastUpdated: s.updated_at,
        metadata: {
            name: s.name,
            description: s.description,
            tags: s.tags ?? [],
            input: s.input_schema ?? {},
            output: {
                example: s.output_example ?? {},
                schema: s.output_schema ?? {},
            },
            // ── Reputation — inside metadata to stay Coinbase-compatible ──────────
            reputation: {
                settle_count: s.settle_count ?? 0,
                verified: s.verified ?? false,
                first_seen: s.created_at,
            },
        },
    };
}

// ─── GET /discovery/resources ─────────────────────────────────────────────────
// Returns a paginated Bazaar v2 discovery list.
// Query params: q, network, asset, maxPrice, payTo, type, limit, offset

router.get('/discovery/resources', async (req: Request, res: Response) => {
    const {
        q,
        network,
        asset,
        maxPrice,
        payTo,
        limit: limitStr,
        offset: offsetStr,
    } = req.query;

    const limit = Math.min(parseInt(String(limitStr ?? '20'), 10), 100);
    const offset = parseInt(String(offsetStr ?? '0'), 10);

    // Build dynamic WHERE clauses
    const conditions: string[] = ["status = 'active'"];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (network) {
        conditions.push(`network = $${paramIdx++}`);
        params.push(network);
    }
    if (asset) {
        conditions.push(`asset = $${paramIdx++}`);
        params.push(asset);
    }
    if (maxPrice) {
        conditions.push(`amount::numeric <= $${paramIdx++}`);
        params.push(Number(maxPrice));
    }
    if (payTo) {
        conditions.push(`pay_to = $${paramIdx++}`);
        params.push(payTo);
    }
    if (q) {
        conditions.push(`fts @@ plainto_tsquery('english', $${paramIdx++})`);
        params.push(String(q));
    }

    const whereClause = conditions.join(' AND ');

    try {
        // Count for pagination
        const countRows = await query<{ count: string }>(
            `SELECT COUNT(*) AS count FROM services WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countRows[0]?.count ?? '0', 10);

        // Data query
        const dataParams = [...params, limit, offset];
        const rows = await query<ServiceRow>(
            `SELECT * FROM services
       WHERE ${whereClause}
       ORDER BY verified DESC, settle_count DESC, created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
            dataParams
        );

        const response: BazaarDiscoveryResponse = {
            x402Version: 2,
            items: rows.map(toBazaarItem),
            pagination: { limit, offset, total },
        };

        res.status(200).json(response);
    } catch (err) {
        console.error('[discovery] Error:', err);
        res.status(500).json({ error: 'Database error', details: String(err) });
    }
});

// ─── GET /discovery/merchant ──────────────────────────────────────────────────
// Returns all resources registered to a specific pay_to address.

router.get('/discovery/merchant', async (req: Request, res: Response) => {
    const { payTo, limit: limitStr, offset: offsetStr } = req.query;

    if (!payTo) {
        res.status(400).json({ error: 'payTo query parameter is required' });
        return;
    }

    const limit = Math.min(parseInt(String(limitStr ?? '25'), 10), 100);
    const offset = parseInt(String(offsetStr ?? '0'), 10);

    try {
        const countRows = await query<{ count: string }>(
            `SELECT COUNT(*) AS count FROM services WHERE pay_to = $1 AND status = 'active'`,
            [payTo]
        );
        const total = parseInt(countRows[0]?.count ?? '0', 10);

        const rows = await query<ServiceRow>(
            `SELECT * FROM services
       WHERE pay_to = $1 AND status = 'active'
       ORDER BY settle_count DESC, created_at DESC
       LIMIT $2 OFFSET $3`,
            [payTo, limit, offset]
        );

        const response: BazaarMerchantResponse = {
            payTo: String(payTo),
            resources: rows.map(toBazaarItem),
            pagination: { limit, offset, total },
        };

        res.status(200).json(response);
    } catch (err) {
        console.error('[merchant] Error:', err);
        res.status(500).json({ error: 'Database error', details: String(err) });
    }
});

// ─── GET /discovery/resources/:id ────────────────────────────────────────────
// Returns a single service by UUID.

router.get('/discovery/resources/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const row = await queryOne<ServiceRow>(
            `SELECT * FROM services WHERE id = $1`,
            [id]
        );

        if (!row) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }

        res.status(200).json(toBazaarItem(row));
    } catch (err) {
        console.error('[discovery/:id] Error:', err);
        res.status(500).json({ error: 'Database error', details: String(err) });
    }
});

export default router;
