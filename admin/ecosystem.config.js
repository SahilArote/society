module.exports = {
  apps: [
    {
      name: 'society-app',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: '  ',
      merge_logs: true,
      autorestart: true,
      restart_delay: 4000,
    },
  ],
};
