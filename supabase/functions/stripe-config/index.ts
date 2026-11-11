import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
// The publishable key is public by design; served so it can be changed without a rebuild.
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({ publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY") ?? null }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
