

# Fix Plan: Live Location Sharing & Static Location Display

## Problem 1: Live Location — Other Party Always "Waiting"

**Root Cause**: Channel name mismatch.
- `LiveLocationBanner` (the broadcaster) uses channel: `live-loc-${conversationId}`
- `LiveLocationMap` (the viewer) listens on channel: `live-loc-map-${conversationId}`

They never communicate because they're on different Supabase Broadcast channels.

**Additionally**, the receiver auto-starts their own `LiveLocationBanner` broadcasting, but the `LiveLocationMap` also starts its own GPS watch internally — creating redundant position tracking that doesn't feed into the broadcast channel the map is listening on.

## Problem 2: Static Location — Should Show Sender Name + Location

**Current behavior**: The `LocationMessage` component shows only the address text (e.g. "共享位置" or a geocoded address). There is no sender name displayed.

**Expected**: Show the sender's username alongside the location, e.g. "张三的位置" in the card.

---

## Plan

### Step 1: Unify Broadcast Channel Names
**File**: `src/components/chat/LiveLocationMap.tsx`

Change the channel subscription from `live-loc-map-${conversationId}` to `live-loc-${conversationId}` so it matches what `LiveLocationBanner` broadcasts on. Also, the map component should broadcast its own position on the same channel (so both parties see each other), instead of only using a local GPS watch for the "my" marker.

### Step 2: Fix LiveLocationMap to Also Broadcast
**File**: `src/components/chat/LiveLocationMap.tsx`

The map's GPS `watchPosition` should broadcast coordinates to the shared channel (`live-loc-${conversationId}`) so the other party's map instance can receive them. Currently it only sets local state — the other party never sees these updates.

### Step 3: Add Sender Name to Static Location Message
**Files**: `src/components/chat/LocationMessage.tsx`, `src/pages/ChatRoom.tsx`

- Add a `senderName` prop to `LocationMessage`
- Display it in the card footer, e.g. "{senderName}的位置 · {address}"
- Pass the sender's name from `ChatRoom.tsx` when rendering the component (using the existing `otherName` or current user's name based on `isMe`)

### Step 4: Include sender name in location JSON payload
**File**: `src/pages/ChatRoom.tsx`

When sending a static location message, include the sender's display name in the JSON content so it can be displayed by the receiver without needing a separate profile lookup:
```json
{ "type": "location", "lat": ..., "lng": ..., "address": "...", "senderName": "张三" }
```

---

## Technical Details

**Channel unification** — Both `LiveLocationBanner` and `LiveLocationMap` will use `live-loc-${conversationId}`. The map will:
1. Subscribe to the channel
2. Broadcast its own GPS via `watchPosition` (same as Banner does)
3. Listen for the other party's broadcasts and update the green marker

This means when both parties have the map open, each broadcasts and each receives — achieving true bidirectional live tracking.

**Static location sender name** — The `LocationMessage` component will parse `senderName` from the JSON content and display it. For backward compatibility with older messages that lack this field, it will fall back to the passed `senderName` prop or generic text.

