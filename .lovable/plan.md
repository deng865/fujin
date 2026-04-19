

## 上架合规检查计划

逐项核对 iOS App Store 与 Google Play 上架所需的隐私/权限合规要求，并对照现有隐私政策与服务条款，给出修订方案。

### 一、需要检查的核心权限

应用实际使用的敏感权限（基于代码功能）：
1. **位置（前台 + 可能后台）** — 地图定位、附近商家、移动商家实时位置上报、聊天实时位置共享
2. **麦克风** — 语音消息、语音通话（LiveKit）
3. **相机** — 拍照发布帖子
4. **相册/照片库** — 选择图片/视频上传
5. **通知** — 来电、消息、行程状态
6. **设备标识符（Device ID）** — 防刷去重

### 二、调查步骤（READ-ONLY）

1. 通读 `src/pages/PrivacyPolicy.tsx` 与 `src/pages/TermsOfService.tsx` 现有条款
2. 查看 iOS Info.plist / Capacitor 配置（如有），确认 Usage Description 字符串
3. 检查 `index.html` 与 PWA manifest 的权限声明
4. 检查 Google Play Data Safety 必需披露：第三方 SDK（Mapbox、Cloudflare R2、LiveKit、Supabase）的数据传输
5. 核对儿童隐私（COPPA）条款与年龄分级
6. 核对账号注销流程（Apple 强制要求 App 内注销）

### 三、预期发现与修订方向

**隐私政策当前缺失 / 需补充：**
- ❌ **后台位置使用说明**（移动商家上报、实时共享）— Apple/Google 强制要求明确"为何在后台收集位置"
- ❌ **麦克风用途单独说明**（语音消息 vs 语音通话）
- ❌ **相机/相册用途单独说明**
- ❌ **通知用途**（来电、新消息、行程更新）
- ❌ **第三方 SDK 数据共享清单**：Mapbox（位置）、Cloudflare R2（媒体）、LiveKit（音视频）、Supabase（账号/数据）、Google/Apple OAuth
- ❌ **数据保留期限**（聊天消息、位置历史、账号数据）
- ❌ **跨境数据传输**（数据存储在美国）
- ❌ **加州 CCPA / 欧盟 GDPR 用户权利说明**（Do Not Sell、数据可携带、申诉渠道）
- ❌ **App 内账号注销入口指引**（Apple App Store Guideline 5.1.1(v) 强制）
- ❌ **设备标识符收集说明**

**服务条款当前缺失 / 需补充：**
- ❌ **年龄要求**（13+ 或 17+，与 App Store 分级一致）
- ❌ **用户生成内容（UGC）反滥用机制**（Apple 1.2 强制：内容过滤、举报、屏蔽用户、24h 处理违规）
- ❌ **EULA 标准条款**（Apple 要求 App Store Standard EULA 或自定义且不弱于其要求）
- ❌ **支付/虚拟商品条款**（如有）
- ❌ **司机/移动服务的免责加强**（线下交易风险、不保证背景调查）
- ❌ **位置共享的用户同意与撤回机制**

### 四、产出物

1. **合规体检报告**（清单式，标注严重程度：阻断 / 建议）
2. **重写后的隐私政策**（中英双语，按 Apple/Google 要求结构化分节）
3. **重写后的服务条款**（中英双语，加入 UGC、EULA、年龄、举报机制）
4. **App Store Privacy Nutrition Label 数据**（你提交时填写用，按数据类别列出）
5. **Google Play Data Safety 表单数据**（同上）
6. **Info.plist Usage Description 推荐文案**（中英）
7. **App 内必备入口检查表**：账号注销、举报、屏蔽、隐私设置、撤回位置/通知权限指引

### 五、涉及文件（实施阶段）

- `src/pages/PrivacyPolicy.tsx` — 完整重写
- `src/pages/TermsOfService.tsx` — 完整重写
- `ios/App/App/Info.plist`（如已 Capacitor 化）— 添加/修订 Usage Description
- 可能新增 `src/pages/DataSafety.tsx` 或合并入隐私政策
- `mem://compliance/app-store-readiness` — 新建合规策略 memory

### 六、需确认事项

1. App 是否需要后台位置（移动商家长时间上报）？这会触发 Apple "Always" 权限审核
2. 最低年龄设定 13 还是 17（含 UGC 通常建议 17+）
3. 是否对欧盟 / 加州用户开放？（决定是否需要 GDPR / CCPA 完整披露）
4. 是否计划接入 App Tracking Transparency（iOS 14.5+）？

