// ─────────────────────────────────────────────────────────────────────────────
// ImbaFind — Supabase Edge Function: send-push
// Sends push notifications to iOS and Android devices via Expo Push Service.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  recipientUserId?: string;
  pushToken?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
}

function isValidExpoPushToken(token: string): boolean {
  return /^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(token.trim());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const payload: PushPayload = await req.json();
    let token = payload.pushToken;

    // If recipientUserId is provided without direct token, look up profile push_token
    if (!token && payload.recipientUserId) {
      const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('push_token')
        .eq('id', payload.recipientUserId)
        .maybeSingle();

      if (error) {
        console.error('[send-push] Profile lookup error:', error.message);
      }
      token = profile?.push_token;
    }

    if (!token || !isValidExpoPushToken(token)) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: !token ? 'no_push_token_registered' : 'invalid_push_token_format',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    // Dispatch to Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: 'default',
        badge: payload.badge,
        priority: 'high',
        channelId: 'default',
      }),
    });

    const result = await expoResponse.json();

    return new Response(JSON.stringify({ success: expoResponse.ok, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[send-push] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
