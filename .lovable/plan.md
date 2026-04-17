

## 用户反馈分析

用户上传了 App 图标（地图+定位针+房子，符合"华人街坊"附近华人服务的定位），并提到：
1. App 名称是 **华人街坊**，图标是上传的这张图（不是默认图标）
2. 按上次方案操作后**仍然白屏**

需要解决两件事：
1. **设置 App 图标**：把上传的图标设置为 Xcode 项目的 AppIcon
2. **彻底修复白屏**：上次方案不奏效，需要换思路

## 重新诊断白屏根因

上次方案让用户用 `cat > ____App.swift` 写入 SwiftUI 代码，但**这个文件名 `____App.swift` 本身就是异常的**——正常 Xcode 创建的是 `华人街坊App.swift`。出现 4 条下划线说明：
- Xcode 在文件系统层把中文项目名转义成了下划线
- 但 Xcode 项目内部 (`.xcodeproj`) 引用的可能是 `华人街坊App.swift`（不存在）或 `____App.swift`（存在但 struct 名不匹配）

更可能的根因：**Xcode 项目里 Swift 文件的引用是红色的（文件丢失），或者 struct 名不匹配 `@main` 入口**。即使文件被覆盖，Xcode 也可能因为 target membership 没勾选而不编译它。

另一个可能性：用户的 dist 文件夹拖进 Xcode 时**没有勾选 "Copy items if needed" 或没加入 target**，导致 `Bundle.main.url(forResource: "index")` 返回 nil，回退到 fujin.life，但 fujin.life 在 WKWebView 里因 CORS/Service Worker/某个 JS 报错白屏。

## 新方案（彻底重做，最简路径）

放弃修补现有损坏的项目，**让用户在 Xcode 里删掉旧文件、新建干净的 Swift 文件**，全程在 Xcode GUI 里完成（用户对终端不熟悉，命令行容易出错）。

```text
┌─────────────────────────────────────────┐
│  Xcode 项目导航栏                        │
│  ├─ 华人街坊                             │
│  │  ├─ HuaRenApp.swift   (新建，干净)    │
│  │  ├─ ContentView.swift (新建，干净)    │
│  │  ├─ Assets.xcassets   (放新图标)      │
│  │  └─ Info.plist                        │
└─────────────────────────────────────────┘
```

## 实施步骤（用户在 Xcode 里手动操作）

### A. 设置 App 图标（5 步）

1. 把上传的图标保存到桌面，命名 `icon.png`
2. 打开 Xcode → 左侧点 `Assets.xcassets` → 选中 `AppIcon`
3. 把 `icon.png` 拖到 "1024x1024" 那个空槽位
4. 改 App 显示名：项目设置 → General → Display Name 改为 "华人街坊"
5. Clean Build Folder（Shift+Cmd+K）

### B. 彻底重建 Swift 文件（解决白屏）

1. **删除**导航栏里的 `____App.swift` 和 `ContentView.swift`（右键 → Delete → Move to Trash）
2. **新建** Swift 文件：File → New → File → Swift File → 命名 `HuaRenApp.swift`
3. 粘贴干净的 App 入口代码
4. 同样新建 `ContentView.swift`
5. 粘贴 WebView 代码（直接在线模式加载 fujin.life，避开离线 dist 复杂度）
6. 确保两个新文件的 **Target Membership 勾选了"华人街坊"**（右侧检查器最下方）

### C. 在线模式优先（跳过 dist 离线包）

把所有 dist 相关文件先从 Xcode 移除（Remove Reference），只保留纯在线 WebView 加载 `https://fujin.life`。在线跑通后再考虑离线。

## 提供给用户的 Swift 代码

**HuaRenApp.swift**：
```swift
import SwiftUI

@main
struct HuaRenApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
```

**ContentView.swift**：
```swift
import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        WebView().ignoresSafeArea()
    }
}

struct WebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let web = WKWebView(frame: .zero, configuration: config)
        web.load(URLRequest(url: URL(string: "https://fujin.life")!))
        return web
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
```

## Lovable 项目代码

整个修复在 Mac 本地 Xcode 完成，**Lovable 前端代码 0 改动**。

## 完成后请反馈

- ✅ 图标变成你上传的、能打开看到 fujin.life
- ❌ 还是白屏 → 截 **Xcode 控制台底部** 完整报错
- ⚠️ 图标对了但还白屏 → 说明 WebView 配置问题，单独解决

