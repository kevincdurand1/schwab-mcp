import { KVTokenStore as SDKKVTokenStore, } from '@sudowealth/schwab-api';
import { TOKEN_KEY_PREFIX, TTL_31_DAYS } from './constants';
import { logger } from './log';
/**
 * Creates a KV-backed token store using the SDK implementation
 * This maintains backward compatibility with the existing interface
 */
export function makeKvTokenStore(kv) {
    const sdkStore = new SDKKVTokenStore(kv, {
        keyPrefix: TOKEN_KEY_PREFIX,
        ttl: TTL_31_DAYS,
        autoMigrate: true,
    });
    return {
        load: async (ids) => {
            const result = await sdkStore.load(ids);
            return result;
        },
        save: async (ids, data) => {
            await sdkStore.save(ids, data);
        },
        kvKey: (ids) => {
            return sdkStore.generateKey(ids);
        },
        migrate: async (fromIds, toIds) => {
            return sdkStore.migrate(fromIds, toIds);
        },
        migrateIfNeeded: async (fromIds, toIds) => {
            const success = await sdkStore.migrate(fromIds, toIds);
            if (!success) {
                logger.warn('Token migration was not needed or failed', {
                    from: sdkStore.generateKey(fromIds),
                    to: sdkStore.generateKey(toIds),
                });
            }
        },
    };
}
//# sourceMappingURL=kvTokenStore.js.map