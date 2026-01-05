const path = require('path');
const BASE = '/opt/serv/agency/langcore/up-release';

module.exports = {
  apps: [
    {
      name: 'up_web',
      cwd: path.join(BASE, 'up_web'),
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3120
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: path.join(BASE, 'logs/up_web-error.log'),
      out_file: path.join(BASE, 'logs/up_web-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'cc_agent',
      cwd: path.join(BASE, 'agent'),
      script: 'poetry',
      args: 'run uvicorn src.main:app --host 0.0.0.0 --port 8230',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: path.join(BASE, 'logs/cc_agent-error.log'),
      out_file: path.join(BASE, 'logs/cc_agent-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'tunnel_ai_prod_staff',
      script: 'cloudflared',
      args: 'tunnel --config /etc/cloudflared/api-ai-prod-staff.yml run',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      error_file: path.join(BASE, 'logs/tunnel_ai_prod_staff-error.log'),
      out_file: path.join(BASE, 'logs/tunnel_ai_prod_staff-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
