import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { verifiedAppleTransaction } from "../_shared/appleStore.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const Body = z.object({
  transactionId: z.string().regex(/^\d{5,30}$/),
  orderId: z.string().uuid().nullable().optional(),
});
const productPrefix = "life.fujin.app.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "无效的交易或订单" }, 400);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "请先登录" }, 401);

    const transaction = await verifiedAppleTransaction(parsed.data.transactionId);
    if (transaction.transactionId !== parsed.data.transactionId || transaction.bundleId !== "life.fujin.app") {
      return json({ error: "交易与应用不匹配" }, 400);
    }
    if (transaction.appAccountToken?.toLowerCase() !== user.id.toLowerCase()) {
      return json({ error: "交易不属于当前账号" }, 403);
    }
    if (transaction.revocationDate) return json({ error: "这笔交易已退款或撤销" }, 400);
    const planKey = transaction.productId?.startsWith(productPrefix)
      ? transaction.productId.slice(productPrefix.length) : null;
    if (!planKey || !/^[a-z0-9_]+$/.test(planKey)) return json({ error: "未知的苹果商品" }, 400);

    const { data: existing } = await supabase.from("payments").select("*")
      .eq("apple_transaction_id", parsed.data.transactionId).maybeSingle();
    if (existing && existing.user_id !== user.id) return json({ error: "交易已绑定其他账号" }, 403);
    if (existing?.payment_status === "completed") return json({ status: "completed" });

    let payment = existing;
    if (!payment) {
      if (parsed.data.orderId) {
        const { data } = await supabase.from("payments").select("*")
          .eq("id", parsed.data.orderId).eq("user_id", user.id).maybeSingle();
        payment = data;
      } else {
        const { data } = await supabase.from("payments").select("*")
          .eq("user_id", user.id).eq("plan_key", planKey).eq("payment_method", "apple_iap")
          .eq("payment_status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
        payment = data;
      }
    }
    if (!payment || payment.user_id !== user.id || payment.plan_key !== planKey) {
      return json({ error: "找不到与商品匹配的待确认订单，请恢复购买或联系客服" }, 404);
    }
    if (payment.payment_status === "completed") return json({ status: "completed" });

    const environment = String(transaction.environment || "Sandbox").toLowerCase();
    const amount = typeof transaction.price === "number" ? transaction.price / 1000 : payment.amount;
    const { error: attachError } = await supabase.from("payments").update({
      apple_transaction_id: parsed.data.transactionId,
      apple_original_transaction_id: transaction.originalTransactionId ?? null,
      environment,
      amount,
      currency: transaction.currency?.toLowerCase() ?? payment.currency,
      updated_at: new Date().toISOString(),
    }).eq("id", payment.id).eq("payment_status", "pending");
    if (attachError) {
      const { data: raced } = await supabase.from("payments").select("payment_status")
        .eq("apple_transaction_id", parsed.data.transactionId).eq("user_id", user.id).maybeSingle();
      if (raced?.payment_status === "completed") return json({ status: "completed" });
      throw attachError;
    }

    const { error: fulfillError } = await supabase.rpc("fulfill_payment", {
      _payment_id: payment.id, _user_id: user.id,
    });
    if (fulfillError) throw fulfillError;
    return json({ status: "completed" });
  } catch (error) {
    console.error("verify-apple-purchase failed", error);
    return json({ error: error instanceof Error ? error.message : "苹果交易确认失败，请稍后恢复购买" }, 500);
  }
});
