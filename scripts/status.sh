#!/bin/bash
# Check status of all services
pm2 status
echo ""
echo "=== Chat UI Logs (last 10 lines) ==="
pm2 logs chat-ui --lines 10 --nostream
echo ""
echo "=== API Wrapper Logs (last 10 lines) ==="
pm2 logs api-wrapper --lines 10 --nostream
