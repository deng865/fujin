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

    const { error: fulfillError } = await supabase.rpc("fulfill_payment", {
      _payment_id: payment.id,
      _user_id: user.id,
    });
    if (fulfillError) throw fulfillError;
    return json({ status: "completed" });
  } catch (e) {
    console.error("verify-checkout error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
