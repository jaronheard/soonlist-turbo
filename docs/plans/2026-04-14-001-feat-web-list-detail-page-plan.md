---
title: "feat: Web list detail page at /list/[slug]"
type: feat
status: completed
date: 2026-04-14
origin: docs/superpowers/specs/2026-04-13-web-list-detail-page-design.md
---

# feat: Web list detail page at /list/[slug]

## Overview

Add a public, shareable list detail page to the Next.js web app at `/list/[slug]` that mirrors the Expo list detail screen. Server-render rich Open Graph / Twitter metadata, show a dedicated state for private lists (rather than 404), and offer a smart "Open in app" banner for mobile in-app browsers. Change `api.lists.getBySlug` to return a discriminated union so the new route can distinguish `notFound` from `private`. Promote `OpenInAppBanner` from the event route to a shared component. Delete the legacy `/[userName]/list` redirect. Ship as one PR.

## Problem Frame

The Expo app has a list detail screen, but sharing a list externally (web link) currently leads nowhere useful: there is no web route, and private lists return `null` which gives consumers no way to differentiate "doesn't exist" from "exists but you can't see it." Users sharing lists in social apps (Instagram, Twitter) need rich previews and a smart path back into the native app. The legacy `/[userName]/list` redirect is stale and must go to avoid conflicting with the new route's semantics. (see origin: `docs/superpowers/specs/2026-04-13-web-list-detail-page-design.md`)

## Requirements Trace

- R1. New route `apps/web/app/(base)/list/[slug]/` renders a public list with server-rendered OG/Twitter metadata (title, description, image, `apple-itunes-app`).
- R2. Private lists render a dedicated "Private list" state with the owner's public profile and `robots: noindex`, not 404.
- R3. Unknown slugs return 404 via `notFound()`.
- R4. Mobile in-app browsers (Instagram, FB, TikTok, Twitter, LinkedIn, iOS Safari) see a smart "Open in app" banner with a `soonlist://list/${slug}` deep link.
- R5. Page header has a share action: `navigator.share` when available, else clipboard copy + toast.
- R6. `api.lists.getBySlug` returns a discriminated union `{ status: "ok" | "private" | "notFound", ... }`. All call sites updated in the same PR.
- R7. Legacy redirect `apps/web/app/(base)/[userName]/list/page.tsx` deleted.
- R8. `OpenInAppBanner` promoted to `apps/web/components/OpenInAppBanner.tsx`, accepts `deepLink: string` (and optional `label`). Event page updated to import from the new location; behavior unchanged.
- R9. `apps/expo/src/app/list/[slug].tsx` updated to unwrap the discriminated result and handle the `private` variant gracefully.
- R10. `pnpm lint:fix && pnpm format:fix && pnpm check` passes.

## Scope Boundaries

- Not building `/lists` index or discovery.
- Not adding follow/unfollow on the web page (v1 is read + share).
- Not standardizing param casing across the monorepo (tracked separately in #986).
- Not changing `api.lists.getEventsForList` shape (already paginated correctly).
- Not adding a cover-image field to the `lists` schema; private/listed/public lists without an image fall back to the default Soonlist social card.
- **Not adding Convex unit tests.** The spec's claim that `packages/backend` has existing test patterns is incorrect — no test infra exists in that package. Adding convex-test + vitest configuration is out of scope for this PR; coverage for the three-status `getBySlug` is via the manual PR checklist. A follow-up may set up backend test infra.

## Context & Research

### Relevant Code and Patterns

- `apps/web/app/(base)/event/[eventId]/page.tsx` — reference pattern for server component + `generateMetadata` + `getAuthenticatedConvex()`. Mirror this exactly for the new list page.
- `apps/web/app/(base)/event/[eventId]/EventPageClient.tsx` — reference for `"use client"` shell with Convex hooks + banner + content.
- `apps/web/app/(base)/event/[eventId]/OpenInAppBanner.tsx` — current banner. In-app browser detection (Instagram/FB/TikTok/Twitter/LinkedIn/iOS generic), iOS detection, App Store fallback. Currently takes `eventId`; promote to shared component with a `deepLink: string` prop.
- `apps/web/lib/convex-server.ts` — `getAuthenticatedConvex()` (server-only, pulls Clerk token, returns `ConvexHttpClient`).
- `apps/web/lib/urlScheme.ts` — `createDeepLink(path)` takes a **single string** path and prepends `soonlist://` (prod) or `soonlist.dev://` (dev). Spec's `createDeepLink("list", { slug })` call signature is wrong; correct usage is `createDeepLink(\`list/${slug}\`)` (see `SaveButton.tsx` and current `OpenInAppBanner.tsx` `event/${eventId}` precedent).
- `apps/web/components/ShareButton.tsx` — share + clipboard + toast precedent to mirror in the list header.
- `apps/web/components/EventList.tsx` — requires **three pre-split arrays**: `currentEvents`, `futureEvents`, `pastEvents: EventWithUser[]`. The client must categorize events by start/end time before passing. Internally it `collapseSimilarEvents` and renders accordion sections.
- `packages/backend/convex/lists.ts:31-82` — `checkListAccess` already returns `{ status: "notFound" } | { status: "forbidden" } | { status: "ok"; list }`. Model the new `getBySlug` shape after this (renaming `forbidden` → `private`, adding sanitized `owner` to the `private` variant).
- `packages/backend/convex/lists.ts:669-776` — current `getBySlug` (returns `EnrichedList | null`). Rewrite returns validator (`v.union(...)`) and handler to emit the discriminated union.
- `packages/backend/convex/schema.ts:128-161` — `lists` table has no cover image field. Unresolved question resolved: fall back to default social card.
- `apps/expo/src/app/list/[slug].tsx` — only Expo consumer of `getBySlug`. Uses `useQuery` with `undefined = loading, null = not found`. Update to the new shape. `FollowedListsModal.tsx` does not use `getBySlug` (confirmed via grep).
- `apps/web/app/(base)/[userName]/list/page.tsx` — 12-line legacy redirect. No inbound references. Deleting it leaves `/[userName]/list` to fall through to a 404. The new static `list/[slug]` route does not conflict with the dynamic `[userName]` sibling because Next.js ranks static segments higher.

### Institutional Learnings

None found — `docs/solutions/` does not exist in this repo. Treating this as greenfield from an institutional-learnings perspective.

### External References

External research skipped — the codebase has strong local patterns (event detail route is a direct analogue) and the technology layers involved (Next.js App Router, Convex, Clerk) are well-established in the repo.

## Key Technical Decisions

- **Discriminated union on `getBySlug`, modeled after existing `checkListAccess`.** This keeps a single source of truth for slug → visibility logic, and reuses a pattern already established in the same file. Rationale: fewer invented abstractions; reviewer-familiar shape.
- **`private` variant includes sanitized `owner`** (username, displayName, avatar). The PrivateListState card needs `"Ask @owner for access"` + optional link to owner profile (resolved YES in spec).
- **Single server-side Convex call per request**, consumed by both `generateMetadata` and `page.tsx` default export. Next.js dedupes the awaited promise within one request; no need to `cache()` wrap.
- **Client re-fetches list via Convex hooks** (same pattern as `EventPageClient`). Server result passes only `slug` (and pre-resolved `status` for routing decision) to the client; `usePaginatedQuery` drives event list. Keeps SSR fast and the client reactive to live updates.
- **Delete legacy `/[userName]/list` outright, don't redirect.** No inbound references; a 404 for stale bookmarks is acceptable and simpler than maintaining another redirect.
- **`OpenInAppBanner` prop: `deepLink: string`, optional `label?: string`.** Keeps the component a pure presentation + detection primitive with no knowledge of routes.
- **No Convex test infra in this PR.** Spec mis-stated existing coverage; introducing convex-test + vitest here expands scope unnecessarily. Manual PR checklist plus type-checked `v.union` returns validator gives reasonable confidence for the three statuses.
- **OG image falls back to site default.** `lists` has no cover image field per schema inspection.

## Open Questions

### Resolved During Planning

- Cover image source for OG? → Lists have no cover field; use default Soonlist social card.
- Does `FollowedListsModal.tsx` use `getBySlug`? → No (grep confirms); only Expo consumer to update is `apps/expo/src/app/list/[slug].tsx`.
- Does the new static `list/[slug]` conflict with dynamic `[userName]`? → No; static wins in Next.js routing.
- Is there existing Convex test infra to extend? → No. Reducing automated test scope accordingly.

### Deferred to Implementation

- Exact shape of the sanitized `PublicOwner` type — confirm against existing `sanitizedOwner` projection in `lists.ts` when writing the new returns validator.
- Whether the mobile smart banner needs any styling tweaks for the list context (list icon vs event icon) — decide at implementation time by visual review.
- Whether the private state copy should link to the owner's profile inline or via a secondary button — settle via screenshot review.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
                  ┌──────────────────────────────────────┐
 GET /list/:slug  │ apps/web/app/(base)/list/[slug]/     │
 ───────────────► │ page.tsx  (server)                   │
                  │                                      │
                  │ getAuthenticatedConvex()             │
                  │   .query(api.lists.getBySlug, …)     │
                  │                                      │
                  │ switch (result.status):              │
                  │   "notFound" → notFound()            │
                  │   "private"  → <PrivateListState/>   │
                  │   "ok"       → <ListPageClient/>     │
                  │                                      │
                  │ generateMetadata:                    │
                  │   same query (deduped)               │
                  │   → OG/Twitter/apple-itunes-app      │
                  │   noindex for private/notFound       │
                  └──────────────────────────────────────┘
                                │
                   status="ok"  ▼
                  ┌──────────────────────────────────────┐
                  │ ListPageClient.tsx  ("use client")   │
                  │                                      │
                  │ <OpenInAppBanner                     │
                  │   deepLink={soonlist://list/:slug} />│
                  │ <Header onShare=…/>                  │
                  │ usePaginatedQuery(getEventsForList)  │
                  │ → split into current/future/past     │
                  │ → <EventList …/>                     │
                  └──────────────────────────────────────┘

  Convex query return shape (packages/backend/convex/lists.ts):
    { status: "ok";       list: EnrichedList }
  | { status: "private";  owner: PublicOwner }
  | { status: "notFound" }
```

## Implementation Units

- [x] **Unit 1: Rewrite `api.lists.getBySlug` to a discriminated union**

**Goal:** Replace `EnrichedList | null` return shape with `{ status: "ok" | "private" | "notFound", ... }` so consumers can distinguish private from not-found.

**Requirements:** R6

**Dependencies:** None (must land first; all other units depend on the new shape).

**Files:**
- Modify: `packages/backend/convex/lists.ts`

**Approach:**
- Rewrite the `returns: v.union(...)` validator as three variants. Reuse the existing sanitized `owner` projection already used for `status: "ok"` inside the `private` variant (username, displayName, avatar — whatever the current projection already exposes).
- Move the current "private → null" branch to `return { status: "private", owner: sanitizedOwner }`.
- Move the current "not found → null" branch to `return { status: "notFound" }`.
- Wrap the successful enriched list in `{ status: "ok", list: enriched }`.
- Mirror the shape conventions of `checkListAccess` (lines 31-82 of same file) for internal consistency.

**Patterns to follow:**
- `checkListAccess` at `packages/backend/convex/lists.ts:31-82` — same discriminated-union style.

**Test scenarios:**
- Test expectation: none -- no test infra exists in `packages/backend`; coverage via manual PR checklist + compile-time `v.union` validator. Adding convex-test is out of scope (see Scope Boundaries).

**Verification:**
- Convex `pnpm check` passes with the new validator.
- `rg "getBySlug" apps/` shows all consumers either updated in later units or compile-erroring on the old shape, not silently accepting `null`.

- [x] **Unit 2: Update Expo consumer of `getBySlug`**

**Goal:** Unwrap the new discriminated result in the Expo list detail screen so existing behavior is preserved and the `private` variant gets a graceful UI path.

**Requirements:** R6, R9

**Dependencies:** Unit 1.

**Files:**
- Modify: `apps/expo/src/app/list/[slug].tsx`

**Approach:**
- Treat `undefined` as loading (unchanged).
- Branch on `result.status`:
  - `"ok"` → existing rendering with `result.list`.
  - `"private"` → show a minimal "Private list" state (existing toast or inline message is acceptable — match native UX conventions; detailed styling is deferred to implementation).
  - `"notFound"` → existing not-found branch.
- Confirm via grep that `FollowedListsModal.tsx` and any other Expo files do not reference `getBySlug`; if any do, update them here.

**Patterns to follow:**
- Existing `useQuery` usage in the same file.
- Any existing Expo "private" / restricted-access patterns (grep `private` across `apps/expo/src/app/`).

**Test scenarios:**
- Happy path: open a public list in the app → list renders as before.
- Edge case: open a private list URL (one the user does not follow) → private-state UI shown, no crash.
- Error path: open an unknown slug → not-found UI shown, no crash.

**Verification:**
- Manual: navigate to a public list, a private list, and a bogus slug in the Expo app; each renders the expected state.
- `pnpm check` and `pnpm lint` pass.

- [x] **Unit 3: Promote `OpenInAppBanner` to a shared component**

**Goal:** Move the banner out of the event route into `apps/web/components/`, and change its prop to `deepLink: string` so it can be reused by the new list page.

**Requirements:** R4, R8

**Dependencies:** None (can run in parallel with Unit 1/2, but lands in same PR).

**Files:**
- Create: `apps/web/components/OpenInAppBanner.tsx`
- Delete: `apps/web/app/(base)/event/[eventId]/OpenInAppBanner.tsx`
- Modify: `apps/web/app/(base)/event/[eventId]/EventPageClient.tsx` (import path + prop)

**Approach:**
- Copy the existing banner file content to the new location.
- Change prop signature from `{ eventId: string }` to `{ deepLink: string; label?: string }`.
- Replace the internal `createDeepLink(\`event/${eventId}\`)` call with direct use of the `deepLink` prop.
- Keep in-app browser detection (Instagram/FB/TikTok/Twitter/LinkedIn/iOS generic), App Store fallback, and dismiss behavior unchanged.
- Update `EventPageClient.tsx`: import from the new path, pass `deepLink={createDeepLink(\`event/${eventId}\`)}`.

**Patterns to follow:**
- Existing banner styling (`rounded-xl border border-interactive-2 bg-interactive-3 p-4`, `Smartphone` + `X` icons).

**Test scenarios:**
- Happy path (event page, desktop Chrome): banner does not render (detection returns false).
- Happy path (event page, Instagram in-app browser simulated via UA override): banner renders, "Open in App" redirects to `soonlist://event/...`.
- Edge case: dismiss button hides banner for the session.

**Verification:**
- Event detail page behavior is visually identical before vs after the move (spot-check in dev + in-app browser UA simulation).
- `pnpm check` finds no dangling imports to the old path.

- [x] **Unit 4: Server-side list page entry (`page.tsx` + metadata + `PrivateListState`)**

**Goal:** Add the server component for `/list/[slug]` that does the Convex fetch, emits metadata, and routes the three statuses.

**Requirements:** R1, R2, R3

**Dependencies:** Unit 1 (needs the new `getBySlug` shape).

**Files:**
- Create: `apps/web/app/(base)/list/[slug]/page.tsx`
- Create: `apps/web/app/(base)/list/[slug]/PrivateListState.tsx`

**Approach:**
- `page.tsx` is a server component. `generateMetadata({ params })` and the default export both `await params` and call `getAuthenticatedConvex().query(api.lists.getBySlug, { slug })`. Next.js dedupes the awaited call within one request — no `cache()` wrapper needed.
- `generateMetadata` returns:
  - `title: \`${list.name} · Soonlist\`` for `ok`; `\`Private list · Soonlist\`` for `private`; `\`Not found · Soonlist\`` for `notFound`.
  - `description`: list description or `\`A list by @${owner.username}\``.
  - `openGraph`: `title`, `description`, `type: "website"`, `siteName`, `images: [defaultSocialCard]` (no cover field in schema), `locale`.
  - `twitter`: `summary_large_image` with default image.
  - `other: { "apple-itunes-app": \`app-id=6670222216, app-argument=https://www.soonlist.com/list/${slug}\` }`.
  - `robots: { index: false, follow: false }` for `private` and `notFound`.
- Default export switches on `result.status`:
  - `"notFound"` → `notFound()` from `next/navigation`.
  - `"private"` → `<PrivateListState owner={result.owner} />`.
  - `"ok"` → `<ListPageClient slug={slug} />` (client re-fetches; does not need server-passed list).
- `PrivateListState.tsx` is a pure presentation server component: shows the list's owner avatar/username, a "This list is private" card, and an `"Ask @owner for access"` CTA linking to the owner's profile.

**Patterns to follow:**
- `apps/web/app/(base)/event/[eventId]/page.tsx` — mirror structure, metadata shape, and use of `getAuthenticatedConvex()`.

**Test scenarios:**
- Happy path: public list slug → 200 with OG metadata present in `<head>` (title, description, image, `apple-itunes-app`).
- Happy path (private): private list slug → renders `PrivateListState`, `<head>` contains `robots: noindex`.
- Error path: unknown slug → 404 response.
- Integration: viewing source (or curl with a User-Agent) on a public list shows all four of `og:title`, `og:description`, `og:image`, `apple-itunes-app` meta tags.

**Verification:**
- Manual: visit a public, a private, and a bogus slug in a dev server; confirm each of the three states.
- `view-source:` on a public list shows expected OG/Twitter meta.
- `view-source:` on a private list shows `<meta name="robots" content="noindex, nofollow">`.

- [x] **Unit 5: Client shell `ListPageClient.tsx` (events + share + banner)**

**Goal:** Implement the interactive portion of the list page: paginated events, header with share action, and the smart banner.

**Requirements:** R1, R4, R5

**Dependencies:** Unit 3 (shared banner), Unit 4 (route scaffold); depends on Unit 1 for the `ok` shape (`list`).

**Files:**
- Create: `apps/web/app/(base)/list/[slug]/ListPageClient.tsx`

**Approach:**
- `"use client"` directive at top.
- Props: `{ slug: string }`. Re-fetch `list` via `useQuery(api.lists.getBySlug, { slug })` (matches `EventPageClient` pattern), guarded on `status === "ok"`.
- Events: `useStablePaginatedQuery(api.lists.getEventsForList, { slug }, { initialNumItems: 50 })` (use existing web equivalent of the Expo hook, or plain `usePaginatedQuery` if no stable wrapper exists on web — check `apps/web/hooks/` first). Load more in 25-event pages on scroll / button.
- Categorize flat `events` into `currentEvents`, `futureEvents`, `pastEvents` by comparing `startDateTime`/`endDateTime` to `Date.now()`. Pass all three arrays to `<EventList>`.
- Header:
  - List icon + name + `by @${owner.username}`.
  - Share button: if `navigator.share` available → `navigator.share({ title: list.name, url: \`https://soonlist.com/list/${slug}\` })`; else → `navigator.clipboard.writeText(url)` + `toast("Link copied")`.
- Above content: `<OpenInAppBanner deepLink={createDeepLink(\`list/${slug}\`)} />`.

**Patterns to follow:**
- `apps/web/app/(base)/event/[eventId]/EventPageClient.tsx` — client shell with Convex + banner.
- `apps/web/components/ShareButton.tsx` — share + clipboard + toast.
- Any existing web usage of `usePaginatedQuery` in `apps/web/` (grep to locate; fall back to `apps/expo/src/app/list/[slug].tsx` pagination semantics).

**Test scenarios:**
- Happy path: public list with events → events render, categorized current/future/past; "load more" fetches page 2.
- Happy path: public list with no events → `EventList` empty state shown.
- Integration (share, navigator.share available): click Share → share sheet opens with list URL.
- Integration (share, fallback): click Share → URL on clipboard, "Link copied" toast appears.
- Happy path (banner, desktop): banner hidden.
- Happy path (banner, Instagram in-app browser): banner visible, deep link is `soonlist://list/:slug`.

**Verification:**
- Manual in dev: visit a public list, paginate, trigger share on a browser without `navigator.share`, trigger share on mobile Safari where it is available.
- Visual spot check: header + banner + list render without layout jank.

- [x] **Unit 6: Delete the legacy `/[userName]/list` redirect**

**Goal:** Remove the stale redirect so route semantics are clean and there's no implicit contract for `/[userName]/list`.

**Requirements:** R7

**Dependencies:** None (but keep in same PR so the change ships atomically).

**Files:**
- Delete: `apps/web/app/(base)/[userName]/list/page.tsx`
- Delete (if empty after): `apps/web/app/(base)/[userName]/list/` directory.

**Approach:**
- `rg "\\[userName\\]/list"` across the repo to confirm no lingering references (research already confirmed zero inbound links).
- Remove the file; `pnpm check` confirms nothing broke.

**Patterns to follow:** n/a — pure deletion.

**Test scenarios:**
- Error path: visiting `/some-user/list` returns 404 (was previously a redirect to `/some-user`).

**Verification:**
- Manual: hit `/someuser/list` in dev → 404.
- `rg "/list"` and `rg "\\[userName\\]/list"` return no dangling references.

## System-Wide Impact

- **Interaction graph:** `api.lists.getBySlug` is the single surface affected; consumers are enumerated (Expo `list/[slug].tsx` and the new web route). `FollowedListsModal.tsx` does not consume it (confirmed).
- **Error propagation:** Private vs notFound now flow as distinct statuses instead of collapsing to `null`. Expo must branch or visibly default to the existing not-found path for the new `private` status; Unit 2 covers this.
- **State lifecycle risks:** None significant — read-only paths.
- **API surface parity:** The Expo screen and the new web route both consume the same discriminated union, keeping behavior in lockstep. `api.lists.getEventsForList` is unchanged.
- **Integration coverage:** `generateMetadata` + Convex server query is exercised in the event route already; the list route mirrors it. Cross-layer behaviors covered by manual PR checklist.
- **Unchanged invariants:**
  - `api.lists.getEventsForList` return shape — unchanged.
  - Event detail route (`/event/[eventId]`) behavior — unchanged; banner move is mechanical.
  - `createDeepLink` signature and scheme — unchanged.
  - Convex schema (`lists` table) — unchanged.
  - Clerk auth flow — unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `getBySlug` shape change silently breaks an Expo screen we missed. | Grep all call sites before and after Unit 1; compile will fail for any `null` check on the old shape; manual QA on Expo list flow. |
| `navigator.share` behaves differently on iOS Safari vs Chrome vs in-app browsers. | Always fall back to clipboard + toast; only gate on `typeof navigator.share === "function"`. |
| New static `list/[slug]` segment conflicts with dynamic `[userName]` sibling. | Static segments win in Next.js; confirmed by routing rules and research. Verify in dev by visiting both a username and a list slug. |
| OG image falls back to default because schema has no cover field, so previews look generic. | Accepted for v1; noted in Scope Boundaries. If needed, follow up with a schema addition. |
| Smart banner renders on unexpected UAs and annoys users. | Detection list is already production-proven on the event page; no detection changes in this PR. |
| Missing Convex test infra leaves the three-status contract uncovered. | Accepted for this PR; compile-time `v.union` + manual QA. Follow-up can add convex-test. |
| Deleted `/[userName]/list` redirect breaks a bookmark. | Accepted — research confirmed zero inbound references; 404 is acceptable. |

## Documentation / Operational Notes

- PR description should include:
  - Before/after screenshots of the event page (to prove banner move is behaviorally unchanged).
  - Screenshots of the new list page in `ok`, `private`, and `notFound` states.
  - `view-source:` snippet showing OG + `apple-itunes-app` meta on a public list and `robots: noindex` on a private list.
  - Video or screenshots of an in-app browser (e.g., Instagram) showing the smart banner.
- No database migration, no feature flag, no rollout concerns. Straight merge + deploy.

## Sources & References

- **Origin document:** [docs/superpowers/specs/2026-04-13-web-list-detail-page-design.md](../superpowers/specs/2026-04-13-web-list-detail-page-design.md)
- Reference code:
  - `apps/web/app/(base)/event/[eventId]/page.tsx`
  - `apps/web/app/(base)/event/[eventId]/EventPageClient.tsx`
  - `apps/web/app/(base)/event/[eventId]/OpenInAppBanner.tsx`
  - `apps/web/lib/convex-server.ts`
  - `apps/web/lib/urlScheme.ts`
  - `apps/web/components/ShareButton.tsx`
  - `apps/web/components/EventList.tsx`
  - `packages/backend/convex/lists.ts` (`checkListAccess` at L31, `getBySlug` at L669, `getEventsForList` at L1133)
  - `packages/backend/convex/schema.ts` (`lists` table at L128)
  - `apps/expo/src/app/list/[slug].tsx`
- Related issue: #986 (param-casing standardization — out of scope).
