module.exports = {
  apps: [
    {
      name: 'chat-ui',
      cwd: './next-chat-ui-cc-wrapper',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3120
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/chat-ui-error.log',
      out_file: './logs/chat-ui-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'api-wrapper',
      cwd: './claude-code-openai-wrapper',
      script: 'poetry',
      args: 'run uvicorn src.main:app --host 0.0.0.0 --port 8120',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: './logs/api-wrapper-error.log',
      out_file: './logs/api-wrapper-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
