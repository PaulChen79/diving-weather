require('dotenv').config()
const db = require('../config/mongoose')
const { genResult } = require('../controllers/utils')
const locations = require('../models/locations.json')
const Weather = require('../models/weather')
const axios = require('axios')

db.once('open', () => {
  return Promise.all(Array.from(locations, location => {
    const locationName = location.alias
    const LocationLon = location.lon
    const locationLat = location.lat
    const timeNow = new Date(Date.now()).toISOString()
    const timeNextHr = new Date(Date.now() + 3600000).toISOString()
    const today = new Date(Date.now()).toISOString().substring(0, 10) + 'T00:00:00'
    const nextDay = new Date(Date.now() + 86400000).toISOString().substring(0, 10) + 'T00:00:00'
    // URLs
    const tideUrl = encodeURI('https://opendata.cwb.gov.tw/api/v1/rest/datastore/F-A0021-001?Authorization=' + process.env.TAIWAN_OPENDATA_TOKEN + '&locationName=' + locationName + '&elementName=&sort=dataTime&timeFrom=' + today + '&timeTo=' + nextDay)
    const weatherUrl = encodeURI(`https://api.openweathermap.org/data/2.5/weather?lat=${locationLat}&lon=${LocationLon}&appid=${process.env.OPENWEATHER_TOKEN}`)
    const waveRul = encodeURI(`https://api.stormglass.io/v2/weather/point?lat=${locationLat}&lng=${LocationLon}&params=waveHeight,waveDirection,waterTemperature,currentDirection,currentSpeed,cloudCover&start=${timeNow}&end=${timeNextHr}`)

    return Promise.all([
      axios.get(tideUrl),
      axios.get(weatherUrl),
      axios.get(waveRul, { headers: { Authorization: process.env.WAVE_API_TOKEN } })
    ])
      .then(([tideData, weatherData, waveData]) => {
        const result = genResult(tideData, weatherData, waveData, location.name, today)
        return result
      })
      .then(result => {
        return Weather.create({
          time: result.time,
          location: result.location,
          tideChanging: result.tideChanging,
          waterTemperature: result.waterTemperature,
          waveHeight: result.waveHeight,
          waveDirection: result.waveDirection,
          currentSpeed: result.currentSpeed,
          currentDirection: result.currentDirection,
          tideDifference: result.tideDifference,
          temperature: result.temperature,
          humidity: result.humidity,
          rain: result.rain,
          wind: result.wind,
          cloudCover: result.cloudCover
        })
      })
  }))
    .then(() => {
      console.log('update done.')
      process.exit()
    })
    .catch(error => console.log(error))
})
