require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai').default;

async function main() {
  const openai = new OpenAI({ apiKey: process.env.open_ai });

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "OpenAI OK" and nothing else.' }],
      temperature: 0.1
    });
    console.log('OpenAI response:', res.choices[0].message.content);
  } catch (err) {
    console.error('OpenAI ERROR:', err.message);
    if (err.status) console.error('Status:', err.status);
  }
}

main();
