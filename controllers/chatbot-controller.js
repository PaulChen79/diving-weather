require('dotenv').config()
const request = require('request')
const axios = require('axios')
const MY_VERIFY_TOKEN = process.env.MY_VERIFY_TOKEN

const chatbotController = {
  getWebhook: (req, res) => {
    const VERIFY_TOKEN = MY_VERIFY_TOKEN
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED')
        res.status(200).send(challenge)
      } else {
        res.sendStatus(403)
      }
    }
  },
  postWebhook: (req, res) => {
    const body = req.body

    if (body.object === 'page') {
      body.entry.forEach(function (entry) {
        const webhookEvent = entry.messaging[0]
        console.log(webhookEvent)

        const senderPsid = webhookEvent.sender.id
        console.log('Sender PSID: ' + senderPsid)

        if (webhookEvent.message) {
          handleMessage(senderPsid, webhookEvent.message)
        } else if (webhookEvent.postback) {
          console.log(webhookEvent.postback)
          handlePostback(senderPsid, webhookEvent.postback)
        }
      })
      res.status(200).send('EVENT_RECEIVED')
    } else {
      res.sendStatus(404)
    }
  }
}

function handleMessage (senderPsid, receivedMessage) {
  // Check if the message contains text
  let response = {}

  if (receivedMessage.text) {
    axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${receivedMessage.text}&appid=a3a652db95697608165e76ed2d559e19`)
      .then(response => {
        const position = {
          lat: response.data[0].lat,
          lon: response.data[0].lon
        }
        return position
      })
      .then(position => {
        return axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${position.lat}&lon=${position.lon}&appid=a3a652db95697608165e76ed2d559e19`)
      })
      .then(response => {
        const temp = Math.round(response.data.main.temp - 273.15)
        const message = `The temp of ${receivedMessage.text} now is: ${temp} celsius`
        return message
      })
      .then(message => {
        response = {
          text: message
        }
        // Create the payload for a basic text message
        callSendAPI(senderPsid, response)
      })
      .catch(error => {
        console.log(error)
      })
    response = {
      text: 'Sorry! something wrong. Please try again'
    }
    // Create the payload for a basic text message
    callSendAPI(senderPsid, response)
  } else if (receivedMessage.attachments) {
    // Gets the URL of the message attachment
    const attachmentUrl = receivedMessage.attachments[0].payload.url
    response = {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [{
            title: 'Is this the right picture?',
            subtitle: 'Tap a button to answer.',
            image_url: attachmentUrl,
            buttons: [{
              type: 'postback',
              title: 'Yes!',
              payload: 'yes'
            },
            {
              type: 'postback',
              title: 'No!',
              payload: 'no'
            }
            ]
          }]
        }
      }
    }
  }

  // Sends the response message
  callSendAPI(senderPsid, response)
}

// Handles messaging_postbacks events
function handlePostback (senderPsid, receivedPostback) {
  if (receivedPostback.title === 'Get Started') {
    const response = {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [{
            title: '請選擇你要查詢的地點',
            buttons: [{
              type: 'postback',
              title: '小琉球',
              payload: '屏東縣琉球鄉,120.3833,22.3533'
            },
            {
              type: 'postback',
              title: '萬里桐',
              payload: '潛點萬里桐,120.706,21.995'
            },
            {
              type: 'postback',
              title: '後壁湖航道西側',
              payload: '潛點後壁湖航道西側,120.746,21.938'
            }
            ]
          }]
        }
      }
    }
    return callSendAPI(senderPsid, response)
  }
  const payloadName = receivedPostback.payload.split(',')[0]
  const payloadLon = Number(receivedPostback.payload.split(',')[1])
  const payloadLat = Number(receivedPostback.payload.split(',')[2])
  const today = new Date(Date.now()).toISOString().substring(0, 10) + 'T00:00:00'
  const nextDay = new Date(Date.now() + 86400000).toISOString().substring(0, 10) + 'T00:00:00'
  const tideUrl = encodeURI('https://opendata.cwb.gov.tw/api/v1/rest/datastore/F-A0021-001?Authorization=CWB-E120C9CE-49B1-42D6-82A9-A28C742A403E&locationName=' + payloadName + '&elementName=&sort=dataTime&timeFrom=' + today + '&timeTo=' + nextDay)
  const weatherUrl = encodeURI(`https://api.openweathermap.org/data/2.5/weather?lat=${payloadLat}&lon=${payloadLon}&appid=a3a652db95697608165e76ed2d559e19`)

  return Promise.all([
    axios.get(tideUrl),
    axios.get(weatherUrl)
  ])
    .then(([tideData, weatherData]) => {
      console.log(weatherData)
      const result = {
        location: '',
        time: `${today.substring(0, 10)}`,
        tideDifference: '',
        tideChanging: '',
        temperature: Math.round(weatherData.data.main.temp - 273.15),
        humidity: weatherData.data.main.humidity,
        rain: `每小時： ${weatherData.data.rain || 0}mm`,
        wind: `風速： ${weatherData.data.wind.speed}miles/小時\n` + '風向： ' + changeDegOfWing(weatherData.data.wind.deg)
      }

      result.location = tideData.data.records.location[0].locationName
      result.tideDifference = tideData.data.records.location[0].validTime[0].weatherElement[1].elementValue
      result.tideChanging = `潮汐變化：\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[0].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[0].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[1].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[1].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[2].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[2].parameter[0].parameterValue}\n${tideData.data.records.location[0].validTime[0].weatherElement[2].time[3].dataTime.substring(11, 16)} - ${tideData.data.records.location[0].validTime[0].weatherElement[2].time[3].parameter[0].parameterValue}\n
        `
      return result
    })
    .then(result => {
      const response = {
        text: '查詢地點： ' + result.location + '\n' + '潮差： ' + result.tideDifference + '\n' + '時間： ' + result.time + '\n' + result.tideChanging + '\n' + `氣溫： ${result.temperature}度` + '\n' + `濕度： ${result.humidity}%` + '\n' + '雨量' + result.rain + '\n' + result.wind
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
                payload: '屏東縣琉球鄉,120.3833,22.3533'
              },
              {
                type: 'postback',
                title: '萬里桐',
                payload: '潛點萬里桐,120.706,21.995'
              },
              {
                type: 'postback',
                title: '後壁湖航道西側',
                payload: '潛點後壁湖航道西側,120.746,21.938'
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

function callSendAPI (senderPsid, response) {
  // Construct the message body
  const requestBody = {
    recipient: {
      id: senderPsid
    },
    message: response
  }

  // Send the HTTP request to the Messenger Platform
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

function changeDegOfWing (deg) {
  let windDirection = ''
  if ((deg > 337.5 && deg <= 359) || deg === 0) {
    windDirection = '北'
  } else if (deg > 0 && deg <= 22.5) {
    windDirection = '北北東'
  } else if (deg > 22.5 && deg <= 45) {
    windDirection = '東北'
  } else if (deg > 45 && deg <= 67.5) {
    windDirection = '東北東'
  } else if (deg > 67.5 && deg <= 90) {
    windDirection = '東'
  } else if (deg > 90 && deg <= 112.5) {
    windDirection = '東南東'
  } else if (deg > 112.5 && deg <= 135) {
    windDirection = '東南'
  } else if (deg > 135 && deg <= 157.5) {
    windDirection = '南南東'
  } else if (deg > 157.5 && deg <= 180) {
    windDirection = '南'
  } else if (deg > 180 && deg <= 202.5) {
    windDirection = '南南西'
  } else if (deg > 202.5 && deg <= 225) {
    windDirection = '西南'
  } else if (deg > 225 && deg <= 247.5) {
    windDirection = '西南西'
  } else if (deg > 247.5 && deg <= 270) {
    windDirection = '西'
  } else if (deg > 270 && deg <= 292.5) {
    windDirection = '西北西'
  } else if (deg > 292.5 && deg <= 315) {
    windDirection = '西北'
  } else if (deg > 315 && deg <= 337.5) {
    windDirection = '北北西'
  }
  return windDirection
}

module.exports = chatbotController
