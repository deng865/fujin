

# Fix: Live Location Map Shows Wrong Position

## Problem

The `LiveLocationMap` component initializes the map with a **hardcoded default center** of Los Angeles (`-118.25, 34.05`) because the map init effect runs with `[]` deps — before any GPS data arrives. The markers also start at this wrong position. When the real GPS coordinates arrive later, the map never re-centers to the actual location.

## Root Cause

In `LiveLocationMap.tsx` line 91:
```typescript
const center = myPos || { lng: -118.25, lat: 34.05 };
```
Since the map effect has `[]` deps (line 121), `myPos` is always `null` at init time, so it always falls back to LA.

Additionally, markers are placed at this wrong default position immediately (lines 104-106, 112-114), and the "other" marker is visible at the wrong spot even before any data arrives.

## Plan

### Step 1: Defer map initialization until GPS is available
**File**: `src/components/chat/LiveLocationMap.tsx`

- Change the map init effect to depend on `myPos` being available (only init once, using a ref flag to prevent re-init)
- Use the actual GPS coordinates as the initial map center
- Only add the "my" marker once we have real coordinates
- Only add/show the "other" marker when `otherPos` arrives (don't place it at default coords)

### Step 2: Fly to actual position on first GPS fix
- When `myPos` first becomes non-null and the map is already initialized, call `map.flyTo()` to smoothly center on the real position
- When `otherPos` first arrives, fit bounds to show both markers

### Step 3: Hide "other" marker until data arrives
- Don't create the other marker at init time at the default position
- Create it lazily when `otherPos` first becomes non-null, so it doesn't show at a wrong location

## Technical Details

The key change is splitting marker creation from map creation:
1. **Map init**: Wait for first `myPos` GPS fix, then create map centered on real coords + add blue marker
2. **Other marker**: Create green marker only when `otherPos` first arrives
3. **Ref guard**: Use `mapInitedRef` to ensure the map is only created once despite `myPos` updates

This eliminates the hardcoded LA fallback and ensures markers only appear at real positions.

