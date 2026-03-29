/**
 * Seed Script — Populates the Bazaar DB with sample Stellar x402 services.
 * Run with: npm run seed
 */

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

interface SeedService {
    name: string;
    description: string;
    tags: string[];
    resource: string;
    facilitator_url: string;
    network: string;
    asset: string;
    amount: string;
    pay_to: string;
    input_schema: Record<string, unknown>;
    output_schema: Record<string, unknown>;
    output_example: Record<string, unknown>;
}

const SERVICES: SeedService[] = [
    {
        name: 'Stellar Weather API',
        description: 'Real-time weather data for any location, paid via x402 on Stellar testnet. Returns temperature, conditions, humidity, and wind speed.',
        tags: ['weather', 'climate', 'temperature', 'forecast', 'api'],
        resource: 'https://x402-stellar-491bf9f7e30b.herokuapp.com/weather',
        facilitator_url: `${BASE_URL}`,
        network: 'stellar:testnet',
        asset: 'USDC',
        amount: '1000',
        pay_to: '',
        input_schema: {
            type: 'object',
            properties: {
                city: { type: 'string', description: 'City name to get weather for', example: 'San Francisco' },
                units: { type: 'string', enum: ['metric', 'imperial'], description: 'Unit system' },
            },
            required: [],
        },
        output_schema: {
            type: 'object',
            properties: {
                temperature: { type: 'number', description: 'Current temperature' },
                conditions: { type: 'string', description: 'Weather conditions description' },
                humidity: { type: 'number', description: 'Humidity percentage' },
                wind_speed: { type: 'number', description: 'Wind speed' },
            },
        },
        output_example: {
            temperature: 72,
            conditions: 'partly cloudy',
            humidity: 58,
            wind_speed: 12,
        },
    },
    {
        name: 'Stellar Price Feed',
        description: 'Live XLM and Stellar asset prices sourced from the SDEX and Reflector Oracle. Returns latest bid, ask, and mid prices in USDC.',
        tags: ['price', 'crypto', 'xlm', 'usdc', 'feed', 'oracle', 'defi'],
        resource: 'https://x402-stellar-491bf9f7e30b.herokuapp.com/price',
        facilitator_url: `${BASE_URL}`,
        network: 'stellar:testnet',
        asset: 'USDC',
        amount: '1000',
        pay_to: '',
        input_schema: {
            type: 'object',
            properties: {
                asset: { type: 'string', description: 'Asset code, e.g. XLM, AQUA, USDC', example: 'XLM' },
            },
            required: [],
        },
        output_schema: {
            type: 'object',
            properties: {
                asset: { type: 'string' },
                bid: { type: 'string', description: 'Best bid price in USDC' },
                ask: { type: 'string', description: 'Best ask price in USDC' },
                mid: { type: 'string', description: 'Mid-market price in USDC' },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
        output_example: {
            asset: 'XLM',
            bid: '0.09812',
            ask: '0.09871',
            mid: '0.09842',
            timestamp: '2026-03-29T15:00:00Z',
        },
    },
    {
        name: 'Stellar Observatory — Space Weather',
        description: 'Latest space weather data including solar wind speed, X-ray flux, geomagnetic Kp index, and aurora visibility. Powered by NOAA data via x402.',
        tags: ['space', 'weather', 'solar', 'aurora', 'kp-index', 'noaa', 'science'],
        resource: 'https://stellar-observatory.vercel.app/api/space-weather',
        facilitator_url: `${BASE_URL}`,
        network: 'stellar:testnet',
        asset: 'USDC',
        amount: '1000',
        pay_to: '',
        input_schema: {
            type: 'object',
            properties: {},
            required: [],
        },
        output_schema: {
            type: 'object',
            properties: {
                solar_wind_speed: { type: 'number', description: 'Solar wind speed in km/s' },
                xray_flux: { type: 'string', description: 'X-ray flux classification' },
                kp_index: { type: 'number', description: 'Geomagnetic Kp index (0–9)' },
                aurora_visible: { type: 'boolean' },
            },
        },
        output_example: {
            solar_wind_speed: 420,
            xray_flux: 'B3.2',
            kp_index: 4,
            aurora_visible: true,
        },
    },
];

async function registerService(service: SeedService): Promise<void> {
    const res = await fetch(`${BASE_URL}/register-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
    });

    const data = await res.json() as { success?: boolean; service?: { id: string; name: string }; error?: string };

    if (res.ok && data.success) {
        console.log(`  ✅ Registered: ${data.service?.name} (${data.service?.id})`);
    } else {
        console.error(`  ❌ Failed to register "${service.name}":`, data.error ?? res.statusText);
    }
}

async function seed(): Promise<void> {
    console.log(`\n🌱 Seeding Stellar Bazaar at ${BASE_URL}...\n`);

    for (const service of SERVICES) {
        await registerService(service);
    }

    console.log('\n✨ Seed complete! Try:');
    console.log(`  curl "${BASE_URL}/discovery/resources"`);
    console.log(`  curl "${BASE_URL}/discovery/resources?q=weather"`);
    console.log(`  curl "${BASE_URL}/discovery/resources?q=space&network=stellar:testnet"\n`);
}

seed().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
});
