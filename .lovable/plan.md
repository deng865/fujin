

# 修复：老款手机定位显示极慢

## 根因分析

当前 `LiveLocationBanner` 的 GPS 配置（第 148 行）：

```typescript
const geoOptions = { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 };
```

问题：
1. **`enableHighAccuracy: true`** — 强制使用 GPS 芯片获取精确坐标。老款手机 GPS 冷启动需要 30秒~几分钟来搜索卫星信号，在室内或信号弱时更慢
2. **`timeout: 10000`**（10秒）— 如果 GPS 芯片 10 秒内没锁定卫星，直接报错超时，不会降级到基站/WiFi 定位
3. **`maximumAge: 3000`**（3秒）— 只接受 3 秒内的缓存位置，过于严格。老款手机可能有稍旧但完全可用的缓存位置被丢弃
4. **`getCurrentPosition` 和 `watchPosition` 同时使用相同的严格参数** — 没有"先快后精"的降级策略

结果：老手机卡在等 GPS 精确定位，可能反复超时重试，用户看到自己的位置迟迟不出现。

## 修复方案："先快后精"两阶段定位

### 文件: `src/components/chat/LiveLocationBanner.tsx`

**阶段一：快速定位（立即显示）**
- `getCurrentPosition` 使用宽松参数：`enableHighAccuracy: false, maximumAge: 60000, timeout: 5000`
- 先用基站/WiFi 粗略定位，1-3 秒内就能拿到坐标，立即显示在地图上

**阶段二：持续高精度跟踪**
- `watchPosition` 保持 `enableHighAccuracy: true`，但增大 `maximumAge` 到 `10000`，`timeout` 到 `15000`
- GPS 芯片在后台慢慢锁定卫星后，坐标会自动更新变精确
- 用户不用干等，一开始就能看到自己的大致位置

### 具体改动

```typescript
// 阶段一：快速粗略定位
const fastOptions = { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 };

// 阶段二：持续精确跟踪
const preciseOptions = { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 };

navigator.geolocation.getCurrentPosition(
  (pos) => broadcastPosition({ ... }, true),
  handleGeoError,
  fastOptions,    // ← 改用宽松参数
);

watchIdRef.current = navigator.geolocation.watchPosition(
  handleGeoSuccess,
  handleGeoError,
  preciseOptions, // ← 放宽超时和缓存
);
```

## 只修改一个文件
- `src/components/chat/LiveLocationBanner.tsx` — 第 148-159 行

