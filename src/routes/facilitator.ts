import { Router, type Request, type Response } from 'express';
import { query, queryOne } from '../db.js';
import type { ServiceRow, SettleBody } from '../types.js';
import {
    extractBazaarMetadata,
    extractResourceURL,
    detectNetwork,
    getOzConfig,
} from '../utils/bazaar.js';

const router = Router();

// ─── GET /supported ──────────────────────────────────────────────────────────
// Proxies to OZ facilitator and returns supported networks/schemes.
// No auth needed on the client side for this endpoint.

router.get('/supported', async (req: Request, res: Response) => {
    // Use testnet by default for /supported (network-agnostic)
    const { url, apiKey } = getOzConfig('stellar:testnet');

    try {
        const ozRes = await fetch(`${url}/supported`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        const body = await ozRes.json();
        res.status(ozRes.status).json(body);
    } catch (err) {
        res
            .status(502)
            .json({ error: 'Failed to reach OZ facilitator', details: String(err) });
    }
});

// ─── POST /verify ─────────────────────────────────────────────────────────────
// Proxies payment verification to OZ facilitator. Returns OZ response as-is.

router.post('/verify', async (req: Request, res: Response) => {
    const body = req.body as SettleBody;
    const network = detectNetwork(body);
    const { url, apiKey } = getOzConfig(network);

    try {
        const ozRes = await fetch(`${url}/verify`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });

        const responseBody = await ozRes.json();
        res.status(ozRes.status).json(responseBody);
    } catch (err) {
        res
            .status(502)
            .json({ error: 'Failed to reach OZ facilitator', details: String(err) });
    }
});

// ─── POST /settle ─────────────────────────────────────────────────────────────
// Proxies settlement to OZ. On success, auto-indexes the service into DB
// if Bazaar discovery metadata is present in the payload.

router.post('/settle', async (req: Request, res: Response) => {
    const body = req.body as SettleBody;
    const network = detectNetwork(body);
    const { url, apiKey } = getOzConfig(network);

    let ozStatus = 502;
    let ozBody: unknown = { error: 'Failed to reach OZ facilitator' };

    try {
        const ozRes = await fetch(`${url}/settle`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });

        ozStatus = ozRes.status;
        ozBody = await ozRes.json();

        // ── Auto-index on successful settlement ──────────────────────────────────
        if (ozRes.ok) {
            const meta = extractBazaarMetadata(body);
            const resourceURL = extractResourceURL(body);

            if (meta && resourceURL) {
                try {
                    await upsertServiceFromSettle(resourceURL, network, body, meta);
                } catch (dbErr) {
                    // Non-fatal: log but don't fail the response
                    console.error('[bazaar] Failed to index service:', dbErr);
                }
            }
        }
    } catch (err) {
        ozBody = { error: 'Failed to reach OZ facilitator', details: String(err) };
    }

    res.status(ozStatus).json(ozBody);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertServiceFromSettle(
    resourceURL: string,
    network: string,
    body: SettleBody,
    meta: NonNullable<ReturnType<typeof extractBazaarMetadata>>
): Promise<void> {
    const payload = body.payload ?? {};
    const amount = String(payload.maxAmountRequired ?? meta?.output?.example?.amount ?? '0');
    const payTo = payload.payTo ?? '';

    const existing = await queryOne<ServiceRow>(
        'SELECT id, settle_count FROM services WHERE resource = $1',
        [resourceURL]
    );

    if (existing) {
        // Increment settle_count and update metadata
        await query(
            `UPDATE services SET
        settle_count = settle_count + 1,
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        tags = COALESCE($4, tags),
        network = $5,
        amount = $6,
        pay_to = $7,
        input_schema = COALESCE($8, input_schema),
        output_schema = COALESCE($9, output_schema),
        output_example = COALESCE($10, output_example),
        updated_at = now()
       WHERE resource = $1`,
            [
                resourceURL,
                meta.name ?? null,
                meta.description ?? null,
                meta.tags ?? null,
                network,
                amount,
                payTo,
                meta.input ?? meta.inputSchema ?? null,
                meta.output?.schema ?? null,
                meta.output?.example ?? meta.outputExample ?? null,
            ]
        );
    } else {
        // New service — insert it
        await query(
            `INSERT INTO services
        (name, description, tags, resource, facilitator_url, network, amount, pay_to,
         input_schema, output_schema, output_example)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (resource) DO UPDATE SET
        settle_count = services.settle_count + 1,
        updated_at = now()`,
            [
                meta.name ?? resourceURL,
                meta.description ?? '',
                meta.tags ?? [],
                resourceURL,
                process.env.BASE_URL ?? 'http://localhost:3000',
                network,
                amount,
                payTo,
                meta.input ?? meta.inputSchema ?? {},
                meta.output?.schema ?? {},
                meta.output?.example ?? meta.outputExample ?? {},
            ]
        );
    }
}

export default router;
