import axios from "axios";

export const get_news_api = async (topic) => {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) throw new Error("NEWS_API_KEY is missing");

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&pageSize=5&apiKey=${apiKey}`;
  const response = await axios.get(url);
  return response.data;
};
