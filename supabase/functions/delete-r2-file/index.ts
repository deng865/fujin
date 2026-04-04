import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { urls } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: 'urls array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const R2_ACCESS_KEY_ID = (Deno.env.get('R2_ACCESS_KEY_ID') || '').trim();
    const R2_SECRET_ACCESS_KEY = (Deno.env.get('R2_SECRET_ACCESS_KEY') || '').trim();
    const R2_ENDPOINT = (Deno.env.get('R2_ENDPOINT') || '').trim().replace(/\/+$/, '');
    const R2_BUCKET_NAME = (Deno.env.get('R2_BUCKET_NAME') || '').trim();
    const R2_PUBLIC_URL = (Deno.env.get('R2_PUBLIC_URL') || '').trim().replace(/\/$/, '');

    const results: { url: string; deleted: boolean }[] = [];

    for (const fileUrl of urls) {
      try {
        // Extract key from public URL
        const key = fileUrl.replace(R2_PUBLIC_URL + '/', '');
        if (!key || key === fileUrl) {
          results.push({ url: fileUrl, deleted: false });
          continue;
        }

        const emptyHash = await sha256(new Uint8Array(0));
        const now = new Date();
        const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
        const dateStamp = amzDate.slice(0, 8);
        const region = 'auto';
        const service = 's3';

        const url = new URL(`${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`);
        const host = url.hostname;

        const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${emptyHash}\nx-amz-date:${amzDate}\n`;
        const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

        const canonicalRequest = [
          'DELETE',
          `/${R2_BUCKET_NAME}/${key}`,
          '',
          canonicalHeaders,
          signedHeaders,
          emptyHash,
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

        const delRes = await fetch(url.toString(), {
          method: 'DELETE',
          headers: {
            'Host': host,
            'x-amz-content-sha256': emptyHash,
            'x-amz-date': amzDate,
            'Authorization': authHeader,
          },
        });

        results.push({ url: fileUrl, deleted: delRes.ok || delRes.status === 204 });
      } catch (e) {
        console.error('Failed to delete:', fileUrl, e);
        results.push({ url: fileUrl, deleted: false });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
