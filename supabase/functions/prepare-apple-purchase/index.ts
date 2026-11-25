import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const Body = z.object({
  planKey: z.string().regex(/^[a-z0-9_]+$/).max(80),
  postId: z.string().uuid().nullable().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "无效的套餐或帖子" }, 400);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "请先登录" }, 401);

    const { data: plan, error: planError } = await supabase.from("pricing_plans")
      .select("*").eq("plan_key", parsed.data.planKey).eq("is_active", true).maybeSingle();
    if (planError) throw planError;
    if (!plan) return json({ error: "套餐不存在或已下架" }, 404);

    const snapshot = {
      plan_type: plan.plan_type,
      duration_days: plan.duration_days,
      post_credits: plan.post_credits,
      unlimited_posts: plan.unlimited_posts,
      is_boost: plan.is_boost,
    };
    const { data: payment, error } = await supabase.from("payments").insert({
      user_id: user.id,
      post_type: plan.plan_type,
      post_id: parsed.data.postId ?? null,
      amount: plan.amount_cents / 100,
      currency: plan.currency || "usd",
      payment_method: "apple_iap",
      payment_status: "pending",
      plan_key: plan.plan_key,
      plan_name: plan.name,
      duration_days: plan.duration_days,
      environment: "pending",
      metadata: { postId: parsed.data.postId ?? null, snapshot },
    }).select("id").single();
    if (error) throw error;
    return json({ orderId: payment.id });
  } catch (error) {
    console.error("prepare-apple-purchase failed", error);
    return json({ error: "暂时无法创建苹果订单，请稍后重试" }, 500);
  }
});
