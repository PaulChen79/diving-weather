require('dotenv').config()
const Weather = require('../models/weather')

// Packages
const request = require('request')
const locations = require('../models/locations.json')

// Response tempelates
const quickReplies = [
  {
    content_type: 'text',
    title: '如何使用',
    payload: '<POSTBACK_PAYLOAD>'
  },
  {
    content_type: 'text',
    title: '建議與回報',
    payload: '<POSTBACK_PAYLOAD>'
  },
  {
    content_type: 'text',
    title: '推薦的潛點',
    payload: '<POSTBACK_PAYLOAD>'
  },
  {
    content_type: 'text',
    title: '經常查詢的潛點',
    payload: '<POSTBACK_PAYLOAD>'
  }
]
const oftenPostBackButton = [
  {
    type: 'postback',
    title: '小琉球',
    payload: '琉球'
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
const popularPostBackButton = [
  {
    type: 'postback',
    title: '小琉球',
    payload: '琉球'
  },
  {
    type: 'postback',
    title: '綠島',
    payload: '綠島'
  },
  {
    type: 'postback',
    title: '蘭嶼',
    payload: '蘭嶼'
  }
]

const handleMessage = async (senderPsid, receivedMessage) => {
  try {
    if (receivedMessage.text) {
      if (receivedMessage.text === '如何使用') {
        const response = {
          text: '輸入常用潛點，如：小琉球、玉女岩等關鍵字來查詢\n\n如果關鍵字不符合可以再多嘗試幾個看看~\n\n目前還再測試階段中，如果有任何無法解決的問題或是有想要許願的潛點還請聯絡作者唷~',
          quick_replies: quickReplies
        }
        return callSendAPI(senderPsid, response)
      } else if (receivedMessage.text === '推薦的潛點') {
        const response = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title: '這邊推薦幾個大家常去的潛點給你~',
                  buttons: oftenPostBackButton
                }
              ]
            }
          },
          quick_replies: quickReplies
        }
        return callSendAPI(senderPsid, response)
      } else if (receivedMessage.text === '經常查詢的潛點') {
        const response = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title: '這邊是幾個常被搜尋的潛點~',
                  buttons: popularPostBackButton
                }
              ]
            }
          },
          quick_replies: quickReplies
        }
        return callSendAPI(senderPsid, response)
      } else if (receivedMessage.text.includes('保羅')) {
        const response = {
          text: '嗯？雖然我不知道你說什麼，但我知道保羅他很帥',
          quick_replies: quickReplies
        }
        return callSendAPI(senderPsid, response)
      } else if (receivedMessage.text === '建議與回報') {
        const response = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title: '有什麼建議和Feedback歡迎私訊保羅教練的IG\n\n他會盡快回覆給你唷～',
                  buttons: [
                    {
                      type: 'web_url',
                      url: 'https://instagram.com/paul_cph11?igshid=YmMyMTA2M2Y=',
                      title: '私訊IG'
                    }
                  ]
                }
              ]
            }
          },
          quick_replies: quickReplies
        }
        return callSendAPI(senderPsid, response)
      } else {
        const filteredLocation = locations.filter(location =>
          location.name.includes(receivedMessage.text)
        )
        if (filteredLocation.length) {
          const keyword = new RegExp(receivedMessage.text, 'i')
          const result = await Weather.findOne({ location: { $regex: keyword } })
          const suggestResponse = checkWaterAndAirTemp(result.temperature, result.waterTemperature)
          const response = awaitgenResponse(
            result.time,
            result.location,
            result.tideChanging,
            result.waterTemperature,
            result.waveHeight,
            result.waveDirection,
            result.currentSpeed,
            result.currentDirection,
            result.tideDifference,
            result.temperature,
            result.humidity,
            result.rain,
            result.wind,
            result.cloudCover
          )
          callSendAPI(senderPsid, response)
          setTimeout(() => {
            callSendAPI(senderPsid, suggestResponse)
          }, '2000')
        } else {
          const response = {
            text: '抱歉我不認識這個潛點，請換個地點或名稱試試看',
            quick_replies: quickReplies
          }
          callSendAPI(senderPsid, response)
        }
      }
    } else {
      const response = {
        text: '抱歉我看不懂你傳這個什麼意思？\n不要玩我啦～～～\n請輸入"文字"地點或名稱試試看',
        quick_replies: quickReplies
      }
      callSendAPI(senderPsid, response)
    }
  } catch (error) {
    console.log(error)
  }
}
const handlePostback = async (senderPsid, receivedPostback) => {
  try {
    if (receivedPostback.title === 'Get Started') {
      const response = {
        text: '哈囉！這裡是潛點即時氣候查詢機器人\n你可以輸入潛點關鍵字來查詢當地天候狀況\n天候狀況每15分鐘更新一次\n或是點選以下按鈕來得到更多資訊唷！',
        quick_replies: quickReplies
      }
      return callSendAPI(senderPsid, response)
    }
    const keyword = new RegExp(receivedPostback.title, 'i')
    const result = await Weather.findOne({ location: { $regex: keyword } })
    const suggestResponse = checkWaterAndAirTemp(result.temperature, result.waterTemperature)
    const response = genResponse(
      result.time,
      result.location,
      result.tideChanging,
      result.waterTemperature,
      result.waveHeight,
      result.waveDirection,
      result.currentSpeed,
      result.currentDirection,
      result.tideDifference,
      result.temperature,
      result.humidity,
      result.rain,
      result.wind,
      result.cloudCover
    )
    callSendAPI(senderPsid, response)
    setTimeout(() => {
      callSendAPI(senderPsid, suggestResponse)
    }, '2000')
  } catch (error) {
    console.log(error)
  }
}

function genResult(tideData, weatherData, waveData, name, today) {
  const tideElemant = tideData.data.records.location[0].validTime[0].weatherElement[2]
  // Factoryig result date
  const result = {
    location: name,
    time: `${today.substring(0, 10)}`,
    tideDifference: tideData.data.records.location[0].validTime[0].weatherElement[1].elementValue,
    tideChanging: `當日潮汐變化：\n${
      tideElemant.time[0] ? tideElemant.time[0].dataTime.substring(11, 16) : '暫無資料'
    } - ${tideElemant.time[0] ? tideElemant.time[0].parameter[0].parameterValue : ''}\n${
      tideElemant.time[1] ? tideElemant.time[1].dataTime.substring(11, 16) : '暫無資料'
    } - ${tideElemant.time[1] ? tideElemant.time[1].parameter[0].parameterValue : ''}\n${
      tideElemant.time[2] ? tideElemant.time[2].dataTime.substring(11, 16) : '暫無資料'
    } - ${tideElemant.time[2] ? tideElemant.time[2].parameter[0].parameterValue : ''}\n${
      tideElemant.time[3] ? tideElemant.time[3].dataTime.substring(11, 16) : '暫無資料'
    } - ${tideElemant.time[3] ? tideElemant.time[3].parameter[0].parameterValue : ''}`,
    temperature: Math.round(weatherData.data.main.temp - 273.15),
    humidity: weatherData.data.main.humidity,
    rain: `每小時： ${weatherData.data.rain ? weatherData.data.rain['1h'] : 0}mm`,
    wind:
      `風速： ${weatherData.data.wind.speed}miles/小時\n` +
      '風向： from ' +
      changeDeg(weatherData.data.wind.deg),
    waveHeight: waveData.data.hours[0].waveHeight.sg,
    waveDirection: changeDeg(waveData.data.hours[0].waveDirection.sg),
    waterTemperature: waveData.data.hours[0].waterTemperature.sg,
    currentSpeed: waveData.data.hours[0].currentSpeed.sg,
    currentDirection: changeDeg(waveData.data.hours[0].currentDirection.sg),
    cloudCover: genCloudCover(waveData.data.hours[0].cloudCover.sg)
  }
  return result
}
function changeDeg(deg) {
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
    windDirection = '南 ↑'
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
function checkWaterAndAirTemp(temperature, waterTemperature) {
  const response = {
    text: '',
    quick_replies: quickReplies
  }
  let status = ''
  if (temperature >= 29 && waterTemperature >= 28) {
    status = 'hot'
  } else if (temperature >= 29 && waterTemperature <= 28 && waterTemperature >= 25) {
    status = 'airHot'
  } else if (
    temperature < 29 &&
    temperature >= 26 &&
    waterTemperature <= 28 &&
    waterTemperature >= 25
  ) {
    status = 'warm'
  } else if (temperature < 29 && temperature >= 26 && waterTemperature >= 28) {
    status = 'waterHot'
  } else {
    status = 'cold'
  }
  if (status === 'hot') {
    response.text = '今天穿比基尼或泳褲都OK啦！\n不過還是要注意一下海象天氣喔！'
  } else if (status === 'airHot') {
    response.text =
      '氣溫熱熱的，水溫可能稍冷\n穿上3mm以內的防寒衣應該足夠了～\n開心的玩水或訓練囉～\n還是要注意一下海象天氣喔！'
  } else if (status === 'warm') {
    response.text =
      '不是天氣稍冷就是水溫稍冷唷\n建議穿3mm或以上的防寒衣\n泡太久可能會有點冷\n還是要注意一下海象天氣喔！'
  } else if (status === 'waterHot') {
    response.text =
      '水溫暖暖的，上岸可能稍冷\n穿上3mm以內的防寒衣應該足夠了～\n記得備一件毛巾衣在岸上唷\n還是要注意一下海象天氣喔！'
  } else {
    response.text =
      '你有5mm以上的防寒衣嗎？\n沒有的話你最好注意一下保暖！\n還是要注意一下海象天氣喔！'
  }
  return response
}
function genCloudCover(percent) {
  let result = ''
  if (percent <= 25) {
    result = '晴天'
  } else if (percent > 25 && percent <= 62.5) {
    result = '疏雲'
  } else {
    result = '多雲'
  }
  return result
}
function genResponse(
  time,
  location,
  tideChanging,
  waterTemperature,
  waveHeight,
  waveDirection,
  currentSpeed,
  currentDirection,
  tideDifference,
  temperature,
  humidity,
  rain,
  wind,
  cloudCover
) {
  const response = {
    text:
      `
        日期： ${time}\n地點： ${location}\n\n${tideChanging}\n\n海水溫度： ${waterTemperature}度\n浪高： ${waveHeight}米\n浪向： from  ` +
      waveDirection +
      `\n流速： ${currentSpeed}米/秒\n流向： from ` +
      currentDirection +
      `\n潮差： ${tideDifference}\n\n` +
      '雲量： ' +
      cloudCover +
      `\n氣溫： ${temperature}度\n濕度： ${humidity}%\n雨量${rain}\n${wind}`,
    quick_replies: quickReplies
  }
  return response
}
function callSendAPI(senderPsid, response) {
  const requestBody = {
    recipient: {
      id: senderPsid
    },
    message: response
  }

  request(
    {
      uri: 'https://graph.facebook.com/v13.0/me/messages',
      qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: {
        recipient: {
          id: senderPsid
        },
        sender_action: 'mark_seen'
      }
    },
    (err, res, body) => {
      if (!err) {
        console.log('message sent!')
      } else {
        console.error('Unable to send message:' + err)
      }
    }
  )

  request(
    {
      uri: 'https://graph.facebook.com/v13.0/me/messages',
      qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: {
        recipient: {
          id: senderPsid
        },
        sender_action: 'typing_on'
      }
    },
    (err, res, body) => {
      if (!err) {
        console.log('message sent!')
      } else {
        console.error('Unable to send message:' + err)
      }
    }
  )

  request(
    {
      uri: 'https://graph.facebook.com/v13.0/me/messages',
      qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: requestBody
    },
    (err, res, body) => {
      if (!err) {
        console.log('message sent!')
      } else {
        console.error('Unable to send message:' + err)
      }
    }
  )

  request(
    {
      uri: 'https://graph.facebook.com/v13.0/me/messages',
      qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: {
        recipient: {
          id: senderPsid
        },
        sender_action: 'typing_off'
      }
    },
    (err, res, body) => {
      if (!err) {
        console.log('message sent!')
      } else {
        console.error('Unable to send message:' + err)
      }
    }
  )
}

module.exports = { handleMessage, handlePostback, genResult }
