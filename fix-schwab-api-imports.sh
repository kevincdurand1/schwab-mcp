#!/bin/bash

# Fix ESM imports in @sudowealth/schwab-api package
# This is a workaround for broken ESM imports in version 2.1.0

echo "Fixing ESM imports in @sudowealth/schwab-api..."

# Main index.js file - fix all imports
sed -i \
  -e "s/from '\\.\/errors'/from '.\/errors.js'/g" \
  -e "s/from '\\.\/auth'/from '.\/auth\/index.js'/g" \
  -e "s/from '\\.\/market-data'/from '.\/market-data\/index.js'/g" \
  -e "s/from '\\.\/trader'/from '.\/trader\/index.js'/g" \
  -e "s/from '\\.\/schemas'/from '.\/schemas\/index.js'/g" \
  -e "s/from '\\.\/create-api-client'/from '.\/create-api-client.js'/g" \
  -e "s/from '\\.\/constants'/from '.\/constants.js'/g" \
  -e "s/from '\\.\/auth\/enhanced-token-manager'/from '.\/auth\/enhanced-token-manager.js'/g" \
  -e "s/from '\\.\/auth\/auth-utils'/from '.\/auth\/auth-utils.js'/g" \
  -e "s/from '\\.\/auth\/oauth-state-utils'/from '.\/auth\/oauth-state-utils.js'/g" \
  -e "s/from '\\.\/auth\/adapters\/kv-token-store'/from '.\/auth\/adapters\/kv-token-store.js'/g" \
  -e "s/from '\\.\/auth\/adapters\/cookie-token-store'/from '.\/auth\/adapters\/cookie-token-store.js'/g" \
  -e "s/from '\\.\/utils\/secure-logger'/from '.\/utils\/secure-logger.js'/g" \
  -e "s/from '\\.\/auth\/error-mapping'/from '.\/auth\/error-mapping.js'/g" \
  -e "s/from '\\.\/middleware\/compose'/from '.\/middleware\/compose.js'/g" \
  -e "s/from '\\.\/middleware\/with-token-auth'/from '.\/middleware\/with-token-auth.js'/g" \
  -e "s/from '\\.\/middleware\/with-rate-limit'/from '.\/middleware\/with-rate-limit.js'/g" \
  -e "s/from '\\.\/middleware\/with-retry'/from '.\/middleware\/with-retry.js'/g" \
  -e "s/from '\\.\/auth\/token-lifecycle-manager'/from '.\/auth\/token-lifecycle-manager.js'/g" \
  -e "s/from '\\.\/auth\/adapters'/from '.\/auth\/adapters\/index.js'/g" \
  -e "s/from '\\.\/utils\/crypto-utils'/from '.\/utils\/crypto-utils.js'/g" \
  -e "s/from '\\.\/utils\/account-scrubber'/from '.\/utils\/account-scrubber.js'/g" \
  node_modules/@sudowealth/schwab-api/dist/src/index.js

echo "Fixed ESM imports in @sudowealth/schwab-api"