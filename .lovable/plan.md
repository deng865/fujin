

# 添加隐私政策与服务条款页面（应用商店合规）

## 背景

Google Play 和 Apple App Store 上架均要求应用提供可访问的隐私政策和服务条款页面。当前项目没有这两个页面，Auth 页面的"登录即表示同意"文字也没有链接。

## 改动

### 1. 新建两个页面

**`src/pages/PrivacyPolicy.tsx`** — 隐私政策页面，内容涵盖：
- 收集的信息（账号信息、位置数据、设备 ID、聊天记录）
- 信息用途（提供服务、定位附近服务、安全保障）
- 信息共享与披露
- 数据存储与安全
- 用户权利（访问、修改、删除账号）
- Cookie 与本地存储
- 儿童隐私（不面向13岁以下）
- 联系方式
- 政策更新

**`src/pages/TermsOfService.tsx`** — 服务条款页面，内容涵盖：
- 服务描述（华人社区本地化服务平台）
- 用户账号与责任
- 禁止行为（欺诈、敏感词相关内容）
- 用户发布内容的权利与义务
- 免责声明与责任限制
- 帐号终止
- 适用法律
- 联系方式

两个页面使用简洁的排版，支持中文内容，顶部有返回按钮。

### 2. 注册路由（`src/App.tsx`）

新增两条路由：
```
/privacy-policy → PrivacyPolicy
/terms-of-service → TermsOfService
```
放在 `AppLayout` 路由组内。

### 3. Auth 页面增加链接（`src/pages/Auth.tsx`）

将第 337 行的纯文本改为带链接的版本：

```tsx
<p className="text-center text-xs text-muted-foreground">
  登录即表示同意我们的
  <Link to="/terms-of-service" className="underline">服务条款</Link>
  和
  <Link to="/privacy-policy" className="underline">隐私政策</Link>
</p>
```

### 4. Profile 页面增加入口（`src/components/profile/PrivacySettings.tsx`）

在隐私设置面板底部添加两个链接按钮，方便用户随时查阅隐私政策和服务条款。

## 涉及文件

| 文件 | 操作 |
|------|------|
| `src/pages/PrivacyPolicy.tsx` | 新建 |
| `src/pages/TermsOfService.tsx` | 新建 |
| `src/App.tsx` | 添加路由 |
| `src/pages/Auth.tsx` | 文本改为链接 |
| `src/components/profile/PrivacySettings.tsx` | 底部增加链接入口 |

