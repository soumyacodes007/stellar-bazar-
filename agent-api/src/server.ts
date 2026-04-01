import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactStellarScheme } from '@x402/stellar/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';

import llmRouter from './routes/llm.js';
import sttRouter from './routes/stt.js';
import ttsRouter from './routes/tts.js';
import imageRouter from './routes/image.js';
import storageRouter from './routes/storage.js';
import computeRouter from './routes/compute.js';
import hfRouter from './routes/hf.js';
import { registerAllInBazaar } from './utils/bazaar.js';

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '4030', 10);
const STELLAR_ADDRESS = process.env.STELLAR_ADDRESS ?? '';
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'https://channels.openzeppelin.com/x402/testnet';
const OZ_API_KEY = process.env.OZ_API_KEY ?? '';

if (!STELLAR_ADDRESS) {
  console.error('❌ STELLAR_ADDRESS is required in .env');
  process.exit(1);
}

// ─── x402 Facilitator Client (OpenZeppelin) ───────────────────────────────────
// As per x402faciatordoc.md: use HTTPFacilitatorClient with OZ facilitator URL
const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
  createAuthHeaders: async () => {
    const headers = OZ_API_KEY ? { Authorization: `Bearer ${OZ_API_KEY}` } : {};
    return { verify: headers, settle: headers, supported: headers };
  },
});

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.set('json spaces', 2);

// ─── x402 Payment Middleware ─────────────────────────────────────────────────
// Wraps all AI endpoints behind the x402 payment protocol.
// Agents must pay in Stellar USDC before getting a response.
// Following the pattern from x402faciatordoc.md exactly.
app.use(
  paymentMiddleware(
    {
      // ── LLM Inference ──────────────────────────────────────────────────────
      'POST /v1/chat': {
        accepts: [{
          scheme: 'exact',
          price: '$0.02',
          network: 'stellar:testnet',
          payTo: STELLAR_ADDRESS,
        }],
        description: 'Unified LLM Inference with intelligent auto-routing (Groq)',
        mimeType: 'application/json',
      },

      // ── Speech-to-Text ────────────────────────────────────────────────────
      'POST /v1/stt': {
        accepts: [{
          scheme: 'exact',
          price: '$0.05',
          network: 'stellar:testnet',
          payTo: STELLAR_ADDRESS,
        }],
        description: 'Speech-to-Text transcription via Deepgram Nova-3',
        mimeType: 'application/json',
      },

      // ── Text-to-Speech ────────────────────────────────────────────────────
      'POST /v1/tts': {
        accepts: [{
          scheme: 'exact',
          price: '$0.02',
          network: 'stellar:testnet',
          payTo: STELLAR_ADDRESS,
        }],
        description: 'Text-to-Speech synthesis via Deepgram Aura-2',
        mimeType: 'audio/mpeg',
      },

      // ── Image Generation ──────────────────────────────────────────────────
      'POST /v1/image': {
        accepts: [{
          scheme: 'exact',
          price: '$0.05',
          network: 'stellar:testnet',
          payTo: STELLAR_ADDRESS,
        }],
        description: 'Image generation via fal.ai Flux models',
        mimeType: 'application/json',
      },

      // ── IPFS Storage ──────────────────────────────────────────────────────
      'POST /v1/storage': {
        accepts: [{
          scheme: 'exact',
          price: '$0.01',
          network: 'stellar:testnet',
          payTo: STELLAR_ADDRESS,
        }],
        description: 'Decentralized file storage via Pinata IPFS',
        mimeType: 'application/json',
      },

      // ── Sandboxed Code Execution ──────────────────────────────────────────
      'POST /v1/compute': {
        accepts: [{
          scheme: 'exact',
          price: '$0.10',
          network: 'stellar:testnet',
          payTo: STELLAR_ADDRESS,
        }],
        description: 'Sandboxed code execution via self-hosted Piston (50+ languages)',
        mimeType: 'application/json',
      },

      // ── HuggingFace Inference ─────────────────────────────────────────────
      // Note: HF uses a dynamic route pattern - middleware covers the base path
      'POST /v1/hf': {
        accepts: [{
          scheme: 'exact',
          price: '$0.03',
          network: 'stellar:testnet',
          payTo: STELLAR_ADDRESS,
        }],
        description: 'Inference on any HuggingFace model via Serverless API',
        mimeType: 'application/json',
      },
    },
    new x402ResourceServer(facilitatorClient).register(
      'stellar:testnet',
      new ExactStellarScheme()
    ),
  )
);

// ─── Routes ───────────────────────────────────────────────────────────────────
// (These only execute after successful x402 payment verification)
app.use(llmRouter);
app.use(sttRouter);
app.use(ttsRouter);
app.use(imageRouter);
app.use(storageRouter);
app.use(computeRouter);
app.use(hfRouter);

// ─── Free Endpoint: API Info ──────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'Agent API — Unified AI Layer',
    description: 'x402-gated unified AI API. Pay per request on Stellar Testnet using USDC.',
    version: '1.0.0',
    network: 'stellar:testnet',
    facilitator: FACILITATOR_URL,
    payTo: STELLAR_ADDRESS,
    endpoints: {
      'POST /v1/chat':          { price: '$0.02', description: 'LLM inference (Groq, auto-routed or explicit model)' },
      'POST /v1/stt':           { price: '$0.05', description: 'Speech-to-Text (Deepgram Nova-3)' },
      'POST /v1/tts':           { price: '$0.02', description: 'Text-to-Speech (Deepgram Aura-2)' },
      'POST /v1/image':         { price: '$0.05', description: 'Image generation (fal.ai Flux)' },
      'POST /v1/storage':       { price: '$0.01', description: 'IPFS file storage (Pinata)' },
      'POST /v1/compute':       { price: '$0.10', description: 'Sandboxed code execution (Piston)' },
      'POST /v1/hf/:model_id':  { price: '$0.03', description: 'HuggingFace serverless inference (any model)' },
    },
    discovery: 'https://stellar-bazar.onrender.com/discovery/resources?q=unified',
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  const baseUrl = process.env.SERVICE_URL ?? `http://localhost:${PORT}`;
  console.log('\n🚀 Agent API — Unified AI Layer');
  console.log(`   URL:         ${baseUrl}`);
  console.log(`   Facilitator: ${FACILITATOR_URL}`);
  console.log(`   Pay To:      ${STELLAR_ADDRESS}`);
  console.log(`   Network:     stellar:testnet\n`);
  console.log('   Routes:');
  console.log(`   POST /v1/chat    → LLM Inference (Groq, auto-router)     $0.02`);
  console.log(`   POST /v1/stt     → Speech-to-Text (Deepgram Nova-3)      $0.05`);
  console.log(`   POST /v1/tts     → Text-to-Speech (Deepgram Aura-2)      $0.02`);
  console.log(`   POST /v1/image   → Image Generation (fal.ai Flux)        $0.05`);
  console.log(`   POST /v1/storage → IPFS Storage (Pinata)                 $0.01`);
  console.log(`   POST /v1/compute → Code Execution (Piston)               $0.10`);
  console.log(`   POST /v1/hf/:id  → HuggingFace Inference (any model)     $0.03`);

  // Register all services in Stellar Bazaar
  await registerAllInBazaar();
});

export default app;
