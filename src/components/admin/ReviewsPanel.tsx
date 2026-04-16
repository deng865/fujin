import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star, AlertTriangle, Check, X, Trash2, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DisputedReview {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  image_urls: string[];
  dispute_reason: string | null;
  dispute_images: string[];
  dispute_status: string;
  status?: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  target_type: string;
  sender_name?: string;
  receiver_name?: string;
  sender_credit?: number;
}

export default function ReviewsPanel() {
  const [items, setItems] = useState<DisputedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"disputed" | "all">("disputed");

  const fetchData = async () => {
    setLoading(true);
    let query = supabase
      .from("reviews")
      .select("id, rating, comment, tags, image_urls, dispute_reason, dispute_images, dispute_status, created_at, sender_id, receiver_id, target_type")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter === "disputed") query = query.eq("dispute_status", "disputed");

    const { data } = await query;
    if (!data) { setItems([]); setLoading(false); return; }

    const userIds = [...new Set(data.flatMap((r: any) => [r.sender_id, r.receiver_id]))];
    const { data: profiles } = userIds.length
      ? await supabase.from("public_profiles").select("id, name").in("id", userIds)
      : { data: [] };
    const map = new Map((profiles || []).map((p: any) => [p.id, p.name || "用户"]));

    setItems(
      data.map((r: any) => ({
        ...r,
        sender_name: map.get(r.sender_id) || "用户",
        receiver_name: map.get(r.receiver_id) || "用户",
      })),
    );
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const adjustCredit = async (userId: string, currentCredit: number, delta: number) => {
    const newScore = Math.max(0, Math.min(100, currentCredit + delta));
    await (supabase as any).from("profiles").update({ credit_score: newScore }).eq("id", userId);
  };

  const approveDispute = async (id: string, senderId: string, senderCredit: number) => {
    if (!confirm("批准申诉将永久删除该评价并扣除评价者 10 信用分，确认操作？")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) { toast({ title: "操作失败", description: error.message, variant: "destructive" }); return; }
    await adjustCredit(senderId, senderCredit, -10);
    toast({ title: "已批准申诉", description: "评价已删除，评价者信用分 -10" });
    fetchData();
  };

  const rejectDispute = async (id: string) => {
    const note = prompt("驳回理由（选填，将记录到 admin_note）：") || "";
    const { error } = await (supabase as any)
      .from("reviews")
      .update({ dispute_status: "none", admin_note: note || null })
      .eq("id", id);
    if (error) { toast({ title: "操作失败", description: error.message, variant: "destructive" }); return; }
    toast({ title: "已驳回申诉", description: "评价恢复正常" });
    fetchData();
  };

  const approvePending = async (id: string) => {
    const { error } = await (supabase as any).from("reviews").update({ status: "approved" }).eq("id", id);
    if (error) { toast({ title: "操作失败", description: error.message, variant: "destructive" }); return; }
    toast({ title: "已通过审核", description: "评价已公开显示" });
    fetchData();
  };

  const rejectPending = async (id: string, senderId: string, senderCredit: number) => {
    if (!confirm("驳回该评价并扣除评价者 5 信用分？")) return;
    const { error } = await (supabase as any).from("reviews").update({ status: "rejected" }).eq("id", id);
    if (error) { toast({ title: "操作失败", description: error.message, variant: "destructive" }); return; }
    await adjustCredit(senderId, senderCredit, -5);
    toast({ title: "已驳回", description: "评价已隐藏，评价者信用分 -5" });
    fetchData();
  };

  const deleteReview = async (id: string) => {
    if (!confirm("永久删除该评价？")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) { toast({ title: "操作失败", description: error.message, variant: "destructive" }); return; }
    toast({ title: "评价已删除" });
    fetchData();
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-10" />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">评价管理</h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: "disputed" as const, label: "申诉中" },
          { value: "pending" as const, label: "待审核（垃圾过滤）" },
          { value: "all" as const, label: "全部评价" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无{filter === "disputed" ? "申诉" : filter === "pending" ? "待审核评价" : "评价"}</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {items.map((r) => (
            <div key={r.id} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.dispute_status === "disputed" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                        <AlertTriangle className="h-3 w-3" /> 申诉中
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("zh-CN")}
                    </span>
                    <span className="text-[11px] bg-muted px-2 py-0.5 rounded">{r.target_type}</span>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">{r.sender_name}</span>
                    <span className="text-muted-foreground"> 评价 </span>
                    <span className="font-medium">{r.receiver_name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
                    />
                  ))}
                </div>
              </div>

              {/* Original review */}
              <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground">原评价内容</p>
                {r.comment && <p className="text-sm">{r.comment}</p>}
                {r.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-background rounded-full text-[10px]">{t}</span>
                    ))}
                  </div>
                )}
                {r.image_urls?.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto">
                    {r.image_urls.map((u, i) => (
                      <img key={i} src={u} alt="" className="h-20 w-20 rounded-lg object-cover shrink-0" />
                    ))}
                  </div>
                )}
              </div>

              {/* Dispute */}
              {r.dispute_status === "disputed" && (
                <div className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-3 space-y-2">
                  <p className="text-[11px] text-amber-700 font-medium">申诉理由</p>
                  <p className="text-sm">{r.dispute_reason || "（无说明）"}</p>
                  {r.dispute_images?.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto">
                      {r.dispute_images.map((u, i) => (
                        <img key={i} src={u} alt="" className="h-20 w-20 rounded-lg object-cover shrink-0" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border flex-wrap">
                <span className="text-[11px] text-muted-foreground">
                  评价者信用分: <span className={`font-semibold ${(r.sender_credit ?? 100) < 50 ? "text-destructive" : "text-foreground"}`}>{r.sender_credit ?? 100}</span>
                  {r.status === "pending" && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">待审核</span>}
                </span>
                <div className="flex gap-2">
                  {r.dispute_status === "disputed" ? (
                    <>
                      <Button size="sm" onClick={() => approveDispute(r.id, r.sender_id, r.sender_credit ?? 100)}>
                        <Check className="h-3.5 w-3.5 mr-1" /> 批准申诉（删除评价）
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectDispute(r.id)}>
                        <X className="h-3.5 w-3.5 mr-1" /> 驳回申诉
                      </Button>
                    </>
                  ) : r.status === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => approvePending(r.id)}>
                        <Check className="h-3.5 w-3.5 mr-1" /> 通过
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectPending(r.id, r.sender_id, r.sender_credit ?? 100)}>
                        <X className="h-3.5 w-3.5 mr-1" /> 驳回
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => deleteReview(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> 删除
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
