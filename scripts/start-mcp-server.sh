#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Load environment variables from .env file
if [ -f ".env" ]; then
    set -a  # automatically export all variables
    source .env
    set +a  # turn off automatic export
fi

# Start the MCP server
npx tsx src/mcp-server.ts 