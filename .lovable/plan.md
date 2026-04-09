

# Plan: Fix Location Terminology & Add Live Share Accept Flow

## Problem Summary

1. **"发送我的位置"** shows "共享位置" as fallback — should say "{name}的位置", because it's a one-way send, not a mutual share.
2. **"实时位置共享"** currently auto-starts for both parties when one sends it. It should require the other party to **accept** before mutual tracking begins. Either party can end it.

---

## Changes

### Step 1: Fix Static Location Label
**File**: `src/components/chat/LocationMessage.tsx`

Change fallback label from `"共享位置"` to `"位置信息"` (neutral, since it's one-way). Keep the `"{name}的位置"` display when senderName is available.

### Step 2: Add Accept/Reject to Live Location Message
**File**: `src/components/chat/LiveLocationMessage.tsx`

- Add `status` field to the live location data: `"pending"` | `"accepted"` | `"ended"`
- When the message is `pending` and `!isMe`, show an **"接受"** (Accept) button
- When `pending` and `isMe`, show "等待对方接受..." text
- When `accepted`, show current "点击查看" behavior
- When `ended`, show "位置共享已结束"
- Add `onAccept` callback prop

### Step 3: Update ChatRoom Live Share Flow
**File**: `src/pages/ChatRoom.tsx`

- When initiating live share, set message status to `"pending"` — do NOT start `LiveLocationBanner` yet
- Add `handleAcceptLiveShare` function:
  - Update the message content in DB to set `status: "accepted"`
  - Start `LiveLocationBanner` for both parties (receiver starts on accept; sender starts when they detect the status change via realtime)
- Listen for message updates: when a `live_location` message changes to `accepted`, the sender also starts their banner
- On stop (either party): update message status to `"ended"`, send a system notification message "实时位置共享已结束", broadcast stop event

### Step 4: Add End Notification Message
**File**: `src/pages/ChatRoom.tsx`

When either party ends live sharing (manual or expired):
- Insert a system message: `{ type: "system", text: "实时位置共享已结束" }`
- Update conversation's `last_message`
- Clean up banner and map state

### Step 5: Update LiveLocationBanner Stop Handler
**File**: `src/components/chat/LiveLocationBanner.tsx`

- The `onStop` callback already exists; ensure it propagates the reason back to ChatRoom
- ChatRoom's stop handler will handle the DB update and notification message

---

## Technical Details

**Message content schema change for live_location:**
```json
{
  "type": "live_location",
  "lat": 34.05,
  "lng": -118.25,
  "durationMinutes": 15,
  "sharedBy": "user-id",
  "status": "pending" | "accepted" | "ended"
}
```

**Accept flow:**
1. User A sends live_location message with `status: "pending"`
2. User B sees message with "接受" button
3. User B clicks accept → message content updated to `status: "accepted"` in DB
4. Both parties detect the accepted status (B immediately, A via realtime UPDATE) → both start `LiveLocationBanner`
5. Either party clicks end → message updated to `status: "ended"`, system message inserted, broadcast stop event

**Realtime subscription:** Need to listen for UPDATE events on the messages table (already have INSERT listener), specifically for `live_location` type messages changing status.

**Files to modify:**
- `src/components/chat/LocationMessage.tsx` — fix fallback label
- `src/components/chat/LiveLocationMessage.tsx` — add pending/accepted/ended states with accept button
- `src/pages/ChatRoom.tsx` — accept flow, stop notification, status tracking
- `src/components/chat/LiveLocationBanner.tsx` — minor: ensure clean stop callback

