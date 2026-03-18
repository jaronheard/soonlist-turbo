# Onboarding Direction: "Everything in One Place"

## Research: Consolidation Onboarding in Real iOS Apps

### 1. Notion — "All-in-one workspace"

Notion's iOS onboarding asks users what they plan to use the app for (notes, projects, wikis, databases) and then serves personalized template suggestions. The core messaging is "replace your scattered tools with one workspace." The signup flow explicitly reasserts that Notion is a multifunctional, multichannel solution that takes the place of many existing tools. The onboarding is lightweight — editable templates and unobtrusive tooltips — because the consolidation pitch does the heavy lifting: you already know you have a mess of tools, so Notion just needs to prove it can absorb them all.

**What Soonlist can steal:** The idea that the consolidation pitch is the onboarding. If people already feel the pain of scattered events, you don't need to over-explain — you just need to show them "before" (mess) and "after" (one clean list).

Sources: [Notion Onboarding on iOS (Page Flows)](https://pageflows.com/post/ios/onboarding/notion/), [Notion's Clever Onboarding (Appcues)](https://goodux.appcues.com/blog/notions-lightweight-onboarding), [How Notion Crafts Personalized Onboarding (Candu)](https://www.candu.ai/blog/how-notion-crafts-a-personalized-onboarding-experience-6-lessons-to-guide-new-users)

### 2. Readwise Reader — "All your reading in one place"

Readwise Reader positions itself as the single destination for articles, newsletters, RSS, PDFs, EPUBs, tweets, and YouTube videos. Their core pitch: "Save everything to one place, highlight like a pro, and replace several apps with Reader." The onboarding emphasizes connecting sources — Kindle, Instapaper, Pocket, email newsletters — so users immediately see their scattered reading consolidated into one feed. The emotional hook is relief: you no longer have to remember which app you saved something in.

**What Soonlist can steal:** The "connect your sources" metaphor. Readwise shows arrows flowing in from different platforms. Soonlist's version is showing event sources (Instagram, texts, flyers, email) converging into one clean list.

Sources: [Readwise Reader](https://readwise.io/read), [The Next Chapter of Readwise (Blog)](https://blog.readwise.io/readwise-reading-app/), [Readwise Reader on Hacker News](https://news.ycombinator.com/item?id=34006202)

### 3. Fantastical — "All your calendars, one app"

Fantastical's consolidation pitch is blunt: "You can throw all your other calendar apps in the trash." The onboarding immediately asks users to connect their calendar accounts (Google, iCloud, Outlook, Exchange) so the first thing they see is all their events unified. The app doesn't try to teach features first — it prioritizes getting data in so the user sees the value of consolidation immediately. Calendar sets let users group work, personal, and family calendars, reinforcing the "everything belongs here" feeling.

**What Soonlist can steal:** The idea that the fastest path to the "aha moment" is showing the user their own mess, organized. Fantastical doesn't explain calendars — it just shows you yours, unified. Soonlist's equivalent: show the user what their scattered screenshots would look like as one clean event feed.

Sources: [Fantastical](https://flexibits.com/fantastical), [Fantastical vs Apple Calendar (Setapp)](https://setapp.com/app-reviews/fantastical-vs-apple-calendar), [Fantastical Review (TechRadar)](https://www.techradar.com/phones/iphone/is-your-calendar-a-mess-this-app-solved-my-schedule-woes-on-all-my-devices)

### 4. Spark Mail — "All your email, intelligently sorted"

Spark's onboarding starts with a single action: pick your email provider and sign in. Within seconds, users see all their email accounts in one unified inbox, automatically sorted by priority. The consolidation message is structural — the app's default view is "Unified," showing every account in one stream — rather than copy-heavy. The Smart Inbox sorts personal messages to the top and newsletters/notifications below, giving users the instant feeling of "order from chaos" without them doing anything.

**What Soonlist can steal:** Leading with the unified view as the default state. Spark doesn't ask "would you like to consolidate your inboxes?" — it just does it. Soonlist should similarly present "one place for all your events" as an obvious fact, not a feature to be explained.

Sources: [Spark Mail Features](https://sparkmailapp.com/features), [Spark Onboarding Help](https://support.readdle.com/spark/spark-onboarding), [Spark Smart Inbox](https://sparkmailapp.com/features/smart_inbox)

### 5. Raindrop.io — "All-in-one bookmark manager"

Raindrop.io positions itself as the single place for articles, videos, PDFs, screenshots, and any link you want to save. Their messaging emphasizes that "everything lives in one place" — RSS feeds, bookmarks from browsers, PDFs, YouTube videos. The app replaced users' read-it-later apps, RSS readers, and research databases. The onboarding focuses on importing existing bookmarks and connecting browser extensions so users see their scattered saves unified immediately.

**What Soonlist can steal:** The "replaces several apps" framing. Raindrop explicitly names what it replaces. Soonlist can name the behaviors it replaces: "No more scrolling back through Instagram stories. No more lost texts. No more photos of flyers you'll forget about."

Sources: [Raindrop.io](https://raindrop.io/), [Raindrop.io as a Productivity Hack (XDA)](https://www.xda-developers.com/raindropio-productivity-hack/), [Raindrop.io All-in-One Replacement (XDA)](https://www.xda-developers.com/raindrop-bookmarking-system-replacement/)

---

## Common Patterns Across All Five Apps

1. **Name the mess explicitly.** Every consolidation app starts by naming the scattered tools/sources the user already has. The pain must be specific.
2. **Show the unified view fast.** The "after" state (everything in one place) is the product. The faster you show it, the faster you convert.
3. **Convergence visual language.** Multiple sources flowing into one stream. Arrows, icons, or lists that visually collapse many into one.
4. **Don't explain features — demonstrate the outcome.** None of these apps lead with feature lists. They lead with the feeling: relief, control, clarity.
5. **The pitch IS the onboarding.** Consolidation apps don't separate "value prop" from "onboarding." Showing everything in one place IS the value, IS the demo, IS the hook.

---

## Complete Onboarding Flow: "Everything in One Place"

**Total screens: 12** (Welcome + 10 progress-bar steps + Paywall)

**Visual language throughout:** Purple (bg-interactive-1) backgrounds on all progress-bar screens. White text. The recurring motif is "many scattered sources converging into one clean list." Survey questions are reframed to feel like personalization for the consolidation experience, not generic data collection.

---

### Screen 0: Welcome

**File:** `00-welcome.tsx`
**Progress:** None
**Background:** Light (bg-interactive-3)

**Headline:**

> Your events are everywhere

**Subtitle:**

> Soonlist brings them all into one place

**Tagline:**

> Free, community-supported

**What the user sees:**

- Soonlist logo (top center)
- FollowContextBanner (conditional)
- Illustration: a scattered collage of event source icons (Instagram logo, text message bubble, email icon, camera/photo icon, flyer icon) loosely arranged around the screen, with subtle dotted lines converging toward a single Soonlist feed preview at the bottom center. The feed preview uses the existing `assets/feed.png`.
- Three bottom actions

**What the user does:**

| Button                                 | Style         | Destination                         |
| -------------------------------------- | ------------- | ----------------------------------- |
| "Bring them together"                  | Purple filled | 01-the-mess                         |
| "Already have an account? **Sign in**" | Text link     | /sign-in (marks onboarding as seen) |
| "Got a code? **Enter it here**"        | Text link     | Opens CodeEntryModal                |

---

### Screen 1: The Mess

**File:** `01-the-mess.tsx`
**Progress:** Step 1 of 10
**Background:** Purple

**Headline:**

> Sound familiar?

**Subtitle:**

> Events buried in screenshots. Plans lost in group chats. Flyers you forgot to save. Newsletters you skimmed and closed.

**What the user sees:**

- Four mini "source cards" stacked at slight angles (like a messy pile), each representing a different source:
  - An Instagram story thumbnail with an event poster
  - A text message bubble: "you coming to the thing saturday?"
  - An email snippet: "This week in Portland..."
  - A photo of a physical flyer, slightly crooked
- Each card has a small red badge or question mark, indicating "unsaved / unorganized"
- Subtle animation: cards drift slightly, implying disorder

**What the user does:**

| Button      | Style        | Destination |
| ----------- | ------------ | ----------- |
| "That's me" | White filled | 02-the-fix  |

---

### Screen 2: The Fix

**File:** `02-the-fix.tsx`
**Progress:** Step 2 of 10
**Background:** Purple

**Headline:**

> One place. Every event.

**Subtitle:**

> No matter where you find it — Instagram, a friend's text, a flyer on the street — capture it and it lives here

**What the user sees:**

- Same source icons from Screen 1, but now they are arranged in a neat row at the top with thin lines converging downward into a single, clean Soonlist feed preview (using `assets/feed.png`)
- The feed preview shows 3-4 neatly organized event cards with dates, names, and locations
- Social proof pill: "Join thousands of people who stopped losing events"

**What the user does:**

| Button     | Style        | Destination |
| ---------- | ------------ | ----------- |
| "Continue" | White filled | 03-batch    |

---

### Screen 3: All at Once

**File:** `03-batch.tsx`
**Progress:** Step 3 of 10
**Background:** Purple

**Headline:**

> Add them all at once

**Subtitle:**

> Select up to 10 screenshots from your camera roll. We'll save every event in seconds.

**What the user sees:**

- 2x3 grid of thumbnail placeholders (using `assets/feed.png`)
- First 3 thumbnails have a purple checkmark badge overlay
- Social proof pill: "Most people have 5+ event screenshots saved already"

**What the user does:**

| Button     | Style        | Destination |
| ---------- | ------------ | ----------- |
| "Continue" | White filled | 04-goals    |

---

### Screen 4: Goals (Survey)

**File:** `04-goals.tsx`
**Progress:** Step 4 of 10
**Background:** Purple
**Data saved:** `onboardingData.goals` (string array)

**Headline:**

> What's slipping through the cracks?

**Subtitle:**

> Pick everything that applies

**Options (multi-select, checkmark on selected):**

1. Events I screenshot but never look at again
2. Plans friends text me that I forget
3. Local things I hear about too late
4. Concerts, shows, and tickets I lose track of
5. I just want everything in one place

**Validation:** At least 1 required. Error toast: "Please select at least one"

**What the user does:**

| Button     | Style                                 | Destination         |
| ---------- | ------------------------------------- | ------------------- |
| "Continue" | White filled (disabled if 0 selected) | 05-screenshot-habit |

**Note:** The goals are reframed as "problems" to reinforce the consolidation message. Each option names a specific scattered-event failure mode rather than a generic aspiration. Data maps to the same `goals` field.

---

### Screen 5: Screenshot Habit (Survey)

**File:** `05-screenshot-habit.tsx`
**Progress:** Step 5 of 10
**Background:** Purple
**Data saved:** `onboardingData.screenshotEvents`

**Headline:**

> Do you already screenshot events you want to remember?

**Options (single-select, tapping advances immediately):**

1. Yes, all the time
2. Sometimes
3. Not yet

**What the user does:** Tapping an option saves and navigates to 06-discovery-channels.

**Note:** Added a middle option ("Sometimes") to capture more signal. "Yes" and "Yes, all the time" map to the same `"Yes"` value; "Sometimes" maps to `"Yes"`; "Not yet" stays as-is.

---

### Screen 6: Discovery Channels (Survey)

**File:** `06-discovery-channels.tsx`
**Progress:** Step 6 of 10
**Background:** Purple
**Data saved:** `onboardingData.discoveryMethod`

**Headline:**

> Where do your events get lost?

**Subtitle:**

> Pick the place where you find the most events

**Options (single-select, tapping advances immediately):**

1. Instagram
2. TikTok
3. Friends' recommendations
4. Local websites/newsletters
5. Walking around town
6. Facebook

**What the user does:** Tapping an option saves and navigates to 07-try-it.

**Note:** Headline reframed from "Where do you see the most events?" to "Where do your events get lost?" — reinforcing that these sources are the problem, and Soonlist is the solution.

---

### Screen 7: Try It (Simulated Capture Demo)

**File:** `07-try-it.tsx`
**Progress:** Step 7 of 10
**Background:** Purple
**Data saved:** `onboardingData.completedShareDemo`

This screen has 3 phases that transition in sequence. The sample event card varies based on the discovery channel chosen in Screen 6 (same mapping as current implementation).

#### Phase 1: Capture

**Headline:**

> See it. Screenshot it. Done.

**Subtitle:**

> Tap below to capture this event from {source}

**What the user sees:**

- A sample event card styled to match the source selected in Screen 6 (Instagram story, TikTok post, text message, newsletter clipping, flyer photo, or Facebook event). The card shows event name, date, time, location, and a small italic "Spotted on {source}" label.

**What the user does:**

| Button               | Style        | Action         |
| -------------------- | ------------ | -------------- |
| "Capture this event" | White filled | Starts Phase 2 |

#### Phase 2: Parsing (1.5 seconds)

**Headline:**

> Capturing...

**What the user sees:**

- Pulsing sparkle icon in a circle
- "Parsing your event..."
- "AI is reading the details"

Auto-transitions to Phase 3 after 1.5s.

#### Phase 3: Result

**Headline:**

> Saved. Organized. One place.

**Subtitle:**

> Every event you capture lands right here — no sorting, no folders, no effort

**What the user sees:**

- Parsed event card (styled like the real app's event cards): date + time header, bold event name, location, "Add to Calendar" and "Save" action pills
- Fake notification banner (slides in from top after 0.8s, auto-dismisses after 3s): Soonlist app icon, "Soonlist" label, "{Event name} saved!", date and time

**What the user does:**

| Button     | Style                                   | Destination      |
| ---------- | --------------------------------------- | ---------------- |
| "Continue" | White filled (appears after 0.5s delay) | 08-notifications |

---

### Screen 8: Notifications

**File:** `08-notifications.tsx`
**Progress:** Step 8 of 10
**Background:** Purple
**Data saved:** `onboardingData.notificationsEnabled`

**Headline:**

> Never lose an event again

**Subtitle:**

> Get a notification every time an event is saved, so nothing slips through the cracks

**Footer:**

> You can always change this in Settings

**What the user sees:**

- Fake iOS notification permission dialog:
  - Dialog title: "Turn on Push Notifications to capture and remember"
  - Dialog body: "Soonlist notifies you when events are created, and to help you build a habit of capturing events"
  - "Don't Allow" button (disabled/grayed out)
  - "Allow" button (active, blue)
- Bouncing chevron-up arrow pointing at "Allow" button

**Behavior:**

- If permission already granted: navigates directly to 09-share-demo
- Otherwise: calls `registerForPushNotifications()`, saves result, navigates

**What the user does:**

| Button  | Style                        | Destination   |
| ------- | ---------------------------- | ------------- |
| "Allow" | Blue text (iOS dialog style) | 09-share-demo |

---

### Screen 9: Share Demo

**File:** `09-share-demo.tsx`
**Progress:** Step 9 of 10
**Background:** Purple

**Headline:**

> Share from any app, straight to Soonlist

**Subtitle:**

> See an event in Instagram, Safari, or a text? Tap share, tap Soonlist. It's in your feed instantly.

**What the user sees:**

- Demo video player (looping, muted, auto-playing)
  - Video URL loaded from Convex: `api.appConfig.getDemoVideoUrl`
  - Aspect ratio: 884/1920
  - Loading spinner while video loads
  - Rounded purple container

**What the user does:**

| Button     | Style        | Destination |
| ---------- | ------------ | ----------- |
| "Continue" | White filled | 10-age      |

---

### Screen 10: Age (Survey)

**File:** `10-age.tsx`
**Progress:** Step 10 of 10 (first of a 2-question rapid-fire ending)
**Background:** Purple
**Data saved:** `onboardingData.ageRange`

**Headline:**

> Almost there — how old are you?

**Options (single-select, tapping advances immediately):**

1. Under 24
2. 25-34
3. 35-44
4. 45-54
5. 55-64
6. 65+

**What the user does:** Tapping an option saves and navigates to 11-source.

---

### Screen 11: Source (Survey)

**File:** `11-source.tsx`
**Progress:** (no bar — this is the final step before paywall, same as current)
**Background:** Purple
**Data saved:** `onboardingData.source`

**Headline:**

> Last one — where did you hear about us?

**Options (single-select, tapping advances immediately):**

1. Google Search
2. TikTok
3. Searched on App Store
4. Instagram
5. Facebook
6. Through a friend
7. Other

**What the user does:** Tapping an option saves and navigates to paywall.

**Note:** Age and Source are positioned at the end as a quick "almost done" pair. They feel lightweight after the demo and notifications screens, giving users a sense of momentum into the paywall. The progress bar ends at step 10; Source has no progress bar (same pattern as current Welcome and Paywall).

---

### Screen 12: Paywall

**File:** `paywall.tsx`
**Progress:** None
**Background:** Purple

**Behavior:** Same as current implementation — auto-presents RevenueCat paywall on real devices, mock UI on simulator.

**Framing note for RevenueCat paywall copy (if customizable):**

**Headline:**

> Support Soonlist

**Subtitle:**

> Every feature is free, forever. Your support keeps it that way.

**Paywall outcomes:** Same as current (Purchased/Restored -> sign-in with subscribed=true; Cancelled/Error -> trial mode, sign-in with trial=true).

**After paywall:** Navigate to /sign-in (OAuth).

---

## Navigation Flow Diagram

```
Welcome (00) — "Your events are everywhere"
  |-- [Bring them together] --> The Mess (01)
  |-- [Sign In] --> /sign-in
  |-- [Code] --> CodeEntryModal

The Mess (01) ---------> The Fix (02)
The Fix (02) ----------> All at Once (03)
All at Once (03) ------> Goals (04)
Goals (04) ------------> Screenshot Habit (05)
Screenshot Habit (05) -> Discovery Channels (06)
Discovery Channels (06)-> Try It (07)
Try It (07) -----------> Notifications (08)
Notifications (08) ----> Share Demo (09)
Share Demo (09) -------> Age (10)
Age (10) --------------> Source (11)
Source (11) -----------> Paywall
Paywall ---------------> /sign-in
```

---

## Survey Data Mapping

All five required survey questions are present:

| Survey             | Screen    | Headline reframing                                                       |
| ------------------ | --------- | ------------------------------------------------------------------------ |
| Goals              | Screen 4  | "What's slipping through the cracks?" (problems, not aspirations)        |
| Screenshot Habit   | Screen 5  | "Do you already screenshot events you want to remember?" (minor reframe) |
| Discovery Channels | Screen 6  | "Where do your events get lost?" (names the source as the problem)       |
| Age                | Screen 10 | "Almost there — how old are you?" (quick, end-of-flow)                   |
| Source             | Screen 11 | "Last one — where did you hear about us?" (momentum into paywall)        |

---

## Justification

**Why this works for Soonlist:** Soonlist's core value proposition IS consolidation — events genuinely are scattered across Instagram, texts, email, and physical flyers, and the app genuinely does bring them into one place. Unlike aspirational framings ("go out more") that require the user to buy into an identity shift, the consolidation pitch works for anyone who has ever lost track of a plan. It is the most universally relatable framing because it describes a problem people already know they have. The simulated capture demo (Screen 7) lands harder in this context because the user has just been shown the "mess" and the "fix" — the demo becomes proof, not pitch.

**Biggest risk:** This direction may feel too utilitarian for users who don't yet have a large volume of events to track. Someone who screenshots one event a month won't feel the "chaos" that makes the consolidation pitch resonate. The "everything in one place" framing works best for power users who already feel the pain — it may underwhelm casual or aspirational users who need to be sold on the _desire_ to track events, not just the _tool_ to do it. Mitigation: the Try It demo (Screen 7) and the reframed Goals screen (Screen 4, "what's slipping through the cracks?") help even light users recognize scattered events as a real problem worth solving.
