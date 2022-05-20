const mongoose = require('mongoose')
const Schema = mongoose.Schema
const weatherSchema = new Schema({
  time: {
    type: String
  },
  location: {
    type: String
  },
  tideChanging: {
    type: String
  },
  waterTemperature: {
    type: String
  },
  waveHeight: {
    type: String
  },
  waveDirection: {
    type: String
  },
  currentSpeed: {
    type: String
  },
  currentDirection: {
    type: String
  },
  tideDifference: {
    type: String
  },
  temperature: {
    type: String
  },
  humidity: {
    type: String
  },
  rain: {
    type: String
  },
  wind: {
    type: String
  },
  cloudCover: {
    type: String
  }
})

module.exports = mongoose.model('Weather', weatherSchema)
