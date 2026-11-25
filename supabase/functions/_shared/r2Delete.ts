function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function hmac(key: Uint8Array, data: string) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data)));
}
async function sha256(data: Uint8Array) {
  return toHex(await crypto.subtle.digest("SHA-256", data));
}
async function signingKey(secret: string, date: string) {
  const dateKey = await hmac(new TextEncoder().encode(`AWS4${secret}`), date);
  const regionKey = await hmac(dateKey, "auto");
  const serviceKey = await hmac(regionKey, "s3");
  return await hmac(serviceKey, "aws4_request");
}

export async function deleteR2Urls(urls: string[]) {
  const accessKey = Deno.env.get("R2_ACCESS_KEY_ID")?.trim();
  const secretKey = Deno.env.get("R2_SECRET_ACCESS_KEY")?.trim();
  const endpoint = Deno.env.get("R2_ENDPOINT")?.trim().replace(/\/+$/, "");
  const bucket = Deno.env.get("R2_BUCKET_NAME")?.trim();
  const publicUrl = Deno.env.get("R2_PUBLIC_URL")?.trim().replace(/\/$/, "");
  if (!accessKey || !secretKey || !endpoint || !bucket || !publicUrl) return { complete: false };

  let complete = true;
  for (const fileUrl of [...new Set(urls)].slice(0, 500)) {
    if (!fileUrl.startsWith(`${publicUrl}/`)) continue;
    try {
      const fileKey = fileUrl.slice(publicUrl.length + 1);
      const emptyHash = await sha256(new Uint8Array());
      const now = new Date();
      const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
      const dateStamp = amzDate.slice(0, 8);
      const url = new URL(`${endpoint}/${bucket}/${fileKey}`);
      const canonicalHeaders = `host:${url.hostname}\nx-amz-content-sha256:${emptyHash}\nx-amz-date:${amzDate}\n`;
      const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
      const canonicalRequest = ["DELETE", `/${bucket}/${fileKey}`, "", canonicalHeaders, signedHeaders, emptyHash].join("\n");
      const scope = `${dateStamp}/auto/s3/aws4_request`;
      const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256(new TextEncoder().encode(canonicalRequest))].join("\n");
      const awsKey = await signingKey(secretKey, dateStamp);
      const signatureKey = await crypto.subtle.importKey("raw", awsKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const signature = toHex(await crypto.subtle.sign("HMAC", signatureKey, new TextEncoder().encode(stringToSign)));
      const response = await fetch(url, { method: "DELETE", headers: {
        Host: url.hostname,
        "x-amz-content-sha256": emptyHash,
        "x-amz-date": amzDate,
        Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      } });
      if (!response.ok && response.status !== 404) complete = false;
    } catch {
      complete = false;
    }
  }
  return { complete };
}
