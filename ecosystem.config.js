module.exports = {
  apps: [{
    name: 'bank-workflow',
    script: 'npm',
    args: 'start',
    env: {
      PORT: 3003,
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      PORT: 3003,
      NODE_ENV: 'production'
    }
  }]
}
