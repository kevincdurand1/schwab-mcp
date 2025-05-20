# Token Management State Machine

This directory contains the implementation of a state machine for token
management that centralizes and simplifies the token lifecycle handling in the
Schwab MCP application.

## Overview

The token management has been redesigned using a state machine approach to:

1. Make token state transitions explicit and predictable
2. Eliminate duplicate code and reduce complexity
3. Centralize error handling
4. Improve diagnostic capabilities
5. Provide a single source of truth for token refresh operations

> **Important:** All token refresh operations must go through the `TokenStateMachine`.
> The state machine is the single source of truth for token state management and ensures
> consistent lifecycle management across the application.

## Implementation Files

- `tokenStateMachine.ts` - Core implementation of the state machine
- `exampleUsage.ts` - Examples showing how to use the state machine
- `migrateToStateMachine.md` - Detailed migration guide

## State Diagram

```
                              ┌───────────────┐
                              │ Uninitialized │
                              └───────┬───────┘
                                     │
                                     │ initialize()
                                     ▼
                              ┌───────────────┐
                              │ Initializing  │
                              └───────┬───────┘
                                     │
                      ┌──────────────┴──────────────┐
                      │                             │
           No token data                       With token data
                      │                             │
                      ▼                             ▼
                ┌─────────┐    refresh()      ┌────────┐
          ┌─────│  Error  │◄────────────────┐ │ Expired │
          │     └─────────┘                 │ └────┬────┘
          │           ▲                     │      │
          │           │                     │      │ refresh()
  Error   │           │       Error         │      │
          │           │                     │      ▼
          │     ┌───────────┐               │ ┌────────────┐
          └────►│ Refreshing│◄──────────────┘ │   Valid    │
                └─────┬─────┘                 └─────┬──────┘
                      │                             │
                      │         Success             │
                      └──────────────────────────►─┘
```

## How to Use

### Basic Initialization

```typescript
import { initializeSchwabAuthClient } from './auth/client'
import { TokenStateMachine } from './auth/tokenStateMachine'
import { initializeTokenManager } from './shared/utils'

// Create auth client
// Note: The auth client does not directly manage token refresh operations
// It only provides the underlying API calls that the state machine uses
const auth = initializeSchwabAuthClient(env, redirectUri)

// Create token state machine - this is the source of truth for token management
const tokenStateMachine = new TokenStateMachine(auth)

// Initialize token state
await tokenStateMachine.initialize()

// Register with utility functions for use throughout the app
initializeTokenManager(tokenStateMachine)
```

### Ensuring Valid Tokens

```typescript
// Get a valid token
const accessToken = await tokenStateMachine.getAccessToken()

// Or check validity first
const isValid = await tokenStateMachine.ensureValidToken()
if (isValid) {
	// Token is valid
	const accessToken = await tokenStateMachine.getAccessToken()
} else {
	// Token is invalid, cannot proceed
	const diagnostics = tokenStateMachine.getDiagnostics()
	logger.error('Token is invalid', { state: diagnostics.state })
}
```

### Token Refreshing

```typescript
// The state machine is the only component that handles token refreshing

// Explicit refresh through the state machine
const refreshed = await tokenStateMachine.refresh()

// Reconnection for handling transient errors
// This also goes through the state machine to maintain consistent state
const reconnected = await tokenStateMachine.handleReconnection()
```

## Implementation

The `TokenStateMachine` implements the `ITokenManager` interface with the
following key methods:

- `getAccessToken()`
- `ensureValidToken()`
- `refresh()`
- `handleReconnection()`
- `updateTokenClient()`
- `getDiagnostics()`

## Benefits

1. **Clear State Management**: All possible token states are explicitly defined
2. **Improved Error Handling**: Error states are properly tracked and can be
   recovered from
3. **Simplified Logic**: Each state handles only the transitions relevant to it
4. **Comprehensive Diagnostics**: Better visibility into current token state
5. **Consistent Behavior**: Predictable token lifecycle handling
6. **Single Source of Truth**: All token refresh operations are centralized in the state machine
7. **Clear Responsibility Separation**: Auth client handles API calls while state machine manages lifecycle
