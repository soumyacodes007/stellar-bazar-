import type { BazaarExtensionMeta, SettleBody } from '../types.js';

/**
 * Extracts Bazaar discovery metadata from an x402 settle request body.
 * Checks all known payload paths where bazaar metadata may be embedded.
 * Returns null if no valid Bazaar metadata is found.
 */
export function extractBazaarMetadata(
    body: SettleBody
): BazaarExtensionMeta | null {
    const payload = body.payload;
    if (!payload) return null;

    // Check all known metadata paths (order: most specific → least)
    const meta: BazaarExtensionMeta | undefined =
        payload.extensions?.bazaar ??
        payload.bazaar ??
        payload.metadata?.bazaar;

    if (!meta) return null;

    // If discoverable is explicitly set to false, skip indexing
    if (meta.discoverable === false) return null;

    return meta;
}

/**
 * Extracts the resource URL from a settle payload.
 * Handles both object and string forms of payload.resource.
 */
export function extractResourceURL(body: SettleBody): string | null {
    const payload = body.payload;
    if (!payload) return null;

    if (typeof payload.resource === 'string') return payload.resource;
    if (typeof payload.resource === 'object' && payload.resource?.url) {
        return payload.resource.url;
    }
    if (payload.resourceURL) return payload.resourceURL;

    return null;
}

/**
 * Detects the Stellar network from the settle request body.
 * Checks payload.network and body.network.
 */
export function detectNetwork(body: SettleBody): string {
    return body.payload?.network ?? body.network ?? 'stellar:testnet';
}

/**
 * Picks the correct OZ facilitator URL + API key based on network.
 */
export function getOzConfig(network: string): {
    url: string;
    apiKey: string;
} {
    const isMainnet = network.includes('pubnet') || network.includes('mainnet');
    return {
        url: isMainnet
            ? 'https://channels.openzeppelin.com/x402'
            : 'https://channels.openzeppelin.com/x402/testnet',
        apiKey: isMainnet
            ? (process.env.OZ_API_KEY_MAINNET ?? '')
            : (process.env.OZ_API_KEY_TESTNET ?? ''),
    };
}
