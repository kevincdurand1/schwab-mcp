/**
 * Broker Factory Pattern
 * Creates broker clients based on configuration
 */

import { type RedisClientType } from 'redis';
import { MockBrokerAdapter } from '../adapters/mock/mockBrokerAdapter.js';
import { createSchwabBrokerAdapter } from '../adapters/schwab/schwabAdapter.js';
import  { type BrokerClient, type BrokerConfig, type BrokerType } from './types.js';

// ===============================
// Broker Factory Interface
// ===============================

export interface BrokerFactory {
  createClient(config: BrokerConfig, redisClient: RedisClientType): Promise<BrokerClient>;
  getSupportedBrokers(): BrokerType[];
}

// ===============================
// Default Broker Factory Implementation
// ===============================

export class DefaultBrokerFactory implements BrokerFactory {
  private readonly brokerMap: Map<BrokerType, (redisClient: RedisClientType) => Promise<BrokerClient>> = new Map();

  constructor() {
    // Register supported brokers
    this.brokerMap.set('schwab', this.createSchwabClient.bind(this));
    this.brokerMap.set('mock', this.createMockClient.bind(this));
    
    // TODO: Add more brokers as adapters are created
    // this.brokerMap.set('fidelity', this.createFidelityClient.bind(this));
    // this.brokerMap.set('td-ameritrade', this.createTdAmeritradeClient.bind(this));
    // this.brokerMap.set('interactive-brokers', this.createIbClient.bind(this));
  }

  async createClient(config: BrokerConfig, redisClient: RedisClientType): Promise<BrokerClient> {
    const createFunc = this.brokerMap.get(config.type);
    if (!createFunc) {
      throw new Error(`Unsupported broker type: ${config.type}`);
    }

    console.error(`[BrokerFactory] Creating ${config.type} client`);
    return await createFunc(redisClient);
  }

  getSupportedBrokers(): BrokerType[] {
    return Array.from(this.brokerMap.keys());
  }

  // ===============================
  // Broker-Specific Factory Methods
  // ===============================

  private async createSchwabClient(redisClient: RedisClientType): Promise<BrokerClient> {
    return await createSchwabBrokerAdapter(redisClient);
  }

  private async createMockClient(redisClient: RedisClientType): Promise<BrokerClient> {
    // Mock client doesn't need Redis, but keep interface consistent
    return await MockBrokerAdapter.create('mock-token');
  }

  // TODO: Implement additional broker adapters
}

// ===============================
// Singleton Factory Instance
// ===============================

let factoryInstance: BrokerFactory | null = null;

export function getBrokerFactory(): BrokerFactory {
  if (!factoryInstance) {
    factoryInstance = new DefaultBrokerFactory();
  }
  return factoryInstance;
}

// Allow dependency injection for testing
export function setBrokerFactory(factory: BrokerFactory): void {
  factoryInstance = factory;
}

// ===============================
// Configuration Helper
// ===============================

export function createBrokerConfig(
  type: BrokerType,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  options?: {
    baseUrl?: string;
    scopes?: string[];
  }
): BrokerConfig {
  return {
    type,
    clientId,
    clientSecret,
    redirectUri,
    baseUrl: options?.baseUrl,
    scopes: options?.scopes || getDefaultScopes(type)
  };
}

function getDefaultScopes(type: BrokerType): string[] {
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

export function getBrokerConfigFromEnv(): BrokerConfig {
  const brokerType = (process.env.BROKER_TYPE || 'schwab') as BrokerType;
  
  // Map environment variables based on broker type
  const envMap = {
    schwab: {
      clientId: process.env.SCHWAB_CLIENT_ID!,
      clientSecret: process.env.SCHWAB_CLIENT_SECRET!,
      redirectUri: process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1:3000/auth/callback'
    },
    mock: {
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      redirectUri: 'https://127.0.0.1:3000/auth/callback'
    },
    fidelity: {
      clientId: process.env.FIDELITY_CLIENT_ID!,
      clientSecret: process.env.FIDELITY_CLIENT_SECRET!,
      redirectUri: process.env.FIDELITY_REDIRECT_URI || 'https://127.0.0.1:3000/auth/callback'
    },
    'td-ameritrade': {
      clientId: process.env.TD_CLIENT_ID!,
      clientSecret: process.env.TD_CLIENT_SECRET!,
      redirectUri: process.env.TD_REDIRECT_URI || 'https://127.0.0.1:3000/auth/callback'
    },
    'interactive-brokers': {
      clientId: process.env.IB_CLIENT_ID!,
      clientSecret: process.env.IB_CLIENT_SECRET!,
      redirectUri: process.env.IB_REDIRECT_URI || 'https://127.0.0.1:3000/auth/callback'
    }
  };

  const config = envMap[brokerType];
  if (!config) {
    throw new Error(`Unsupported broker type in environment: ${brokerType}`);
  }

  return createBrokerConfig(
    brokerType,
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
} 