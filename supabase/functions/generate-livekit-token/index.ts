import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JWT generation for LiveKit
async function generateLiveKitToken(
  apiKey: string,
  apiSecret: string,
  identity: string,
  roomName: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Create JWT header
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  
  // Create JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    exp: now + 3600, // 1 hour expiry
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
  
  // Base64 URL encode
  const base64UrlEncode = (obj: any) => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };
  
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  
  // Create signature
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );
  
  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  let signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  signatureBase64 = signatureBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  return `${data}.${signatureBase64}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL');
    const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
    const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');

    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error('Missing LiveKit configuration');
      throw new Error('LiveKit configuration is incomplete');
    }

    const { roomName, participantName } = await req.json();
    
    if (!roomName || !participantName) {
      throw new Error('roomName and participantName are required');
    }

    console.log(`Generating token for room: ${roomName}, participant: ${participantName}`);

    // Generate token
    const token = await generateLiveKitToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      participantName,
      roomName
    );
    
    console.log('Token generated successfully');

    return new Response(
      JSON.stringify({ 
        token,
        url: LIVEKIT_URL 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
