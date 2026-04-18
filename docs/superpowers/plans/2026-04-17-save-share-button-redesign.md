# Save / Share Button Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the iOS save/share button so the tap feels instant, the "Saved" state is tappable to unsave, and every save offers a Mail-style iOS toast with a Share follow-up.

**Architecture:** Local-state-authoritative button (synchronous UI flip, background Convex mutation). A new app-wide Mail-style `Toast` provider mounted at root. Every save fires the toast; tapping its Share action opens the native iOS share sheet. The existing `useEventSaveActions` hook becomes the coordination layer.

**Tech Stack:** React Native 0.83, Expo 55, Expo Router, Convex, react-native-reanimated v4, react-native-gesture-handler, expo-haptics, expo-blur, react-native-safe-area-context, posthog-react-native.

**Testing note:** The Expo app has no unit test infrastructure (only Maestro e2e). Each task uses **manual verification** — run the app in the iOS simulator and confirm behavior. Commits happen after manual verification passes.

---

## File Structure

**Create:**
- `apps/expo/src/components/Toast/Toast.tsx` — visual Mail-style banner component
- `apps/expo/src/components/Toast/ToastProvider.tsx` — context + provider + `useToast` hook
- `apps/expo/src/components/Toast/index.ts` — exports

**Modify:**
- `apps/expo/src/components/SaveButton.tsx` — rewrite in place (new visual + behavior)
- `apps/expo/src/hooks/useEventActions.ts` — refactor `useEventSaveActions` export
- `apps/expo/src/app/_layout.tsx` — mount `ToastProvider` in the provider stack
- `apps/expo/src/app/(tabs)/discover.tsx` — swap `SaveShareButton` for owner-aware render
- `apps/expo/src/app/[username]/index.tsx` — same swap
- `apps/expo/src/app/event/[id]/index.tsx` — use new `SaveButton` for non-owners
- `apps/expo/src/components/UserEventsList.tsx` — replace inline save/saved/share logic

**Delete:**
- `apps/expo/src/components/SaveShareButton.tsx`

---

## Task 1: Create `ToastProvider` context and hook (no UI yet)

**Files:**
- Create: `apps/expo/src/components/Toast/ToastProvider.tsx`

- [ ] **Step 1: Create the context, types, and provider file**

Write the full file:

```tsx
// apps/expo/src/components/Toast/ToastProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastVariant = "success" | "error";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  message: string;
  action?: ToastAction;
  duration?: number; // ms, default 4000
  variant?: ToastVariant; // default "success"
}

export interface ActiveToast extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  current: ActiveToast | null;
  show: (options: ToastOptions) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ActiveToast | null>(null);
  const idRef = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    idRef.current += 1;
    setCurrent({ id: idRef.current, ...options });
  }, []);

  const dismiss = useCallback(() => {
    setCurrent(null);
  }, []);

  const value = useMemo(
    () => ({ current, show, dismiss }),
    [current, show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
```

- [ ] **Step 2: Verify the file typechecks**

Run: `pnpm -F @soonlist/expo check` (or whatever the `check` script is; fallback: `pnpm tsc --noEmit` from `apps/expo/`)

Expected: no type errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add apps/expo/src/components/Toast/ToastProvider.tsx
git commit -m "feat(expo): add Toast context and useToast hook"
```

---

## Task 2: Create the Toast visual component

**Files:**
- Create: `apps/expo/src/components/Toast/Toast.tsx`

- [ ] **Step 1: Write the Toast component**

Write the full file. This is the Mail-style banner: blur background, system green/red check, body text, blue action text. Uses Reanimated for slide-up, GestureDetector for swipe-down, `useSafeAreaInsets` for positioning, auto-dismiss timer, route-change dismissal via Expo Router's `usePathname`, and AppState listener for backgrounding.

```tsx
// apps/expo/src/components/Toast/Toast.tsx
import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ActiveToast } from "./ToastProvider";

interface ToastProps {
  toast: ActiveToast;
  onDismiss: () => void;
}

const DEFAULT_DURATION = 4000;

export function Toast({ toast, onDismiss }: ToastProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);
  const pathnameAtMountRef = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const duration = toast.duration ?? DEFAULT_DURATION;
  const variant = toast.variant ?? "success";

  // Animate in on mount / toast change; reset on toast.id change.
  useEffect(() => {
    pathnameAtMountRef.current = pathname;
    translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 200 });

    // Announce to VoiceOver
    AccessibilityInfo.announceForAccessibility(toast.message);

    // Auto-dismiss timer
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      runDismiss();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  // Dismiss on route change
  useEffect(() => {
    if (pathname !== pathnameAtMountRef.current) {
      runDismiss();
    }
  }, [pathname]);

  // Dismiss on app backgrounding
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        runDismiss();
      }
    });
    return () => sub.remove();
  }, []);

  const runDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    translateY.value = withTiming(120, { duration: 180 });
    opacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 40) {
        runOnJS(runDismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const checkColor = variant === "success" ? "#34C759" : "#FF3B30";

  const handleActionPress = () => {
    toast.action?.onPress();
    runDismiss();
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { bottom: insets.bottom + 72 },
        containerStyle,
      ]}
      accessibilityLiveRegion="polite"
    >
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.shadowHost}>
          <BlurView intensity={60} tint="light" style={styles.blur}>
            <View style={[styles.check, { backgroundColor: checkColor }]}>
              <Text style={styles.checkGlyph}>
                {variant === "success" ? "✓" : "✕"}
              </Text>
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.action && (
              <Pressable
                onPress={handleActionPress}
                accessibilityRole="button"
                accessibilityLabel={toast.action.label}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.actionLabel}>{toast.action.label}</Text>
              </Pressable>
            )}
          </BlurView>
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 9999,
  },
  shadowHost: {
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 6,
    overflow: "hidden",
    backgroundColor: "rgba(242, 242, 247, 0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  blur: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkGlyph: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: "#1C1C1E",
    fontWeight: "500",
    letterSpacing: -0.13,
  },
  actionLabel: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "600",
    letterSpacing: -0.13,
  },
});
```

- [ ] **Step 2: Verify the file typechecks**

Run: `pnpm -F @soonlist/expo check` (or `pnpm tsc --noEmit` from `apps/expo/`).

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/expo/src/components/Toast/Toast.tsx
git commit -m "feat(expo): add Mail-style Toast component"
```

---

## Task 3: Wire the Toast renderer into the provider + export

**Files:**
- Modify: `apps/expo/src/components/Toast/ToastProvider.tsx`
- Create: `apps/expo/src/components/Toast/index.ts`

- [ ] **Step 1: Update `ToastProvider.tsx` to render the Toast component**

Replace the `ToastProvider` function body so it renders the current toast. Change the return of `ToastProvider` from:

```tsx
return (
  <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
);
```

to:

```tsx
return (
  <ToastContext.Provider value={value}>
    {children}
    {current && <Toast toast={current} onDismiss={dismiss} />}
  </ToastContext.Provider>
);
```

And add the import at the top of the file, below the existing React import:

```tsx
import { Toast } from "./Toast";
```

- [ ] **Step 2: Create the barrel export**

Create `apps/expo/src/components/Toast/index.ts`:

```ts
export { ToastProvider, useToast } from "./ToastProvider";
export type { ToastOptions, ToastVariant, ToastAction } from "./ToastProvider";
```

- [ ] **Step 3: Verify types**

Run: `pnpm tsc --noEmit` from `apps/expo/`.

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/components/Toast/ToastProvider.tsx apps/expo/src/components/Toast/index.ts
git commit -m "feat(expo): wire Toast rendering into provider"
```

---

## Task 4: Mount `ToastProvider` in the root layout

**Files:**
- Modify: `apps/expo/src/app/_layout.tsx` (line 156–177 area, provider stack)

- [ ] **Step 1: Add the import**

At the top of `apps/expo/src/app/_layout.tsx`, add:

```tsx
import { ToastProvider } from "~/components/Toast";
```

- [ ] **Step 2: Wrap the inner content with `ToastProvider`**

Locate the provider stack (around lines 156–199). The innermost content is `<RootLayoutContent />` nested inside `RevenueCatProvider`. Wrap `RootLayoutContent` with `ToastProvider`.

Find:

```tsx
<RevenueCatProvider>
  <AuthAndTokenSync />
  <RootLayoutContent />
</RevenueCatProvider>
```

Replace with:

```tsx
<RevenueCatProvider>
  <AuthAndTokenSync />
  <ToastProvider>
    <RootLayoutContent />
  </ToastProvider>
</RevenueCatProvider>
```

Rationale: the toast must live inside `GestureHandlerRootView` (it already does — that's the outermost), inside `SafeAreaProvider` (RNSafeAreaContext is already wrapping via `NotifierWrapper`'s tree), and inside any auth/data providers so it can react to state changes. Placing it directly around `RootLayoutContent` means every route has access.

- [ ] **Step 3: Manually verify the app still boots**

Run the app: `pnpm dev:expo` (from repo root) or `pnpm -F @soonlist/expo dev`.

Open the iOS simulator. Expected: app loads to its normal starting screen. No errors in Metro logs or on device. No visible change yet (nothing calls `useToast` anywhere).

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/app/_layout.tsx
git commit -m "feat(expo): mount ToastProvider in root layout"
```

---

## Task 5: Refactor `useEventSaveActions` hook

**Files:**
- Modify: `apps/expo/src/hooks/useEventActions.ts` (the `useEventSaveActions` export, lines 308–401)

- [ ] **Step 1: Confirm current imports in the file**

Open `apps/expo/src/hooks/useEventActions.ts`. Confirm these imports exist (add any missing):

```tsx
import { Share } from "react-native";
import * as Haptics from "expo-haptics";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { usePostHog } from "posthog-react-native";
import { api } from "@soonlist/backend/convex/_generated/api";
```

Also add:

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "~/components/Toast";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";
```

(Most of these are already imported — only add what's missing.)

- [ ] **Step 2: Replace the `useEventSaveActions` function**

Replace the entire `useEventSaveActions` export (lines 308–401) with this new implementation:

```tsx
export function useEventSaveActions(
  eventId: string,
  initialIsSaved: boolean,
  options: { source?: string; demoMode?: boolean } = {},
) {
  const { source = "unknown", demoMode = false } = options;
  const { user } = useUser();
  const posthog = usePostHog();
  const toast = useToast();

  // Local state owns the UI. Seeded from prop. Updated synchronously on toggle.
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);

  // If the parent prop changes (e.g., query refetch) and no mutation is in flight,
  // sync the local state to match.
  useEffect(() => {
    if (!pendingRef.current) {
      setIsSaved(initialIsSaved);
    }
  }, [initialIsSaved]);

  const followEventMutation = useMutation(
    api.events.follow,
  ).withOptimisticUpdate((localStore, args) => {
    const { id } = args;
    if (!user?.username) return;
    const currentSavedIds = localStore.getQuery(
      api.events.getSavedIdsForUser,
      { userName: user.username },
    );
    if (currentSavedIds !== undefined) {
      const updatedSavedIds = [...currentSavedIds, { id }];
      localStore.setQuery(
        api.events.getSavedIdsForUser,
        { userName: user.username },
        updatedSavedIds,
      );
    }
  });

  const unfollowEventMutation = useMutation(
    api.events.unfollow,
  ).withOptimisticUpdate((localStore, args) => {
    const { id } = args;
    if (!user?.username) return;
    const currentSavedIds = localStore.getQuery(
      api.events.getSavedIdsForUser,
      { userName: user.username },
    );
    if (currentSavedIds !== undefined) {
      const updatedSavedIds = currentSavedIds.filter(
        (savedEvent) => savedEvent.id !== id,
      );
      localStore.setQuery(
        api.events.getSavedIdsForUser,
        { userName: user.username },
        updatedSavedIds,
      );
    }
  });

  const openShareSheet = useCallback(
    async (via: "save_toast" | "event_detail" | "event_card") => {
      try {
        posthog.capture("share_event_initiated", {
          event_id: eventId,
          source,
          is_saved: true,
          via,
        });

        const result = await Share.share({
          url: `${Config.apiBaseUrl}/event/${eventId}`,
        });

        if (result.action === Share.sharedAction) {
          posthog.capture("share_event_completed", {
            event_id: eventId,
            source,
            is_saved: true,
            via,
          });
        } else if (result.action === Share.dismissedAction) {
          posthog.capture("share_event_dismissed", {
            event_id: eventId,
            source,
            is_saved: true,
            via,
          });
        }
      } catch (error) {
        posthog.capture("share_event_error", {
          event_id: eventId,
          source,
          via,
          error_message: (error as Error).message,
        });
        logError("Error sharing event", error);
      }
    },
    [eventId, source, posthog],
  );

  const runSave = useCallback(async () => {
    pendingRef.current = true;
    setIsPending(true);
    try {
      await followEventMutation({ id: eventId });
      posthog.capture("event_saved", { event_id: eventId, source });
    } catch (error) {
      // Revert local state on error
      setIsSaved(false);
      posthog.capture("event_save_failed", {
        event_id: eventId,
        source,
        error_message: (error as Error).message,
      });
      toast.show({
        message: "Couldn't save event",
        action: { label: "Retry", onPress: () => void toggle() },
        variant: "error",
      });
      logError("Error saving event", error);
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }, [eventId, followEventMutation, source, posthog, toast]);

  const runUnsave = useCallback(async () => {
    pendingRef.current = true;
    setIsPending(true);
    try {
      await unfollowEventMutation({ id: eventId });
      posthog.capture("event_unsaved", { event_id: eventId, source });
    } catch (error) {
      // Revert local state on error
      setIsSaved(true);
      toast.show({
        message: "Couldn't unsave event",
        variant: "error",
      });
      logError("Error unsaving event", error);
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }, [eventId, unfollowEventMutation, source, posthog, toast]);

  const toggle = useCallback(() => {
    if (demoMode) {
      toast.show({
        message: "Demo mode: action disabled",
        variant: "error",
      });
      return;
    }

    if (isSaved) {
      // Unsave: silent (no toast, no haptic per spec).
      setIsSaved(false);
      void runUnsave();
    } else {
      // Save: instant UI flip, light haptic, success toast with Share action.
      setIsSaved(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toast.show({
        message: "Saved to your list",
        action: {
          label: "Share",
          onPress: () => {
            posthog.capture("save_toast_share_clicked", {
              event_id: eventId,
              source,
            });
            void openShareSheet("save_toast");
          },
        },
      });
      void runSave();
    }
  }, [
    demoMode,
    isSaved,
    runSave,
    runUnsave,
    toast,
    openShareSheet,
    posthog,
    eventId,
    source,
  ]);

  return {
    isSaved,
    isPending,
    toggle,
    openShareSheet,
  };
}
```

- [ ] **Step 3: Fix remaining callers (compile errors)**

The old hook returned `{ handleFollow, handleUnfollow }`. Anything still calling those will now have a type error. Search for remaining usages:

Run: `grep -rn "useEventSaveActions" apps/expo/src/` (via the Grep tool).

Expected callers after this task:
- `apps/expo/src/components/SaveButton.tsx` — fixed in Task 6.
- `apps/expo/src/components/SaveShareButton.tsx` — deleted in Task 11. Leave for now (file still compiles because its usage is untyped-friendly, but if it breaks, comment out the SaveShareButton body temporarily).

If `SaveShareButton.tsx` breaks the build, add a stub at the top of its function body to silence the error for now:

```tsx
// TEMP: replaced in later task
return null;
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm tsc --noEmit` from `apps/expo/`.

Expected: no errors (aside from any temporary stubs in `SaveShareButton.tsx`).

- [ ] **Step 5: Commit**

```bash
git add apps/expo/src/hooks/useEventActions.ts apps/expo/src/components/SaveShareButton.tsx
git commit -m "refactor(expo): make useEventSaveActions local-state-authoritative with toast"
```

---

## Task 6: Rewrite `SaveButton` component

**Files:**
- Modify: `apps/expo/src/components/SaveButton.tsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

```tsx
// apps/expo/src/components/SaveButton.tsx
import React from "react";
import { Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { useUser } from "@clerk/clerk-expo";

import { Heart } from "~/components/icons";
import { useEventSaveActions } from "~/hooks/useEventActions";

interface SaveButtonProps {
  eventId: string;
  isSaved: boolean;
  source: string;
}

export default function SaveButton({
  eventId,
  isSaved: initialIsSaved,
  source,
}: SaveButtonProps) {
  const { isLoaded } = useUser();
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;

  const { isSaved, toggle } = useEventSaveActions(eventId, initialIsSaved, {
    source,
  });

  if (isSaved) {
    return (
      <TouchableOpacity
        onPress={toggle}
        disabled={!isLoaded}
        accessibilityLabel="Saved, double-tap to remove"
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 px-4 py-2.5"
        style={{
          borderRadius: 16,
          backgroundColor: "rgba(120, 120, 128, 0.12)",
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: iconSize * 1.1, color: "#1C1C1E" }}>✓</Text>
        <Text
          className="text-base font-bold"
          style={{ color: "#1C1C1E" }}
        >
          Saved
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={toggle}
      disabled={!isLoaded}
      accessibilityLabel="Save"
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 bg-interactive-2 px-4 py-2.5"
      style={{ borderRadius: 16 }}
      activeOpacity={0.8}
    >
      <Heart color="#5A32FB" size={iconSize * 1.1} fill="white" />
      <Text className="text-base font-bold text-interactive-1">Save</Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit` from `apps/expo/`.

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/expo/src/components/SaveButton.tsx
git commit -m "feat(expo): rewrite SaveButton with local-state and clear saved state"
```

---

## Task 7: Update `discover.tsx` call site

**Files:**
- Modify: `apps/expo/src/app/(tabs)/discover.tsx` (lines 16, 111)

- [ ] **Step 1: Change the import**

Find line 16:

```tsx
import SaveShareButton from "~/components/SaveShareButton";
```

Replace with:

```tsx
import SaveButton from "~/components/SaveButton";
import ShareButton from "~/components/ShareButton";
```

- [ ] **Step 2: Update the render call**

The previous `SaveShareButton` for owners rendered a pill with icon + "Share" text. The standalone `ShareButton` is icon-only, so we wrap it in the same pill styling to preserve visual continuity.

Find the render on line 111 (approximately):

```tsx
<SaveShareButton
  eventId={event.id}
  isSaved={isSaved}
  isOwnEvent={isOwnEvent}
  source="discover_list"
/>
```

Replace with:

```tsx
{isOwnEvent ? (
  <View
    className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 bg-interactive-2 px-4 py-2.5"
    style={{ borderRadius: 16 }}
  >
    <ShareButton webPath={`/event/${event.id}`} />
    <Text className="text-base font-bold text-interactive-1">Share</Text>
  </View>
) : (
  <SaveButton
    eventId={event.id}
    isSaved={isSaved}
    source="discover_list"
  />
)}
```

If `View` and `Text` aren't already imported in this file, add them to the existing `react-native` import.

- [ ] **Step 3: Typecheck and manual verify**

Run: `pnpm tsc --noEmit` from `apps/expo/`.

Run the app. Open the Discover tab. Expected:
- An event NOT owned by you, NOT saved: shows `♡ Save` button.
- Tap it: button flips to `✓ Saved` instantly, toast appears bottom with "Saved to your list · Share", light haptic.
- Tap `✓ Saved`: button flips to `♡ Save` instantly, no toast, no haptic.
- Tap `Share` in toast: iOS share sheet opens.
- An event YOU own: shows Share button (pill, icon, "Share").
- Tap it: iOS share sheet opens.

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/app/(tabs)/discover.tsx
git commit -m "feat(expo): use SaveButton in discover tab"
```

---

## Task 8: Update `[username]/index.tsx` call site

**Files:**
- Modify: `apps/expo/src/app/[username]/index.tsx` (lines 20, 553)

- [ ] **Step 1: Change the import**

Find line 20:

```tsx
import SaveShareButton from "~/components/SaveShareButton";
```

Replace with:

```tsx
import SaveButton from "~/components/SaveButton";
import ShareButton from "~/components/ShareButton";
```

- [ ] **Step 2: Update the render**

Find the render on line 553:

```tsx
<SaveShareButton
  eventId={event.id}
  isSaved={isSaved}
  isOwnEvent={isOwnEvent}
  source="user_profile"
/>
```

Replace with the same pill-wrapped pattern from Task 7 to preserve visual continuity:

```tsx
{isOwnEvent ? (
  <View
    className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 bg-interactive-2 px-4 py-2.5"
    style={{ borderRadius: 16 }}
  >
    <ShareButton webPath={`/event/${event.id}`} />
    <Text className="text-base font-bold text-interactive-1">Share</Text>
  </View>
) : (
  <SaveButton
    eventId={event.id}
    isSaved={isSaved}
    source="user_profile"
  />
)}
```

If `View` and `Text` aren't already imported in this file, add them to the existing `react-native` import.

- [ ] **Step 3: Typecheck and manual verify**

Run: `pnpm tsc --noEmit`.

Run the app. Navigate to a user profile (someone else's profile). Expected: their events show Save/Saved buttons for you (non-owner). Navigate to your own profile: your events show Share.

- [ ] **Step 4: Commit**

```bash
git add "apps/expo/src/app/[username]/index.tsx"
git commit -m "feat(expo): use SaveButton on user profile events"
```

---

## Task 9: Update event detail page

**Files:**
- Modify: `apps/expo/src/app/event/[id]/index.tsx` (lines 331–332, 610–680)

- [ ] **Step 1: Update the show-flag logic**

Find the two lines around 331–332:

```tsx
const showSaveButton = !isCurrentUserEvent && !isSaved;
const showShareButton = isCurrentUserEvent || isSaved;
```

Replace with:

```tsx
const showSaveButton = !isCurrentUserEvent;
const showShareButton = isCurrentUserEvent;
```

Rationale: non-owners always see `SaveButton` (which handles both saved and unsaved internally). Only owners see the standalone `Share` button.

- [ ] **Step 2: Import `SaveButton`**

At the top of the file with the other imports, add:

```tsx
import SaveButton from "~/components/SaveButton";
```

- [ ] **Step 3: Replace the inline Save button**

Find the floating action block (lines 630–645 approx) containing:

```tsx
{showSaveButton && (
  <TouchableOpacity
    onPress={handleFollow}
    accessibilityLabel="Save Event"
    accessibilityRole="button"
    activeOpacity={0.8}
  >
    <View className="flex-row items-center gap-4 rounded-full bg-interactive-1 px-8 py-5">
      <Heart size={28} color="#FFFFFF" />
      <Text className="text-xl font-bold text-white">Save</Text>
    </View>
  </TouchableOpacity>
)}
```

Replace with a new large-size variant of `SaveButton`. Since the existing event detail save button is visually much larger than the list variant (28pt icon, xl text, px-8 py-5 pill), we have two options:

**Option A (recommended):** Add a `variant?: "default" | "large"` prop to `SaveButton` and branch styling. But that couples the component to multiple visual contexts.

**Option B (simpler):** Keep `SaveButton` list-sized and render the detail-page button inline using the hook directly.

Going with **Option B** for the event detail page since it's a one-off large presentation:

Replace the existing `{showSaveButton && ...}` block with:

```tsx
{showSaveButton && (
  <EventDetailSaveButton eventId={eventData.id} isSaved={isSaved} />
)}
```

Then add this local component above the default export (or at the bottom of the file before the default export):

```tsx
function EventDetailSaveButton({
  eventId,
  isSaved: initialIsSaved,
}: {
  eventId: string;
  isSaved: boolean;
}) {
  const { isSaved, toggle } = useEventSaveActions(eventId, initialIsSaved, {
    source: "event_detail",
  });

  if (isSaved) {
    return (
      <TouchableOpacity
        onPress={toggle}
        accessibilityLabel="Saved, double-tap to remove"
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <View
          className="flex-row items-center gap-4 rounded-full px-8 py-5"
          style={{ backgroundColor: "rgba(120, 120, 128, 0.16)" }}
        >
          <Text style={{ fontSize: 28, color: "#1C1C1E", fontWeight: "700" }}>
            ✓
          </Text>
          <Text className="text-xl font-bold" style={{ color: "#1C1C1E" }}>
            Saved
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={toggle}
      accessibilityLabel="Save Event"
      accessibilityRole="button"
      activeOpacity={0.8}
    >
      <View className="flex-row items-center gap-4 rounded-full bg-interactive-1 px-8 py-5">
        <Heart size={28} color="#FFFFFF" />
        <Text className="text-xl font-bold text-white">Save</Text>
      </View>
    </TouchableOpacity>
  );
}
```

Make sure `useEventSaveActions` is imported at the top of the file if it isn't already. The file's existing `handleFollow` will likely become dead code — remove if nothing else references it.

- [ ] **Step 4: Leave the owner Share button unchanged**

The `{showShareButton && ...}` block for owners stays as-is (lines ~660–673).

- [ ] **Step 5: Typecheck and manual verify**

Run: `pnpm tsc --noEmit`.

Run the app. Navigate to an event detail page for:
- **Someone else's event, not saved:** See large purple `♡ Save` button. Tap → morphs instantly to `✓ Saved` (grey pill), toast slides up with "Saved to your list · Share", light haptic. Tap `✓ Saved` → reverts to `♡ Save`, no toast. Tap `Share` in toast → iOS share sheet.
- **Someone else's event, already saved:** See large grey `✓ Saved` pill immediately on page load (no toast).
- **Your own event:** See large `Share` button only. Tap → iOS share sheet.

- [ ] **Step 6: Commit**

```bash
git add apps/expo/src/app/event/[id]/index.tsx
git commit -m "feat(expo): use SaveButton on event detail page"
```

---

## Task 10: Update `UserEventsList.tsx` inline buttons

**Files:**
- Modify: `apps/expo/src/components/UserEventsList.tsx` (lines 570–640 area, the `primaryAction === "save"` branch)

- [ ] **Step 1: Import `SaveButton`**

At the top of the file with the other imports:

```tsx
import SaveButton from "./SaveButton";
```

- [ ] **Step 2: Replace the inline save/saved/share branches**

Locate the block starting around line 582 that handles `primaryAction !== "addToCalendar"`. It has three inline branches: `isOwner` (Share), `isSaved` (disabled "Saved"), and the else (Save).

Replace that ternary with:

```tsx
{!ActionButton &&
  (primaryAction === "addToCalendar" ? (
    <TouchableOpacity
      className="-mb-0.5 -ml-2.5 flex-row items-center gap-1 py-2.5 pl-4 pr-1"
      onPress={handleAddToCal}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <CalendarPlus size={iconSize * 1.1} color="#5A32FB" />
      <Text className="text-base font-bold text-interactive-1">Add</Text>
    </TouchableOpacity>
  ) : isOwner ? (
    <TouchableOpacity
      className="-mb-0.5 -ml-2.5 flex-row items-center gap-1 py-2.5 pl-4 pr-1"
      onPress={handleShare}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <ShareIcon size={iconSize * 1.1} color="#5A32FB" />
      <Text className="text-base font-bold text-interactive-1">Share</Text>
    </TouchableOpacity>
  ) : (
    <SaveButton eventId={id} isSaved={isSaved} source="user_events_list" />
  ))}
```

This keeps the calendar and owner-Share branches intact and replaces the save/saved pair with the new `SaveButton`.

- [ ] **Step 3: Clean up dead locals if any**

If `handleFollow` (the one pulled from the old `useEventSaveActions`) is no longer referenced anywhere in this file, remove it and its import. Check by searching the file for `handleFollow`.

- [ ] **Step 4: Typecheck and manual verify**

Run: `pnpm tsc --noEmit`.

Run the app. Find a list that uses `UserEventsList` with `primaryAction="save"` (e.g., another user's saved list or a "for you" feed). Expected:
- Unsaved event shows `♡ Save`. Tap → morph to `✓ Saved`, toast appears.
- Already-saved event shows `✓ Saved` (no opacity-60 dead-state). Tap → reverts to `♡ Save`.
- Owner's own event still shows `Share`.

- [ ] **Step 5: Commit**

```bash
git add apps/expo/src/components/UserEventsList.tsx
git commit -m "feat(expo): use SaveButton in UserEventsList"
```

---

## Task 11: Delete `SaveShareButton.tsx`

**Files:**
- Delete: `apps/expo/src/components/SaveShareButton.tsx`

- [ ] **Step 1: Confirm no remaining imports**

Run: `grep -rn "SaveShareButton" apps/expo/src/`

Expected: zero matches outside of `SaveShareButton.tsx` itself.

If there are any remaining imports, fix them before proceeding.

- [ ] **Step 2: Delete the file**

Run: `git rm apps/expo/src/components/SaveShareButton.tsx`

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`.

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(expo): remove SaveShareButton (replaced by SaveButton + Toast)"
```

---

## Task 12: End-to-end manual verification pass

**No file changes — verification only.**

- [ ] **Step 1: Run the app cleanly**

From repo root: `pnpm dev:expo` (or `pnpm dev:no-expo` separately if needed for Convex). Make sure Metro is running cleanly and no warnings appear on boot.

- [ ] **Step 2: Run through each spec flow**

Walk through each scenario on the iOS simulator. Check each box:

- [ ] **Discover feed — save an event you don't own.**
  - Tap `♡ Save`. Button flips to `✓ Saved` within ~50ms (visibly instant).
  - Light haptic fires.
  - Toast slides up: "✓ Saved to your list" with "Share" action (blue, iOS system style).
  - Toast auto-dismisses after ~4s.

- [ ] **Discover feed — tap Share in toast immediately.**
  - iOS native share sheet opens.
  - Dismiss it: returns to discover feed, event still shows `✓ Saved`.

- [ ] **Discover feed — tap Saved to unsave.**
  - Button flips back to `♡ Save` instantly. No toast, no haptic.

- [ ] **Discover feed — rapid-fire save on 3 different events.**
  - Each toast replaces the previous. Only the newest is visible. No stacking.

- [ ] **Event detail page — save.**
  - Same flow as above but with the large purple/grey pill buttons.

- [ ] **Event detail page — view an already-saved event.**
  - Large grey `✓ Saved` pill is shown on page load.
  - No toast fires on load.

- [ ] **Event detail page — owner view.**
  - Large `Share` button shown. Tapping opens iOS share sheet.
  - No Save button visible.

- [ ] **Toast — swipe it down to dismiss.**
  - Toast disappears when dragged more than ~40px downward.

- [ ] **Toast — navigate away with toast showing.**
  - Toast dismisses immediately on route change.

- [ ] **Toast — background the app with toast showing.**
  - Toast dismisses. When returning to the app, no toast reappears.

- [ ] **VoiceOver — toast announcement.**
  - Enable VoiceOver (Settings → Accessibility). Save an event. VoiceOver reads "Saved to your list".

- [ ] **Error simulation (optional).**
  - Disable network (airplane mode) mid-session. Tap Save. Button still flips to `✓ Saved` (optimistic). Convex queues the mutation. Re-enable network → mutation completes. (If Convex retries exhaust, error toast appears with "Retry".)

- [ ] **Step 3: If any flow fails, fix and re-verify.**

For any failure, return to the relevant earlier task, fix the issue, re-commit with a fix message, and re-verify.

- [ ] **Step 4: Final bundle typecheck + lint**

Run from repo root:
```bash
pnpm lint:fix && pnpm check
```

Expected: clean output.

- [ ] **Step 5: Summary commit (optional)**

If there are any small fixes made during verification, commit them:
```bash
git add -A
git commit -m "chore(expo): post-verification fixes"
```

---

## Rollout notes

- No database migrations.
- No Convex function changes (`api.events.follow` / `api.events.unfollow` unchanged).
- No web changes.
- Analytics: new events `event_saved`, `event_unsaved`, `event_save_failed`, `save_toast_share_clicked` — add to PostHog dashboards as needed. Existing `share_event_*` events gain a `via` property.
- PR description should mention: analytics dashboard updates, screenshot of the toast, brief video of save → share flow.
