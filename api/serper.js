import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Endast POST tillåts' });
  }

  const { query } = req.body;
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Sökfråga saknas' });
  }

  try {
    const response = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query }),
    });

    const data = await response.json();
    return res.status(200).json({ news: data.news });
  } catch (error) {
    console.error('Serper API-fel:', error);
    return res.status(500).json({ error: 'Fel vid hämtning av nyheter' });
  }
}
