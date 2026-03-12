import axios from "axios";

export const get_weather_openmeteo = async (latitude, longitude) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const response = await axios.get(url);
  return {
    data: response.data,
    url: url
  };
};
