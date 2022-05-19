require('dotenv').config()
const { handleMessage, handlePostback } = require('./utils')
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

module.exports = chatbotController
