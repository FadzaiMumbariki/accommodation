// Shared helpers for ImbaFind AI Edge Functions (Deno runtime).
// The Gemini API key lives only in Supabase secrets (GEMINI_API_KEY) and is never sent to the app.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function enforceAiRateLimit(req: Request, feature: string): Promise<Response | null> {
  const authorization = req.headers.get('authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!authorization) return json({ error: 'Sign in to use this AI feature.' }, 401);
  if (!supabaseUrl || !anonKey) {
    console.error('[ai-rate-limit] Supabase environment is not configured');
    return json({ error: 'AI is temporarily unavailable.' }, 503);
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_ai_request`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_feature: feature }),
    });

    if (response.status === 401 || response.status === 403) {
      return json({ error: 'Sign in to use this AI feature.' }, 401);
    }
    if (!response.ok) {
      console.error('[ai-rate-limit] Usage check failed with status', response.status);
      return json({ error: 'AI is temporarily unavailable.' }, 503);
    }

    const allowed: unknown = await response.json();
    if (allowed === false) {
      return json({ error: 'You have reached the AI request limit. Try again in an hour.' }, 429);
    }
    if (allowed !== true) {
      console.error('[ai-rate-limit] Usage check returned an invalid response');
      return json({ error: 'AI is temporarily unavailable.' }, 503);
    }
    return null;
  } catch (error) {
    console.error(
      '[ai-rate-limit] Usage check failed:',
      error instanceof Error ? error.message : error,
    );
    return json({ error: 'AI is temporarily unavailable.' }, 503);
  }
}

interface GeminiJsonOptions {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  temperature?: number;
}

/** Calls Gemini and returns the parsed JSON object that matches `schema`. Throws on any failure. */
export async function callGeminiJson({ system, user, schema, temperature = 0 }: GeminiJsonOptions) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: 600,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      }),
    },
  );

  if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}`);
  const data = await response.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  return JSON.parse(text);
}
