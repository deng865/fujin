import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LocationPermissionDialog } from "@/components/LocationPermissionDialog";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password || !name) {
      toast.error("请填写必填项 / Please fill required fields");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      toast.success("注册成功！请查看邮箱验证 / Check email to verify");
      setShowLocationDialog(true);
    } catch (error: any) {
      toast.error(error.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("登录成功！/ Welcome back!");
      setShowLocationDialog(true);
    } catch (error: any) {
      toast.error(error.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationPermission = (permission: "once" | "always" | "never") => {
    localStorage.setItem("locationPermission", permission);
    setShowLocationDialog(false);
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <LocationPermissionDialog open={showLocationDialog} onSelect={handleLocationPermission} />
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">华人生活平台</CardTitle>
          <CardDescription>Local Community for Chinese in North America</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="signin">登录 Login</TabsTrigger>
              <TabsTrigger value="signup">注册 Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label>邮箱 / Email</Label>
                  <Input name="email" type="email" placeholder="your@email.com" required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>密码 / Password</Label>
                  <Input name="password" type="password" placeholder="••••••••" required className="rounded-xl" />
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                  {loading ? "登录中..." : "登录 / Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label>姓名 / Name *</Label>
                  <Input name="name" placeholder="您的姓名" required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>邮箱 / Email *</Label>
                  <Input name="email" type="email" placeholder="your@email.com" required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>密码 / Password *</Label>
                  <Input name="password" type="password" placeholder="至少6位" required minLength={6} className="rounded-xl" />
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                  {loading ? "注册中..." : "注册 / Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
