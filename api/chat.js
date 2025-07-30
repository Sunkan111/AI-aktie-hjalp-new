/**
 * API endpoint for free‑form chat with the AI assistant.
 *
 * Expects a POST request with a JSON body containing:
 *   - message: The user's message/question for the AI.
 *
 * The function uses the OpenAI API to generate a response based on the
 * supplied message. If the request to OpenAI fails (e.g. quota exceeded),
 * it returns a fallback response advising the user to refine their query.
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid message' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  let reply;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Du är en hjälpsam investeringsassistent som ger råd baserat på börsdata, trender och nyheter.' },
          { role: 'user', content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
    }
    const json = await response.json();
    reply = json.choices?.[0]?.message?.content?.trim();
  } catch (err) {
    // Fallback message when OpenAI is unavailable
    reply = 'Jag kan tyvärr inte svara just nu. Försök igen senare eller ställ en annan fråga.';
  }

  return res.status(200).json({ reply: reply || '...' });
}