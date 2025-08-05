import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Endast GET tillåts' });
  }

  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Sökterm saknas' });
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=sv&apiKey=${process.env.NEWSAPI_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Kunde inte hämta nyheter' });
  }
}
