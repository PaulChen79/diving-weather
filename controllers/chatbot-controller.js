require('dotenv').config()
const request = require('request')
// const axios = require('axios')
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
  // // Check if the message contains text
  // let response = {}

  // if (receivedMessage.text) {
  //   axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${receivedMessage.text}&appid=a3a652db95697608165e76ed2d559e19`)
  //     .then(response => {
  //       const position = {
  //         lat: response.data[0].lat,
  //         lon: response.data[0].lon
  //       }
  //       return position
  //     })
  //     .then(position => {
  //       return axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${position.lat}&lon=${position.lon}&appid=a3a652db95697608165e76ed2d559e19`)
  //     })
  //     .then(response => {
  //       const temp = Math.round(response.data.main.temp - 273.15)
  //       const message = `The temp of ${receivedMessage.text} now is: ${temp} celsius`
  //       return message
  //     })
  //     .then(message => {
  //       response = {
  //         text: message
  //       }
  //       // Create the payload for a basic text message
  //       callSendAPI(senderPsid, response)
  //     })
  //     .catch(error => {
  //       console.log(error)
  //       response = {
  //         text: 'Sorry! something wrong. Please try again'
  //       }
  //       // Create the payload for a basic text message
  //       callSendAPI(senderPsid, response)
  //     })
  // } else if (receivedMessage.attachments) {
  //   // Gets the URL of the message attachment
  //   const attachmentUrl = receivedMessage.attachments[0].payload.url
  //   response = {
  //     attachment: {
  //       type: 'template',
  //       payload: {
  //         template_type: 'generic',
  //         elements: [{
  //           title: 'Is this the right picture?',
  //           subtitle: 'Tap a button to answer.',
  //           image_url: attachmentUrl,
  //           buttons: [{
  //             type: 'postback',
  //             title: 'Yes!',
  //             payload: 'yes'
  //           },
  //           {
  //             type: 'postback',
  //             title: 'No!',
  //             payload: 'no'
  //           }
  //           ]
  //         }]
  //       }
  //     }
  //   }
  // }

  // // Sends the response message
  // callSendAPI(senderPsid, response)
}

// Handles messaging_postbacks events
function handlePostback (senderPsid, receivedPostback) {
  let response

  // Get the payload for the postback
  const payload = receivedPostback.payload

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { text: 'Thanks!' }
  } else if (payload === 'no') {
    response = { text: 'Oops, try sending another image.' }
  }
  // Send the message to acknowledge the postback
  callSendAPI(senderPsid, response)
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

module.exports = chatbotController
