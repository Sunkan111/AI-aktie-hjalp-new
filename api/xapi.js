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
    // OBS: Kräver att x_api_key har rätt behörighet till v2‑endpointen
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=created_at,lang,public_metrics`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.x_api_key}`,
      }
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Kunde inte hämta X-data' });
  }
}
