import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { deleteR2Urls } from "../_shared/r2Delete.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function collectUrls(value: unknown, urls: Set<string>) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed !== value) collectUrls(parsed, urls);
    } catch { /* Plain text is not JSON. */ }
    const matches = value.match(/https:\/\/[^\s"'\\]+/g) ?? [];
    matches.forEach((url) => urls.add(url));
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, urls));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectUrls(item, urls));
  }
}

async function accountMediaUrls(userId: string) {
  const urls = new Set<string>();
  const [{ data: posts }, { data: profile }, { data: conversations }, { data: chats }] = await Promise.all([
    supabase.from("posts").select("image_urls").eq("user_id", userId),
    supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("conversations").select("id").or(`participant_1.eq.${userId},participant_2.eq.${userId}`),
    supabase.from("chats").select("message").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
  ]);
  collectUrls(posts, urls);
  collectUrls(profile?.avatar_url, urls);
  collectUrls(chats, urls);
  const conversationIds = (conversations ?? []).map((item) => item.id);
  if (conversationIds.length) {
    const { data: messages } = await supabase.from("messages").select("content").in("conversation_id", conversationIds);
    collectUrls(messages, urls);
  }
  return [...urls];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "请先登录" }, 401);

    const mediaUrls = await accountMediaUrls(user.id);
    const { error: cleanupError } = await supabase.rpc("delete_account_data", { _user_id: user.id });
    if (cleanupError) throw cleanupError;
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
    const media = await deleteR2Urls(mediaUrls);
    return json({ deleted: true, mediaCleanupComplete: media.complete });
  } catch (error) {
    console.error("delete-account failed", error);
    return json({ error: "账号注销未完成，请稍后重试或联系客服" }, 500);
  }
});
