// 微信小程序大医苗
const Dayjs = require('dayjs')
const config = require('config')
const _ = require('lodash')
const async = require('async')
const dayjs = require('dayjs');
const axios = require('@lib/request')
const generateUa = require('@lib/device').generateUa
const utils = require('@utils/utils')
const myData  = require('@root/data/dayimiao')


const Base = require('./base')
const myConfig = utils.getMyConfig('dayimiao')


class Dayimiao extends Base {
  _name = '大医苗'
  _nameEn = 'dayimiao'

  _headers = {
    host: 'mp.dywrbt.com',
    referer: 'https://servicewechat.com/wx1cf50c2a73c08a5d/33/page-frame.html',
    // userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E217 MicroMessenger/6.8.0(0x16080000) NetType/WIFI Language/en Branch/Br_trunk MiniProgramEnv/Mac',
    userAgent: generateUa(),
    id: myConfig.headerId,
    os: 'applet',
    roletype: 'vac',
    acceptLanguage: 'zh-cn',
    contentType: 'application/json',
    phone: myConfig.phone,
    openId: myConfig.openId,
  }

  // 疫苗类型ID
  // 23价肺炎疫苗，1355045532162560000
  // 乙肝疫苗, 1328241213956108288
  // HPV疫苗类型ID, 1326346365879083008
  _bvaccinTypeId = "1326346365879083008"
  _bvaccinNameId = "1326346365879083008"

  // 经纬度
  _position = {
    latitude: 39.95933151245117,
    longitude: 116.29844665527344,
  }

  async fetchList() {
    try {
      const url = `https://mp.dywrbt.com/vac/wechat/smallRoutine/getVaccinNameByTypeId`
      const resp = await axios.post(url, {
        bvaccinTypeId: this._bvaccinTypeId, // HPV疫苗类型ID
        // 疫苗名称ID
        bvaccinNameId: "",
        // 公司/机构名称
        companyName: "",
        ...this._position
      }, {
        headers: this._headers
      })

      if (resp.data.message === '您当前刷新过于频繁，请稍候再试') {
        this.log(`${this._name} 获取列表失败，请求过于频繁`)
        await this.wait(_.random(2000, 5000))
        return []
      }
      const { companyList } = resp.data.data

      const filteredList = companyList.filter(({ surplusAmount }) => Number(surplusAmount) > 1)
      return filteredList;
    } catch (e) {
      this.log(`${this._name} 获取列表失败，${e.message}`)
    }
  }

  // 获取sku信息
  async fetchVaccineSkuInfo(company) {
    this.log(`${company.companyName} 获取sku信息`)
    try {
      const url = `https://mp.dywrbt.com/vac/wechat/smallRoutine/reserveInfo`
      const { data } = await axios.post(url, {
        bvaccinTypeId: this._bvaccinTypeId,
        bvaccinNameId: this._bvaccinNameId,
        companyId: company.id,
        mode: "1", // mode = 1，表示已选中预约详情里的疫苗，下面需要选疫苗品种
      }, {
        headers: this._headers
      })

      const { vaccinList } = data.data

      return vaccinList.find(({ vaccinName, vacIsEmpty, ageMin }) => {
        if (
          !vacIsEmpty &&
          utils.checkHpvType(vaccinName, myConfig.hpvType) &&
          utils.checkAdultHpvType(vaccinName, ageMin)
        ) {
          return true
        }
        this.log(`${company.companyName}-${vaccinName}: 无库存 或 非目标疫苗 `)
        return false
      })
    } catch (e) {
      this.log(`${company.companyName} 获取sku信息失败，${e.message}`)
    }
  }

  // 获取疫苗sku对应的可预约时间范围
  async fetchReserveDateList(company, vaccine) {

    // 获取可预约时间段信息
    const fetchDateRangeList = async ({formatDate}) => {
      try {
        const url = `https://mp.dywrbt.com/vac/wechat/smallRoutine/getReserveDateDetail`
        // 获取最近两个月的
        const resp = await axios.post(url, {
          companyId: company.id,
          makeDate: formatDate,
          vacId: vaccine.id,
          stockId: vaccine.stockId,
          payId: "",
          mode: "1",
        }, {
          headers: this._headers
        })

        return resp.data.data || []
      } catch(e) {
        this.log(`获取预约时间段列表失败, ${e.message}`)
      }

    }

    // 获取近两个月的可预约的日期信息
    const fetchMonthDate = async (month) => {
      const monthFormated = month.format('YYYY-M')

      try {
        const url = `https://mp.dywrbt.com/vac/wechat/smallRoutine/getReserveDateListNew`
        // 获取最近两个月的
        const resp = await axios.post(url, {
          companyId: company.id,
          reserveDate: monthFormated, // "2022-4"
          vacId: vaccine.id,
          bvaccinTypeId: this._bvaccinTypeId,
          vacPeoId: myConfig.peopleId,
          vacNameId: vaccine.vacNameId,
          payId: "",
          specs: "01",
          vaccinateId: "",
          vacCount: -1,
          mode: "1", // mode = 1，表示已选中预约详情里的疫苗，下面需要选疫苗品种
        }, {
          headers: this._headers
        })
        const { dateList } = resp.data.data

        const results = []
        for (let i = 0; i < dateList.length; i++) {
          const dateItem = dateList[i]
          const { isClicked, year, month, day } = dateItem
          dateItem.formatDate = Dayjs(`${year}-${month}-${day}`).format('YYYY-M-DD')
          if (isClicked) {
            const rangeList = await fetchDateRangeList(dateItem)
            results.push({
              ...dateItem,
              rangeList
            })
          }
        }

        return results
      } catch(e) {
        this.log(`获取${monthFormated}日期列表失败, ${e.message}`)
      }

    }

    const dateList = await Promise.all([Dayjs(), Dayjs().add(1, 'M')].map(m => fetchMonthDate(m)))

    return _.flattenDeep(dateList.filter(item => item))
  }

  // 发起预约请求
  async pay(company, vaccine, date, rangeId) {
    try {
      const url = `https://mp.dywrbt.com/vac/wechat/smallRoutine/pay`
      console.log('pay params', {
        vaccinPeopleId: myConfig.peopleId,
        stockId: vaccine.stockId,
        vaccinateTimeDetailId: rangeId,
        entCompanyId: company.id,
        vacId: vaccine.id,
        reserveDate: date.formatDate,
        reserveDateList: [date.formatDate],
        vacTypeId: this._bvaccinTypeId,
        queueId: "",
        mode: "1",
      })

      const resp = await axios.post(url, {
        vaccinPeopleId: myConfig.peopleId,
        stockId: vaccine.stockId,
        vaccinateTimeDetailId: rangeId,
        entCompanyId: company.id,
        vacId: vaccine.id,
        reserveDate: date.formatDate,
        reserveDateList: [date.formatDate],
        vacTypeId: this._bvaccinTypeId,
        queueId: "",
        mode: "1",
      }, {
        headers: this._headers,
      })

      return resp.data.message === '预约成功'
    } catch(e) {
      this.log(`预约失败, ${e.message}`)
    }
  }

  // 遍历可预约的每一天，并发预约当天所有可预约的时间段
  async concurrentPay(company, vaccine, dateList) {
    this.log(`开始预约 ${vaccine.vaccinName}`)
    for (let i = 0; i < dateList.length; i++) {
      const date = dateList[i]
      const rangeResults = await async.mapLimit(date.rangeList, 2, (range) => {
        return this.pay(company, vaccine, date, range.id)
      })
      if (rangeResults.some(item => item)) {
        this.log(`预约 ${vaccine.vaccinName} 成功`)
        return true
      }

      await this.wait(_.random(50, 300))
    }
    return false
  }


  // 脚本预处理
  async prepare({
    cron
  }) {
    this.log('开始预处理')
    const { curKey, curVal } = utils.findCurCronConfig(myConfig, cron)

    return {
      // 获取当前计划时间可能会补货的疫苗
      companyList: myData.companyList.filter((company) => (
        (curKey === 'common' || _.includes(company.companyName, curKey)) && curVal === cron)
      )
    }
  }

  async execute({
    companyList
  }) {
    this.log('开始执行')
    // 执行超过4分钟则停止脚本
    const endTime = Dayjs().add(4, 'm')

    const loopFlag = true

    while (loopFlag && Dayjs().isBefore(endTime)) {
      this.log('开始循环')
      async.mapLimit(companyList, 3, async (company) => {
        const vaccine = await this.fetchVaccineSkuInfo(company)
        if (vaccine) {
          this.log(`${company.companyName} 可预约疫苗: ${vaccine.vaccinName}, ${JSON.stringify(vaccine)}`)
          const dateList = await this.fetchReserveDateList(company, vaccine)
          const result = await this.concurrentPay(company, vaccine, dateList)
          if (result) loopFlag = result
        }
      })

      await this.wait(_.random(1000, 3000))
    }

  }
}


module.exports = Dayimiao
