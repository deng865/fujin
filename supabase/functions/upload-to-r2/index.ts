import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
    const R2_ENDPOINT = Deno.env.get('R2_ENDPOINT')!; // e.g. https://<account_id>.r2.cloudflarestorage.com
    const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!;
    const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL')!; // e.g. https://pub-xxx.r2.dev

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique file path
    const ext = file.name.split('.').pop() || 'bin';
    const key = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const payloadHash = await sha256(fileBytes);

    // Build S3 PUT request with AWS Sig V4
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

    const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const uploadRes = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Host': host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authHeader,
      },
      body: fileBytes,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('R2 upload failed:', uploadRes.status, errText);
      return new Response(JSON.stringify({ error: 'Upload to R2 failed', details: errText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    await uploadRes.text(); // consume body

    // Build public URL
    const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
