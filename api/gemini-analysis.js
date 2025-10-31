export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Endast POST tillåts' });
  }

  const { symbol } = req.body || {};
  if (!symbol) {
    return res.status(400).json({ error: 'Ticker saknas' });
  }

  try {
    // 1. Hämta börsdata från Alpha Vantage (guard mot saknad nyckel)
    let alphaData = null;
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      const alphaUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
      const alphaResp = await fetch(alphaUrl);
      alphaData = await alphaResp.json();
    }

    // 2. Hämta nyheter från NewsAPI (guard)
    let newsData = null;
    if (process.env.NEWSAPI_API_KEY) {
      const newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(symbol)}&sortBy=publishedAt&apiKey=${process.env.NEWSAPI_API_KEY}`;
      const newsResp = await fetch(newsUrl);
      newsData = await newsResp.json();
    }

    // 3. Serper (om konfigurerad)
    let serperData = null;
    if (process.env.SERPER_API_KEY) {
      try {
        const serperResp = await fetch('https://google.serper.dev/news', {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: `${symbol} aktienyheter` }),
        });
        serperData = await serperResp.json();
      } catch (err) {
        console.error('Serper-fel:', err);
      }
    }

    // 4. X/Twitter (om konfigurerad)
    let xData = null;
    if (process.env.X_API_BEARER) {
      try {
        const xUrl = `https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(symbol)}&max_results=5`;
        const xResp = await fetch(xUrl, {
          headers: { Authorization: `Bearer ${process.env.X_API_BEARER}` },
        });
        xData = await xResp.json();
      } catch (err) {
        console.error('X API-fel:', err);
      }
    }

    // 5. OpenRouter (extra analys) (om konfigurerad)
    let openRouterAnalysis = null;
    if (process.env.OPENROUTER_API_KEY) {
      try {
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
            ],
            max_tokens: 300
          })
        });
        const openRouterJson = await openRouterResp.json();
        openRouterAnalysis = openRouterJson?.choices?.[0]?.message?.content || openRouterJson?.reply || null;
      } catch (err) {
        console.error('OpenRouter-fel:', err);
      }
    }

    // 6. Kombinera och eventuellt anropa Gemini
    const combined = {
      alpha: alphaData,
      news: newsData,
      serper: serperData,
      x: xData,
      openRouter: openRouterAnalysis,
    };

    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `
Du är en avancerad aktieanalytiker.
Här är data för ${symbol}:
[MARKNADSDATA]
${JSON.stringify(alphaData || {})}

[NYHETER]
${JSON.stringify(newsData || {})}

[SERPER]
${JSON.stringify(serperData || {})}

[X/Twitter]
${JSON.stringify(xData || {})}

[EXTRA - OpenRouter]
${openRouterAnalysis || 'Ingen extra analys'}

Uppgift: Ge en kort analys av aktien ${symbol} och avsluta med rekommendation (Köp, Sälj eller Avvakta).
`;
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            }),
            // Timeout och retries kan implementeras här vid behov
          },
        );
        const geminiJson = await geminiResp.json();
        // Parsning: Gemini API returnerar text i candidates[0].content.parts[0].text
        const analysis = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || null;
        return res.status(200).json({ analysis: analysis || 'Ingen analys tillgänglig', raw: combined });
      } catch (err) {
        console.error('Gemini-fel:', err);
        // Fallback: returnera kombinerad data
      }
    }

    // Fallback om ingen Gemini-nyckel eller kall misslyckas
    return res.status(200).json({ analysis: openRouterAnalysis || 'Ingen analys tillgänglig', raw: combined });
  } catch (error) {
    console.error('Fel i gemini-analysis:', error);
    return res.status(500).json({ error: 'Internt serverfel vid analys' });
  }
}
