import { createEndpoint, EndpointMetadata, InferPathParams, InferQueryParams, InferBody, InferResponse } from './http'
// Import actual schemas
import {
  AccountsQueryParamsSchema,
  UserPreference,
  OrdersQuerySchema,
  // Added helper schemas:
  AccountNumberPathSchema,
  AccountsArraySchema,
  OrdersArraySchema,
} from '../../tools/schemas'

// --- Get Accounts ---
const getAccountsMeta = {
  path: '/trader/v1/accounts',
  method: 'GET',
  querySchema: AccountsQueryParamsSchema,
  responseSchema: AccountsArraySchema,
} as const satisfies EndpointMetadata<undefined, typeof AccountsQueryParamsSchema, undefined, typeof AccountsArraySchema, 'GET'>
export const getAccounts = createEndpoint<
  undefined,
  InferQueryParams<typeof getAccountsMeta.querySchema>,
  undefined,
  InferResponse<typeof getAccountsMeta.responseSchema>,
  typeof getAccountsMeta.method,
  typeof getAccountsMeta
>(getAccountsMeta)

// --- Get User Preference ---
const getUserPreferenceMeta = {
  path: '/trader/v1/userPreference',
  method: 'GET',
  responseSchema: UserPreference,
} as const satisfies EndpointMetadata<undefined, undefined, undefined, typeof UserPreference, 'GET'>
export const getUserPreference = createEndpoint<
  undefined,
  undefined,
  undefined,
  InferResponse<typeof getUserPreferenceMeta.responseSchema>,
  typeof getUserPreferenceMeta.method,
  typeof getUserPreferenceMeta
>(getUserPreferenceMeta)

// --- Get Orders ---
const getOrdersMeta = {
  path: '/trader/v1/accounts/{accountNumber}/orders',
  method: 'GET',
  pathSchema: AccountNumberPathSchema,
  querySchema: OrdersQuerySchema,
  responseSchema: OrdersArraySchema,
} as const satisfies EndpointMetadata<typeof AccountNumberPathSchema, typeof OrdersQuerySchema, undefined, typeof OrdersArraySchema, 'GET'>
export const getOrders = createEndpoint<
  InferPathParams<typeof getOrdersMeta.pathSchema>,
  InferQueryParams<typeof getOrdersMeta.querySchema>,
  undefined,
  InferResponse<typeof getOrdersMeta.responseSchema>,
  typeof getOrdersMeta.method,
  typeof getOrdersMeta
>(getOrdersMeta)

// Example for an endpoint with path parameters:
/*
const AccountModelSchema = z.object({ accountId: z.string(), ... }); // Define if not already
const GetAccountPathParamsSchema = z.object({ accountNumber: z.string() });

// Example using the new pattern:
const getAccountByNumberMeta = {
  path: '/trader/v1/accounts/{accountNumber}',
  method: 'GET',
  pathSchema: GetAccountPathParamsSchema,
  responseSchema: AccountModelSchema,
} as const satisfies EndpointMetadata<
  typeof GetAccountPathParamsSchema,
  undefined,
  undefined,
  typeof AccountModelSchema,
  'GET'
>;
export const getAccountByNumber = createEndpoint<
  InferPathParams<typeof getAccountByNumberMeta.pathSchema>,
  InferQueryParams<typeof getAccountByNumberMeta.querySchema>,
  InferBody<typeof getAccountByNumberMeta.bodySchema>,
  InferResponse<typeof getAccountByNumberMeta.responseSchema>,
  typeof getAccountByNumberMeta.method,
  typeof getAccountByNumberMeta
>(getAccountByNumberMeta);
*/

// Add other endpoint definitions here following the same pattern...
