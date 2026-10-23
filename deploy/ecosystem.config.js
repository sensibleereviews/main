// PM2 process definition for the Sensiblee app (standalone Next.js server).
//
// Usage on the VPS, from the project root (/var/www/sensiblee):
//   set -a; source .env; set +a          # export DATABASE_URL / SESSION_SECRET / PORT
//   pm2 start deploy/ecosystem.config.js
//   pm2 save                             # remember the process list
//   pm2 startup                          # enable boot persistence (follow printed step)
//
// The standalone server (built by `npm run build`) reads PORT and DATABASE_URL
// from its environment. Shell-exported values win over the fallbacks below.
module.exports = {
  apps: [
    {
      name: "sensiblee",
      cwd: "/var/www/sensiblee",
      script: ".next/standalone/server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        DATABASE_URL: process.env.DATABASE_URL || "file:/var/www/sensiblee/db/custom.db",
        SESSION_SECRET: process.env.SESSION_SECRET || "SET-A-REAL-SECRET-BEFORE-STARTING",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      out_file: "/var/log/sensiblee/out.log",
      error_file: "/var/log/sensiblee/error.log",
      time: true,
    },
  ],
};
