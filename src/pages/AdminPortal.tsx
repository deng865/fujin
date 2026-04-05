import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";
import {
  BarChart3, FileText, Users, Settings, Shield, Eye, EyeOff,
  Check, X, Search, Ban, ArrowUpDown, Plus, Trash2, GripVertical, Flag, AlertTriangle,
  ChevronUp, ChevronDown, Pencil, FolderPlus,
  Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale,
  MapPin, Wrench, ShoppingBag, Heart, Music, Camera, Star, Coffee, Scissors,
  Stethoscope, Building, Dumbbell, Baby, Dog, Laptop, Paintbrush, Hammer,
  BookOpen, Headphones, Truck, Wallet, Globe, Flower2, Sparkles, Pizza,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AVAILABLE_ICONS: Record<string, LucideIcon> = {
  Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale,
  MapPin, Wrench, ShoppingBag, Heart, Music, Camera, Star, Coffee, Scissors,
  Stethoscope, Building, Dumbbell, Baby, Dog, Laptop, Paintbrush, Hammer,
  BookOpen, Headphones, Truck, Wallet, Globe, Flower2, Sparkles, Pizza,
};
import { Input } from "@/components/ui/input";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

type AdminTab = "dashboard" | "moderation" | "users" | "categories" | "reports";

// ─── Dashboard Stats ───
function DashboardPanel() {
  const [stats, setStats] = useState({ todayPosts: 0, activeUsers: 0, totalPosts: 0, pendingReports: 0 });

  useEffect(() => {
    const load = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [postsToday, totalPosts, totalUsers, pendingReports] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setStats({
        todayPosts: postsToday.count || 0,
        activeUsers: totalUsers.count || 0,
        totalPosts: totalPosts.count || 0,
        pendingReports: pendingReports.count || 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "今日新增帖", value: stats.todayPosts, icon: FileText, color: "text-blue-600 bg-blue-50" },
    { label: "注册用户数", value: stats.activeUsers, icon: Users, color: "text-emerald-600 bg-emerald-50" },
    { label: "总帖子数", value: stats.totalPosts, icon: BarChart3, color: "text-orange-600 bg-orange-50" },
    { label: "待处理举报", value: stats.pendingReports, icon: Flag, color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">数据概览</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Content Moderation ───
function ModerationPanel() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailPost, setDetailPost] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("id, title, description, category, image_urls, price, latitude, longitude, created_at, user_id, is_visible")
      .order("created_at", { ascending: false })
      .limit(50);

    if (statusFilter === "pending") query = query.eq("is_visible", false);
    if (statusFilter === "approved") query = query.eq("is_visible", true);

    const { data } = await query;

    // Enrich with publisher name
    if (data) {
      const enriched = await Promise.all(
        data.map(async (p: any) => {
          const { data: profile } = await supabase
            .from("public_profiles")
            .select("name, avatar_url")
            .eq("id", p.user_id)
            .single();
          return { ...p, publisher_name: profile?.name || "未知用户", publisher_avatar: profile?.avatar_url };
        })
      );
      setPosts(enriched);
    } else {
      setPosts([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [statusFilter]);

  const handleApprove = async (id: string) => {
    await supabase.from("posts").update({ is_visible: true }).eq("id", id);
    toast({ title: "已批准", description: "帖子已公开，其他用户可以看到" });
    if (detailPost?.id === id) setDetailPost(null);
    fetchPosts();
  };

  const handleReject = async (id: string) => {
    await supabase.from("posts").update({ is_visible: false }).eq("id", id);
    toast({ title: "已拒绝", description: "帖子已隐藏" });
    if (detailPost?.id === id) setDetailPost(null);
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    toast({ title: "已删除帖子" });
    if (detailPost?.id === id) setDetailPost(null);
    fetchPosts();
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-10" />;

  // Detail view
  if (detailPost) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => setDetailPost(null)}>
          ← 返回列表
        </Button>
        <div className="border border-border rounded-xl p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {detailPost.publisher_avatar ? (
                <img src={detailPost.publisher_avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="text-sm font-medium text-muted-foreground">{(detailPost.publisher_name || "U").charAt(0)}</span>
              )}
            </div>
            <div>
              <p className="font-medium">{detailPost.publisher_name}</p>
              <p className="text-xs text-muted-foreground">发布于 {new Date(detailPost.created_at).toLocaleString("zh-CN")}</p>
            </div>
            <span className={`ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${detailPost.is_visible ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"}`}>
              {detailPost.is_visible ? "已批准" : "待审核"}
            </span>
          </div>

          <h3 className="text-lg font-bold mb-2">{detailPost.title}</h3>
          <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-0.5 rounded">分类: {detailPost.category}</span>
            {detailPost.price != null && <span className="bg-muted px-2 py-0.5 rounded">价格: ${detailPost.price}</span>}
            <span className="bg-muted px-2 py-0.5 rounded">坐标: {detailPost.latitude?.toFixed(4)}, {detailPost.longitude?.toFixed(4)}</span>
          </div>

          {detailPost.description && (
            <p className="text-sm text-foreground/80 mb-4 whitespace-pre-wrap">{detailPost.description}</p>
          )}

          {detailPost.image_urls?.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {detailPost.image_urls.map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="rounded-lg object-cover w-full aspect-square" />
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t border-border">
            {!detailPost.is_visible && (
              <Button size="sm" onClick={() => handleApprove(detailPost.id)}>
                <Check className="h-4 w-4 mr-1" /> 批准
              </Button>
            )}
            {detailPost.is_visible && (
              <Button size="sm" variant="outline" onClick={() => handleReject(detailPost.id)}>
                <X className="h-4 w-4 mr-1" /> 拒绝（隐藏）
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={() => handleDelete(detailPost.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> 删除
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">内容审核</h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { value: "all" as const, label: "全部" },
          { value: "pending" as const, label: "待审核" },
          { value: "approved" as const, label: "已批准" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无帖子</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">帖子</th>
                <th className="px-4 py-3 font-medium">发布者</th>
                <th className="px-4 py-3 font-medium">分类</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_urls?.[0] && (
                        <img src={p.image_urls[0]} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                      )}
                      <span className="font-medium truncate max-w-[200px]">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {p.publisher_avatar ? (
                          <img src={p.publisher_avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground">{(p.publisher_name || "U").charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">{p.publisher_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.is_visible ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"}`}>
                      {p.is_visible ? "已批准" : "待审核"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(p.created_at).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetailPost(p)} title="详情">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!p.is_visible && (
                        <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => handleApprove(p.id)} title="批准">
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {p.is_visible && (
                        <Button size="sm" variant="ghost" className="text-yellow-600" onClick={() => handleReject(p.id)} title="拒绝">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)} title="删除">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── User Management ───
function UsersPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, is_blocked, created_at, phone")
      .order("created_at", { ascending: false })
      .limit(100);
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleBlock = async (id: string, currentlyBlocked: boolean) => {
    await supabase.from("profiles").update({ is_blocked: !currentlyBlocked }).eq("id", id);
    toast({ title: currentlyBlocked ? "已解禁用户" : "已禁用用户" });
    fetchUsers();
  };

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-10" />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">用户管理</h2>
      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户名或电话..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">用户</th>
              <th className="px-4 py-3 font-medium">电话</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">注册时间</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">{(u.name || "U").charAt(0)}</span>
                      )}
                    </div>
                    <span className="font-medium">{u.name || "未命名"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.phone || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.is_blocked ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {u.is_blocked ? "已禁用" : "正常"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(u.created_at).toLocaleDateString("zh-CN")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant={u.is_blocked ? "outline" : "destructive"}
                    onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    {u.is_blocked ? "解禁" : "禁用"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Icon Picker ───
function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const CurrentIcon = AVAILABLE_ICONS[value] || MapPin;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="text-xs text-muted-foreground">{value}</span>
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg p-3 w-[280px] max-h-[240px] overflow-y-auto">
          <div className="grid grid-cols-6 gap-1">
            {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
              <button
                key={name}
                onClick={() => { onChange(name); setOpen(false); }}
                title={name}
                className={`p-2 rounded-lg transition-colors ${value === name ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              >
                <Icon className="h-4 w-4 mx-auto" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Categories Config ───
function CategoriesPanel() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("MapPin");
  const [newParentId, setNewParentId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIcon, setEditIcon] = useState("");

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const topCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const handleToggleVisibility = async (id: string, current: boolean) => {
    await supabase.from("categories").update({ is_visible: !current }).eq("id", id);
    toast({ title: current ? "已隐藏分类" : "已显示分类" });
    fetchCategories();
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newLabel.trim()) return;
    const name = newName.trim().toLowerCase();
    const { data: existing } = await supabase.from("categories").select("id").eq("name", name).maybeSingle();
    if (existing) {
      toast({ title: "添加失败", description: `分类标识 "${name}" 已存在`, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("categories").insert({
      name,
      label: newLabel.trim(),
      icon: newIcon,
      parent_id: newParentId || null,
      sort_order: categories.length + 1,
    });
    if (error) {
      toast({ title: "添加失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "已添加分类" });
      setNewName(""); setNewLabel(""); setNewIcon("MapPin"); setNewParentId("");
      fetchCategories();
    }
  };

  const handleSaveEdit = async (id: string) => {
    await supabase.from("categories").update({ label: editLabel, icon: editIcon }).eq("id", id);
    toast({ title: "已更新分类" });
    setEditingId(null);
    fetchCategories();
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = categories[index];
    const above = categories[index - 1];
    await Promise.all([
      supabase.from("categories").update({ sort_order: above.sort_order }).eq("id", current.id),
      supabase.from("categories").update({ sort_order: current.sort_order }).eq("id", above.id),
    ]);
    fetchCategories();
  };

  const handleMoveDown = async (index: number) => {
    if (index === categories.length - 1) return;
    const current = categories[index];
    const below = categories[index + 1];
    await Promise.all([
      supabase.from("categories").update({ sort_order: below.sort_order }).eq("id", current.id),
      supabase.from("categories").update({ sort_order: current.sort_order }).eq("id", below.id),
    ]);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    toast({ title: "已删除分类" });
    fetchCategories();
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-10" />;

  const renderCategoryRow = (cat: any, index: number, isChild = false) => {
    const isEditing = editingId === cat.id;
    const CatIcon = AVAILABLE_ICONS[cat.icon] || MapPin;

    return (
      <tr key={cat.id} className={`hover:bg-muted/30 ${isChild ? "bg-muted/10" : ""}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground w-6 text-center">{cat.sort_order}</span>
            <div className="flex flex-col">
              <Button size="icon" variant="ghost" className="h-5 w-5" disabled={index === 0} onClick={() => handleMoveUp(index)}>
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-5 w-5" disabled={index === categories.length - 1} onClick={() => handleMoveDown(index)}>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {isEditing ? (
            <IconPicker value={editIcon} onChange={setEditIcon} />
          ) : (
            <div className="flex items-center gap-2">
              <CatIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{cat.icon}</span>
            </div>
          )}
        </td>
        <td className="px-4 py-3 font-mono text-xs">
          {isChild && <span className="text-muted-foreground mr-1">└</span>}
          {cat.name}
        </td>
        <td className="px-4 py-3">
          {isEditing ? (
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="border border-border rounded-lg px-2 py-1 text-sm w-full max-w-[160px] bg-background"
              autoFocus
            />
          ) : (
            <span className="font-medium">{cat.label}</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cat.is_visible ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"}`}>
            {cat.is_visible ? "可见" : "隐藏"}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" className="text-primary" onClick={() => handleSaveEdit(cat.id)}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => { setEditingId(cat.id); setEditLabel(cat.label); setEditIcon(cat.icon); }}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => handleToggleVisibility(cat.id, cat.is_visible)}>
              {cat.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(cat.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">分类配置</h2>

      {/* Add new */}
      <div className="flex flex-wrap gap-2 mb-6 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">父级分类</label>
          <select
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm w-[120px]"
          >
            <option value="">顶级分类</option>
            {topCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">英文标识</label>
          <input placeholder="如: beauty" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm w-[120px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">显示名称</label>
          <input placeholder="如: 美容" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm w-[120px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">图标</label>
          <IconPicker value={newIcon} onChange={setNewIcon} />
        </div>
        <Button onClick={handleAdd} disabled={!newName.trim() || !newLabel.trim()} className="h-9">
          <Plus className="h-4 w-4 mr-1" /> 添加
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">排序</th>
              <th className="px-4 py-3 font-medium">图标</th>
              <th className="px-4 py-3 font-medium">标识</th>
              <th className="px-4 py-3 font-medium">显示名称</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {topCategories.map((cat, index) => {
              const children = getChildren(cat.id);
              return [
                renderCategoryRow(cat, index),
                ...children.map((child, ci) => renderCategoryRow(child, ci, true)),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}



  const handleToggleVisibility = async (id: string, current: boolean) => {
    await supabase.from("categories").update({ is_visible: !current }).eq("id", id);
    toast({ title: current ? "已隐藏分类" : "已显示分类" });
    fetchCategories();
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newLabel.trim()) return;
    const name = newName.trim().toLowerCase();
    const { data: existing } = await supabase.from("categories").select("id").eq("name", name).maybeSingle();
    if (existing) {
      toast({ title: "添加失败", description: `分类标识 "${name}" 已存在，请使用其他名称`, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("categories").insert({
      name,
      label: newLabel.trim(),
      icon: "MapPin",
      sort_order: categories.length + 1,
    });
    if (error) {
      toast({ title: "添加失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "已添加分类" });
      setNewName("");
      setNewLabel("");
      fetchCategories();
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = categories[index];
    const above = categories[index - 1];
    await Promise.all([
      supabase.from("categories").update({ sort_order: above.sort_order }).eq("id", current.id),
      supabase.from("categories").update({ sort_order: current.sort_order }).eq("id", above.id),
    ]);
    fetchCategories();
  };

  const handleMoveDown = async (index: number) => {
    if (index === categories.length - 1) return;
    const current = categories[index];
    const below = categories[index + 1];
    await Promise.all([
      supabase.from("categories").update({ sort_order: below.sort_order }).eq("id", current.id),
      supabase.from("categories").update({ sort_order: current.sort_order }).eq("id", below.id),
    ]);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    toast({ title: "已删除分类" });
    fetchCategories();
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-10" />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">分类配置</h2>

      {/* Add new */}
      <div className="flex gap-2 mb-6 max-w-lg">
        <Input placeholder="英文标识 (如: beauty)" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
        <Input placeholder="显示名称 (如: 💇 美容)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="flex-1" />
        <Button onClick={handleAdd} disabled={!newName.trim() || !newLabel.trim()}>
          <Plus className="h-4 w-4 mr-1" /> 添加
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">排序</th>
              <th className="px-4 py-3 font-medium">标识</th>
              <th className="px-4 py-3 font-medium">显示名称</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((cat, index) => (
              <tr key={cat.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground w-6 text-center">{cat.sort_order}</span>
                    <div className="flex flex-col">
                      <Button size="icon" variant="ghost" className="h-5 w-5" disabled={index === 0} onClick={() => handleMoveUp(index)}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5" disabled={index === categories.length - 1} onClick={() => handleMoveDown(index)}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{cat.name}</td>
                <td className="px-4 py-3 font-medium">{cat.label}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cat.is_visible ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"}`}>
                    {cat.is_visible ? "可见" : "隐藏"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleToggleVisibility(cat.id, cat.is_visible)}>
                      {cat.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(cat.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reports Management ───
function ReportsPanel() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase
      .from("reports")
      .select("*, posts(id, title, category)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query.limit(100);

    if (data) {
      // Fetch reporter names
      const enriched = await Promise.all(
        data.map(async (r: any) => {
          const { data: profile } = await supabase
            .from("public_profiles")
            .select("name")
            .eq("id", r.reporter_id)
            .single();
          return { ...r, reporter_name: profile?.name || "匿名" };
        })
      );
      setReports(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [filter]);

  const handleUpdateStatus = async (id: string, status: string) => {
    await supabase.from("reports").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: status === "reviewed" ? "已处理" : "已驳回" });
    fetchReports();
  };

  const handleDeletePost = async (reportId: string, postId: string) => {
    await supabase.from("posts").delete().eq("id", postId);
    await supabase.from("reports").update({ status: "reviewed", admin_note: "帖子已删除", updated_at: new Date().toISOString() }).eq("id", reportId);
    toast({ title: "帖子已删除，举报已处理" });
    fetchReports();
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700",
    reviewed: "bg-emerald-50 text-emerald-700",
    dismissed: "bg-muted text-muted-foreground",
  };
  const statusLabels: Record<string, string> = { pending: "待处理", reviewed: "已处理", dismissed: "已驳回" };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-10" />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">举报管理</h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { value: "pending", label: "待处理" },
          { value: "reviewed", label: "已处理" },
          { value: "dismissed", label: "已驳回" },
          { value: "all", label: "全部" },
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

      {reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Flag className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无{filter === "all" ? "" : statusLabels[filter] || ""}举报</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[r.status] || ""}`}>
                      {statusLabels[r.status] || r.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 inline mr-1 text-yellow-500" />
                    {r.reason}
                  </p>
                  {r.details && <p className="text-xs text-muted-foreground mb-2">{r.details}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>举报人: {r.reporter_name}</span>
                    <span>帖子: {r.posts?.title || "已删除"}</span>
                    {r.posts?.category && <span>分类: {r.posts.category}</span>}
                  </div>
                </div>
              </div>

              {r.status === "pending" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(r.id, "dismissed")}>
                    <X className="h-3.5 w-3.5 mr-1" /> 驳回
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(r.id, "reviewed")}>
                    <Check className="h-3.5 w-3.5 mr-1" /> 标记已处理
                  </Button>
                  {r.posts && (
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePost(r.id, r.post_id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> 删除帖子
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Portal ───
const menuItems = [
  { id: "dashboard" as AdminTab, label: "数据概览", icon: BarChart3 },
  { id: "moderation" as AdminTab, label: "内容审核", icon: FileText },
  { id: "reports" as AdminTab, label: "举报管理", icon: Flag },
  { id: "users" as AdminTab, label: "用户管理", icon: Users },
  { id: "categories" as AdminTab, label: "分类配置", icon: Settings },
];

export default function AdminPortal() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <Shield className="h-16 w-16 text-muted-foreground opacity-30" />
        <h1 className="text-xl font-bold">无权访问</h1>
        <p className="text-muted-foreground text-sm">此页面仅限管理员访问</p>
        <Button variant="outline" onClick={() => navigate("/")}>返回首页</Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">管理后台</span>
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.id)}
                        isActive={activeTab === item.id}
                        className="gap-3"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-sm font-semibold text-muted-foreground">
                {menuItems.find((m) => m.id === activeTab)?.label}
              </h1>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              返回前台
            </Button>
          </header>

          {/* Content */}
          <main className="flex-1 p-6 overflow-y-auto">
            {activeTab === "dashboard" && <DashboardPanel />}
            {activeTab === "moderation" && <ModerationPanel />}
            {activeTab === "users" && <UsersPanel />}
            {activeTab === "categories" && <CategoriesPanel />}
            {activeTab === "reports" && <ReportsPanel />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
