# Share Prompt Timing: 3-Event Gate — Implementation Plan

**Goal:** Gate proactive Soon List share prompts on `upcomingEventCount >= 3` by adding a persistent pill transformation + a one-shot bottom sheet, via a reusable `shareOwnList` action.

**Architecture:** Mirrors the existing `useRatingPrompt` pattern. A Zustand flag tracks one-shot dismissal. A single hook exposes eligibility + trigger state. The feed screen drives both surfaces. Share action is a shared utility so #1007 can later swap in first-share setup.

**Tech Stack:** React Native (Expo), Zustand, Convex, PostHog, NativeWind.

**Issue:** [#1011](https://github.com/jaronheard/soonlist-turbo/issues/1011)

---

## File Structure

- Create: `apps/expo/src/utils/shareOwnList.ts` — reusable share action with analytics `source`.
- Create: `apps/expo/src/hooks/useShareListPrompt.ts` — eligibility + one-shot trigger hook.
- Create: `apps/expo/src/components/ShareListPromptSheet.tsx` — modal sheet, shell content.
- Modify: `apps/expo/src/store.ts` — add `hasSeenShareListPrompt` flag + setter + selectors.
- Modify: `apps/expo/src/components/UserEventsList.tsx` — make `ScreenshotCta` accept `upcomingEventCount`, flip content when eligible.
- Modify: `apps/expo/src/app/(tabs)/feed/index.tsx` — consume `useShareListPrompt`, pass count down, mount sheet.
- Modify: `apps/expo/src/app/settings/account.tsx` — route existing Share button through `shareOwnList`.

---

## Task 1 — Add `hasSeenShareListPrompt` to useAppStore

**Files:** Modify `apps/expo/src/store.ts`.

- [ ] Add to `AppState` interface near `hasShownRatingPrompt`:

```ts
hasSeenShareListPrompt: boolean;
setShareListPromptSeen: () => void;
```

- [ ] Add to initial state (3 locations: initial, 2 reset blocks at lines ~405, ~455, ~513):

```ts
hasSeenShareListPrompt: false,
```

- [ ] Add the setter next to `markRatingPromptShown`:

```ts
setShareListPromptSeen: () => set({ hasSeenShareListPrompt: true }),
```

- [ ] Add selectors at the bottom with the other selectors:

```ts
export const useHasSeenShareListPrompt = () =>
  useAppStore((state) => state.hasSeenShareListPrompt);
export const useSetShareListPromptSeen = () =>
  useAppStore((state) => state.setShareListPromptSeen);
```

- [ ] Verify flag persists alongside `hasShownRatingPrompt` (same persist config, no changes needed).

---

## Task 2 — Create `shareOwnList` utility

**Files:** Create `apps/expo/src/utils/shareOwnList.ts`.

- [ ] Implement:

```ts
import { Platform, Share } from "react-native";
import type { PostHog } from "posthog-react-native";

import Config from "~/config";
import { logError } from "./errorLogging";

export type ShareOwnListSource =
  | "pill"
  | "one_shot_sheet"
  | "header"
  | "settings"
  | "list_detail";

interface ShareOwnListParams {
  username: string | null | undefined;
  posthog: PostHog;
  source: ShareOwnListSource;
}

export async function shareOwnList({
  username,
  posthog,
  source,
}: ShareOwnListParams): Promise<{ shared: boolean }> {
  if (!username) return { shared: false };

  const url = `${Config.apiBaseUrl}/${username}`;

  posthog.capture("share_list_initiated", { source });

  try {
    const result = await Share.share(
      Platform.OS === "ios" ? { url } : { message: url },
    );

    if (result.action === Share.sharedAction) {
      posthog.capture("share_list_completed", { source });
      return { shared: true };
    }
    return { shared: false };
  } catch (error) {
    logError("shareOwnList failed", error);
    return { shared: false };
  }
}
```

- [ ] Verify `Config.apiBaseUrl` export exists at `~/config`.

---

## Task 3 — Create `useShareListPrompt` hook

**Files:** Create `apps/expo/src/hooks/useShareListPrompt.ts`.

- [ ] Implement:

```ts
import { useEffect, useRef } from "react";
import { shallow } from "zustand/shallow";
import { usePostHog } from "posthog-react-native";

import {
  useHasSeenShareListPrompt,
  useSetShareListPromptSeen,
} from "~/store";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

const THRESHOLD = 3;

export function useShareListPrompt(upcomingEventCount: number) {
  const hasSeen = useHasSeenShareListPrompt();
  const markSeen = useSetShareListPromptSeen();
  const posthog = usePostHog();
  const pendingBatchIds = useInFlightEventStore(
    (s) => s.pendingBatchIds,
    shallow,
  );

  const isShareEligible = upcomingEventCount >= THRESHOLD;
  const isBatchInFlight = pendingBatchIds.length > 0;

  // Track whether we've seen eligibility go true this session
  const wasEligibleRef = useRef(isShareEligible);

  // Fire eligibility-crossed analytic once per install when we first observe
  // eligibility flip false → true and the user hasn't already seen the prompt.
  useEffect(() => {
    if (!wasEligibleRef.current && isShareEligible && !hasSeen) {
      posthog.capture("share_prompt_eligibility_crossed", {
        upcomingEventCount,
      });
    }
    wasEligibleRef.current = isShareEligible;
  }, [isShareEligible, hasSeen, posthog, upcomingEventCount]);

  const shouldShowOneShot =
    isShareEligible && !hasSeen && !isBatchInFlight;

  return {
    isShareEligible,
    shouldShowOneShot,
    markOneShotSeen: markSeen,
  };
}
```

- [ ] Verify `usePostHog` is the right import (matches `DiscoverShareBanner.tsx:4`).

---

## Task 4 — Thread `upcomingEventCount` into `ScreenshotCta`

**Files:** Modify `apps/expo/src/components/UserEventsList.tsx`.

- [ ] Extend `ScreenshotCta` to accept props:

```ts
interface ScreenshotCtaProps {
  upcomingEventCount: number;
  onSharePress: () => void;
}

const ScreenshotCta = ({ upcomingEventCount, onSharePress }: ScreenshotCtaProps) => {
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;
  const { triggerAddEventFlow } = useAddEventFlow();

  const isShareEligible = upcomingEventCount >= 3;
  const label = isShareEligible ? "Share your Soon List →" : "Screenshot events →";
  const handlePress = isShareEligible ? onSharePress : () => void triggerAddEventFlow();

  return (
    <View className="mb-6 items-center py-4">
      <TouchableOpacity
        className="flex-row items-center justify-center gap-1.5 rounded-full bg-interactive-2 px-4 py-3"
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={isShareEligible ? "Share your Soon List" : "Screenshot events"}
      >
        <Text
          className="text-center font-semibold text-neutral-1"
          style={{ fontSize: 14 * fontScale }}
        >
          {label}
        </Text>
        {!isShareEligible && (
          <Image
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
            source={require("../assets/capture-cta.png")}
            style={{ width: iconSize, height: iconSize }}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};
```

- [ ] Add `upcomingEventCount?: number` and `onSharePress?: () => void` to `UserEventsListProps`, default `upcomingEventCount = 0`, default `onSharePress = () => {}`.

- [ ] At the `ScreenshotCta` call site (around line 1199), pass props:

```tsx
{showSourceStickers ? (
  <ScreenshotCta upcomingEventCount={upcomingEventCount} onSharePress={onSharePress} />
) : null}
```

---

## Task 5 — Create `ShareListPromptSheet`

**Files:** Create `apps/expo/src/components/ShareListPromptSheet.tsx`.

- [ ] Implement (Modal-based to match `CodeEntryModal`):

```tsx
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

interface ShareListPromptSheetProps {
  isVisible: boolean;
  onShare: () => void;
  onDismiss: (method: "not_now_button" | "swipe") => void;
}

export function ShareListPromptSheet({
  isVisible,
  onShare,
  onDismiss,
}: ShareListPromptSheetProps): React.ReactElement {
  const posthog = usePostHog();

  React.useEffect(() => {
    if (isVisible) {
      posthog.capture("share_prompt_one_shot_shown");
    }
  }, [isVisible, posthog]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={() => onDismiss("swipe")}
    >
      <Pressable
        className="flex-1 justify-end bg-black/40"
        onPress={() => onDismiss("swipe")}
        accessibilityRole="button"
        accessibilityLabel="Dismiss share prompt"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-3xl bg-white px-6 pb-8 pt-6"
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-neutral-300" />
          <Text className="mb-2 text-center font-heading text-2xl font-bold text-neutral-1">
            Your Soon List is ready to share
          </Text>
          <Text className="mb-6 text-center text-base text-neutral-2">
            Send your upcoming events to friends.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share your Soon List"
            onPress={() => {
              posthog.capture("share_prompt_one_shot_share_tapped");
              onShare();
            }}
            className="mb-3 rounded-full bg-interactive-1 py-4"
          >
            <Text className="text-center text-base font-semibold text-white">
              Share
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not now"
            onPress={() => {
              posthog.capture("share_prompt_one_shot_dismissed", {
                method: "not_now_button",
              });
              onDismiss("not_now_button");
            }}
            className="py-3"
          >
            <Text className="text-center text-base font-medium text-neutral-2">
              Not now
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

- [ ] `onDismiss("swipe")` emits the dismissed analytic — do it in the parent so flag + analytics are in one place (see Task 6).

---

## Task 6 — Wire everything into the feed screen

**Files:** Modify `apps/expo/src/app/(tabs)/feed/index.tsx`.

- [ ] Add imports at top:

```ts
import { useUser } from "@clerk/clerk-expo";
import { usePostHog } from "posthog-react-native";
import { useShareListPrompt } from "~/hooks/useShareListPrompt";
import { shareOwnList } from "~/utils/shareOwnList";
import { ShareListPromptSheet } from "~/components/ShareListPromptSheet";
```

(Note: `useUser` likely already imported; dedupe.)

- [ ] After `useRatingPrompt` call (~line 179), wire the share prompt:

```ts
const posthog = usePostHog();
const upcomingCount =
  selectedSegment === "upcoming" ? enrichedEvents.length : 0;

const { shouldShowOneShot, markOneShotSeen } =
  useShareListPrompt(upcomingCount);

const [isShareSheetVisible, setShareSheetVisible] = React.useState(false);

React.useEffect(() => {
  if (shouldShowOneShot && !isShareSheetVisible) {
    const t = setTimeout(() => setShareSheetVisible(true), 400);
    return () => clearTimeout(t);
  }
}, [shouldShowOneShot, isShareSheetVisible]);

const handleSheetShare = useCallback(() => {
  markOneShotSeen();
  setShareSheetVisible(false);
  void shareOwnList({
    username: user?.username,
    posthog,
    source: "one_shot_sheet",
  });
}, [markOneShotSeen, posthog, user?.username]);

const handleSheetDismiss = useCallback(
  (method: "not_now_button" | "swipe") => {
    if (method === "swipe") {
      posthog.capture("share_prompt_one_shot_dismissed", { method });
    }
    markOneShotSeen();
    setShareSheetVisible(false);
  },
  [markOneShotSeen, posthog],
);

const handlePillShare = useCallback(() => {
  posthog.capture("share_prompt_pill_tapped");
  void shareOwnList({
    username: user?.username,
    posthog,
    source: "pill",
  });
}, [posthog, user?.username]);
```

- [ ] Update the `UserEventsList` render to thread props and mount the sheet:

```tsx
return (
  <>
    <UserEventsList
      groupedEvents={enrichedEvents}
      onEndReached={handleLoadMore}
      isFetchingNextPage={status === "LoadingMore"}
      isLoadingFirstPage={false}
      showCreator="savedFromOthers"
      showSourceStickers
      savedEventIds={savedEventIds}
      upcomingEventCount={upcomingCount}
      onSharePress={handlePillShare}
      /* ...any other existing props... */
    />
    <ShareListPromptSheet
      isVisible={isShareSheetVisible}
      onShare={handleSheetShare}
      onDismiss={handleSheetDismiss}
    />
  </>
);
```

- [ ] Verify `user` from `useUser()` is already in scope (from the clerk hook at top of function).

- [ ] Pill impression analytic — fire once per session when eligible. Add to `useShareListPrompt`:

```ts
const pillImpressionRef = useRef(false);
useEffect(() => {
  if (isShareEligible && !pillImpressionRef.current) {
    pillImpressionRef.current = true;
    posthog.capture("share_prompt_pill_impression", { upcomingEventCount });
  }
}, [isShareEligible, posthog, upcomingEventCount]);
```

(Add inside the hook body in Task 3 — update plan retroactively by including in this task.)

---

## Task 7 — Route settings Share through `shareOwnList`

**Files:** Modify `apps/expo/src/app/settings/account.tsx`.

- [ ] Replace `handleSharePublicList` body to call the utility, preserving behavior:

```ts
const posthog = usePostHog();

const handleSharePublicList = useCallback(async () => {
  await shareOwnList({
    username: user?.username,
    posthog,
    source: "settings",
  });
}, [posthog, user?.username]);
```

- [ ] Add imports at top.

- [ ] Delete `getPublicListUrl` if no longer used by anything besides `handleSharePublicList` — double-check `handleCopyLink` still uses it and keep if so.

---

## Task 8 — Lint, typecheck, verify

- [ ] Run `pnpm lint:fix && pnpm check` at repo root.
- [ ] Fix any reported issues.
- [ ] Confirm no existing callers of `ScreenshotCta` rely on the old signature (it's only called once, inside `UserEventsList.tsx`).
- [ ] Manual review: does the feed still render when `selectedSegment === "past"`? (Pill should show "Screenshot events →" because upcomingCount = 0.)

---

## Task 9 — Commit, push, open PR

- [ ] Single commit: `feat(expo): gate share prompts on 3 upcoming events (#1011)`
- [ ] Push to branch; open PR targeting `main`.
- [ ] PR body references #1011 and explains the gate, pill flip, one-shot sheet, and handoff to #1007.

---

## Out of Scope (explicit)

- Push notifications and onboarding share tail (spec §3.4).
- Privacy + profile setup inside sheet (owned by #1007).
- Threshold tuning beyond 3 (defer on PostHog data).
- Gating manual entry points.
