require('dotenv').config()
const axios = require('axios')
const request = require('request')
const locations = require('../models/locations.json')

const handleMessage = (senderPsid, receivedMessage) => {
  if (receivedMessage.text) {
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
      const waveRul = encodeURI(`https://api.stormglass.io/v2/weather/point?lat=${locationLat}&lng=${LocationLon}&params=waveHeight,waveDirection&start=${timeNow}&end=${timeNextHr}`)

      return Promise.all([
        axios.get(tideUrl),
        axios.get(weatherUrl),
        axios.get(waveRul, { headers: { Authorization: process.env.WAVE_API_TOKEN } })
      ])
        .then(([tideData, weatherData, waveData]) => {
          let waveDir = ''
          if (waveData.data.hours[0].waveDirection.sg < 180) {
            waveDir = changeDegOfWing(waveData.data.hours[0].waveDirection.sg + 180)
          } else {
            waveDir = changeDegOfWing(waveData.data.hours[0].waveDirection.sg - 180)
          }
          const result = {
            location: '',
            time: `${today.substring(0, 10)}`,
            tideDifference: '',
            tideChanging: '',
            temperature: Math.round(weatherData.data.main.temp - 273.15),
            humidity: weatherData.data.main.humidity,
            rain: `每小時： ${weatherData.data.rain || 0}mm`,
            wind: `風速： ${weatherData.data.wind.speed}miles/小時\n` + '風向： ' + changeDegOfWing(weatherData.data.wind.deg),
            waveHeight: waveData.data.hours[0].waveHeight.sg,
            waveDirection: waveDir
          }

          result.location = tideData.data.records.location[0].locationName
          result.tideDifference = tideData.data.records.location[0].validTime[0].weatherElement[1].elementValue
          result.tideChanging = `潮汐變化：\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[0].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[0].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[1].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[1].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[2].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[2].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[3].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[3].parameter[0].parameterValue}`
          return result
        })
        .then(result => {
          const response = {
            text: `
            查詢地點： ${filteredLocation[0].name}\n浪高： ${result.waveHeight}米\n浪向： 往` + result.waveDirection + `\n潮差： ${result.tideDifference}\n時間： ${result.time}\n\n${result.tideChanging}\n\n氣溫： ${result.temperature}度\n濕度： ${result.humidity}%\n雨量${result.rain}\n${result.wind}`
          }
          callSendAPI(senderPsid, response)
        })
        .catch(error => console.log(error))
    } else {
      const response = {
        text: '抱歉我不認識這個潛點，請換個地點或名稱試試看'
      }
      callSendAPI(senderPsid, response)
    }
  }
}
const handlePostback = (senderPsid, receivedPostback) => {
  if (receivedPostback.title === 'Get Started') {
    const response = {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [{
            title: '推薦給你常用潛點',
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
              title: '後壁湖',
              payload: '後壁湖'
            }
            ]
          }]
        }
      }
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
  const waveRul = encodeURI(`https://api.stormglass.io/v2/weather/point?lat=${locationLat}&lng=${LocationLon}&params=waveHeight,waveDirection&start=${timeNow}&end=${timeNextHr}`)

  return Promise.all([
    axios.get(tideUrl),
    axios.get(weatherUrl),
    axios.get(waveRul, { headers: { Authorization: process.env.WAVE_API_TOKEN } })
  ])
    .then(([tideData, weatherData, waveData]) => {
      let waveDir = ''
      if (waveData.data.hours[0].waveDirection.sg < 180) {
        waveDir = changeDegOfWing(waveData.data.hours[0].waveDirection.sg + 180)
      } else {
        waveDir = changeDegOfWing(waveData.data.hours[0].waveDirection.sg - 180)
      }
      const result = {
        location: '',
        time: `${today.substring(0, 10)}`,
        tideDifference: '',
        tideChanging: '',
        temperature: Math.round(weatherData.data.main.temp - 273.15),
        humidity: weatherData.data.main.humidity,
        rain: `每小時： ${weatherData.data.rain || 0}mm`,
        wind: `風速： ${weatherData.data.wind.speed}miles/小時\n` + '風向： ' + changeDegOfWing(weatherData.data.wind.deg),
        waveHeight: waveData.data.hours[0].waveHeight.sg,
        waveDirection: waveDir
      }

      result.location = tideData.data.records.location[0].locationName
      result.tideDifference = tideData.data.records.location[0].validTime[0].weatherElement[1].elementValue
      result.tideChanging = `潮汐變化：\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[0].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[0].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[1].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[1].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[2].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[2].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[3].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[3].parameter[0].parameterValue}`
      return result
    })
    .then(result => {
      const response = {
        text: `
            查詢地點： ${filteredLocation[0].name}\n浪高： ${result.waveHeight}米\n浪向： 往` + result.waveDirection + `\n潮差： ${result.tideDifference}\n時間： ${result.time}\n\n${result.tideChanging}\n\n氣溫： ${result.temperature}度\n濕度： ${result.humidity}%\n雨量${result.rain}\n${result.wind}`
      }
      callSendAPI(senderPsid, response)
    })
    .then(() => {
      const response = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: '請選擇另一個要查詢的地點',
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
                title: '後壁湖',
                payload: '後壁湖'
              }
              ]
            }]
          }
        }
      }
      return callSendAPI(senderPsid, response)
    })
    .catch(error => console.log(error))
}
const changeDegOfWing = deg => {
  let windDirection = ''
  if ((deg > 337.5 && deg <= 359) || deg === 0) {
    windDirection = '北 🡡'
  } else if (deg > 0 && deg <= 22.5) {
    windDirection = '北北東 🡥'
  } else if (deg > 22.5 && deg <= 45) {
    windDirection = '東北 🡥'
  } else if (deg > 45 && deg <= 67.5) {
    windDirection = '東北東 🡥'
  } else if (deg > 67.5 && deg <= 90) {
    windDirection = '東 🡢'
  } else if (deg > 90 && deg <= 112.5) {
    windDirection = '東南東 🡦'
  } else if (deg > 112.5 && deg <= 135) {
    windDirection = '東南 🡦'
  } else if (deg > 135 && deg <= 157.5) {
    windDirection = '南南東 🡦'
  } else if (deg > 157.5 && deg <= 180) {
    windDirection = '南 🡣'
  } else if (deg > 180 && deg <= 202.5) {
    windDirection = '南南西 🡧'
  } else if (deg > 202.5 && deg <= 225) {
    windDirection = '西南 🡧'
  } else if (deg > 225 && deg <= 247.5) {
    windDirection = '西南西 🡧'
  } else if (deg > 247.5 && deg <= 270) {
    windDirection = '西 🡠'
  } else if (deg > 270 && deg <= 292.5) {
    windDirection = '西北西 🡤'
  } else if (deg > 292.5 && deg <= 315) {
    windDirection = '西北 🡤'
  } else if (deg > 315 && deg <= 337.5) {
    windDirection = '北北西 🡤'
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
