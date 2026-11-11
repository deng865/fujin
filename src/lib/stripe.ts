import { loadStripe, Stripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

// Payments go directly to the owner's own Stripe account; the publishable
// key is served by the backend so it can be rotated without a rebuild.
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = (async () => {
      const { data, error } = await supabase.functions.invoke("stripe-config");
      const key = data?.publishableKey as string | undefined;
      if (error || !key?.startsWith("pk_")) {
        stripePromise = null;
        throw new Error("支付功能尚未配置完成");
      }
      return loadStripe(key);
    })();
  }
  return stripePromise;
}
