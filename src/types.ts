// ─── Supabase / DB row ──────────────────────────────────────────────────────

export interface ServiceRow {
    id: string;
    name: string;
    description: string;
    tags: string[];
    resource: string;
    type: string;
    x402_version: number;
    facilitator_url: string;
    network: string;
    asset: string;
    amount: string;
    pay_to: string;
    scheme: string;
    max_timeout_seconds: number;
    input_schema: Record<string, unknown>;
    output_schema: Record<string, unknown>;
    output_example: Record<string, unknown>;
    verified: boolean;
    status: string;
    settle_count: number;
    created_at: string;
    updated_at: string;
}

// ─── Bazaar v2 response types ────────────────────────────────────────────────

export interface BazaarAccepts {
    scheme: string;
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    maxTimeoutSeconds: number;
}

export interface BazaarReputation {
    settle_count: number;
    verified: boolean;
    first_seen: string;
}

export interface BazaarMetadata {
    name: string;
    description: string;
    tags: string[];
    input: Record<string, unknown>;
    output: {
        example: Record<string, unknown>;
        schema: Record<string, unknown>;
    };
    reputation: BazaarReputation;
}

export interface BazaarItem {
    resource: string;
    type: string;
    x402Version: number;
    accepts: BazaarAccepts[];
    lastUpdated: string;
    metadata: BazaarMetadata;
}

export interface BazaarPagination {
    limit: number;
    offset: number;
    total: number;
}

export interface BazaarDiscoveryResponse {
    x402Version: 2;
    items: BazaarItem[];
    pagination: BazaarPagination;
}

export interface BazaarMerchantResponse {
    payTo: string;
    resources: BazaarItem[];
    pagination: BazaarPagination;
}

// ─── Route body types ────────────────────────────────────────────────────────

export interface RegisterServiceBody {
    name: string;
    description?: string;
    tags?: string[];
    resource: string;
    facilitator_url: string;
    network: string;
    asset?: string;
    amount?: string;
    pay_to?: string;
    scheme?: string;
    max_timeout_seconds?: number;
    input_schema?: Record<string, unknown>;
    output_schema?: Record<string, unknown>;
    output_example?: Record<string, unknown>;
}

// ─── OZ settle body (simplified) ─────────────────────────────────────────────

export interface BazaarExtensionMeta {
    discoverable?: boolean;
    name?: string;
    description?: string;
    tags?: string[];
    input?: Record<string, unknown>;
    output?: {
        example?: Record<string, unknown>;
        schema?: Record<string, unknown>;
    };
    inputSchema?: Record<string, unknown>;
    outputExample?: Record<string, unknown>;
}

export interface SettlePayload {
    network?: string;
    resource?: { url?: string } | string;
    resourceURL?: string;
    maxAmountRequired?: string | number;
    payTo?: string;
    extensions?: {
        bazaar?: BazaarExtensionMeta;
    };
    bazaar?: BazaarExtensionMeta;
    metadata?: {
        bazaar?: BazaarExtensionMeta;
    };
}

export interface SettleBody {
    network?: string;
    payload?: SettlePayload;
}
