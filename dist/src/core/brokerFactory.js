/**
 * Broker Factory Pattern
 * Creates broker clients based on configuration
 */
import { MockBrokerAdapter } from '../adapters/mock/mockBrokerAdapter.js';
import { createSchwabBrokerAdapter } from '../adapters/schwab/schwabAdapter.js';
// ===============================
// Default Broker Factory Implementation
// ===============================
export class DefaultBrokerFactory {
    brokerMap = new Map();
    constructor() {
        // Register supported brokers
        this.brokerMap.set('schwab', this.createSchwabClient.bind(this));
        this.brokerMap.set('mock', this.createMockClient.bind(this));
        // TODO: Add more brokers as adapters are created
        // this.brokerMap.set('fidelity', this.createFidelityClient.bind(this));
        // this.brokerMap.set('td-ameritrade', this.createTdAmeritradeClient.bind(this));
        // this.brokerMap.set('interactive-brokers', this.createIbClient.bind(this));
    }
    async createClient(config, redisClient) {
        const createFunc = this.brokerMap.get(config.type);
        if (!createFunc) {
            throw new Error(`Unsupported broker type: ${config.type}`);
        }
        console.error(`[BrokerFactory] Creating ${config.type} client`);
        return await createFunc(redisClient);
    }
    getSupportedBrokers() {
        return Array.from(this.brokerMap.keys());
    }
    // ===============================
    // Broker-Specific Factory Methods
    // ===============================
    async createSchwabClient(redisClient) {
        return await createSchwabBrokerAdapter(redisClient);
    }
    async createMockClient(redisClient) {
        // Mock client doesn't need Redis, but keep interface consistent
        return await MockBrokerAdapter.create('mock-token');
    }
}
// ===============================
// Singleton Factory Instance
// ===============================
let factoryInstance = null;
export function getBrokerFactory() {
    if (!factoryInstance) {
        factoryInstance = new DefaultBrokerFactory();
    }
    return factoryInstance;
}
// Allow dependency injection for testing
export function setBrokerFactory(factory) {
    factoryInstance = factory;
}
// ===============================
// Configuration Helper
// ===============================
export function createBrokerConfig(type, clientId, clientSecret, redirectUri, options) {
    return {
        type,
        clientId,
        clientSecret,
        redirectUri,
        baseUrl: options?.baseUrl,
        scopes: options?.scopes || getDefaultScopes(type)
    };
}
function getDefaultScopes(type) {
    switch (type) {
        case 'schwab':
            return ['api'];
        case 'mock':
            return ['api'];
        case 'fidelity':
            return ['read', 'trading']; // TODO: Verify actual scopes
        case 'td-ameritrade':
            return ['read', 'trading']; // TODO: Verify actual scopes
        case 'interactive-brokers':
            return ['read', 'trading']; // TODO: Verify actual scopes
        default:
            return ['read'];
    }
}
// ===============================
// Environment Configuration Helper
// ===============================
export function getBrokerConfigFromEnv() {
    const brokerType = (process.env.BROKER_TYPE || 'schwab');
    // Map environment variables based on broker type
    const envMap = {
        schwab: {
            clientId: process.env.SCHWAB_CLIENT_ID,
            clientSecret: process.env.SCHWAB_CLIENT_SECRET,
            redirectUri: process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1:3000/auth/callback'
        },
        mock: {
            clientId: 'mock-client-id',
            clientSecret: 'mock-client-secret',
            redirectUri: 'https://127.0.0.1:3000/auth/callback'
        },
        fidelity: {
            clientId: process.env.FIDELITY_CLIENT_ID,
            clientSecret: process.env.FIDELITY_CLIENT_SECRET,
            redirectUri: process.env.FIDELITY_REDIRECT_URI || 'https://127.0.0.1:3000/auth/callback'
        },
        'td-ameritrade': {
            clientId: process.env.TD_CLIENT_ID,
            clientSecret: process.env.TD_CLIENT_SECRET,
            redirectUri: process.env.TD_REDIRECT_URI || 'https://127.0.0.1:3000/auth/callback'
        },
        'interactive-brokers': {
            clientId: process.env.IB_CLIENT_ID,
            clientSecret: process.env.IB_CLIENT_SECRET,
            redirectUri: process.env.IB_REDIRECT_URI || 'https://127.0.0.1:3000/auth/callback'
        }
    };
    const config = envMap[brokerType];
    if (!config) {
        throw new Error(`Unsupported broker type in environment: ${brokerType}`);
    }
    return createBrokerConfig(brokerType, config.clientId, config.clientSecret, config.redirectUri);
}
//# sourceMappingURL=brokerFactory.js.map