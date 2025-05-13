import * as apiEndpoints from './endpoints'
// Removed: SchwabFetchRequestOptions import likely not needed with new type assertion
// import { type SchwabFetchRequestOptions } from './http'

// New: Define a type representing all exports from endpoints.ts
type EndpointFunctions = typeof import('./endpoints');

/**
 * Dynamic API client that allows access to endpoints using their exported function names.
 *
 * Example usage:
 * ```typescript
 * // Get accounts
 * const accounts = await Schwab.getAccounts(token, { queryParams: { fields: 'positions' } });
 *
 * // Get Orders
 * const orders = await Schwab.getOrders(token, { pathParams: { accountNumber: '123' } });
 *
 * // Create an order (assuming placeOrder is exported from endpoints.ts)
 * // const order = await Schwab.placeOrder(token, {
 * //   pathParams: { accountNumber: '12345' },
 * //   body: myOrderData
 * // });
 * ```
 */
export const Schwab = new Proxy(
  {}, // Target object (unused)
  {
    get(_, propName: string) {
      // Find the exported function in apiEndpoints that matches the property name
      const endpointFunction = (apiEndpoints as Record<string, any>)[propName];

      if (typeof endpointFunction === 'function') {
        // Return the actual endpoint function directly
        return endpointFunction;
      } else {
        // Property doesn't match an exported endpoint function
        console.error(
          `[Schwab Proxy] No endpoint function found for name: ${propName}. Available endpoints: ${Object.keys(apiEndpoints).join(', ')}`,
        );
        // Return undefined or throw an error, depending on desired behavior
        return undefined; // Or: throw new Error(`...`);
      }
    },
  },
// Updated type assertion to use the dynamically imported type
) as EndpointFunctions;
// Removed manual intersection type
/*
) as {
  // Add type definitions for the exported functions from endpoints.ts
  // This provides type safety and autocompletion for the proxy.
  getAccounts: typeof apiEndpoints.getAccounts;
  getUserPreference: typeof apiEndpoints.getUserPreference; // Added
  getOrders: typeof apiEndpoints.getOrders; // Added
  // getAccountByNumber: typeof apiEndpoints.getAccountByNumber; // If defined
  // placeOrder: typeof apiEndpoints.placeOrder; // If defined
  // ... add types for all exported endpoints ...
} & { [key: string]: any }; // Allow arbitrary string access, though less type-safe
*/
