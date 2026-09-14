# 添加支付系统：发帖收费 + 信用卡/PayPal

## 背景与支付提供商选择

- 业务模式：华人社区信息平台，用户为「发布信息」付费，平台仅展示联系方式、不撮合交易。
- 收款主体：美国（USA）。
- Lovable 内置支付评估结果：**推荐 Stripe 内置支付**；由于本应用属于用户可发布本地服务/商品的分类信息平台（marketplace 形态），Paddle 自动开户不符合其政策，因此不建议启用 Paddle（Paddle 的 PayPal 通道也随之不可用）。
- **信用卡**：通过 Lovable 内置 Stripe 直接支持，无需自有 Stripe 账户。
- **PayPal**：内置 Stripe/Paddle 均不直接提供，需要额外走「自带 PayPal 账户 + 自定义集成」路线；本计划把 PayPal 列为第二阶段可选扩展，第一阶段先上线信用卡支付。

## 收费方案建议

针对「发布信息收费」模式，建议采用「基础发帖费 + 增值服务」组合：

| 项目 | 价格（USD） | 说明 |
|------|------------|------|
| 普通发帖 | $1.99/条 | 有效期 30 天，到期可续费 |
| 置顶 7 天 | $4.99/条 | 在列表/地图结果中优先展示 |
| 刷新一次 | $0.99/次 | 让帖子回到时间线顶部 |
| 商家月卡 | $9.99/月 | 30 天内无限发帖，适合司机、美甲、家政等移动商家 |
| 季度商家卡 | $24.99/季 | 相当于 8.3 折，鼓励长期留存 |

> 备注：上线初期建议先用 $0.99 普通发帖做冷启动，验证转化率后再调到 $1.99。

## 第一阶段：信用卡支付（Lovable 内置 Stripe）

### 1. 启用 Stripe 内置支付

- 调用 `enable_stripe_payments` 开通测试环境。
- 默认使用 **Stripe full compliance handling**：Stripe 作为 merchant of record 处理 ~80 个国家的税务、风控、争议、交易级客服，每笔 +3.5%（可在后续按交易关闭）。
- 创建测试产品：
  - `普通发帖`
  - `置顶 7 天`
  - `刷新一次`
  - `商家月卡`
  - `季度商家卡`

### 2. 数据库改造

- 扩展现有 `public.payments` 表：
  - 增加 `product_id text`、`package_type text`（`single_post`、`boost_7d`、`bump`、`merchant_monthly`、`merchant_quarterly`）。
  - 增加 `metadata jsonb` 存储关联 post_id、生效时间等。
  - 增加 `expires_at timestamptz` 用于月卡/置顶到期。
- 新增 `public.user_credits` 表：
  - `user_id`、`post_credits integer`、`bump_credits integer`、`boost_expires_at timestamptz`、`merchant_expires_at timestamptz`。
  - 用于月卡/套餐的额度管理。
- 为 `posts` 表增加：
  - `is_boosted boolean`、`boost_expires_at timestamptz`、`bumped_at timestamptz`，用于置顶/刷新排序。
- 所有新表补充 GRANT + RLS 策略。

### 3. 购买入口与结账流程

- 新增页面 `/pricing`：展示 5 个套餐卡片，突出「商家月卡」推荐。
- 在「我的发布」和「创建帖子」页面增加「余额不足，去购买」入口。
- 点击购买后调用 Stripe Checkout（Lovable 内置函数），传入：
  - `priceId`
  - `metadata`（user_id、package_type）
- 支付成功后通过 webhook（Lovable Cloud Edge Function）更新 `payments.payment_status = completed` 并给用户加 credits。

### 4. 发帖流程与支付校验

- 用户点击「发布」时：
  - 若用户有 `post_credits > 0` 或处于 `merchant_expires_at` 有效期内，直接扣除额度并发布。
  - 否则跳转 `/pricing` 提示购买。
- 帖子默认 `is_visible = false`（保持现有审核逻辑），支付成功后由管理员审核通过即上线。

### 5. 支付状态与历史

- 在「我的」页面新增「我的订单」入口，展示 `payments` 表记录。
- 支持支付失败重试、退款申请入口（先提交到 `reports` 或新建 `refund_requests` 表）。

## 第二阶段：PayPal 自定义集成（可选）

- 由于 Paddle 不可用，PayPal 需走 BYOK（Bring Your Own Key）模式：
  - 用户自行注册 PayPal Business 账户并获取 Client ID / Secret。
  - 通过 `add_secret` 保存到 Lovable Cloud。
  - 新建 Edge Function `paypal-create-order` 创建订单，前端调用 PayPal SDK 完成支付。
  - 再建 Edge Function `paypal-capture-order` 捕获付款并写入 `payments` 表。
- 建议：等信用卡支付跑通、有稳定收入后再接入 PayPal，避免同时维护两套支付系统。

## 第三阶段：运营与合规

- 更新《隐私政策》和《服务条款》：
  - 增加「付费服务、自动续费、退款政策」章节。
  - 明确平台只收信息发布费，交易纠纷由用户自行解决。
- 在 App Store / Google Play 的 Data Safety / Privacy Nutrition Label 中增加「购买历史」数据类型。
- 设置后台：管理员可查看订单、手动退款、赠送额度。

## 预期结果

- 用户可用信用卡购买发帖额度/月卡/置顶/刷新。
- 发帖前自动校验额度，无额度则引导购买。
- 商家月卡用户 30 天内发帖不再逐条扣费。
- 支付记录、额度余额、订单历史可在 App 内查看。
