import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { stripeRequest } from "../_shared/stripeDirect.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function resolveOrCreateCustomer(email: string | undefined, userId: string): Promise<string> {
  const found = await stripeRequest("GET", "customers/search", { query: `metadata['userId']:'${userId}'`, limit: 1 });
  if (found.data?.length) return found.data[0].id;
  if (email) {
    const existing = await stripeRequest("GET", "customers", { email, limit: 1 });
    if (existing.data?.length) {
      const c = existing.data[0];
      if (c.metadata?.userId !== userId) await stripeRequest("POST", `customers/${c.id}`, { metadata: { userId } });
      return c.id;
    }
  }
  const created = await stripeRequest("POST", "customers", { email, metadata: { userId } });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const planKey = typeof body.planKey === "string" ? body.planKey : "";
    const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : "";
    const postId = typeof body.postId === "string" && /^[0-9a-f-]{36}$/i.test(body.postId) ? body.postId : null;
    if (!/^[a-z0-9_]+$/.test(planKey)) return json({ error: "无效的套餐" }, 400);
    if (!/^https?:\/\//.test(returnUrl)) return json({ error: "无效的返回地址" }, 400);

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user || !/^[a-zA-Z0-9_-]+$/.test(user.id)) return json({ error: "请先登录" }, 401);

    const { data: plan, error: planError } = await supabase
      .from("pricing_plans").select("*").eq("plan_key", planKey).eq("is_active", true).maybeSingle();
    if (planError) throw planError;
    if (!plan) return json({ error: "套餐不存在或已下架" }, 404);
    if (plan.amount_cents < 50) return json({ error: "套餐金额过低（最低 $0.50）" }, 400);

    const customer = await resolveOrCreateCustomer(user.email ?? undefined, user.id);

    // One-time payment so both card and WeChat Pay work. Benefits are frozen
    // at purchase time so later admin plan edits never change this order.
    const snapshot = {
      plan_type: plan.plan_type,
      duration_days: plan.duration_days,
      post_credits: plan.post_credits,
      unlimited_posts: plan.unlimited_posts,
      is_boost: plan.is_boost,
    };

    const session = await stripeRequest("POST", "checkout/sessions", {
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer,
      payment_method_types: ["card", "wechat_pay"],
      payment_method_options: { wechat_pay: { client: "web" } },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: plan.currency || "usd",
          unit_amount: plan.amount_cents,
          product_data: { name: plan.name, ...(plan.description ? { description: plan.description } : {}) },
        },
      }],
      payment_intent_data: { description: plan.name },
      metadata: { userId: user.id, planKey, ...(postId ? { postId } : {}) },
    });

    const { error: insErr } = await supabase.from("payments").insert({
      user_id: user.id,
      post_type: plan.plan_type,
      post_id: postId,
      amount: plan.amount_cents / 100,
      currency: plan.currency || "usd",
      payment_method: "stripe",
      payment_status: "pending",
      plan_key: planKey,
      plan_name: plan.name,
      duration_days: plan.duration_days,
      environment: "live",
      stripe_session_id: session.id,
      metadata: { postId, snapshot },
    });
    if (insErr) throw insErr;

    return json({ clientSecret: session.client_secret });
  } catch (e) {
    console.error("create-checkout error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
