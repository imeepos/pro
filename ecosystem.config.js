module.exports = {
  apps: [
    {
      name: 'api',
      script: './apps/api/dist/main.js',
      cwd: '/app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SERVICE_NAME: 'api'
      },
      instances: 1,
      max_memory_restart: '512M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      listen_timeout: 10000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'broker',
      script: './apps/broker/dist/main.js',
      cwd: '/app',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        SERVICE_NAME: 'broker'
      },
      instances: 1,
      max_memory_restart: '256M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      listen_timeout: 10000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'crawler',
      script: './apps/crawler/dist/main.js',
      cwd: '/app',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SERVICE_NAME: 'crawler'
      },
      instances: 1,
      max_memory_restart: '1G',
      restart_delay: 10000,
      max_restarts: 5,
      min_uptime: '30s',
      kill_timeout: 15000,
      listen_timeout: 30000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'cleaner',
      script: './apps/cleaner/dist/main.js',
      cwd: '/app',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        SERVICE_NAME: 'cleaner'
      },
      instances: 1,
      max_memory_restart: '256M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      listen_timeout: 10000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};