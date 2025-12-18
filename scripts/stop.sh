#!/bin/bash
# Stop all services
cd "$(dirname "${BASH_SOURCE[0]}")/.."
pm2 stop ecosystem.config.js
pm2 status
