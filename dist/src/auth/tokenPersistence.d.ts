import { type TokenData, type EnhancedTokenManagerOptions } from '@sudowealth/schwab-api';
/**
 * Maps MCP-style load/save functions to EnhancedTokenManager-compatible functions
 *
 * @param load Function to load tokens from storage
 * @param save Function to save tokens to storage
 * @returns Mapped load and save functions compatible with EnhancedTokenManager
 */
export declare function mapTokenPersistence<T extends EnhancedTokenManagerOptions = EnhancedTokenManagerOptions>(load?: () => Promise<TokenData | null>, save?: (tokenData: TokenData) => Promise<void>): Pick<T, 'load' | 'save'>;
