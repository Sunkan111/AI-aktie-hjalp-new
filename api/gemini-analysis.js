// /api/gemini-analysis.js
import fetch from 'node-fetch';

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 60000; // 60 seconds

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Endast POST tillåts' });
  }

  const { symbol } = req.body || {};
  if (!symbol) {
    return res.status(400).json({ error: 'Ticker saknas' });
  }

  // Check cache
  const cacheKey = `analysis-${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.status(200).json({ analysis: cached.data, cached: true });
  }

  try {
    // 1. Hämta börsdata från Twelve Data (primary) eller Alpha Vantage (fallback)
    let marketData = null;
    
    if (process.env.TWELVE_DATA_API_KEY) {
      try {
        const twelveUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${process.env.TWELVE_DATA_API_KEY}`;
        const twelveResp = await fetch(twelveUrl);
        marketData = await twelveResp.json();
        if (marketData.status === 'error') {
          throw new Error('Twelve Data error');
        }
      } catch (err) {
        console.warn('Twelve Data failed, falling back to Alpha Vantage:', err.message);
      }
    }
    
    if (!marketData && process.env.ALPHA_VANTAGE_API_KEY) {
      const alphaUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
      const alphaResp = await fetch(alphaUrl);
      marketData = await alphaResp.json();
    }
    
    if (!marketData) {
      throw new Error('No market data API configured');
    }

    // 2. Hämta nyheter från NewsAPI
    let newsData = null;
    if (process.env.NEWSAPI_API_KEY) {
      try {
        const newsUrl = `https://newsapi.org/v2/everything?q=${symbol}&sortBy=publishedAt&apiKey=${process.env.NEWSAPI_API_KEY}`;
        const newsResp = await fetch(newsUrl);
        newsData = await newsResp.json();
      } catch (err) {
        console.warn('NewsAPI failed:', err.message);
        newsData = { articles: [] };
      }
    } else {
      newsData = { articles: [] };
    }

    // 3. Hämta Google/Serper‑nyheter
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
        console.warn('Serper failed:', err.message);
        serperData = { news: [] };
      }
    } else {
      serperData = { news: [] };
    }

    // 4. Hämta senaste tweets från X
    let xData = null;
    if (process.env.X_API_BEARER) {
      try {
        const xUrl = `https://api.x.com/2/tweets/search/recent?query=${symbol}&max_results=5`;
        const xResp = await fetch(xUrl, {
          headers: { Authorization: `Bearer ${process.env.X_API_BEARER}` },
        });
        xData = await xResp.json();
      } catch (err) {
        console.warn('X API failed:', err.message);
        xData = { data: [] };
      }
    } else {
      xData = { data: [] };
    }

    // 5. Hämta extra analys från OpenRouter
    let openRouterJson = null;
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
            ]
          })
        });
        openRouterJson = await openRouterResp.json();
      } catch (err) {
        console.warn('OpenRouter failed:', err.message);
        openRouterJson = { choices: [] };
      }
    } else {
      openRouterJson = { choices: [] };
    }

    // 6. Skicka allt till Gemini för slutanalys
    const combinedPrompt = `
Du är en avancerad aktieanalytiker. 
Här är data för ${symbol}:

[MARKNADSDATA]
${JSON.stringify(marketData).substring(0, 2000)}

[NYHETER - NewsAPI]
${JSON.stringify(newsData).substring(0, 1000)}

[NYHETER - Google/Serper]
${JSON.stringify(serperData).substring(0, 1000)}

[SOCIALA MEDIER - Twitter/X]
${JSON.stringify(xData).substring(0, 500)}

[OpenRouter AI-Analys]
${openRouterJson?.choices?.[0]?.message?.content || 'Ingen analys tillgänglig'}

Uppgift: Ge en sammanfattad analys av aktien ${symbol}.
Inkludera marknadstrender, sentiment från nyheter och sociala medier, och avsluta med en tydlig rekommendation: Köp, Sälj eller Avvakta.
`;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

    // Cache the result
    cache.set(cacheKey, { data: analysis, timestamp: Date.now() });

    return res.status(200).json({ analysis });
  } catch (error) {
    console.error('Fel i gemini-analysis:', error);
    return res.status(500).json({ error: 'Kunde inte analysera datan', message: error.message });
  }
}
