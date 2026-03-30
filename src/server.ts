import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import facilitatorRouter from './routes/facilitator.js';
import registerRouter from './routes/register.js';
import discoveryRouter from './routes/discovery.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.set('json spaces', 2); // Enable pretty-printed JSON responses globally
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? (process.env.ALLOWED_ORIGINS?.split(',') || '*')
        : '*'
}));
app.use(express.json({ limit: '1mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use(facilitatorRouter);   // /supported, /verify, /settle
app.use(registerRouter);      // /register-service
app.use(discoveryRouter);     // /discovery/resources, /discovery/merchant

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        name: 'Stellar Bazaar',
        description: 'Bazaar-enabled x402 facilitator for Stellar',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            // Facilitator proxy (OZ-compatible)
            'GET  /supported': 'Proxied from OpenZeppelin facilitator',
            'POST /verify': 'Proxied payment verification',
            'POST /settle': 'Proxied settlement + auto-indexes service if metadata present',
            // Manual registration
            'POST /register-service': 'Manually register an x402 service in the Bazaar',
            // Bazaar v2 discovery
            'GET  /discovery/resources': 'Bazaar v2 service discovery (supports ?q, ?network, ?asset, ?maxPrice, ?payTo, ?limit, ?offset)',
            'GET  /discovery/resources/:id': 'Get a single service by UUID',
            'GET  /discovery/merchant': 'Get all services by pay_to address (?payTo=...)',
        },
        network: process.env.NODE_ENV,
    });
});

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    console.log(`\n🌟 Stellar Bazaar running on ${baseUrl}`);
    console.log(`📡 OZ Facilitator (testnet): https://channels.openzeppelin.com/x402/testnet`);
    console.log(`🗄️  Database: Supabase Postgres (ap-south-1)\n`);
});

export default app;
