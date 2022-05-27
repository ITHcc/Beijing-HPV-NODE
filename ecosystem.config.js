module.exports = {
  apps : [{
    script: 'index.js',
    cwd: __dirname,
    output: './logs/pm2.out.log',
    error: './logs/pm2.error.log',
    log: './logs/pm2.all.log',
    instance_var: 'default',
    autorestart: true,

    // 环境参数，当前指定为生产环境 process.env.NODE_ENV
    env: {
      NODE_ENV: 'prod',
    },
    // pm2 start --env dev
    env_dev: {
      NODE_ENV: 'dev',
    },
    // pm2 start --env test
    env_test: {
      NODE_ENV: 'test',
    }
  }],

};
