import { OpenAI } from 'openai';

// This serverless function calls OpenAI to generate a short
// recommendation (buy, sell or hold) for the given ticker.  If the
// OpenAI API is unavailable or returns an error, a simple heuristic
// based on price momentum is used instead.  The request body should
// include a `ticker` string and optionally an array of closing prices
// named `closes`.

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { ticker, closes } = req.body || {};
  if (!ticker) {
    return res.status(400).json({ error: 'ticker missing' });
  }

  // Compose a prompt for the AI.  We instruct the model to make a
  // recommendation using current trend, recent news and macroeconomic
  // context.  The model should respond in Swedish with a short
  // explanation and a suggested action: Köp, Sälj eller Avvakta.
  const userPrompt = `Du är en professionell aktieanalytiker. Baserat på tillgänglig prisdata, nyheter och omvärldsanalys, ge en kort rekommendation (Köp, Sälj eller Avvakta) för aktien ${ticker}. Förklara trenden och ange ditt beslut.`;

  try {
    if (process.env.OPENAI_API_KEY) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Du är en erfaren aktieanalytiker som ger välgrundade investeringsrekommendationer.' },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 120,
        temperature: 0.6
      });
      const message = response?.choices?.[0]?.message?.content?.trim();
      if (message) {
        return res.status(200).json({ message });
      }
    }
  } catch (error) {
    // fall through to heuristic
  }
  // Fallback heuristic: use closing price momentum to derive a simple recommendation.
  let recommendation = 'Det går inte att generera en rekommendation just nu.';
  if (Array.isArray(closes) && closes.length > 1) {
    const first = closes[0];
    const last = closes[closes.length - 1];
    const pctChange = ((last - first) / first) * 100;
    if (pctChange > 2) {
      recommendation = `Trenden är uppåtgående med en uppgång på ${pctChange.toFixed(2)} %. Detta tyder på en möjlig köpsignal.`;
    } else if (pctChange < -2) {
      recommendation = `Trenden är nedåtgående med en nedgång på ${pctChange.toFixed(2)} %. Detta tyder på en möjlig säljsignal.`;
    } else {
      recommendation = `Aktien rör sig sidledes. Det kan vara klokt att avvakta tills en tydligare trend uppstår.`;
    }
  }
  return res.status(200).json({ message: recommendation });
}