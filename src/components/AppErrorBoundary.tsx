import React from "react";
import { Button } from "@/components/ui/button";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : "应用加载失败",
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error("[AppErrorBoundary]", error, errorInfo);
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: "" });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-base font-semibold">页面加载失败</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            请重试一次；如果刚发布过新版本，重新加载通常就能恢复。
          </p>
          {this.state.errorMessage && (
            <p className="mt-2 break-words text-xs text-muted-foreground/80">
              {this.state.errorMessage}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => window.location.reload()}>
              重新加载
            </Button>
            <Button className="flex-1" variant="outline" onClick={() => (window.location.href = "/")}>
              返回首页
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
