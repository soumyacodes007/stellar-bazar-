import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '4021', 10);
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'https://stellar-bazar.onrender.com';
const SERVICE_URL = process.env.SERVICE_URL ?? `http://localhost:${PORT}`;
const STELLAR_ADDRESS = process.env.STELLAR_ADDRESS ?? 'GB3XYWSUA5AHY344GBAEJID5J7LBIRYADP2KLTYXXUAECR425KWWN5WN';

app.use(express.json());

// Rock Paper Scissors game logic
type Move = 'rock' | 'paper' | 'scissors';

function playGame(playerMove: Move): { result: string; computerMove: Move; outcome: string } {
  const moves: Move[] = ['rock', 'paper', 'scissors'];
  const computerMove = moves[Math.floor(Math.random() * moves.length)];
  
  let outcome: string;
  if (playerMove === computerMove) {
    outcome = 'tie';
  } else if (
    (playerMove === 'rock' && computerMove === 'scissors') ||
    (playerMove === 'paper' && computerMove === 'rock') ||
    (playerMove === 'scissors' && computerMove === 'paper')
  ) {
    outcome = 'win';
  } else {
    outcome = 'lose';
  }

  return {
    result: outcome === 'win' ? 'You win!' : outcome === 'lose' ? 'You lose!' : "It's a tie!",
    computerMove,
    outcome
  };
}

// Free endpoint - game info
app.get('/', (req, res) => {
  res.json({
    name: 'Rock Paper Scissors x402',
    description: 'Play Rock Paper Scissors with x402 payments on Stellar',
    price: '$0.001 per game (1000 stroops USDC)',
    network: 'stellar:testnet',
    facilitator: FACILITATOR_URL,
    payTo: STELLAR_ADDRESS,
    endpoints: {
      'POST /play': 'Play a game (requires payment)',
    },
    howToPlay: {
      move: 'Send POST to /play with { "move": "rock" | "paper" | "scissors" }',
      payment: 'This is a demo - payment flow would be handled by x402 client',
    },
  });
});

// Demo endpoint - play game (in production this would require x402 payment)
app.post('/play', (req, res) => {
  const { move } = req.body;
  
  if (!move || !['rock', 'paper', 'scissors'].includes(move)) {
    return res.status(400).json({ 
      error: 'Invalid move. Choose: rock, paper, or scissors' 
    });
  }

  const gameResult = playGame(move as Move);
  
  res.json({
    playerMove: move,
    ...gameResult,
    timestamp: new Date().toISOString(),
    note: 'Demo mode - in production this would require x402 payment'
  });
});

// Register service in Bazaar on startup
async function registerInBazaar() {
  try {
    const response = await fetch(`${FACILITATOR_URL}/register-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rock Paper Scissors x402',
        description: 'Play Rock Paper Scissors with x402 payments on Stellar testnet. $0.001 per game.',
        tags: ['game', 'rps', 'rock-paper-scissors', 'fun', 'entertainment'],
        resource: `${SERVICE_URL}/play`,
        facilitator_url: FACILITATOR_URL,
        network: 'stellar:testnet',
        asset: 'USDC',
        amount: '1000',
        pay_to: STELLAR_ADDRESS,
        input_schema: {
          type: 'object',
          required: ['move'],
          properties: {
            move: {
              type: 'string',
              enum: ['rock', 'paper', 'scissors'],
              description: 'Your move'
            }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            playerMove: { type: 'string' },
            computerMove: { type: 'string' },
            result: { type: 'string' },
            outcome: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        output_example: {
          playerMove: 'rock',
          computerMove: 'scissors',
          result: 'You win!',
          outcome: 'win',
          timestamp: '2026-03-30T12:00:00Z'
        }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Registered in Stellar Bazaar:', data);
    } else {
      console.log('⚠️  Failed to register in Bazaar:', await response.text());
    }
  } catch (err) {
    console.log('⚠️  Could not register in Bazaar:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`\n🎮 Rock Paper Scissors x402 running on ${SERVICE_URL}`);
  console.log(`💰 Price: $0.001 per game on stellar:testnet`);
  console.log(`💳 Pay to: ${STELLAR_ADDRESS}`);
  console.log(`🌟 Facilitator: ${FACILITATOR_URL}\n`);
  
  await registerInBazaar();
});
