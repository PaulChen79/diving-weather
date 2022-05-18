const express = require('express')
const router = express.Router()
const chatbotController = require('../controllers/chatbot-controller')

router.get('/webhook', chatbotController.getWebhook)
router.post('/webhook', chatbotController.postWebhook)

router.get('/', (req, res) => {
  res.send('<h1>Hi</h1>')
})

module.exports = router
