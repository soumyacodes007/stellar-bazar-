// ─── Bazaar Registration ──────────────────────────────────────────────────────
// On startup, registers all 7 AI endpoints in the Stellar Bazaar so that
// AI agents can discover them autonomously via the discovery API.

const BAZAAR_URL = process.env.BAZAAR_URL ?? 'https://stellar-bazar.onrender.com';
const SERVICE_URL = process.env.SERVICE_URL ?? 'http://localhost:4030';
const STELLAR_ADDRESS = process.env.STELLAR_ADDRESS ?? '';
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'https://channels.openzeppelin.com/x402/testnet';

type ServiceDef = {
  name: string;
  description: string;
  tags: string[];
  resource: string;
  amount: string;
  input_schema: object;
  output_schema: object;
  output_example: object;
};

const SERVICES: ServiceDef[] = [
  {
    name: 'Unified LLM Inference (Groq)',
    description: 'OpenAI-compatible chat completions powered by Groq. Supports auto-routing for best price/performance, or explicit model selection (llama-3.1-8b-instant, llama-4-scout-17b, llama-3.3-70b-versatile).',
    tags: ['llm', 'inference', 'groq', 'chat', 'completions', 'openai-compatible'],
    resource: `${SERVICE_URL}/v1/chat`,
    amount: '200',
    input_schema: {
      type: 'object', required: ['messages'],
      properties: {
        model: { type: 'string', description: "Model ID or 'auto' for intelligent routing. Options: 'llama-3.1-8b-instant', 'llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile'." },
        messages: { type: 'array', items: { type: 'object', properties: { role: { type: 'string', enum: ['user','assistant','system'] }, content: { type: 'string' } } } },
      },
    },
    output_schema: { type: 'object', properties: { choices: { type: 'array', items: { type: 'object', properties: { message: { type: 'object', properties: { content: { type: 'string' } } } } } } } },
    output_example: { choices: [{ message: { role: 'assistant', content: 'Hello! How can I help you today?' } }] },
  },
  {
    name: 'Speech-to-Text (Deepgram Nova-3)',
    description: 'Transcribe audio files using Deepgram Nova-3, the most accurate real-time STT model. Send audio as multipart/form-data.',
    tags: ['stt', 'speech-to-text', 'transcription', 'deepgram', 'nova', 'audio'],
    resource: `${SERVICE_URL}/v1/stt`,
    amount: '500',
    input_schema: { type: 'object', required: ['audio'], properties: { audio: { type: 'string', format: 'binary', description: 'Audio file (mp3, wav, ogg, flac) as multipart/form-data field.' } } },
    output_schema: { type: 'object', properties: { transcript: { type: 'string' }, confidence: { type: 'number' }, words: { type: 'array' } } },
    output_example: { transcript: 'Hello world, this is a test.', confidence: 0.998 },
  },
  {
    name: 'Text-to-Speech (Deepgram Aura-2)',
    description: 'Convert text to natural, human-like speech using Deepgram Aura-2. Returns MP3 audio binary.',
    tags: ['tts', 'text-to-speech', 'deepgram', 'aura', 'voice', 'audio'],
    resource: `${SERVICE_URL}/v1/tts`,
    amount: '200',
    input_schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', description: 'The text to convert to speech.' }, voice: { type: 'string', default: 'aura-2-en-us', description: 'Voice ID. Default: aura-2-en-us.' } } },
    output_schema: { type: 'object', properties: { audio_url: { type: 'string', description: 'URL to generated MP3, or binary MP3 in body.' } } },
    output_example: { note: 'Response body is raw MP3 audio binary (Content-Type: audio/mpeg).' },
  },
  {
    name: 'Image Generation (fal.ai Flux)',
    description: 'Generate images from text prompts using fal.ai Flux models. Supports flux-schnell (fast), flux-dev (balanced), flux-pro (highest quality).',
    tags: ['image', 'image-generation', 'flux', 'fal', 'text-to-image', 'stable-diffusion'],
    resource: `${SERVICE_URL}/v1/image`,
    amount: '500',
    input_schema: { type: 'object', required: ['prompt'], properties: { prompt: { type: 'string', description: 'Text prompt for image generation.' }, model: { type: 'string', enum: ['flux-schnell', 'flux-dev', 'flux-pro'], default: 'flux-schnell', description: 'Model to use. More powerful = slower and pricier.' }, width: { type: 'number', default: 1024 }, height: { type: 'number', default: 1024 } } },
    output_schema: { type: 'object', properties: { url: { type: 'string' }, width: { type: 'number' }, height: { type: 'number' } } },
    output_example: { url: 'https://fal.ai/files/example.png', width: 1024, height: 1024 },
  },
  {
    name: 'IPFS Storage (Pinata)',
    description: 'Upload files to IPFS via Pinata. Returns a permanent, decentralized IPFS hash and a public gateway URL.',
    tags: ['storage', 'ipfs', 'pinata', 'decentralized', 'upload', 'files'],
    resource: `${SERVICE_URL}/v1/storage`,
    amount: '100',
    input_schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary', description: 'File as multipart/form-data.' } } },
    output_schema: { type: 'object', properties: { ipfs_hash: { type: 'string' }, gateway_url: { type: 'string' }, size: { type: 'number' } } },
    output_example: { ipfs_hash: 'QmXYZ123...', gateway_url: 'https://gateway.pinata.cloud/ipfs/QmXYZ123...', size: 1024 },
  },
  {
    name: 'Code Execution (Piston Sandbox)',
    description: 'Execute code in a secure, sandboxed environment. Supports Python, JavaScript, Go, Rust, C++, and 50+ languages via self-hosted Piston.',
    tags: ['compute', 'code-execution', 'sandbox', 'python', 'javascript', 'piston'],
    resource: `${SERVICE_URL}/v1/compute`,
    amount: '1000',
    input_schema: { type: 'object', required: ['language', 'code'], properties: { language: { type: 'string', description: "Programming language. E.g.: 'python', 'javascript', 'rust', 'go'." }, code: { type: 'string', description: 'The source code to execute.' }, stdin: { type: 'string', description: 'Optional stdin input for the program.' } } },
    output_schema: { type: 'object', properties: { stdout: { type: 'string' }, stderr: { type: 'string' }, exit_code: { type: 'number' } } },
    output_example: { stdout: 'Hello, World!\n', stderr: '', exit_code: 0 },
  },
  {
    name: 'HuggingFace Inference (Any Model)',
    description: 'Run inference on any HuggingFace model via the Serverless Inference API. Pass the model ID in the URL path. Supports text-classification, summarization, NER, and more.',
    tags: ['huggingface', 'inference', 'nlp', 'classification', 'summarization', 'embeddings'],
    resource: `${SERVICE_URL}/v1/hf/{model_id}`,
    amount: '300',
    input_schema: { type: 'object', required: ['inputs'], properties: { inputs: { type: 'string', description: 'Input text for the HuggingFace model.' }, parameters: { type: 'object', description: 'Optional model-specific parameters (e.g., max_new_tokens, temperature).' } } },
    output_schema: { type: 'object', description: 'Raw HuggingFace Inference API response (varies by model type).' },
    output_example: [{ label: 'POSITIVE', score: 0.9998 }],
  },
];

export async function registerAllInBazaar(): Promise<void> {
  console.log('\n📡 Registering all services in Stellar Bazaar...');
  let registered = 0;

  for (const service of SERVICES) {
    try {
      const res = await fetch(`${BAZAAR_URL}/register-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...service,
          facilitator_url: FACILITATOR_URL,
          network: 'stellar:testnet',
          asset: 'USDC',
          pay_to: STELLAR_ADDRESS,
          scheme: 'exact',
        }),
      });
      if (res.ok) {
        console.log(`  ✅ ${service.name}`);
        registered++;
      } else {
        console.log(`  ⚠️  ${service.name}: ${await res.text()}`);
      }
    } catch {
      console.log(`  ❌ ${service.name}: Could not reach Bazaar`);
    }
  }

  console.log(`\n🌟 ${registered}/${SERVICES.length} services registered in Stellar Bazaar\n`);
}
