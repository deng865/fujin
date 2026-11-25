# 华人街坊 Apple App Store 提审清单

## 已固定在工程中的信息

- App 名称：华人街坊
- Bundle ID：`life.fujin.app`
- 版本：1.0（Build 1）
- 年龄分级：17+
- 运营主体：Shuwen LLC
- 联系邮箱：tao@shuwenllc.com
- 主网站：https://huaren168.online
- 隐私政策：https://huaren168.online/privacy-policy
- 服务条款：https://huaren168.online/terms-of-service
- 不使用广告追踪，不弹 ATT。

## 支付分工

- 网页端：保留现有 Stripe 信用卡及其他已启用支付方式。
- iOS 原生端：发帖、会员、推广等数字权益只显示 Apple 应用内购买，不显示 Stripe、微信支付或外部充值引导。
- 服务器通过 App Store Server API 获取并验证苹果签名交易，核对 Bundle ID、当前用户 UUID、商品 ID、交易 ID 和撤销状态后才发权益。
- 同一 Apple 交易 ID 只能入账一次；购买时保存权益快照，后台以后改价或改套餐不覆盖旧订单。

## 需要创建的 Apple 内购商品

当前后台只有一个启用套餐：

| 项目 | 值 |
|---|---|
| 商品 ID | `life.fujin.app.number1` |
| 类型 | 消耗型项目 |
| 参考名称 | 基础套餐 |
| 价格 | USD 4.99（在 App Store Connect 选择对应价格点） |
| 权益 | 30 天内 1 次发布额度 |
| 审核截图 | 商品创建后，先用沙盒账号完成一次购买并截图 |

App Store Connect 路径：我的 App → 华人街坊 → 功能 → App 内购买项目 → 创建。商品 ID 必须完全一致，不要加空格。商品需要填写各语言显示名称、描述和审核截图，并随 App 一起提交审核。

以后新增后台套餐时，商品 ID 规则是 `life.fujin.app.` + 后台 `plan_key`。限时无限发布类套餐应在苹果后台选择与实际服务期限相符的非续期订阅类型，并同步测试；不要擅自把现有套餐改成自动续费。

## 苹果服务器验证所需资料

在安全表单中填写，不要把私钥发到聊天或提交到 Git：

1. `APPLE_APP_STORE_PRIVATE_KEY`：用记事本或文本编辑打开 `.p8`，复制 BEGIN 到 END 的全部内容。
2. `APPLE_APP_STORE_KEY_ID`：`AuthKey_XXXXXXXXXX.p8` 文件名中后一段 10 位字符，也可在 App Store Connect API 密钥列表查看。
3. `APPLE_APP_STORE_ISSUER_ID`：App Store Connect → 用户和访问 → 集成 → App Store Connect API 页面顶部。
4. `APPLE_APP_STORE_APP_ID`：我的 App → 华人街坊 → App 信息中的数字 Apple ID，不是 Bundle ID。

密钥路径：App Store Connect → 用户和访问 → 集成 → App Store Connect API → 团队密钥。没有权限时请让账户持有人或管理员创建。

## Apple 登录

- 登录按钮使用 Apple 官方素材、黑色背景、白色图标和标题 `Sign in with Apple`。
- 原生 iOS 使用系统 Apple 登录面板，再将身份令牌交给登录服务；网页使用原来的 Apple OAuth。
- Xcode 工程已包含 Sign in with Apple entitlement。打开 Xcode 后仍应在 Signing & Capabilities 中确认团队、签名和该能力均显示正常。
- 必须在真机和 TestFlight 各测一次。若登录服务拒绝原生令牌，需要在 Apple 登录设置中把 `life.fujin.app` 加入允许的 Client IDs；使用自己的 Apple 凭证时，还要配置 Services ID、回调网址和 6 个月有效的客户端密钥。
- 原生版只显示 Apple 和邮箱登录，避免未配置的原生 Google 登录成为死按钮；网页仍保留 Google。

## 权限和隐私

iOS `Info.plist` 已写明：

- 使用期间定位：附近商家、司机、房屋、招聘和服务距离。
- 后台定位：仅移动商家主动上线或聊天实时共享开启时。
- 麦克风：语音消息和用户主动发起的语音通话。
- 相机：帖子、头像、聊天和举报拍照。
- 相册：仅上传用户主动选择的图片；保存图片仅在用户主动操作时。

App Privacy 除原有数据外，应补充：

- Purchases / Purchase History：关联用户，用于 App 功能和防止重复入账。
- Payment Info 不要勾选“由我们收集完整银行卡号”；银行卡由 Stripe 或 Apple 处理。按苹果问卷实际定义如实回答。
- 仍然不勾选 Tracking。

后台定位属于本次既有需求。审核时提供真机演示视频，展示“移动商家上线/聊天开启共享 → 锁屏或切后台 → 对方看到位置 → 收工/结束共享后停止”。如果首发版本不提交后台定位能力，必须同时移除相关描述和后台行为，不能只靠隐藏界面。

## 原生工程与打包

工程已经包含 `ios/` 和 `android/`、品牌图标、启动屏及权限说明。任何原生能力修改后，先更新本地代码，再执行 `npx cap sync`。

在 Mac 上：

1. 从项目连接的 GitHub 仓库下载最新代码。
2. 运行 `npm install`。
3. 运行 `npm run build`。
4. 运行 `npx cap sync ios`；安卓需要时运行 `npx cap sync android`。
5. 运行 `npx cap open ios`，在 Xcode 选择 Shuwen LLC 对应开发团队和自动签名。
6. 确认 Bundle ID 为 `life.fujin.app`，版本 1.0、Build 1，Sign in with Apple 能力存在。
7. 用真机检查登录、发帖、聊天、定位、语音、相机、内购和注销。
8. Product → Archive → Distribute App → App Store Connect → Upload。

热更新地址只在显式设置 `CAPACITOR_LIVE_RELOAD=true` 时启用；正式 Archive 默认打包本地网页，不加载预览地址。

## 提审资料

- 6.9 英寸和 6.5 英寸 iPhone 截图：首页附近列表、服务详情、聊天、行程、个人中心、苹果内购。
- 审核账号：在 App Store Connect 的 App 审查信息中提供一个专用、长期有效、无需验证码的演示邮箱和密码；不要使用自己的私人账号，也不要把密码提交到代码仓库。
- 审核备注：说明附近服务列表、用户发帖、聊天举报/屏蔽、移动商家定位、Apple 内购和账号注销路径。
- 注销路径：我的 → 隐私设置 → 注销账号 → 确认注销。原生 Apple 登录用户注销后还会看到 Disconnect Apple，用于撤销 Apple 授权。
- 举报路径：帖子/聊天中的举报与屏蔽入口。
- 联系邮箱：tao@shuwenllc.com。
- 年龄分级：17+，原因包括用户生成内容、附近社交和私聊。

## 必须实测、不能仅凭代码确认的项目

- App Store Connect 商品尚未创建，沙盒和正式内购尚未扣款验证。
- 苹果服务器 API 密钥需要用户填入后才能验证真实交易。
- 原生 Apple 登录需要真机/TestFlight 验证。
- 注销需要在专用演示账号上测试，不要在商家主账号上测试。
- 需要 macOS/Xcode 完成签名、Archive 和上传；当前环境不能替代这些步骤。
- 后台定位需真实双设备演示，并准备审核视频。
