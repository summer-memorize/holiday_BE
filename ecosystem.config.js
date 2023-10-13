module.exports = {
  apps: [
    {
      name: "my-app",
      script: "app.js",
      cron_restart: "0 0 * * *",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {},
    },
  ],
};
