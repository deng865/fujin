import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { stripeRequest } from "../_shared/stripeDirect.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { sessionId } = await req.json().catch(() => ({}));
    if (typeof sessionId !== "string" || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return json({ error: "无效订单" }, 400);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "请先登录" }, 401);

    const { data: payment } = await supabase.from("payments").select("*")
      .eq("stripe_session_id", sessionId).eq("user_id", user.id).maybeSingle();
    if (!payment) return json({ error: "订单不存在" }, 404);
    if (payment.payment_status === "completed") return json({ status: "completed" });

    const session = await stripeRequest("GET", `checkout/sessions/${sessionId}`);
    if (session.payment_status !== "paid") return json({ status: session.status === "expired" ? "expired" : "pending" });

    // Atomic claim: only one caller flips pending -> completed and grants.
    const { data: claimed } = await supabase.from("payments")
      .update({ payment_status: "completed", updated_at: new Date().toISOString() })
      .eq("id", payment.id).eq("payment_status", "pending").select("id");
    if (!claimed?.length) return json({ status: "completed" });

    const snap = payment.metadata?.snapshot ?? {};
    const days = Number(snap.duration_days ?? payment.duration_days ?? 30);
    const durationMs = days * 86400000;
    const now = Date.now();

    if (snap.is_boost) {
      if (payment.post_id) {
        await supabase.from("posts").update({
          is_boosted: true,
          boost_expires_at: new Date(now + durationMs).toISOString(),
          bumped_at: new Date().toISOString(),
        }).eq("id", payment.post_id).eq("user_id", user.id);
      }
    } else {
      const { data: existing } = await supabase.from("user_credits").select("*").eq("user_id", user.id).maybeSingle();
      let postCredits = existing?.post_credits ?? 0;
      let unlimitedUntil: string | null = existing?.unlimited_until ?? null;
      let expiresAt: string | null = null;
      if (snap.unlimited_posts) {
        const base = unlimitedUntil && new Date(unlimitedUntil).getTime() > now ? new Date(unlimitedUntil).getTime() : now;
        unlimitedUntil = new Date(base + durationMs).toISOString();
        expiresAt = unlimitedUntil;
      } else {
        postCredits += Number(snap.post_credits ?? 0);
      }
      await supabase.from("user_credits").upsert(
        { user_id: user.id, post_credits: postCredits, unlimited_until: unlimitedUntil, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (expiresAt) await supabase.from("payments").update({ expires_at: expiresAt }).eq("id", payment.id);
    }
    return json({ status: "completed" });
  } catch (e) {
    console.error("verify-checkout error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
