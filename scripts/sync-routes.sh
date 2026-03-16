#!/bin/bash
# Sync SPA shell (index.html) to all route directories
# Run this before every firebase deploy to keep route copies in sync
cd "$(dirname "$0")/.."

ROUTES="shop login about sagan contact reykjavik akureyri admin verify-email"
for route in $ROUTES; do
    mkdir -p "$route"
    cp index.html "$route/index.html"
    echo "  Synced $route/index.html"
done
echo "All routes synced."
