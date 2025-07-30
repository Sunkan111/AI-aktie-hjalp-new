import { OpenAI } from 'openai';

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
        model: 'gpt-3.5-turbo',
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
    console.error("OpenAI API error:", error); // 👈 Loggar felet till Vercel
  }

  return res.status(200).json({ reply: 'Jag kan tyvärr inte svara just nu. Försök igen senare.' });
}
