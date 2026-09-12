/**
 * Core Quest Finder — PM2 Ecosystem Configuration
 * 
 * Used for production process management and automated recovery on Linux/VPS hosts.
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: "core-quest-backend",
      script: "./dist/server.js",
      cwd: "./backend",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      error_file: "../logs/backend-error.log",
      out_file: "../logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
    {
      name: "core-quest-frontend",
      script: "npm",
      args: "run preview -- --host 0.0.0.0 --port 4173",
      cwd: "./frontend",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 3000,
      env_production: {
        NODE_ENV: "production",
      },
      error_file: "../logs/frontend-error.log",
      out_file: "../logs/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
