import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LocationPermissionDialog } from "@/components/LocationPermissionDialog";
import { Mail, Eye, EyeOff, Loader2 } from "lucide-react";

const friendlyError = (msg: string): string => {
  const map: Record<string, string> = {
    "Invalid login credentials": "邮箱或密码错误，请检查后重试",
    "Email not confirmed": "邮箱尚未验证，请查看邮箱中的确认链接",
    "User already registered": "该邮箱已注册，请直接登录",
    "Password should be at least 6 characters": "密码至少需要6个字符",
    "Unable to validate email address: invalid format": "邮箱格式不正确",
    "Email rate limit exceeded": "请求过于频繁，请稍后再试",
    "For security purposes, you can only request this after": "操作过于频繁，请稍后再试",
  };
  for (const [key, val] of Object.entries(map)) {
    if (msg.includes(key)) return val;
  }
  return msg;
};

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleLocationPermission = (permission: "once" | "always" | "never") => {
    localStorage.setItem("locationPermission", permission);
    setShowLocationDialog(false);
    navigate("/");
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;

    if (!email || !password) {
      toast.error("请填写邮箱和密码");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("登录成功！Welcome back!");
      setShowLocationDialog(true);
    } catch (error: any) {
      toast.error(friendlyError(error.message || "登录失败"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailInput = document.querySelector<HTMLInputElement>('#signin-email');
    const email = emailInput?.value?.trim();
    if (!email) {
      toast.error("请先输入邮箱地址");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("重置链接已发送，请查看邮箱");
    } catch (error: any) {
      toast.error(friendlyError(error.message || "发送失败"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;
    const name = (formData.get("name") as string).trim();

    if (!email || !password || !name) {
      toast.error("请填写所有必填项");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("密码至少需要6个字符");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;

      // If session exists, auto-confirm is on → go directly
      if (data.session) {
        toast.success("注册成功！");
        setShowLocationDialog(true);
      } else {
        // Email confirmation required
        setSignUpSuccess(true);
        toast.success("注册成功！请查看邮箱完成验证");
      }
    } catch (error: any) {
      toast.error(friendlyError(error.message || "注册失败"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google 登录失败");
        return;
      }
      if (result.redirected) return;
      toast.success("登录成功！");
      setShowLocationDialog(true);
    } catch (error: any) {
      toast.error(friendlyError(error.message || "Google 登录失败"));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Apple 登录失败");
        return;
      }
      if (result.redirected) return;
      toast.success("登录成功！");
      setShowLocationDialog(true);
    } catch (error: any) {
      toast.error(friendlyError(error.message || "Apple 登录失败"));
    } finally {
      setLoading(false);
    }
  };

  // Show success message after signup if email confirmation is needed
  if (signUpSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">验证邮箱</h2>
          <p className="text-sm text-muted-foreground">
            我们已向您的邮箱发送了验证链接，请点击链接完成注册。
          </p>
          <p className="text-xs text-muted-foreground">
            没有收到？请检查垃圾邮件文件夹，或稍后再试。
          </p>
          <Button variant="outline" className="rounded-xl" onClick={() => setSignUpSuccess(false)}>
            返回登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <LocationPermissionDialog open={showLocationDialog} onSelect={handleLocationPermission} />

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">华人街坊</h1>
          <p className="text-sm text-muted-foreground">Chinese Community Platform</p>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl text-sm font-medium gap-3"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            使用 Google 登录
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl text-sm font-medium gap-3"
            onClick={handleAppleSignIn}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            使用 Apple 登录
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted-foreground">或使用邮箱</span>
          </div>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl h-10">
            <TabsTrigger value="signin" className="rounded-lg text-sm">登录</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg text-sm">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="signin-email" name="email" type="email" placeholder="your@email.com" required className="pl-10 h-11 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">密码</Label>
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    className="pr-10 h-11 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />登录中...</> : "登录"}
              </Button>
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  忘记密码？
                </button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">姓名 *</Label>
                <Input name="name" placeholder="您的姓名" required className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">邮箱 *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input name="email" type="email" placeholder="your@email.com" required className="pl-10 h-11 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">密码 *</Label>
                <div className="relative">
                  <Input
                    name="password"
                    type={showSignUpPassword ? "text" : "password"}
                    placeholder="至少6位字符"
                    required
                    minLength={6}
                    className="pr-10 h-11 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />注册中...</> : "注册"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          登录即表示同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
};

export default Auth;
