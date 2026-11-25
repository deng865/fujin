import { NativePurchases, PURCHASE_TYPE, type Transaction } from "@capgo/native-purchases";
import { supabase } from "@/integrations/supabase/client";
import { appleProductIdForPlan } from "./appleIap";

export async function verifyAppleTransaction(transaction: Transaction, orderId?: string) {
  const { data, error } = await supabase.functions.invoke("verify-apple-purchase", {
    body: { transactionId: transaction.transactionId, orderId: orderId ?? null },
  });
  if (error || data?.status !== "completed") {
    throw new Error(data?.error || error?.message || "苹果交易尚未确认，请稍后恢复购买");
  }
  await NativePurchases.finishTransaction({ transactionId: transaction.transactionId });
  return data;
}

export async function purchaseApplePlan(planKey: string, userId: string, postId?: string | null) {
  await NativePurchases.configure({ autoFinishTransactions: false });
  const { data: order, error: orderError } = await supabase.functions.invoke("prepare-apple-purchase", {
    body: { planKey, postId: postId ?? null },
  });
  if (orderError || !order?.orderId) {
    throw new Error(order?.error || orderError?.message || "无法创建订单");
  }

  const transaction = await NativePurchases.purchaseProduct({
    productIdentifier: appleProductIdForPlan(planKey),
    productType: PURCHASE_TYPE.INAPP,
    quantity: 1,
    appAccountToken: userId,
    autoAcknowledgePurchases: false,
  });
  return verifyAppleTransaction(transaction, order.orderId);
}

export async function recoverApplePurchases() {
  await NativePurchases.configure({ autoFinishTransactions: false });
  const { transactions } = await NativePurchases.getUnfinishedTransactions();
  let recovered = 0;
  const errors: string[] = [];
  for (const transaction of transactions) {
    try {
      await verifyAppleTransaction(transaction);
      recovered += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { recovered, errors };
}
