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
  if (!sessionId) return;
  const supabase = getSupabase();
  const { data: payment, error } = await supabase.from("payments").select("id, user_id, plan_key")
    .eq("stripe_session_id", sessionId).maybeSingle();
  if (error) throw error;
  if (!payment || payment.user_id !== userId || payment.plan_key !== planKey) {
    throw new Error("Stripe event does not match its pending payment");
  }
  const { error: fulfillError } = await supabase.rpc("fulfill_payment", {
    _payment_id: payment.id,
    _user_id: userId,
  });
  if (fulfillError) throw fulfillError;
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
