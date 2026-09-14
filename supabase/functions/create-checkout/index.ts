import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Stripe full compliance handling is available for US-based sellers, so we
// enable it and let Stripe handle tax filing / disputes / support.
async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const planKey = typeof body.planKey === "string" ? body.planKey : "";
    const environment: StripeEnv = body.environment === "live" ? "live" : "sandbox";
    const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : "";
    const postId = typeof body.postId === "string" ? body.postId : null;

    if (!/^[a-z0-9_]+$/.test(planKey)) {
      return new Response(JSON.stringify({ error: "无效的套餐" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!returnUrl.startsWith("http")) {
      return new Response(JSON.stringify({ error: "无效的返回地址" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "请先登录" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Price and duration come from the admin-editable pricing_plans table,
    // so admins can change amounts without touching code or Stripe.
    const { data: plan, error: planError } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("plan_key", planKey)
      .eq("is_active", true)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) {
      return new Response(JSON.stringify({ error: "套餐不存在或已下架" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (plan.amount_cents < 50) {
      return new Response(JSON.stringify({ error: "套餐金额过低（最低 $0.50）" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(environment);
    const customerId = await resolveOrCreateCustomer(stripe, {
      email: user.email ?? undefined,
      userId: user.id,
    });

    const isRecurring = plan.plan_type === "membership" && plan.duration_days === 30;

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: plan.currency || "usd",
          product_data: {
            name: plan.name,
            ...(plan.description && { description: plan.description }),
            tax_code: plan.plan_type === "membership" ? "txcd_10103001" : "txcd_10000000",
          },
          unit_amount: plan.amount_cents,
          ...(isRecurring && { recurring: { interval: "month" } }),
        },
        quantity: 1,
      }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer: customerId,
      managed_payments: { enabled: true },
      ...(!isRecurring && { payment_intent_data: { description: plan.name } }),
      metadata: {
        userId: user.id,
        planKey,
        managed_payments: "true",
        ...(postId && { postId }),
      },
      ...(isRecurring && {
        subscription_data: { metadata: { userId: user.id, planKey } },
      }),
    } as any);

    await supabase.from("payments").insert({
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
      environment,
      stripe_session_id: session.id,
      metadata: { postId },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
