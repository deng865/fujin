const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export default function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center text-xs text-destructive">
        支付功能尚未完成上线配置，暂时无法收取真实款项。
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-600">
        当前为测试模式，预览中的所有支付都不会产生真实扣款。
      </div>
    );
  }
  return null;
}
