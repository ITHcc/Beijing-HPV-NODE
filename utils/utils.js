const _ = require('lodash')
const config = require('config')

const NumberMap = {
  0: '零',
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
  7: '七',
  8: '八',
  9: '九',
  10: '十',
}

module.exports.checkHpvType = (str, targets) => {
  const arr = targets.reduce((pre, cur) => {
    return [
      ...pre,
      cur + '价',
      NumberMap[cur] + '价'
    ]
  }, [])

  return arr.some((key) => _.includes(str, key))
}

module.exports.checkAdultHpvType = () => {
  // 暂不校验是否为成人疫苗
  return true
  // return _.includes(vacName, '成人') || Number(ageMin) > 0
}

module.exports.findCurCronConfig = (myConfig, cron) => {
  const curKey = _.isString(myConfig.cron)? 'common' : _.keys(myConfig.cron).find(key => myConfig.cron[key] === cron)
  const curVal = myConfig.cron[curKey] || myConfig.cron
  return {
    curKey: config.DEBUG? 'common' : curKey,
    curVal
  }
}

module.exports.getMyConfig = (name) => {
  const myConfig = config.get(name)

  const crons = _.isArray(myConfig.cron) ? myConfig.cron :
    _.isObject(myConfig.cron) ? _.values(myConfig.cron) : [myConfig.cron]

  return {
    ...myConfig,
    crons
  }
}
