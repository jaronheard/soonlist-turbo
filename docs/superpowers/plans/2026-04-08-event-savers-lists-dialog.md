# Event Savers & Lists Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make user profiles and list names fully interactive on event cards — tappable names, "+N" badges that open a native page sheet dialog showing all savers and lists, plus a new list detail page.

**Architecture:** Modify `EventSaversRow` to use inline avatar+name pairs with "+N" badges. Add a new `SavedByModal` component using the existing `Modal`+`pageSheet` pattern. Add a `/list/[slug]` route. Extend the feed query to expose list data already available from `enrichEventsAndFilterNulls`.

**Tech Stack:** React Native, Expo Router, Convex, NativeWind/TailwindCSS

**Spec:** `docs/superpowers/specs/2026-04-08-event-savers-lists-dialog-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `apps/expo/src/components/SavedByModal.tsx` | Page sheet dialog showing all savers + lists |
| Create | `apps/expo/src/app/list/[slug].tsx` | List detail page route |
| Create | `packages/backend/convex/lists.ts` (add query) | `getEventsForList` — events belonging to a list |
| Modify | `apps/expo/src/components/UserEventsList.tsx` | Redesign `EventSaversRow`, wire up modal, pass list data |
| Modify | `packages/backend/convex/feeds.ts` | Expose `sourceListSlug` and `additionalSourceCount` |

---

### Task 1: Extend Feed Query to Expose List Data

**Files:**
- Modify: `packages/backend/convex/feeds.ts:25-52` (resolveSourceListNames)
- Modify: `packages/backend/convex/feeds.ts:142-162` (queryGroupedFeed return shape)
- Modify: `packages/backend/convex/feeds.ts:79-89` (queryFeed return shape)

The feed query already resolves `sourceListName` from `sourceListId` but doesn't include the list slug (needed for navigation) or the count of additional lists. The event already has `event.lists[]` populated from `getEventById`, so we can compute `additionalSourceCount` and get `sourceListSlug` from the same batch fetch.

- [ ] **Step 1: Update `resolveSourceListNames` to also return slugs**

Change the helper to return a map of `{ name: string; slug?: string }` instead of just `string`.

```typescript
// packages/backend/convex/feeds.ts — replace resolveSourceListNames (lines 26-52)

async function resolveSourceListDetails(
  ctx: QueryCtx,
  feedEntries: { sourceListId?: string }[],
): Promise<Map<string, { name: string; slug?: string }>> {
  const listIds = [
    ...new Set(
      feedEntries.map((e) => e.sourceListId).filter((id): id is string => !!id),
    ),
  ];
  if (listIds.length === 0) return new Map();

  const lists = await Promise.all(
    listIds.map((id) =>
      ctx.db
        .query("lists")
        .withIndex("by_custom_id", (q) => q.eq("id", id))
        .first(),
    ),
  );

  const map = new Map<string, { name: string; slug?: string }>();
  listIds.forEach((id, i) => {
    const list = lists[i];
    if (list) map.set(id, { name: list.name, slug: list.slug ?? undefined });
  });
  return map;
}
```

- [ ] **Step 2: Update `queryGroupedFeed` to use new helper and compute `additionalSourceCount`**

```typescript
// packages/backend/convex/feeds.ts — update queryGroupedFeed (lines 135-162)

  // Resolve source list details (name + slug)
  const sourceEntries = primaryFeedEntries
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .map((e) => ({ sourceListId: e.sourceListId }));
  const sourceListDetailsMap = await resolveSourceListDetails(ctx, sourceEntries);

  // Enrich each group entry with the primary event data
  const enrichedGroups = await Promise.all(
    groupedResults.page.map(async (groupEntry, idx) => {
      const event = await getEventById(ctx, groupEntry.primaryEventId);

      if (!event) {
        return null;
      }

      const feedEntry = primaryFeedEntries[idx];
      const sourceListId = feedEntry?.sourceListId;
      const sourceListDetails = sourceListId
        ? sourceListDetailsMap.get(sourceListId)
        : undefined;

      // additionalSourceCount = total lists this event is on minus the 1 shown
      const additionalSourceCount = event.lists ? Math.max(0, event.lists.length - 1) : 0;

      return {
        event,
        similarEventsCount: groupEntry.similarEventsCount,
        similarityGroupId: groupEntry.similarityGroupId,
        sourceListId,
        sourceListName: sourceListDetails?.name,
        sourceListSlug: sourceListDetails?.slug,
        additionalSourceCount,
      };
    }),
  );
```

- [ ] **Step 3: Apply the same changes to `queryFeed`**

```typescript
// packages/backend/convex/feeds.ts — update queryFeed (lines 75-89)

  // Resolve source list details
  const sourceListDetailsMap = await resolveSourceListDetails(ctx, feedResults.page);

  const events = await Promise.all(
    feedResults.page.map(async (feedEntry) => {
      const event = await getEventById(ctx, feedEntry.eventId);
      if (!event) return null;

      const sourceListDetails = feedEntry.sourceListId
        ? sourceListDetailsMap.get(feedEntry.sourceListId)
        : undefined;

      const additionalSourceCount = event.lists ? Math.max(0, event.lists.length - 1) : 0;

      return {
        ...event,
        sourceListId: feedEntry.sourceListId,
        sourceListName: sourceListDetails?.name,
        sourceListSlug: sourceListDetails?.slug,
        additionalSourceCount,
      };
    }),
  );
```

- [ ] **Step 4: Remove old `resolveSourceListNames` function**

Delete the old function (lines 26-52) since it's been replaced by `resolveSourceListDetails`.

- [ ] **Step 5: Verify the backend compiles**

Run: `cd /Users/jaronheard/soonlist-turbo && pnpm --filter @soonlist/backend exec npx convex typecheck`

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/convex/feeds.ts
git commit -m "feat(backend): expose sourceListSlug and additionalSourceCount in feed queries"
```

---

### Task 2: Create the SavedByModal Component

**Files:**
- Create: `apps/expo/src/components/SavedByModal.tsx`

This modal follows the exact same pattern as `FollowedListsModal` — `Modal` with `presentationStyle="pageSheet"`.

- [ ] **Step 1: Create `SavedByModal.tsx`**

```tsx
// apps/expo/src/components/SavedByModal.tsx

import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import { ChevronRight, List, User } from "~/components/icons";
import { UserProfileFlair } from "~/components/UserProfileFlair";

interface UserForDisplay {
  id: string;
  username: string;
  displayName?: string | null;
  userImage?: string | null;
}

interface SavedByModalProps {
  visible: boolean;
  onClose: () => void;
  creator: UserForDisplay;
  savers: UserForDisplay[];
  lists: Doc<"lists">[];
  currentUserId?: string;
}

export function SavedByModal({
  visible,
  onClose,
  creator,
  savers,
  lists,
  currentUserId,
}: SavedByModalProps) {
  const insets = useSafeAreaInsets();

  // Deduplicated users: creator first, then savers
  const allUsers: UserForDisplay[] = [creator];
  for (const saver of savers) {
    if (!allUsers.some((u) => u.id === saver.id)) {
      allUsers.push(saver);
    }
  }

  const handleUserPress = (user: UserForDisplay) => {
    onClose();
    if (currentUserId && user.id === currentUserId) {
      router.push("/settings/account");
    } else {
      router.push(`/${user.username}`);
    }
  };

  const handleListPress = (list: Doc<"lists">) => {
    onClose();
    if (list.slug) {
      router.push(`/list/${list.slug}`);
    }
  };

  const renderAvatar = (user: UserForDisplay) => {
    if (user.userImage) {
      return (
        <ExpoImage
          source={{ uri: user.userImage }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
          }}
          contentFit="cover"
          cachePolicy="disk"
        />
      );
    }
    return (
      <View className="h-10 w-10 items-center justify-center rounded-full bg-interactive-2">
        <User size={20} color="#627496" />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="border-b border-neutral-3 px-4 py-3">
          <Text className="text-lg font-bold text-neutral-1">Saved by</Text>
        </View>

        {/* Scrollable content */}
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
          {/* People section */}
          <View className="px-4 pt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
              People
            </Text>
            {allUsers.map((user) => (
              <TouchableOpacity
                key={user.id}
                onPress={() => handleUserPress(user)}
                className="flex-row items-center py-3"
                activeOpacity={0.7}
              >
                <UserProfileFlair username={user.username} size="xs">
                  {renderAvatar(user)}
                </UserProfileFlair>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-neutral-1">
                    {user.displayName || user.username}
                  </Text>
                  <Text className="text-sm text-neutral-2">
                    {user.id === creator.id
                      ? "Captured this event"
                      : "Saved"}
                  </Text>
                </View>
                <ChevronRight size={16} color="#DCE0E8" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Lists section */}
          {lists.length > 0 && (
            <View className="px-4 pt-4">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
                Lists
              </Text>
              {lists.map((list) => (
                <TouchableOpacity
                  key={list.id}
                  onPress={() => handleListPress(list)}
                  className="flex-row items-center py-3"
                  activeOpacity={0.7}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-interactive-2">
                    <List size={20} color="#5A32FB" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-neutral-1">
                      {list.name}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#DCE0E8" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/jaronheard/soonlist-turbo && pnpm --filter expo exec npx tsc --noEmit 2>&1 | head -20`

Expected: No errors referencing `SavedByModal`.

- [ ] **Step 3: Commit**

```bash
git add apps/expo/src/components/SavedByModal.tsx
git commit -m "feat(expo): add SavedByModal page sheet component"
```

---

### Task 3: Redesign EventSaversRow

**Files:**
- Modify: `apps/expo/src/components/UserEventsList.tsx:67-315` (EventSaversRow)
- Modify: `apps/expo/src/components/UserEventsList.tsx:326-340` (UserEventListItemProps)
- Modify: `apps/expo/src/components/UserEventsList.tsx:722-751` (EventSaversRow invocation)
- Modify: `apps/expo/src/components/UserEventsList.tsx:1241-1262` (feed data extraction)

- [ ] **Step 1: Add imports at the top of `UserEventsList.tsx`**

Add to the existing imports:

```typescript
// Add new component import after other component imports
import { SavedByModal } from "~/components/SavedByModal";
```

Also add `Doc` type import if not already present:

```typescript
import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
```

- [ ] **Step 2: Update `EventSaversRow` props to accept lists and new data**

Replace the `EventSaversRow` function signature (lines 75-91) and full component body (lines 75-315):

```tsx
function EventSaversRow({
  creator,
  savers,
  iconSize,
  eventId,
  currentUserId,
  sourceListName,
  sourceListSlug,
  additionalSourceCount,
  lists,
}: {
  creator: UserForDisplay;
  savers: UserForDisplay[];
  iconSize: number;
  eventId: string;
  currentUserId?: string;
  sourceListName?: string;
  sourceListSlug?: string;
  additionalSourceCount?: number;
  lists?: Doc<"lists">[];
}) {
  const [showModal, setShowModal] = useState(false);
  const isOwnEvent = currentUserId === creator.id;

  // Combine creator with savers, deduplicate by id
  const allUsers: UserForDisplay[] = [creator];
  for (const saver of savers) {
    if (!allUsers.some((u) => u.id === saver.id)) {
      allUsers.push(saver);
    }
  }

  const displayUsers = allUsers.slice(0, 2);
  const remainingUsersCount = allUsers.length - displayUsers.length;
  const remainingListsCount = additionalSourceCount ?? 0;

  const handleUserPress = (user: UserForDisplay) => {
    if (currentUserId && user.id === currentUserId) {
      router.push("/settings/account");
    } else {
      router.push(`/${user.username}`);
    }
  };

  const handleListPress = () => {
    if (sourceListSlug) {
      router.push(`/list/${sourceListSlug}`);
    }
  };

  const avatarSize = iconSize * 0.9;

  return (
    <>
      <View className="mx-auto mt-1 flex-row flex-wrap items-center justify-center gap-1">
        {isOwnEvent && sourceListName ? (
          // Own event: "You · Shared to [ListName] +N"
          <>
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={() => handleUserPress(creator)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                className="flex-row items-center gap-1"
              >
                <UserProfileFlair username={creator.username} size="xs">
                  {creator.userImage ? (
                    <ExpoImage
                      source={{ uri: creator.userImage }}
                      style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: 9999,
                      }}
                      contentFit="cover"
                      cachePolicy="disk"
                      recyclingKey={`${eventId}-creator-inline`}
                    />
                  ) : (
                    <View
                      style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: 9999,
                        backgroundColor: "#E0D9FF",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User size={avatarSize * 0.6} color="#627496" />
                    </View>
                  )}
                </UserProfileFlair>
                <Text className="text-xs text-neutral-2">You</Text>
              </Pressable>
            </View>
            <Text className="text-xs text-neutral-2">· Shared to</Text>
            <Pressable
              onPress={handleListPress}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              className="flex-row items-center gap-0.5"
            >
              <List size={11} color="#5A32FB" />
              <Text className="text-xs font-semibold text-interactive-1">
                {sourceListName}
              </Text>
            </Pressable>
            {remainingListsCount > 0 && (
              <Pressable
                onPress={() => setShowModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View className="rounded-full bg-interactive-3 px-1.5 py-0.5">
                  <Text className="text-xs font-medium text-interactive-1">
                    +{remainingListsCount}
                  </Text>
                </View>
              </Pressable>
            )}
          </>
        ) : (
          // Others' events: "[avatar] Name, [avatar] Name +N via [ListName] +N"
          <>
            {displayUsers.map((user, index) => (
              <Pressable
                key={user.id}
                onPress={() => handleUserPress(user)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                className="flex-row items-center gap-1"
              >
                <UserProfileFlair username={user.username} size="xs">
                  {user.userImage ? (
                    <ExpoImage
                      source={{ uri: user.userImage }}
                      style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: 9999,
                      }}
                      contentFit="cover"
                      cachePolicy="disk"
                      recyclingKey={`${eventId}-saver-inline-${user.id}`}
                    />
                  ) : (
                    <View
                      style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: 9999,
                        backgroundColor: "#E0D9FF",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User size={avatarSize * 0.6} color="#627496" />
                    </View>
                  )}
                </UserProfileFlair>
                <Text className="text-xs text-neutral-2">
                  {user.displayName || user.username}
                  {index < displayUsers.length - 1 || remainingUsersCount > 0
                    ? ","
                    : ""}
                </Text>
              </Pressable>
            ))}
            {remainingUsersCount > 0 && (
              <Pressable
                onPress={() => setShowModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View className="rounded-full bg-interactive-3 px-1.5 py-0.5">
                  <Text className="text-xs font-medium text-interactive-1">
                    +{remainingUsersCount}
                  </Text>
                </View>
              </Pressable>
            )}
            {sourceListName ? (
              <>
                <Text className="text-xs text-neutral-2">via</Text>
                <Pressable
                  onPress={handleListPress}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  className="flex-row items-center gap-0.5"
                >
                  <List size={11} color="#5A32FB" />
                  <Text className="text-xs font-semibold text-interactive-1">
                    {sourceListName}
                  </Text>
                </Pressable>
                {remainingListsCount > 0 && (
                  <Pressable
                    onPress={() => setShowModal(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <View className="rounded-full bg-interactive-3 px-1.5 py-0.5">
                      <Text className="text-xs font-medium text-interactive-1">
                        +{remainingListsCount}
                      </Text>
                    </View>
                  </Pressable>
                )}
              </>
            ) : null}
          </>
        )}
      </View>

      <SavedByModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        creator={creator}
        savers={savers}
        lists={lists ?? []}
        currentUserId={currentUserId}
      />
    </>
  );
}
```

- [ ] **Step 3: Update `UserEventListItemProps` to include new fields**

Add to the interface at line 338-339:

```typescript
  sourceListSlug?: string;
  // additionalSourceCount already exists at line 339
```

Update the destructuring in `UserEventListItem` (line 355) to include `sourceListSlug`.

- [ ] **Step 4: Update `EventSaversRow` invocation inside `UserEventListItem`**

Replace lines 722-751 where `EventSaversRow` is called:

```tsx
          {shouldShowCreator ? (
            <EventSaversRow
              creator={{
                id: eventUser.id,
                username: eventUser.username,
                displayName: eventUser.displayName,
                userImage: eventUser.userImage,
              }}
              savers={
                (event.eventFollows as EnrichedEventFollow[] | undefined)
                  ?.filter(
                    (
                      f,
                    ): f is EnrichedEventFollow & {
                      user: NonNullable<EnrichedEventFollow["user"]>;
                    } => f.user !== null,
                  )
                  .map((f) => ({
                    id: f.user.id,
                    username: f.user.username,
                    displayName: f.user.displayName,
                    userImage: f.user.userImage,
                  })) ?? []
              }
              iconSize={iconSize}
              eventId={event.id}
              currentUserId={currentUser?.id}
              sourceListName={sourceListName}
              sourceListSlug={sourceListSlug}
              additionalSourceCount={additionalSourceCount}
              lists={(event as { lists?: Doc<"lists">[] }).lists}
            />
```

Also update the fallback `sourceListName`-only block (lines 752-766) to make the list name tappable:

```tsx
          ) : sourceListName ? (
            <View className="mx-auto mt-1 flex-row items-center gap-1">
              <Text className="text-xs text-neutral-2">via</Text>
              <Pressable
                onPress={() => {
                  if (sourceListSlug) router.push(`/list/${sourceListSlug}`);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                className="flex-row items-center gap-0.5"
              >
                <List size={11} color="#5A32FB" />
                <Text className="text-xs font-semibold text-interactive-1">
                  {sourceListName}
                </Text>
              </Pressable>
              {additionalSourceCount && additionalSourceCount > 0 ? (
                <View className="rounded-full bg-interactive-3 px-1.5 py-0.5">
                  <Text className="text-xs font-medium text-interactive-1">
                    +{additionalSourceCount}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
```

- [ ] **Step 5: Update feed data extraction to pass new fields**

Update lines 1241-1262 in the `renderItem` callback:

```typescript
        // Source attribution from feed entry
        const sourceListName = (eventData as { sourceListName?: string })
          .sourceListName;
        const sourceListSlug = (eventData as { sourceListSlug?: string })
          .sourceListSlug;
        const additionalSourceCount = (
          eventData as { additionalSourceCount?: number }
        ).additionalSourceCount;

        return (
          <UserEventListItem
            event={eventData}
            ActionButton={ActionButton}
            showCreator={showCreator}
            isSaved={isSaved}
            savedAt={undefined}
            similarEventsCount={
              similarEventsCount > 0 ? similarEventsCount : undefined
            }
            demoMode={demoMode}
            index={index}
            isDiscoverFeed={isDiscoverFeed}
            primaryAction={primaryAction}
            source={source}
            sourceListName={sourceListName}
            sourceListSlug={sourceListSlug}
            additionalSourceCount={additionalSourceCount}
          />
        );
```

- [ ] **Step 6: Verify it compiles**

Run: `cd /Users/jaronheard/soonlist-turbo && pnpm --filter expo exec npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 7: Commit**

```bash
git add apps/expo/src/components/UserEventsList.tsx
git commit -m "feat(expo): redesign EventSaversRow with inline avatars and +N badges"
```

---

### Task 4: Add `getEventsForList` Backend Query

**Files:**
- Modify: `packages/backend/convex/lists.ts` (add new query)

- [ ] **Step 1: Add the query to `lists.ts`**

Add at the end of the file, following the existing query patterns:

```typescript
// packages/backend/convex/lists.ts — add at end of file

export const getEventsForList = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    // Find the list by slug
    const list = await ctx.db
      .query("lists")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!list) return null;

    // Only allow access to public/unlisted lists
    if (list.visibility === "private") return null;

    // Get all eventToLists entries for this list
    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", list.id))
      .collect();

    // Fetch and enrich each event
    const events = await Promise.all(
      eventToLists.map(async (etl) => {
        const event = await getEventById(ctx, etl.eventId);
        return event;
      }),
    );

    // Filter nulls and sort by start date
    const validEvents = events.filter(
      (event): event is NonNullable<typeof event> => event !== null,
    );

    return {
      list,
      events: validEvents,
    };
  },
});
```

Make sure `getEventById` is imported — check if it's already imported from `./model/events` at the top of `lists.ts`. If not, add:

```typescript
import { getEventById } from "./model/events";
```

- [ ] **Step 2: Verify the backend compiles**

Run: `cd /Users/jaronheard/soonlist-turbo && pnpm --filter @soonlist/backend exec npx convex typecheck`

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/lists.ts
git commit -m "feat(backend): add getEventsForList query"
```

---

### Task 5: Create List Detail Page Route

**Files:**
- Create: `apps/expo/src/app/list/[slug].tsx`

- [ ] **Step 1: Create the route file**

```tsx
// apps/expo/src/app/list/[slug].tsx

import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { List as ListIcon } from "~/components/icons";
import UserEventsList from "~/components/UserEventsList";
import { useUser } from "~/hooks/useUser";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";

export default function ListDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();

  const result = useQuery(
    api.lists.getEventsForList,
    slug ? { slug } : "skip",
  );

  const listData = useQuery(
    api.lists.getBySlug,
    slug ? { slug } : "skip",
  );

  const followListMutation = useMutation(api.lists.followList);
  const unfollowListMutation = useMutation(api.lists.unfollowList);

  const followedLists = useQuery(
    api.lists.getFollowedLists,
    isAuthenticated ? {} : "skip",
  );

  const isFollowing = useMemo(
    () => followedLists?.some((l) => l.slug === slug) ?? false,
    [followedLists, slug],
  );

  const isOwnList = listData?.userId === user?.id;

  const handleToggleFollow = useCallback(async () => {
    if (!listData) return;
    try {
      if (isFollowing) {
        await unfollowListMutation({ listId: listData.id });
      } else {
        await followListMutation({ listId: listData.id });
      }
      void hapticSuccess();
    } catch (error) {
      logError("Error toggling list follow", error);
      toast.error(isFollowing ? "Failed to unfollow list" : "Failed to follow list");
    }
  }, [listData, isFollowing, followListMutation, unfollowListMutation]);

  if (result === undefined || listData === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "List" }} />
        <View className="flex-1 items-center justify-center bg-interactive-3">
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      </>
    );
  }

  if (result === null || listData === null) {
    return (
      <>
        <Stack.Screen options={{ title: "List" }} />
        <View className="flex-1 items-center justify-center bg-interactive-3">
          <Text className="text-base text-neutral-2">List not found</Text>
        </View>
      </>
    );
  }

  const events = result.events.map((event) => ({
    event,
    similarEvents: [],
    similarityGroupId: event.id,
    similarEventsCount: 0,
  }));

  return (
    <>
      <Stack.Screen
        options={{
          title: result.list.name,
          headerRight: () =>
            isAuthenticated && !isOwnList ? (
              <TouchableOpacity
                onPress={() => void handleToggleFollow()}
                activeOpacity={0.7}
              >
                <Text className="text-base font-semibold text-interactive-1">
                  {isFollowing ? "Unfollow" : "Follow"}
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <UserEventsList
        groupedEvents={events}
        showCreator="always"
        HeaderComponent={() => (
          <View className="items-center px-4 pb-2">
            <View className="mb-2 h-12 w-12 items-center justify-center rounded-2xl bg-interactive-2">
              <ListIcon size={24} color="#5A32FB" />
            </View>
            <Text className="text-lg font-bold text-neutral-1">
              {result.list.name}
            </Text>
            {listData?.owner && (
              <Text className="text-sm text-neutral-2">
                by {listData.owner.displayName || listData.owner.username}
              </Text>
            )}
          </View>
        )}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/jaronheard/soonlist-turbo && pnpm --filter expo exec npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/expo/src/app/list/[slug].tsx
git commit -m "feat(expo): add /list/[slug] detail page route"
```

---

### Task 6: Lint, Format, and Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Run lint and format**

```bash
cd /Users/jaronheard/soonlist-turbo && pnpm lint:fix && pnpm format:fix
```

- [ ] **Step 2: Run type check**

```bash
cd /Users/jaronheard/soonlist-turbo && pnpm check
```

- [ ] **Step 3: Review the full diff**

```bash
git diff --stat main
```

- [ ] **Step 4: Commit any lint/format fixes**

```bash
git add -A
git commit -m "chore: lint and format fixes"
```
