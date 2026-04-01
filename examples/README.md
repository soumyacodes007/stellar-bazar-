# Rock Paper Scissors x402 API

A demo x402 service that implements a Rock Paper Scissors game with Stellar payments.

## Features

- Pay $0.001 per game on Stellar testnet
- Uses your Stellar Bazaar as the payment facilitator
- Auto-registers in the Bazaar when payments settle
- Compatible with x402-enabled wallets and AI agents

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your Stellar address:
```
STELLAR_ADDRESS=YOUR_STELLAR_TESTNET_ADDRESS
FACILITATOR_URL=https://stellar-bazar.onrender.com
PORT=4021
```

4. Run in development:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### GET /
Free endpoint - returns game info and instructions

### POST /play (requires payment)
Play a game of Rock Paper Scissors

Request body:
```json
{
  "move": "rock" | "paper" | "scissors"
}
```

Response:
```json
{
  "playerMove": "rock",
  "computerMove": "scissors",
  "result": "You win!",
  "outcome": "win",
  "timestamp": "2026-03-30T..."
}
```

## How x402 Payment Works

1. Client makes request to `/play` without payment
2. Server responds with `402 Payment Required` and payment instructions
3. Client signs Stellar transaction and resubmits with `PAYMENT-SIGNATURE` header
4. Your Bazaar facilitator verifies and settles payment
5. Server returns game result with `PAYMENT-RESPONSE` header
6. Service auto-registers in Bazaar discovery on first settlement

## Testing

Use an x402-compatible client or wallet to test payments. The service will automatically appear in your Bazaar discovery API after the first successful payment.

Check discovery:
```bash
curl https://stellar-bazar.onrender.com/discovery/resources?q=rock
```

## Deploy

Deploy to Render, Railway, or any Node.js hosting platform. Make sure to set environment variables.
