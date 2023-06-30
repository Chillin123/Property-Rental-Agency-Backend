const geocoder = require('opencage-api-client');
const {OPENCAGE_API_KEY}= require('../config/index')


async function getCoordinates(address) {
  try {
    const response = await geocoder.geocode({ q: JSON.stringify(address), key: OPENCAGE_API_KEY });
    console.log(address);
    if (response.status.code === 200 && response.results.length > 0) {
      const { lat, lng } = response.results[0].geometry;
      
      return { latitude: lat, longitude: lng };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}


module.exports= getCoordinates