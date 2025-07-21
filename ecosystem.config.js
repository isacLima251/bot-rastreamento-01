module.exports = {
  apps: [
    {
      name: 'bot-rastreamento',
      script: 'server.js',
      error_file: '/dev/stdout',
      out_file: '/dev/stdout',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
