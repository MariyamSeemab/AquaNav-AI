import axios from 'axios';
const base = 'https://marine-api.open-meteo.com/v1/marine';

export async function getMarine(lat, lon) {
  const params = {
    latitude: lat,
    longitude: lon,
    hourly: 'wave_height',
    timezone: 'auto',
  };
  const { data } = await axios.get(base, { params });
  return data;
}
