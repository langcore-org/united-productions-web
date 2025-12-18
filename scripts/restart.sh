#!/bin/bash
# Restart all services
cd "$(dirname "${BASH_SOURCE[0]}")/.."
pm2 restart ecosystem.config.js
pm2 status
