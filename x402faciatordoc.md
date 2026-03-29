Built on Stellar x402 Facilitator
The Built on Stellar x402 Facilitator is a production-ready payment facilitator for the x402 protocol on Stellar. It handles payment verification and settlement so that sellers can accept per-request payments without running their own blockchain infrastructure.

Built with the OpenZeppelin Relayer and the x402 Facilitator Plugin, it exposes the standard x402 /verify, /settle, and /supported endpoints and is fully compatible with the Coinbase x402 ecosystem.

Key information
Testnet	Mainnet
Facilitator URL	https://channels.openzeppelin.com/x402/testnet	https://channels.openzeppelin.com/x402
API key generation	Generate testnet key	Generate mainnet key
x402 version	v2	v2
x402 scheme	exact	exact
Supported assets	Any SEP-41 token (defaults to USDC)	Any SEP-41 token (defaults to USDC)
Get started
1. Generate an API key
Generate an API key for the network you want to use:

Testnet: https://channels.openzeppelin.com/testnet/gen
Mainnet: https://channels.openzeppelin.com/gen
2. Configure the facilitator URL
Use the facilitator URL in your x402 server configuration. Here's an example using @x402/express:

import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://channels.openzeppelin.com/x402/testnet",
  createAuthHeaders: async () => {
    const headers = { Authorization: `Bearer YOUR_API_KEY` };
    return { verify: headers, settle: headers, supported: headers };
  },
});

const app = express();

app.use(
  paymentMiddleware(
    {
      "GET /weather": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "stellar:testnet",
            payTo: "SERVER_STELLAR_ADDRESS",
          },
        ],
        description: "Weather data",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register(
      "stellar:testnet",
      new ExactStellarScheme(),
    ),
  ),
);

app.get("/weather", (req, res) => {
  res.send({ weather: "sunny", temperature: 70 });
});

app.listen(4021);

Pricing formats
The price field supports two formats:

Human-readable — A dollar-string like "$0.001". The x402 SDK converts this to the equivalent on-chain amount and assumes USDC on Stellar.

price: "$0.001";

Explicit asset and amount — Specify the on-chain SEP-41 asset contract address and the amount in base units (the smallest unit as defined by the token's decimals; for example, if a USDC token has 7 decimals, then 1 USDC = 10,000,000 base units).

price: {
  asset: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  amount: "10000",
};

Use the explicit format when you want to accept a specific asset other than USDC, or when you need precise control over the on-chain amount.

3. Accept payments
With the middleware in place, any request to a protected route will trigger the x402 payment flow:

The client requests the resource
The server responds with 402 Payment Required and a PAYMENT-REQUIRED header containing the payment instructions (price, network, facilitator URL)
The client signs a Soroban authorization entry and resubmits the request with a PAYMENT-SIGNATURE header
The facilitator verifies and settles the payment on-chain
The server returns the resource along with a PAYMENT-RESPONSE header confirming settlement
How it works
The Built on Stellar facilitator leverages the OpenZeppelin Relayer framework with the x402 Facilitator Plugin. Under the hood, it uses the OpenZeppelin Relayer for high-throughput transaction submission.

Verification
When a payment is received, the facilitator:

Validates the x402 protocol version, scheme, and network
Decodes the transaction XDR and checks it is an invokeHostFunction calling transfer
Confirms the amount and recipient match the payment requirements
Verifies the authorization entries are properly signed by the payer
Simulates the transaction on-chain to confirm it will succeed
Settlement
After verification, the facilitator submits the payment on-chain via the OpenZeppelin Relayer and returns confirmation to the server.

Supported features
Networks: stellar:testnet, stellar:pubnet (CAIP-2 identifiers)
Assets: Any SEP-41 token asset (defaults to USDC)
x402 scheme: exact-v2
Endpoints: /verify, /settle, /supported
Settlement: Managed on-chain submission via OpenZeppelin Relayer
Compatibility: Works with all x402 ecosystem packages and Stellar x402-compatible wallets
Self-hosting
If you want to run your own instance of the facilitator instead of using the hosted service, you can deploy the OpenZeppelin Relayer with the x402 Facilitator Plugin directly. See the OpenZeppelin x402 Facilitator guide and the plugin source code for setup instructions.

Resources
@x402/stellar (npm) — npm package for x402 on Stellar
x402-stellar (repo) — Tools, examples, and references for x402 on Stellar
x402 on Stellar — Overview of the x402 protocol on Stellar
x402 protocol specification — x402 specification and whitepaper
OpenZeppelin x402 Facilitator Plugin — Source code
OpenZeppelin x402 Facilitator Docs — Full configuration and setup guide
OpenZeppelin Stellar Relayer SDK — SDK for interacting with the Relayer
Did you find this page helpful?
