import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, ThumbsUp, User, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Post {
  id: string;
  title: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    name: string;
    avatar_url?: string;
  } | null;
}

const Community = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUser();
    fetchPosts();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          profiles (
            name,
            avatar_url
          )
        `)
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data as any || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "加载失败",
        description: "无法加载社区帖子，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "您需要登录才能发布帖子",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({
        title: "信息不完整",
        description: "请填写标题和内容",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        category: "experience",
      });

      if (error) throw error;

      toast({
        title: "发布成功",
        description: "您的帖子已发布",
      });

      setTitle("");
      setContent("");
      setShowCreateForm(false);
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "发布失败",
        description: "无法发布帖子，请稍后再试",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">华人社区交流</h1>
          <p className="text-muted-foreground">分享拼车经验，交流出行心得</p>
        </div>

        {user && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg md:text-xl">发布新帖</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  {showCreateForm ? "取消" : "写帖子"}
                </Button>
              </div>
            </CardHeader>
            {showCreateForm && (
              <CardContent className="space-y-4">
                <Input
                  placeholder="标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base"
                />
                <Textarea
                  placeholder="分享你的拼车经验..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="text-base resize-none"
                />
                <Button onClick={handleCreatePost} className="w-full md:w-auto">
                  发布
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">暂无帖子，快来发布第一篇吧！</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg md:text-xl line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.profiles?.name || "匿名用户"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm md:text-base text-muted-foreground mb-4 line-clamp-3 whitespace-pre-wrap">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {post.comments_count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Community;
