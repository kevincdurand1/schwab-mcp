import { createEndpoint } from './http'
import { z } from 'zod'
import { SchwabAccountsResponseSchema } from '../../tools/accounts'

// Type-safe function for getting accounts
export const getAccounts = createEndpoint<z.infer<typeof SchwabAccountsResponseSchema>>('/trader/v1/accounts', 'GET')
