# Web List Detail Page Design

**Date:** 2026-04-13
**Status:** Draft

## Intent

Add a public, shareable list detail page to the Next.js web app at `/list/[slug]` that mirrors the Expo detail screen. The page must support Open Graph / Twitter previews for sharing, show a dedicated state for private lists (rather than 404), and offer a smart "Open in app" banner for mobile browsers. Remove the stale `/[userName]/list` redirect as part of the same change. Ship as one PR.

## Scope

**In scope**
- New route `apps/web/app/(base)/list/[slug]/` with server-rendered metadata, event list, and share action.
- Promote `OpenInAppBanner` from the event detail route to a shared component with a `deepLink` prop.
- Change `api.lists.getBySlug` to return a discriminated result so the web route can distinguish `notFound` from `private`. Update all Expo consumers.
- Delete the legacy `apps/web/app/(base)/[userName]/list/page.tsx` redirect.

**Out of scope**
- `/lists` index / discovery page.
- Follow/unfollow from the web page (read + share only in v1).
- Param-casing standardization across the monorepo (tracked in GitHub issue #986).
- Any change to `api.lists.getEventsForList` shape (already paginated).

## Architecture

### Route structure

```
apps/web/app/(base)/list/[slug]/
├── page.tsx               server component: generateMetadata + page entry
├── ListPageClient.tsx     client component: events, share, banner
└── PrivateListState.tsx   server component: private-list card
```

`OpenInAppBanner` moves from `apps/web/app/(base)/event/[eventId]/OpenInAppBanner.tsx` to `apps/web/components/OpenInAppBanner.tsx`. The event page imports from the new path; behavior unchanged there.

### Data flow

1. `page.tsx` calls `getAuthenticatedConvex().query(api.lists.getBySlug, { slug })` once (used by both `generateMetadata` and the page body; Next.js dedupes the request).
2. Switch on `result.status`:
   - `notFound` → `notFound()` from `next/navigation`.
   - `private` → render `<PrivateListState owner={result.owner} />` and emit `robots: noindex` metadata.
   - `ok` → render `<ListPageClient list={result.list} />`.
3. `ListPageClient` owns all event fetching via `usePaginatedQuery(api.lists.getEventsForList, { slug }, { initialNumItems: 50 })` — subsequent pages load 25 events at a time on scroll. Events are categorized into current/future/past and handed to the existing `<EventList>` component. This matches the event detail page's split: server component for metadata + list shell, client component for interactive data.

### Private vs not-found

`api.lists.getBySlug` changes from `List | null` to a discriminated union:

```ts
type GetBySlugResult =
  | { status: "ok"; list: EnrichedList }
  | { status: "private"; owner: PublicOwner }
  | { status: "notFound" };
```

The `private` variant includes the owner's public profile (username + avatar) so the web private state can show "Ask @owner for access." Expo callers unwrap with `result.status === "ok" ? result.list : null` to preserve existing behavior.

### Metadata (server-only)

`generateMetadata` produces:
- Title: `${list.name} · Soonlist`
- Description: list description or `"A list by @${owner.username}"`
- `openGraph`: title, description, type `website`, site name, image (list cover if present, else default), locale
- `twitter`: `summary_large_image` when image present, else `summary`
- `other["apple-itunes-app"]`: `app-id=6670222216, app-argument=https://www.soonlist.com/list/${slug}`
- `robots: { index: false, follow: false }` for `private` and `notFound`

### Smart banner

The shared `OpenInAppBanner` accepts `deepLink: string` and optional `label`. The list page passes `createDeepLink("list", { slug })` from `~/lib/urlScheme`. Detection of in-app iOS browsers (Instagram, Facebook, TikTok, Twitter, LinkedIn) stays in the component.

### Share action

Header-level button in `ListPageClient`:
- If `navigator.share` is available → `navigator.share({ title, url })` with `url = https://soonlist.com/list/${slug}`.
- Otherwise → copy URL to clipboard and toast "Link copied."

## Isolation & interfaces

Each unit has one purpose:
- `page.tsx` — routing, metadata, server data fetch; no UI.
- `ListPageClient.tsx` — client state (pagination, share); no data fetching beyond Convex hooks.
- `PrivateListState.tsx` — static presentation; no state.
- `OpenInAppBanner.tsx` — in-app browser detection + banner UI; receives `deepLink` as input.
- `api.lists.getBySlug` — single source of truth for slug → list/visibility decision.

## Testing

**Manual (record in PR):**
- Public list with events → renders, events paginate, share URL correct.
- Public list with no events → empty state.
- Private list → PrivateListState card shown with owner avatar; `noindex` in `<head>`.
- Unknown slug → 404.
- `/someuser/list` → 404 after cleanup.
- iOS Safari share URL → `apple-itunes-app` meta present.
- Instagram in-app browser → smart banner renders with list deep link.
- Expo app: open a list → still works with discriminated return.

**Automated:**
- Convex `getBySlug` unit coverage for all three statuses (matches existing test patterns in `packages/backend`).
- `pnpm lint:fix && pnpm format:fix && pnpm check` passes.

## Migration impact

- **Breaking return shape on `api.lists.getBySlug`.** All consumers must update in the same PR:
  - `apps/expo/src/app/list/[slug].tsx`
  - `apps/expo/src/components/FollowedListsModal.tsx` (if it uses `getBySlug`; grep to confirm)
  - Any other call sites — identified via repo-wide grep for `api.lists.getBySlug`.
- **Deleted file:** `apps/web/app/(base)/[userName]/list/page.tsx`. Grep confirms no inbound links.
- **Moved file:** `OpenInAppBanner.tsx` — event page import updated; banner behavior unchanged.

## Unresolved questions

- Should `PrivateListState` link to the owner's profile, or stay fully static? Current design: link to `/[username]`.
- Cover image for OG: do lists currently have a cover image field, or do we fall back to the site default? (Confirm in Convex schema before implementation; if absent, use the default social card.)
