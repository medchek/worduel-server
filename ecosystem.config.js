module.exports = {
  apps: [
    {
      name: "worduel-server",
      script: "./build/index.js",
      watch: "./build/",
      // Delay between restart
      watch_delay: 1000,
      ignore_watch: ["node_modules", "src"],
      watch_options: {
        followSymlinks: false,
      },
      instances: "1", // revert to max when implementing clustre-shared memory
      exec_mode: "cluster",
      instance_var: "INSTANCE_ID",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
