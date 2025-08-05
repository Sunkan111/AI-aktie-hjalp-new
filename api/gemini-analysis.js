import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Endast POST tillåts' });
  }

  const { symbol } = req.body;
  if (!symbol) {
    return res.status(400).json({ error: 'symbol saknas' });
  }

  try {
    // 1. Hämta data från alla källor parallellt
    const [priceRes, newsRes, xRes, sentimentRes] = await Promise.all([
      fetch(`${process.env.BASE_URL}/api/alphavantage?symbol=${symbol}`).then(r => r.json()),
      fetch(`${process.env.BASE_URL}/api/newsapi?query=${symbol}`).then(r => r.json()),
      fetch(`${process.env.BASE_URL}/api/xapi?query=${symbol}`).then(r => r.json()),
      fetch(`${process.env.BASE_URL}/api/openrouter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analysera aktien ${symbol} baserat på marknadsdata, nyheter och sentiment.`
        })
      }).then(r => r.json())
    ]);

    // 2. Skapa prompt till Gemini
    const prompt = `
      Analysera aktien ${symbol} och ge en slutlig rekommendation (Köp/Sälj/Behåll).
      Ta hänsyn till:
      - Prisdata: ${JSON.stringify(priceRes)}
      - Nyheter: ${JSON.stringify(newsRes)}
      - X/Twitter sentiment: ${JSON.stringify(xRes)}
      - Ytterligare analys från OpenRouter: ${sentimentRes?.reply || 'Ingen'}
    `;

    // 3. Skicka prompten till Gemini
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.gemeni_api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const geminiData = await geminiResponse.json();

    return res.status(200).json({
      analysis: geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Ingen analys kunde genereras.'
    });
  } catch (err) {
    console.error('Gemini analysis error:', err);
    return res.status(500).json({ error: 'Kunde inte analysera data' });
  }
}
