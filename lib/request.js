const axios = require('axios')

// 重试次数，共请求3次
axios.defaults.retry = 2

// 请求的间隙
axios.defaults.retryDelay = 1000

axios.defaults.timeout = 1000 * 30

axios.interceptors.response.use(undefined, function axiosRetryInterceptor(err) {
  var config = err.config;
  // 如果配置不存在或未设置重试选项，则拒绝
  if (!config || !config.retry) return Promise.reject(err);

  // 设置变量以跟踪重试次数
  config.__retryCount = config.__retryCount || 0;

  // 判断是否超过总重试次数
  if (config.__retryCount >= config.retry) {
    // 返回错误并退出自动重试
    return Promise.reject(err);
  }

  // 增加重试次数
  config.__retryCount += 1;

  //打印当前重试次数
  console.log(config.url +' 自动重试第' + config.__retryCount + '次');

  // 创建新的Promise
  var backoff = new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, config.retryDelay || 1);
  });

  // 返回重试请求
  return backoff.then(function () {
    return axios(config);
  });
});


module.exports = axios
