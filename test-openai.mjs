import OpenAI from 'openai';
import { readFileSync } from 'fs';

// Parse .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=')));
const apiKey = env['open_ai']?.trim();

console.log('API Key starts with:', apiKey?.substring(0, 10));

const openai = new OpenAI({ apiKey });

try {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Say OK' }]
  });
  console.log('OpenAI ✅ Response:', res.choices[0].message.content);
} catch (err) {
  console.error('OpenAI ❌ Error:', err.message);
  console.error('Status:', err.status);
  console.error('Code:', err.code);
}
