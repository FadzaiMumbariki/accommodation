// POST { recipientId, title, body, data } -> { success: boolean, sent: boolean }
// Sends an Expo push notification to the recipient if they have a valid push token registered.
import { corsHeaders, json } from '../_shared/gemini.ts';

interface PushPayload {
  recipientId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[push-notify] Missing Supabase environment configuration');
    return json({ error: 'Server configuration error' }, 500);
  }

  try {
    const payload: PushPayload = await req.json();
    const { recipientId, title, body, data } = payload;

    if (!recipientId || !title || !body) {
      return json({ error: 'recipientId, title, and body are required' }, 400);
    }

    // Fetch recipient's push token from public.profiles
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${recipientId}&select=push_token`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );

    if (!profileRes.ok) {
      console.error('[push-notify] Could not fetch profile:', profileRes.status);
      return json({ error: 'Failed to look up recipient' }, 500);
    }

    const profiles = await profileRes.json();
    const pushToken: string | undefined = profiles?.[0]?.push_token;

    if (!pushToken || (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken['))) {
      return json({ success: true, sent: false, reason: 'Recipient has no valid push token' });
    }

    // Deliver via Expo Push API
    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data: data ?? {},
        sound: 'default',
        badge: 1,
        channelId: 'default',
      }),
    });

    const expoResult = await expoRes.json();
    return json({ success: true, sent: true, expoResult });
  } catch (error) {
    console.error('[push-notify]', error instanceof Error ? error.message : error);
    return json({ error: 'Failed to process push notification' }, 500);
  }
});
