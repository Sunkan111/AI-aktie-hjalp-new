import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Endast POST tillåts' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt saknas' });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openrouter/auto", // Väljer bästa tillgängliga
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200
      })
    });

    const data = await response.json();
    return res.status(200).json({
      reply: data?.choices?.[0]?.message?.content || 'Ingen analys från OpenRouter.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Kunde inte hämta svar från OpenRouter' });
  }
}
