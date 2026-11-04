#!/usr/bin/env node
/**
 * check-gemini.mjs
 * Validates Gemini API connectivity and model availability.
 *
 * Usage:
 *   GEMINI_API_KEY=your_key node scripts/check-gemini.mjs
 *   GEMINI_API_KEY=your_key GEMINI_MODEL=gemini-2.5-flash node scripts/check-gemini.mjs
 */

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!apiKey) {
  console.error('Error: GEMINI_API_KEY is not set.');
  console.error('Usage: GEMINI_API_KEY=your_key node scripts/check-gemini.mjs');
  process.exit(1);
}

async function verifyGemini() {
  console.log(`Testing Gemini API connectivity using model: "${model}"...`);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Respond with exactly: OK' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API error (Status ${response.status}):\n${errText}`);
      process.exit(1);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    console.log(`Success! Model "${model}" responded: "${reply}"`);
    console.log('Gemini connectivity verified.');
    process.exit(0);
  } catch (error) {
    console.error('Network or execution error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

verifyGemini();
