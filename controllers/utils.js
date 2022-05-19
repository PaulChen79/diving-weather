require('dotenv').config()
const axios = require('axios')
const request = require('request')
const locations = require('../models/locations.json')

const handleMessage = (senderPsid, receivedMessage) => {
  if (receivedMessage.text) {
    if (receivedMessage.text === '如何使用') {
      const response = {
        text: '輸入常用潛點，如：小琉球、玉女岩等關鍵字來查詢\n\n如果關鍵字不符合可以再多嘗試幾個看看~\n\n目前還再測試階段中，如果有任何無法解決的問題或是有想要許願的潛點還請聯絡作者唷~',
        quick_replies: [{
          content_type: 'text',
          title: '如何使用',
          payload: '<POSTBACK_PAYLOAD>'
        }, {
          content_type: 'text',
          title: '推薦的潛點',
          payload: '<POSTBACK_PAYLOAD>'
        },
        {
          content_type: 'text',
          title: '經常查詢的潛點',
          payload: '<POSTBACK_PAYLOAD>'
        }]
      }
      return callSendAPI(senderPsid, response)
    } else if (receivedMessage.text === '推薦的潛點') {
      const response = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: '這邊推薦幾個大家常去的潛點給你~',
              buttons: [{
                type: 'postback',
                title: '小琉球',
                payload: '小琉球'
              },
              {
                type: 'postback',
                title: '潮境',
                payload: '潮境'
              },
              {
                type: 'postback',
                title: '墾丁',
                payload: '墾丁'
              }
              ]
            }]
          }
        },
        quick_replies: [{
          content_type: 'text',
          title: '如何使用',
          payload: '<POSTBACK_PAYLOAD>'
        }, {
          content_type: 'text',
          title: '推薦的潛點',
          payload: '<POSTBACK_PAYLOAD>'
        },
        {
          content_type: 'text',
          title: '經常查詢的潛點',
          payload: '<POSTBACK_PAYLOAD>'
        }]
      }
      return callSendAPI(senderPsid, response)
    } else if (receivedMessage.text === '經常查詢的潛點') {
      const response = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: '這邊是幾個常被搜尋的潛點~',
              buttons: [{
                type: 'postback',
                title: '小琉球',
                payload: '小琉球'
              },
              {
                type: 'postback',
                title: '蘭嶼',
                payload: '蘭嶼'
              },
              {
                type: 'postback',
                title: '綠島',
                payload: '綠島'
              }
              ]
            }]
          }
        },
        quick_replies: [{
          content_type: 'text',
          title: '如何使用',
          payload: '<POSTBACK_PAYLOAD>'
        }, {
          content_type: 'text',
          title: '推薦的潛點',
          payload: '<POSTBACK_PAYLOAD>'
        },
        {
          content_type: 'text',
          title: '經常查詢的潛點',
          payload: '<POSTBACK_PAYLOAD>'
        }]
      }
      return callSendAPI(senderPsid, response)
    } else {
      const filteredLocation = locations.filter(location => location.name.includes(receivedMessage.text))
      if (filteredLocation.length) {
        const locationName = filteredLocation[0].alias
        const LocationLon = filteredLocation[0].lon
        const locationLat = filteredLocation[0].lat
        const timeNow = new Date(Date.now()).toISOString()
        const timeNextHr = new Date(Date.now() + 3600000).toISOString()
        const today = new Date(Date.now()).toISOString().substring(0, 10) + 'T00:00:00'
        const nextDay = new Date(Date.now() + 86400000).toISOString().substring(0, 10) + 'T00:00:00'
        const tideUrl = encodeURI('https://opendata.cwb.gov.tw/api/v1/rest/datastore/F-A0021-001?Authorization=' + process.env.TAIWAN_OPENDATA_TOKEN + '&locationName=' + locationName + '&elementName=&sort=dataTime&timeFrom=' + today + '&timeTo=' + nextDay)
        const weatherUrl = encodeURI(`https://api.openweathermap.org/data/2.5/weather?lat=${locationLat}&lon=${LocationLon}&appid=${process.env.OPENWEATHER_TOKEN}`)
        const waveRul = encodeURI(`https://api.stormglass.io/v2/weather/point?lat=${locationLat}&lng=${LocationLon}&params=waveHeight,waveDirection,waterTemperature&start=${timeNow}&end=${timeNextHr}`)

        return Promise.all([
          axios.get(tideUrl),
          axios.get(weatherUrl),
          axios.get(waveRul, { headers: { Authorization: process.env.WAVE_API_TOKEN } })
        ])
          .then(([tideData, weatherData, waveData]) => {
            const result = {
              location: '',
              time: `${today.substring(0, 10)}`,
              tideDifference: '',
              tideChanging: '',
              temperature: Math.round(weatherData.data.main.temp - 273.15),
              humidity: weatherData.data.main.humidity,
              rain: `每小時： ${weatherData.data.rain || 0}mm`,
              wind: `風速： ${weatherData.data.wind.speed}miles/小時\n` + '風向： from ' + changeDegOfWing(weatherData.data.wind.deg),
              waveHeight: waveData.data.hours[0].waveHeight.sg,
              waveDirection: changeDegOfWing(waveData.data.hours[0].waveDirection.sg),
              waterTemperature: waveData.data.hours[0].waterTemperature.sg
            }

            result.location = tideData.data.records.location[0].locationName
            result.tideDifference = tideData.data.records.location[0].validTime[0].weatherElement[1].elementValue
            result.tideChanging = `潮汐變化：\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[0].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[0].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[1].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[1].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[2].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[2].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[3].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[3].parameter[0].parameterValue}`
            return result
          })
          .then(result => {
            const response = {
              text: `
            查詢地點： ${filteredLocation[0].name}\n\n海水溫度： ${result.waterTemperature}度\n浪高： ${result.waveHeight}米\n浪向： from ` + result.waveDirection + `\n潮差： ${result.tideDifference}\n\n時間： ${result.time}\n${result.tideChanging}\n\n氣溫： ${result.temperature}度\n濕度： ${result.humidity}%\n雨量${result.rain}\n${result.wind}`,
              quick_replies: [{
                content_type: 'text',
                title: '如何使用',
                payload: '<POSTBACK_PAYLOAD>'
              }, {
                content_type: 'text',
                title: '推薦的潛點',
                payload: '<POSTBACK_PAYLOAD>'
              },
              {
                content_type: 'text',
                title: '經常查詢的潛點',
                payload: '<POSTBACK_PAYLOAD>'
              }]
            }
            callSendAPI(senderPsid, response)
          })
          .catch(error => console.log(error))
      } else {
        const response = {
          text: '抱歉我不認識這個潛點，請換個地點或名稱試試看',
          quick_replies: [{
            content_type: 'text',
            title: '如何使用',
            payload: '<POSTBACK_PAYLOAD>'
          }, {
            content_type: 'text',
            title: '推薦的潛點',
            payload: '<POSTBACK_PAYLOAD>'
          },
          {
            content_type: 'text',
            title: '經常查詢的潛點',
            payload: '<POSTBACK_PAYLOAD>'
          }]
        }
        callSendAPI(senderPsid, response)
      }
    }
  } else {
    const response = {
      text: '抱歉我看不懂你傳的是什麼，請輸入"文字"地點或名稱試試看',
      quick_replies: [{
        content_type: 'text',
        title: '如何使用',
        payload: '<POSTBACK_PAYLOAD>'
      }, {
        content_type: 'text',
        title: '推薦的潛點',
        payload: '<POSTBACK_PAYLOAD>'
      },
      {
        content_type: 'text',
        title: '經常查詢的潛點',
        payload: '<POSTBACK_PAYLOAD>'
      }]
    }
    callSendAPI(senderPsid, response)
  }
}
const handlePostback = (senderPsid, receivedPostback) => {
  if (receivedPostback.title === 'Get Started') {
    const response = {
      text: '可以輸入潛點名稱來查詢當地天候狀況，或是點選以下按鈕來得到更多資訊唷！',
      quick_replies: [{
        content_type: 'text',
        title: '如何使用',
        payload: '<POSTBACK_PAYLOAD>'
      }, {
        content_type: 'text',
        title: '推薦的潛點',
        payload: '<POSTBACK_PAYLOAD>'
      },
      {
        content_type: 'text',
        title: '經常查詢的潛點',
        payload: '<POSTBACK_PAYLOAD>'
      }]
    }
    return callSendAPI(senderPsid, response)
  }
  const filteredLocation = locations.filter(location => location.name.includes(receivedPostback.payload))
  const locationName = filteredLocation[0].alias
  const LocationLon = filteredLocation[0].lon
  const locationLat = filteredLocation[0].lat
  const timeNow = new Date(Date.now()).toISOString()
  const timeNextHr = new Date(Date.now() + 3600000).toISOString()
  const today = new Date(Date.now()).toISOString().substring(0, 10) + 'T00:00:00'
  const nextDay = new Date(Date.now() + 86400000).toISOString().substring(0, 10) + 'T00:00:00'
  const tideUrl = encodeURI('https://opendata.cwb.gov.tw/api/v1/rest/datastore/F-A0021-001?Authorization=' + process.env.TAIWAN_OPENDATA_TOKEN + '&locationName=' + locationName + '&elementName=&sort=dataTime&timeFrom=' + today + '&timeTo=' + nextDay)
  const weatherUrl = encodeURI(`https://api.openweathermap.org/data/2.5/weather?lat=${locationLat}&lon=${LocationLon}&appid=${process.env.OPENWEATHER_TOKEN}`)
  const waveRul = encodeURI(`https://api.stormglass.io/v2/weather/point?lat=${locationLat}&lng=${LocationLon}&params=waveHeight,waveDirection,waterTemperature&start=${timeNow}&end=${timeNextHr}`)

  return Promise.all([
    axios.get(tideUrl),
    axios.get(weatherUrl),
    axios.get(waveRul, { headers: { Authorization: process.env.WAVE_API_TOKEN } })
  ])
    .then(([tideData, weatherData, waveData]) => {
      const result = {
        location: '',
        time: `${today.substring(0, 10)}`,
        tideDifference: '',
        tideChanging: '',
        temperature: Math.round(weatherData.data.main.temp - 273.15),
        humidity: weatherData.data.main.humidity,
        rain: `每小時： ${weatherData.data.rain || 0}mm`,
        wind: `風速： ${weatherData.data.wind.speed}miles/小時\n` + '風向： from ' + changeDegOfWing(weatherData.data.wind.deg),
        waveHeight: waveData.data.hours[0].waveHeight.sg,
        waveDirection: changeDegOfWing(waveData.data.hours[0].waveDirection.sg),
        waterTemperature: waveData.data.hours[0].waterTemperature.sg
      }

      result.location = tideData.data.records.location[0].locationName
      result.tideDifference = tideData.data.records.location[0].validTime[0].weatherElement[1].elementValue
      result.tideChanging = `潮汐變化：\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[0].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[0].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[1].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[1].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[2].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[2].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[3].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[3].parameter[0].parameterValue}`
      return result
    })
    .then(result => {
      const response = {
        text: `
            查詢地點： ${filteredLocation[0].name}\n\n海水溫度： ${result.waterTemperature}度\n浪高： ${result.waveHeight}米\n浪向： from  ` + result.waveDirection + `\n潮差： ${result.tideDifference}\n\n時間： ${result.time}\n${result.tideChanging}\n\n氣溫： ${result.temperature}度\n濕度： ${result.humidity}%\n雨量${result.rain}\n${result.wind}`,
        quick_replies: [{
          content_type: 'text',
          title: '如何使用',
          payload: '<POSTBACK_PAYLOAD>'
        }, {
          content_type: 'text',
          title: '推薦的潛點',
          payload: '<POSTBACK_PAYLOAD>'
        },
        {
          content_type: 'text',
          title: '經常查詢的潛點',
          payload: '<POSTBACK_PAYLOAD>'
        }]
      }
      callSendAPI(senderPsid, response)
    })
    .catch(error => console.log(error))
}

const changeDegOfWing = deg => {
  let windDirection = ''
  if ((deg > 337.5 && deg <= 359) || deg === 0) {
    windDirection = '北 ↓'
  } else if (deg > 0 && deg <= 22.5) {
    windDirection = '北北東 ↙'
  } else if (deg > 22.5 && deg <= 45) {
    windDirection = '東北 ↙'
  } else if (deg > 45 && deg <= 67.5) {
    windDirection = '東北東 ↙'
  } else if (deg > 67.5 && deg <= 90) {
    windDirection = '東 ←'
  } else if (deg > 90 && deg <= 112.5) {
    windDirection = '東南東 ↖'
  } else if (deg > 112.5 && deg <= 135) {
    windDirection = '東南 ↖'
  } else if (deg > 135 && deg <= 157.5) {
    windDirection = '南南東 ↖'
  } else if (deg > 157.5 && deg <= 180) {
    windDirection = '南 ↑↗'
  } else if (deg > 180 && deg <= 202.5) {
    windDirection = '南南西 ↗'
  } else if (deg > 202.5 && deg <= 225) {
    windDirection = '西南 ↗'
  } else if (deg > 225 && deg <= 247.5) {
    windDirection = '西南西 ↗'
  } else if (deg > 247.5 && deg <= 270) {
    windDirection = '西 →'
  } else if (deg > 270 && deg <= 292.5) {
    windDirection = '西北西 ↘'
  } else if (deg > 292.5 && deg <= 315) {
    windDirection = '西北 ↘'
  } else if (deg > 315 && deg <= 337.5) {
    windDirection = '北北西 ↘'
  }
  return windDirection
}
const callSendAPI = (senderPsid, response) => {
  const requestBody = {
    recipient: {
      id: senderPsid
    },
    message: response
  }

  request({
    uri: 'https://graph.facebook.com/v13.0/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: requestBody
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error('Unable to send message:' + err)
    }
  })
}

module.exports = { handleMessage, handlePostback }
