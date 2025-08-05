// /api/gemini-analysis.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Endast POST tillåts' });
  }

  const { symbol } = req.body || {};
  if (!symbol) {
    return res.status(400).json({ error: 'Ticker saknas' });
  }

  try {
    // 1. Hämta börsdata från Alpha Vantage
    const alphaUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
    const alphaResp = await fetch(alphaUrl);
    const alphaData = await alphaResp.json();

    // 2. Hämta nyheter från NewsAPI
    const newsUrl = `https://newsapi.org/v2/everything?q=${symbol}&sortBy=publishedAt&apiKey=${process.env.NEWSAPI_API_KEY}`;
    const newsResp = await fetch(newsUrl);
    const newsData = await newsResp.json();

    // 3. Hämta Google/Serper‑nyheter
    const serperResp = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: `${symbol} aktienyheter` }),
    });
    const serperData = await serperResp.json();

    // 4. Hämta senaste tweets från X
    const xUrl = `https://api.x.com/2/tweets/search/recent?query=${symbol}&max_results=5`;
    const xResp = await fetch(xUrl, {
      headers: { Authorization: `Bearer ${process.env.x_api_key}` },
    });
    const xData = await xResp.json();

    // 5. Hämta extra analys från OpenRouter
    const openRouterResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Analysera marknadsdata och ge en kortfattad marknadsbedömning.' },
          { role: 'user', content: `Ge en snabb analys av ${symbol} baserat på marknadsdata och nyheter.` }
        ]
      })
    });
    const openRouterJson = await openRouterResp.json();

    // 6. Skicka allt till Gemini för slutanalys
    const combinedPrompt = `
Du är en avancerad aktieanalytiker. 
Här är data för ${symbol}:

[MARKNADSDATA - Alpha Vantage]
${JSON.stringify(alphaData)}

[NYHETER - NewsAPI]
${JSON.stringify(newsData)}

[NYHETER - Google/Serper]
${JSON.stringify(serperData)}

[SOCIALA MEDIER - Twitter/X]
${JSON.stringify(xData)}

[OpenRouter AI-Analys]
${openRouterJson?.choices?.[0]?.message?.content || 'Ingen analys tillgänglig'}

Uppgift: Ge en sammanfattad analys av aktien ${symbol}.
Inkludera marknadstrender, sentiment från nyheter och sociala medier, och avsluta med en tydlig rekommendation: Köp, Sälj eller Avvakta.
`;

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.gemeni_api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: combinedPrompt }] }]
        })
      }
    );

    const geminiJson = await geminiResp.json();
    const analysis = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || 'Ingen analys tillgänglig.';

    return res.status(200).json({ analysis });
  } catch (error) {
    console.error('Fel i gemini-analysis:', error);
    return res.status(500).json({ error: 'Kunde inte analysera datan' });
  }
}
