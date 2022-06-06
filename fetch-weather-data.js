require('dotenv').config()
require('./config/mongoose')

const { genResult } = require('./controllers/utils')
const locations = require('./models/locations.json')
const Weather = require('./models/weather')
const axios = require('axios')

const fetchData = async () => {
  console.log('start update...')
  try {
    return locations.forEach(async location => {
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
      const waveUrl = encodeURI(`https://api.stormglass.io/v2/weather/point?lat=${locationLat}&lng=${LocationLon}&params=waveHeight,waveDirection,waterTemperature,currentDirection,currentSpeed,cloudCover&start=${timeNow}&end=${timeNextHr}`)

      const tideData = await axios.get(tideUrl)
      const weatherData = await axios.get(weatherUrl)
      const waveData = await axios.get(waveUrl, { headers: { Authorization: process.env.WAVE_API_TOKEN } })
      const result = genResult(tideData, weatherData, waveData, location.name, today)
      const location = await Weather.findOne({ location: result.location })
      location.time = result.time
      location.location = result.location
      location.tideChanging = result.tideChanging
      location.waterTemperature = result.waterTemperature
      location.waveHeight = result.waveHeight
      location.waveDirection = result.waveDirection
      location.currentSpeed = result.currentSpeed
      location.currentDirection = result.currentDirection
      location.tideDifference = result.tideDifference
      location.temperature = result.temperature
      location.humidity = result.humidity
      location.rain = result.rain
      location.wind = result.wind
      location.cloudCover = result.cloudCover
      location.save()
      console.log('update done.')
    })
  } catch (error) {
    console.log(error)
  }
}

fetchData()
