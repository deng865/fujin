import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SeoCategoryRow, SeoCityRow } from "@/lib/citySeo";

export function useSeoConfig() {
  const [cities, setCities] = useState<SeoCityRow[]>([]);
  const [categories, setCategories] = useState<SeoCategoryRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("seo_cities").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("seo_categories").select("*").eq("is_active", true).order("sort_order"),
    ]).then(([c, k]) => {
      if (!active) return;
      setCities((c.data as SeoCityRow[] | null) || []);
      setCategories((k.data as SeoCategoryRow[] | null) || []);
      setStatus(c.error || k.error ? "error" : "ready");
    });
    return () => { active = false; };
  }, []);
  return { cities, categories, status };
}
