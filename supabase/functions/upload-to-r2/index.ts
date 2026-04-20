import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Allowlist of MIME types accepted for upload
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav',
]);

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB hard cap

// AWS Signature V4 helpers
function hmac(key: Uint8Array, data: string): Promise<ArrayBuffer> {
  return crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then(k => crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string) {
  let k = await hmac(new TextEncoder().encode("AWS4" + key), dateStamp);
  k = await hmac(new Uint8Array(k), region);
  k = await hmac(new Uint8Array(k), service);
  k = await hmac(new Uint8Array(k), "aws4_request");
  return new Uint8Array(k);
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(data: Uint8Array): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== AUTH: validate JWT =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const R2_ACCESS_KEY_ID = (Deno.env.get('R2_ACCESS_KEY_ID') || '').trim();
    const R2_SECRET_ACCESS_KEY = (Deno.env.get('R2_SECRET_ACCESS_KEY') || '').trim();
    const R2_ENDPOINT = (Deno.env.get('R2_ENDPOINT') || '').trim().replace(/\/+$/, '');
    const R2_BUCKET_NAME = (Deno.env.get('R2_BUCKET_NAME') || '').trim();
    const R2_PUBLIC_URL = (Deno.env.get('R2_PUBLIC_URL') || '').trim();

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Content-Type must be multipart/form-data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Server-side validation =====
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return new Response(JSON.stringify({ error: 'File type not allowed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (file.size > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: 'File too large' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique file path scoped to authenticated user
    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'bin';
    const userId = claimsData.claims.sub;
    const key = `uploads/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const payloadHash = await sha256(fileBytes);

    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const dateStamp = amzDate.slice(0, 8);
    const region = 'auto';
    const service = 's3';

    const url = new URL(`${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`);
    const host = url.hostname;

    const canonicalHeaders = `content-type:${file.type}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      'PUT',
      `/${R2_BUCKET_NAME}/${key}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      await sha256(new TextEncoder().encode(canonicalRequest)),
    ].join('\n');

    const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
    const signature = toHex(await crypto.subtle.sign("HMAC",
      await crypto.subtle.importKey("raw", signingKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
      new TextEncoder().encode(stringToSign)
    ));

    const authR2 = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const uploadRes = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Host': host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authR2,
      },
      body: fileBytes,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('R2 upload failed:', uploadRes.status, errText);
      return new Response(JSON.stringify({ error: 'Upload failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    await uploadRes.text();

    const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
