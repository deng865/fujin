import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function generateLiveKitToken(
  apiKey: string,
  apiSecret: string,
  identity: string,
  roomName: string
): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    exp: now + 3600,
    iss: apiKey,
    nbf: now,
    sub: identity,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    }
  };

  const base64UrlEncode = (obj: any) => {
    const base64 = btoa(JSON.stringify(obj));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  let sig64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  sig64 = sig64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${data}.${sig64}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) throw new Error('Unauthorized');

    const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL');
    const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
    const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new Error('LiveKit configuration is incomplete');
    }

    const { roomName, participantName, roomType } = await req.json();
    if (!roomName || !participantName) {
      throw new Error('roomName and participantName are required');
    }

    // Verify access based on room type
    if (roomType === 'conversation') {
      // Chat conversation call - verify user is a participant
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('participant_1, participant_2')
        .eq('id', roomName)
        .single();

      if (convError || !conv) throw new Error('Conversation not found');
      if (conv.participant_1 !== user.id && conv.participant_2 !== user.id) {
        throw new Error('Access denied');
      }
    } else {
      // Legacy: ride-based call
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select(`id, user_id, matches!inner(user_id)`)
        .eq('id', roomName)
        .or(`user_id.eq.${user.id},matches.user_id.eq.${user.id}`)
        .single();

      if (rideError || !ride) throw new Error('Access denied');
    }

    console.log(`Token for room=${roomName}, type=${roomType || 'ride'}, user=${user.id}`);

    const token = await generateLiveKitToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, participantName, roomName);

    return new Response(
      JSON.stringify({ token, url: LIVEKIT_URL }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
