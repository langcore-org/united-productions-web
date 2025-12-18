#!/bin/bash
# Start all services
cd "$(dirname "${BASH_SOURCE[0]}")/.."
pm2 start ecosystem.config.js
pm2 status
