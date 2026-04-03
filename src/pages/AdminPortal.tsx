import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";
import {
  BarChart3, FileText, Users, Settings, Shield, Eye, EyeOff,
  Check, X, Search, Ban, ArrowUpDown, Plus, Trash2, GripVertical, Flag, AlertTriangle,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("id, title, category, image_urls, created_at, user_id, is_visible")
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleApprove = async (id: string) => {
    await supabase.from("posts").update({ is_visible: true }).eq("id", id);
    toast({ title: "已通过审核" });
    fetchPosts();
  };

  const handleReject = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    toast({ title: "已拒绝并删除" });
    fetchPosts();
  };

  const handleToggleVisibility = async (id: string, current: boolean) => {
    await supabase.from("posts").update({ is_visible: !current }).eq("id", id);
    toast({ title: current ? "已隐藏" : "已显示" });
    fetchPosts();
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-10" />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">内容审核</h2>
      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">暂无帖子</p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">帖子</th>
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
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.is_visible ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"}`}>
                      {p.is_visible ? "可见" : "隐藏"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(p.created_at).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleToggleVisibility(p.id, p.is_visible)}>
                        {p.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleReject(p.id)}>
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

// ─── Categories Config ───
function CategoriesPanel() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newName, setNewName] = useState("");

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
