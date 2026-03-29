import { Router, type Request, type Response } from 'express';
import { query, queryOne } from '../db.js';
import type { RegisterServiceBody, ServiceRow } from '../types.js';

const router = Router();

// ─── POST /register-service ───────────────────────────────────────────────────
// Manually register or update an x402 service in the Bazaar.

router.post('/register-service', async (req: Request, res: Response) => {
    const body = req.body as RegisterServiceBody;

    // Validate required fields
    const missing: string[] = [];
    if (!body.name) missing.push('name');
    if (!body.resource) missing.push('resource');
    if (!body.facilitator_url) missing.push('facilitator_url');
    if (!body.network) missing.push('network');

    if (missing.length > 0) {
        res
            .status(400)
            .json({ error: `Missing required fields: ${missing.join(', ')}` });
        return;
    }

    try {
        const rows = await query<ServiceRow>(
            `INSERT INTO services
        (name, description, tags, resource, facilitator_url, network,
         asset, amount, pay_to, scheme, max_timeout_seconds,
         input_schema, output_schema, output_example)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (resource) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         tags = EXCLUDED.tags,
         facilitator_url = EXCLUDED.facilitator_url,
         network = EXCLUDED.network,
         asset = EXCLUDED.asset,
         amount = EXCLUDED.amount,
         pay_to = EXCLUDED.pay_to,
         scheme = EXCLUDED.scheme,
         max_timeout_seconds = EXCLUDED.max_timeout_seconds,
         input_schema = EXCLUDED.input_schema,
         output_schema = EXCLUDED.output_schema,
         output_example = EXCLUDED.output_example,
         updated_at = now()
       RETURNING *`,
            [
                body.name,
                body.description ?? '',
                body.tags ?? [],
                body.resource,
                body.facilitator_url,
                body.network,
                body.asset ?? 'USDC',
                body.amount ?? '0',
                body.pay_to ?? '',
                body.scheme ?? 'exact',
                body.max_timeout_seconds ?? 60,
                JSON.stringify(body.input_schema ?? {}),
                JSON.stringify(body.output_schema ?? {}),
                JSON.stringify(body.output_example ?? {}),
            ]
        );

        const service = rows[0];
        res.status(200).json({ success: true, service });
    } catch (err) {
        console.error('[register] Error:', err);
        res.status(500).json({ error: 'Database error', details: String(err) });
    }
});

export default router;
