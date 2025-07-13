import { type TokenIdentifiers, type KVNamespace } from '@sudowealth/schwab-api';
export interface KvTokenStore<T = any> {
    load(ids: TokenIdentifiers): Promise<T | null>;
    save(ids: TokenIdentifiers, data: T): Promise<void>;
    kvKey(ids: TokenIdentifiers): string;
    migrate(fromIds: TokenIdentifiers, toIds: TokenIdentifiers): Promise<boolean>;
    migrateIfNeeded(fromIds: TokenIdentifiers, toIds: TokenIdentifiers): Promise<void>;
}
/**
 * Creates a KV-backed token store using the SDK implementation
 * This maintains backward compatibility with the existing interface
 */
export declare function makeKvTokenStore<T = any>(kv: KVNamespace): KvTokenStore<T>;
export type { TokenIdentifiers };
