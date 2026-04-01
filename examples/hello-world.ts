import express from 'express';
import dotenv from 'dotenv';
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

dotenv.config();

const app = express();
const PORT = 4022; // Using a different port from the standard example
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'https://stellar-bazar.onrender.com';
const STELLAR_ADDRESS = process.env.STELLAR_ADDRESS ?? 'GB3XYWSUA5AHY344GBAEJID5J7LBIRYADP2KLTYXXUAECR425KWWN5WN';
const SERVICE_URL = process.env.SERVICE_URL ?? `http://localhost:${PORT}`;

app.use(express.json());

// 1. Initialize Facilitator Client
// This client communicates with the Stellar Bazaar (or any x402 facilitator)
// to verify and settle payments.
const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
  createAuthHeaders: async () => {
    // For the Stellar Bazaar public demo, no API keys are required by default.
    return { verify: {}, settle: {}, supported: {} };
  },
});

// 2. Setup x402 Middleware
// This middleware handles the 402 Payment Required handshake automatically.
app.use(
  paymentMiddleware(
    {
      "GET /hello": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "stellar:testnet",
            payTo: STELLAR_ADDRESS,
          },
        ],
        description: "Hello World Message",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register(
      "stellar:testnet",
      new ExactStellarScheme(),
    ),
  ),
);

// 3. Protected Route
// This route will only be reached if the x402 protocol handshake succeeds
// (i.e., a valid payment signature is provided in the headers).
app.get('/hello', (req, res) => {
  res.json({ 
    message: "Hello World! Your x402 payment was successful.",
    timestamp: new Date().toISOString()
  });
});

// 4. Register in Bazaar
// This step makes your service discoverable via the Bazaar's discovery API.
async function registerInBazaar() {
    try {
      const response = await fetch(`${FACILITATOR_URL}/register-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hello World x402',
          description: 'A simple hello world API protected by x402 payments on Stellar Testnet.',
          tags: ['test', 'demo', 'hello-world', 'simple'],
          resource: `${SERVICE_URL}/hello`,
          facilitator_url: FACILITATOR_URL,
          network: 'stellar:testnet',
          asset: 'USDC',
          amount: '1000',
          pay_to: STELLAR_ADDRESS,
          output_example: {
            message: "Hello World! Your x402 payment was successful.",
            timestamp: "2026-03-30T..."
          }
        }),
      });

      if (response.ok) {
        console.log('✅ Registered Hello World in Stellar Bazaar');
      } else {
        console.log('⚠️  Bazaar registration failed:', await response.text());
      }
    } catch (err) {
      console.log('⚠️  Could not connect to Bazaar facilitator for registration');
    }
}

app.listen(PORT, async () => {
  console.log(`\n👋 Hello World x402 running on ${SERVICE_URL}`);
  console.log(`💰 Price: $0.001 on stellar:testnet`);
  console.log(`💳 Pay to: ${STELLAR_ADDRESS}`);
  console.log(`🌟 Facilitator: ${FACILITATOR_URL}\n`);
  
  await registerInBazaar();
});
