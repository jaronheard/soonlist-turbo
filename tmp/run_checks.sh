#!/bin/bash
cd /tmp/soonlist-turbo
echo "Running lint fix..."
pnpm lint:fix
echo "Running format fix..."
pnpm format:fix
echo "Running typecheck..."
pnpm typecheck