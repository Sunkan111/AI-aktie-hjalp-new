import { OpenAI } from 'openai';

// Simple chat endpoint that forwards user messages to OpenAI for
// general investeringsråd.  It expects a JSON body with a
// `message` field.  The AI is instructed to provide concise,
// Swedish-language responses focused on investment insights.  If the
// OpenAI API fails, a friendly fallback message is returned.

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { message } = req.body || {};
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'No message provided' });
  }
  try {
    if (process.env.OPENAI_API_KEY) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Du är en erfaren investeringsrådgivare som svarar kortfattat och på svenska.' },
          { role: 'user', content: message }
        ],
        max_tokens: 120,
        temperature: 0.7
      });
      const reply = completion?.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return res.status(200).json({ reply });
      }
    }
  } catch (error) {
    // ignore and use fallback
  }
  return res.status(200).json({ reply: 'Jag kan tyvärr inte svara just nu. Försök igen senare.' });
}