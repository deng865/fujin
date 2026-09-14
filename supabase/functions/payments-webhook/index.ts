import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function grantEntitlement(userId: string, planKey: string, sessionId?: string) {
  const supabase = getSupabase();

  const { data: plan } = await supabase
    .from("pricing_plans")
    .select("*")
    .eq("plan_key", planKey)
    .maybeSingle();

  if (!plan) {
    console.error("Unknown planKey in webhook:", planKey);
    return;
  }

  const { data: existing } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const now = Date.now();
  const durationMs = (plan.duration_days ?? 30) * 24 * 60 * 60 * 1000;

  let postCredits = existing?.post_credits ?? 0;
  let unlimitedUntil: string | null = existing?.unlimited_until ?? null;

  if (plan.unlimited_posts) {
    const base = unlimitedUntil && new Date(unlimitedUntil).getTime() > now
      ? new Date(unlimitedUntil).getTime()
      : now;
    unlimitedUntil = new Date(base + durationMs).toISOString();
  } else if (plan.post_credits > 0) {
    postCredits += plan.post_credits;
  }

  await supabase.from("user_credits").upsert(
    {
      user_id: userId,
      post_credits: postCredits,
      unlimited_until: unlimitedUntil,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (sessionId) {
    await supabase
      .from("payments")
      .update({
        payment_status: "completed",
        expires_at: plan.unlimited_posts ? unlimitedUntil : null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", sessionId);
  }

  // Boost plans apply to the specific post recorded on the payment.
  if (plan.is_boost && sessionId) {
    const { data: payment } = await supabase
      .from("payments")
      .select("post_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (payment?.post_id) {
      await supabase
        .from("posts")
        .update({
          is_boosted: true,
          boost_expires_at: new Date(now + durationMs).toISOString(),
          bumped_at: new Date().toISOString(),
        })
        .eq("id", payment.post_id);
    }
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      if (obj.payment_status === "unpaid") break;
      const userId = obj.metadata?.userId;
      const planKey = obj.metadata?.planKey;
      if (userId && planKey) await grantEntitlement(userId, planKey, obj.id);
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const userId = obj.metadata?.userId;
      const planKey = obj.metadata?.planKey;
      if (userId && planKey) await grantEntitlement(userId, planKey, obj.id);
      break;
    }
    case "checkout.session.async_payment_failed": {
      if (obj.id) {
        await getSupabase()
          .from("payments")
          .update({ payment_status: "failed", updated_at: new Date().toISOString() })
          .eq("stripe_session_id", obj.id);
      }
      break;
    }
    case "invoice.paid": {
      // Membership renewal: extend the unlimited window.
      const sub = obj.subscription;
      if (sub && typeof sub === "object" && sub.metadata?.userId && sub.metadata?.planKey) {
        await grantEntitlement(sub.metadata.userId, sub.metadata.planKey);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // Membership validity is tracked on user_credits.unlimited_until.
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Invalid env query parameter:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
