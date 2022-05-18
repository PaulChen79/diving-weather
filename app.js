require('dotenv').config()
const express = require('express')
const app = express()
const routes = require('./routes/index')
const PORT = process.env.PORT || 3000

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use('/', routes)

app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`)
})
