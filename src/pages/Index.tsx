import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Users, Star } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: Car,
      title: "打车服务",
      description: "发布或查找实时打车信息",
      link: "/rides/realtime",
      color: "text-blue-500",
    },
    {
      icon: Car,
      title: "拼车服务",
      description: "发布实时或未来拼车行程",
      link: "/rides/carpool",
      color: "text-green-500",
    },
  ];

  const stats = [
    { icon: Users, label: "活跃用户", value: "1000+" },
    { icon: Car, label: "成功拼车", value: "5000+" },
    { icon: Star, label: "用户评分", value: "4.8" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-6 text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          华人滴滴
        </h1>
        <p className="mb-8 text-xl text-muted-foreground max-w-2xl mx-auto">
          安全、便捷的打车拼车信息共享平台<br />
          为华人社区提供实时打车和拼车服务
        </p>
        <div className="flex gap-4 justify-center">
          {user ? (
            <>
            <Button size="lg" onClick={() => navigate("/rides/realtime")}>
                立即打车
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/profile")}>
                个人中心
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" onClick={() => navigate("/auth")}>
                立即注册
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                登录
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <stat.icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                <p className="text-3xl font-bold mb-2">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">平台服务</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(feature.link)}
            >
              <CardHeader>
                <feature.icon className={`h-12 w-12 mb-4 ${feature.color}`} />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  查看详情 →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 bg-secondary/10 rounded-lg">
        <h2 className="text-3xl font-bold text-center mb-12">如何使用</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              1
            </div>
            <h3 className="font-semibold mb-2">注册账号</h3>
            <p className="text-sm text-muted-foreground">选择乘客或车主身份</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              2
            </div>
            <h3 className="font-semibold mb-2">发布信息</h3>
            <p className="text-sm text-muted-foreground">填写出发地、目的地等信息</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              3
            </div>
            <h3 className="font-semibold mb-2">匹配拼车</h3>
            <p className="text-sm text-muted-foreground">系统自动匹配合适的行程</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              4
            </div>
            <h3 className="font-semibold mb-2">评价反馈</h3>
            <p className="text-sm text-muted-foreground">行程结束后互相评分</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t text-center text-muted-foreground">
        <p>&copy; 2024 华人滴滴. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
