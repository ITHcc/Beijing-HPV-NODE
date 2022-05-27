const config = require('config')
const Dayjs = require('dayjs')
const schedule = require('node-schedule')
const _ = require('lodash')
const utils = require('@utils/utils')


const log = require('@lib/logger')

class Base {
  _config

  _name = '未知'
  _nameEn = 'unknown'

  _headers

  _result

  _logs = []

  _schedules = []

  constructor () {
  }

  async createSchedules () {
    this.log('创建定时任务')
    const myConfig = utils.getMyConfig(`${this._nameEn}`)

    this._schedules = _.map(myConfig.crons, (cron) => {
      this.log(`创建定时任务: ${this._name} - ${cron}`)
      return {
        _handler: schedule.scheduleJob(cron, async () => {
          try {
            await this.run(cron)
          } catch (e) {
            this.log(e)
          }
        }),
        _cron: cron
      }
    })
  }

  async run (cron) {
    this.log(`开始执行脚本: ${this._name}`)

    const params = {
      cron: cron
    }
    const expandParams = await this.prepare(params)
    console.log(expandParams)
    await this.execute({
      params,
      ...expandParams
    })
    await this.destory(params)
  }

  async prepare () {
    this.log(`${this._name} 准备中...`)
  }

  async execute() {
    this.log(`${this._name} 执行中...`)
  }

  async destory() {
    this.log(`${this._name} 销毁中...`)
  }

  async wait(second = 200) {
    await new Promise((r) => setTimeout(r, second))
  }

  async log(msg) {

    if (_.isObject(msg)) {
      msg = JSON.stringify(msg)
    }
    log.info(String(msg).toString())
    this._logs.push(msg)
  }
}
module.exports = Base
