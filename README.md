# Stellar Bazaar 🌟

**Bazaar-enabled x402 facilitator for Stellar** — a single Node.js service that acts as:

1. **Facilitator Proxy** — proxies `/verify`, `/settle`, `/supported` to the OpenZeppelin Stellar facilitator
2. **Auto-Indexer** — auto-discovers and indexes services into Postgres on every successful settle
3. **Bazaar Discovery API** — serves `GET /discovery/resources` in exact Coinbase Bazaar v2 format

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up database (run once)
npm run db:setup

# Start dev server
npm run dev

# Seed with sample services
npm run seed
```

## Environment Variables

See `.env.example`. Required:
- `DATABASE_URL` — Supabase Postgres pooler connection string
- `OZ_API_KEY_TESTNET` — from https://channels.openzeppelin.com/testnet/gen
- `PORT` — defaults to 3000

## API Reference

### Facilitator Proxy

```
GET  /supported         → Proxied from OZ facilitator
POST /verify            → Proxied payment verification
POST /settle            → Proxied settlement + auto-indexes service if bazaar metadata present
```

### Bazaar Discovery (Coinbase Bazaar v2 compatible)

```
GET /discovery/resources                     → List all services
GET /discovery/resources?q=weather           → Full-text search
GET /discovery/resources?network=stellar:testnet&maxPrice=0.01
GET /discovery/resources/:id                 → Single service by UUID
GET /discovery/merchant?payTo=G...           → Services by wallet address
```

### Manual Registration

```
POST /register-service                       → Register or update a service
```

## Discovery Response Format (Bazaar v2)

```json
{
  "x402Version": 2,
  "items": [
    {
      "resource": "https://api.example.com/weather",
      "type": "http",
      "x402Version": 1,
      "accepts": [{ "scheme": "exact", "network": "stellar:testnet", "amount": "1000", "asset": "USDC", "payTo": "G..." }],
      "lastUpdated": "2026-03-29T...",
      "metadata": {
        "name": "Stellar Weather API",
        "description": "...",
        "tags": ["weather"],
        "input": {},
        "output": { "example": {}, "schema": {} },
        "reputation": {
          "settle_count": 42,
          "verified": false,
          "first_seen": "2026-03-01T..."
        }
      }
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "total": 3 }
}
```

## Test Commands

```bash
# Register a service
curl -X POST http://localhost:3000/register-service \
  -H "Content-Type: application/json" \
  -d '{"name":"Test API","description":"test","tags":["test"],"resource":"https://test.com/api","facilitator_url":"http://localhost:3000","network":"stellar:testnet","asset":"USDC","amount":"1000","pay_to":"GABC"}'

# Discover services
curl "http://localhost:3000/discovery/resources?q=weather&network=stellar:testnet"

# Merchant lookup
curl "http://localhost:3000/discovery/merchant?payTo=GABC"

# Check supported (proxied from OZ)
curl http://localhost:3000/supported
```

## Architecture

```
AI Agent → GET /discovery/resources → Supabase Postgres (fuzzy search)
AI Agent → hits x402 service → 402 → POST /settle → OZ Facilitator → Stellar
                                                    ↓ (on 200)
                                            auto-upsert to DB
                                            increment settle_count
```
