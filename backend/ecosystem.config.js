module.exports = {
  apps: [
    {
      name: 'society',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      restart_delay: 4000,
    },
  ],
};
