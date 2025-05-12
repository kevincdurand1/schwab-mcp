import { z } from 'zod'
import { UserPreference, ServiceError } from './schemas'

// --- Schemas for GET /userPreference ---

// This endpoint takes no parameters.

// Schema for the successful response body (200 OK)
export const UserPreferenceResponseSchema = UserPreference

// Note: Error responses (400, 401, 403, 404, 500, 503) for this endpoint
// are expected to use the imported 'ServiceError' schema.
// The imported 'ServiceError' schema is intended for use by API client code to handle error responses.
