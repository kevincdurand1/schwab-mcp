/**
 * Maps MCP-style load/save functions to EnhancedTokenManager-compatible functions
 *
 * @param load Function to load tokens from storage
 * @param save Function to save tokens to storage
 * @returns Mapped load and save functions compatible with EnhancedTokenManager
 */
export function mapTokenPersistence(load, save) {
    const mappedLoad = load
        ? async () => load()
        : undefined;
    const mappedSave = save
        ? async (d) => save(d)
        : undefined;
    return {
        load: mappedLoad,
        save: mappedSave,
    };
}
//# sourceMappingURL=tokenPersistence.js.map