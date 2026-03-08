# Onboarding Flow

Progress bar: 10 steps (screens 01–10). Welcome (00) and Paywall have no progress bar.

---

## Design Intentions

The previous onboarding was survey-heavy — 5 out of 8 steps were data-collection questions, with no product demonstration until the very end (a passive video). Users answered questions, hit a paywall, and signed up without ever experiencing what Soonlist actually does. This redesign is guided by five principles:

1. **Show the value proposition up front.** Before asking anything, show users what Soonlist is: one place for all your events, no matter the source, with the ability to capture them all at once from your camera roll. The user should understand the product before we ask them to invest in it.

2. **Let people try it before they sign up.** The core magic of Soonlist is turning a screenshot into a structured event. Users should experience that moment — tap capture, watch the AI parse, see the result — before creating an account. This is the "aha moment" and it should happen as early as possible.

3. **Teach the share extension.** The share extension is the primary way power users add events, but the previous onboarding buried a demo video at step 8. The new flow gives the share extension its own dedicated screen with a video walkthrough, positioned after users have already experienced the capture flow and understand what the app does.

4. **Free and community-supported.** Soonlist is free to use — all features, no event limits. The previous flow had a 3-event free limit enforced by the add-event button and a hard paywall gate. Both have been removed. The paywall remains as a support/upgrade opportunity but never blocks the user. Community messaging ("Free, community-supported", social proof banners) is woven throughout to reinforce this identity.

5. **Earn every permission with context.** Rather than asking for notification permission cold, the flow first simulates a capture that triggers a fake push notification ("Event saved!"). The user sees exactly what notifications look like and why they're useful, then the very next screen asks for the real permission. Every ask is preceded by a reason.

---

## Directions to Explore

Seven lenses for the onboarding. These aren't mutually exclusive — they can be combined, and the strongest versions probably blend two or three. Each one could reshape the copy, screen order, or flow without necessarily requiring new product features.

1. **Try it immediately.** Get to the capture simulation as early as possible. The core magic — screenshot becomes structured event — speaks for itself. Could the "aha moment" be screen 1 or 2 instead of screen 6? The tension: do you need context first, or does the experience create its own context?

2. **"I'm here because of someone's list."** Many users arrive from seeing a friend's shared list. The onboarding could lead with that person: "See [name]'s upcoming events," with a follow action built in. If you came from a list, the list is the hook. If organic, fall back to the general value prop. Could even gate on referral context — two different opening experiences depending on how you arrived.

3. **Go out more.** An aspirational tone shift. People find events scattered across Instagram stories, texts, flyers — it's reactive and scattered. Soonlist is the intentional version: actually see what's out there, actually follow through, actually go out more. The framing is "be the person who goes to things" rather than "save screenshots." This reshapes the value screen copy and the overall emotional register without changing the flow structure.

4. **Everything in one place.** Push hard on the consolidation utility. Events are everywhere — different apps, group chats, screenshots, email newsletters, flyers on the street. Soonlist is the single place they all live. This is the most literal, practical framing: you have a mess, here's the fix. Works well for people who already have the problem and know it.

5. **The habit loop.** Frame the onboarding around the rhythm rather than the features: "See an event. Screenshot it. Soonlist does the rest. Do it once and you'll do it every time." Plant the seed of a weekly routine — not by building streak mechanics or digests, just through how the copy talks about the product. The value screens show the loop in action rather than listing capabilities.

6. **Tell a story.** Instead of stating features across the value screens, tell a mini-narrative. Screen 1: the messy "before" (screenshots buried in your camera roll, texts you forgot, flyers you walked past). Screen 2: the capture moment. Screen 3: the organized "after" (everything in one place, plans with friends, you actually went). Each screen is a chapter. Same flow, but emotional rather than informational.

7. **Free and community-supported.** Lead with the identity, not the features. Soonlist is free — all features, no limits, no gates. It's community-supported, not VC-funded-and-trying-to-convert-you. This could be more than a tagline: it could be the core message of the welcome screen, reinforced through social proof ("Join thousands of people..."), and reflected in a softer paywall framing ("Support Soonlist" rather than "Unlock Soonlist").

### Detailed Direction Designs

Each direction has been researched (3-5 real iOS app examples) and designed as a complete screen-by-screen onboarding flow with exact copy, UI elements, and navigation. Full documents are in `docs/`.

| # | Direction | File | Research examples | Welcome headline | Key structural change |
|---|-----------|------|-------------------|------------------|-----------------------|
| 1 | Try it immediately | [`onboarding-design-try-it-immediately.md`](docs/onboarding-design-try-it-immediately.md) | Duolingo, Photoroom, Robinhood, Headspace, Calm | "Screenshot. Tap. Done." | Capture simulation is screen 1 (not screen 6). No value screens precede it. |
| 2 | Someone's list | [`onboarding-design-someones-list.md`](docs/onboarding-design-someones-list.md) | Discord, Partiful, Clubhouse, Venmo, Strava | Referral: "[Name] wants you to see what's coming up" / Organic: "Turn screenshots into plans" | Two diverging paths based on referral context. Referral users see the sharer's real event list. |
| 3 | Go out more | [`onboarding-design-go-out-more.md`](docs/onboarding-design-go-out-more.md) | Strava, Headspace, Opal, Noom, Duolingo | "Be the person who actually goes" | Aspirational tone throughout. Goals reframed as lifestyle aspirations ("Go to more concerts"). Problem/promise pair before demo. |
| 4 | Everything in one place | [`onboarding-direction-everything-in-one-place.md`](docs/onboarding-direction-everything-in-one-place.md) | Notion, Readwise Reader, Fantastical, Spark Mail, Raindrop.io | "Your events are everywhere" | Before/after pair (mess → fix) as screens 1-2. Survey reframed as problems ("What's slipping through the cracks?"). |
| 5 | The habit loop | [`onboarding-design-habit-loop.md`](docs/onboarding-design-habit-loop.md) | Duolingo, Headspace, Fabulous, Atoms, Calm | "See it. Screenshot it. Soonlist does the rest." | Rhythm visualization on screen 1. Screenshot habit survey moved early as validation. Age+source combined into one screen. |
| 6 | Tell a story | [`onboarding-story-direction.md`](docs/onboarding-story-direction.md) | Headspace, Florence, Finch, Duolingo, Noom | "Maya spotted a poster for a jazz night..." | Character-driven narrative. Surveys embedded in story chapters. Illustrated scenes required. |
| 7 | Free and community | [`onboarding-design-free-community-supported.md`](docs/onboarding-design-free-community-supported.md) | Signal, Overcast, Wikipedia, Mastodon, Halide | "Turn screenshots into plans" + "Free forever. Community-supported." | "Made by people, not a corporation" screen. Paywall reframed as "Support Soonlist" with patronage tiers. |

### Cross-Direction Comparison

**Where the capture demo lives:**
- Screen 1-3: Direction 1 (try it immediately)
- Screen 4-5 (referral) / Screen 6 (organic): Direction 2 (someone's list)
- Screen 6: Directions 3, 4, 7
- Screen 4: Direction 5 (habit loop)
- Screen 5: Direction 6 (tell a story)

**How survey questions are reframed:**
- Directions 1, 2, 7: Keep original copy, reorder
- Direction 3: Aspirational ("What kind of plans do you want to make?" / "Sound familiar?")
- Direction 4: Problem-framed ("What's slipping through the cracks?" / "Where do your events get lost?")
- Direction 5: Behavior-framed ("What do you want to do more of?" / goals as outcomes)
- Direction 6: Embedded in narrative (asked during Maya's story chapters)

**Paywall framing:**
- Directions 1-5: Standard RevenueCat with tweaked copy
- Direction 6: "If Maya's story resonated, you can help us keep building it for everyone"
- Direction 7: Full reframe — "Support Soonlist" with patronage tiers, Wikipedia-style community math, no feature gating

**Biggest production investment:**
- Direction 6 (story) requires 9+ illustrated scenes in a consistent style
- Direction 2 (someone's list) requires fetching real referrer data + two path implementations
- Directions 1, 3, 4, 5, 7 are primarily copy/reorder changes to existing screens

---

## Previous Flow (before this branch)

The original flow had 8 progress-bar steps plus Welcome and Paywall.

```
Welcome (00) → Intro (01) → Goals (02) → Screenshot Habit (03)
→ Discovery Channels (04) → Age (05) → Source (06) → Notifications (07)
→ Demo Video (08) → Paywall → /sign-in
```

| #   | Screen             | File                        | Progress | Type          |
| --- | ------------------ | --------------------------- | -------- | ------------- |
| 0   | Welcome            | `00-welcome.tsx`            | None     | Welcome       |
| 1   | Intro              | `01-intro.tsx`              | 2 of 8   | Value (light) |
| 2   | Goals              | `02-goals.tsx`              | 3 of 8   | Survey        |
| 3   | Screenshot Habit   | `03-screenshot-habit.tsx`   | 4 of 8   | Survey        |
| 4   | Discovery Channels | `04-discovery-channels.tsx` | 5 of 8   | Survey        |
| 5   | Age                | `05-age.tsx`                | 6 of 8   | Survey        |
| 6   | Source             | `06-source.tsx`             | 7 of 8   | Survey        |
| 7   | Notifications      | `07-notifications.tsx`      | 7 of 8   | Permission    |
| 8   | Demo Video         | `08-demo-intro.tsx`         | 8 of 8   | Value         |
| —   | Paywall            | `paywall.tsx`               | None     | Paywall       |

### Previous screen details

**Screen 0: Welcome** — Same structure as current. Navigated to `01-intro`. Did not have the "Free, community-supported" tagline.

**Screen 1: Intro** (`01-intro.tsx`) — Headline: "Welcome to Soonlist" / Subtitle: "We'll customize your experience based on a few quick questions." Showed `SocialProofTestimonials` component. Single "Continue" button to Goals.

**Screens 2–6: Survey** — Goals, Screenshot Habit, Discovery Channels, Age, Source. Same questions and options as current. The ordering was: all five survey screens in a row, then notifications and demo at the end. Discovery Channels navigated directly to Age (no Try It screen existed).

**Screen 7: Notifications** (`07-notifications.tsx`) — Headline: "Let's get started!" / Subtitle: "Turn on notifications to save events, get reminders, and never miss what's coming up." Same fake iOS dialog and bouncing chevron. Navigated to `08-demo-intro`.

**Screen 8: Demo Video** (`08-demo-intro.tsx`) — Headline: "See how it works" / Subtitle: "Watch a quick demo of Soonlist in action." Full-screen video player with share extension demo video from Convex. Navigated to Paywall. Saved `watchedDemo: true`.

**Paywall** — Same as current.

### Previous AddEventButton behavior

The add-event button had a 3-event free limit enforced via RevenueCat:

- First 3 events: always allowed
- After 3 events: required "unlimited" entitlement, otherwise prompted the upgrade paywall
- Showed a Lock icon when gated

This gating has been removed. All features are now free.

---

# Current Flow

---

## Screen 0: Welcome

**File:** `00-welcome.tsx`
**Progress:** None
**Background:** Light (bg-interactive-3)

### Copy

- **Headline:** Turn screenshots into **plans**
- **Subtitle:** Save events in one tap. All in one place
- **Tagline:** Free, community-supported

### Elements

- Soonlist logo (top center)
- FollowContextBanner (conditional, appears when arriving from a follow link)
- Feed preview image (`assets/feed.png`)

### Actions

| Button                                 | Style         | Destination                         |
| -------------------------------------- | ------------- | ----------------------------------- |
| "Get Started"                          | Purple filled | 01-value-one-place                  |
| "Already have an account? **Sign in**" | Text link     | /sign-in (marks onboarding as seen) |
| "Got a code? **Enter it here**"        | Text link     | Opens CodeEntryModal                |

---

## Screen 1: Value — One Place

**File:** `01-value-one-place.tsx`
**Progress:** Step 1 of 10
**Background:** Purple (bg-interactive-1, via QuestionContainer)

### Copy

- **Headline:** One place for all your events
- **Subtitle:** No matter where you find them — Instagram, flyers, texts — save them all here
- **Social proof banner:** Join thousands of people saving events with Soonlist

### Elements

- Feed preview image (`assets/feed.png`)
- Social proof pill (white/10 background)

### Actions

| Button     | Style        | Destination    |
| ---------- | ------------ | -------------- |
| "Continue" | White filled | 02-value-batch |

---

## Screen 2: Value — Batch Capture

**File:** `02-value-batch.tsx`
**Progress:** Step 2 of 10
**Background:** Purple

### Copy

- **Headline:** Add them all at once
- **Subtitle:** Select multiple screenshots from your camera roll and save them in seconds
- **Social proof banner:** Most people have 5+ event screenshots saved already

### Elements

- 2x3 grid of thumbnail placeholders (using `assets/feed.png`)
- First 3 thumbnails have a purple checkmark badge overlay

### Actions

| Button     | Style        | Destination |
| ---------- | ------------ | ----------- |
| "Continue" | White filled | 03-goals    |

---

## Screen 3: Goals

**File:** `03-goals.tsx`
**Progress:** Step 3 of 10
**Background:** Purple
**Data saved:** `onboardingData.goals` (string array)

### Copy

- **Headline:** What do you want to use Soonlist for?
- **Subtitle:** Pick as many as you like

### Options (multi-select, checkmark on selected)

1. Organize all my events in one place
2. Turn my screenshots into saved plans
3. Discover fun events near me
4. Share plans with friends
5. Just exploring for now

### Validation

- At least 1 goal required. Error toast: "Please select at least one goal"

### Actions

| Button     | Style                                        | Destination         |
| ---------- | -------------------------------------------- | ------------------- |
| "Continue" | White filled (disabled/dimmed if 0 selected) | 04-screenshot-habit |

---

## Screen 4: Screenshot Habit

**File:** `04-screenshot-habit.tsx`
**Progress:** Step 4 of 10
**Background:** Purple
**Data saved:** `onboardingData.screenshotEvents` ("Yes" | "Not yet")

### Copy

- **Headline:** Do you already screenshot events you're interested in?

### Options (single-select, tapping advances immediately)

1. Yes
2. Not yet

### Actions

Tapping an option saves and navigates to 05-discovery-channels.

---

## Screen 5: Discovery Channels

**File:** `05-discovery-channels.tsx`
**Progress:** Step 5 of 10
**Background:** Purple
**Data saved:** `onboardingData.discoveryMethod`

### Copy

- **Headline:** Where do you see the most events?

### Options (single-select, tapping advances immediately)

1. Instagram
2. TikTok
3. Friends' recommendations
4. Local websites/newsletters
5. Walking around town
6. Facebook

### Actions

Tapping an option saves and navigates to 06-try-it.

---

## Screen 6: Try It

**File:** `06-try-it.tsx`
**Progress:** Step 6 of 10
**Background:** Purple
**Data saved:** `onboardingData.completedShareDemo` (boolean)

This screen has 3 phases that transition in sequence.

### Phase 1: Screenshot

**Copy:**

- **Headline:** Capture any event screenshot
- **Subtitle:** We'll do the rest

**Elements:**
A sample event card that varies based on the discovery channel chosen in screen 5:

| Discovery Channel          | Event Name                | Location                    | Date        | Time     | Source label       |
| -------------------------- | ------------------------- | --------------------------- | ----------- | -------- | ------------------ |
| Instagram                  | Rooftop Sunset DJ Set     | The Hoxton, Portland        | Sat, Mar 22 | 6:00 PM  | Instagram Story    |
| TikTok                     | Pop-Up Night Market       | Pioneer Courthouse Square   | Fri, Mar 21 | 5:00 PM  | TikTok             |
| Friends' recommendations   | Game Night at the Brewery | Breakside Brewery, Portland | Thu, Mar 20 | 7:00 PM  | a friend's text    |
| Local websites/newsletters | Spring Art Walk           | Alberta Arts District       | Sat, Mar 22 | 12:00 PM | a local newsletter |
| Walking around town        | Live Jazz & Open Mic      | Jack London Revue           | Fri, Mar 21 | 8:00 PM  | a flyer            |
| Facebook                   | Community Volunteer Day   | Forest Park, Portland       | Sun, Mar 23 | 9:00 AM  | Facebook           |

The card layout:

- Purple header with event name + date
- White body with time, location, and italic "Spotted on {source}" text

**Actions:**
| Button | Style | Action |
|--------|-------|--------|
| "📸 Capture this event" | White filled | Starts Phase 2 |

### Phase 2: Parsing (1.5 seconds)

**Copy:**

- **Headline:** Capturing...

**Elements:**

- Pulsing sparkle emoji (✨) in a circle
- "Parsing your event..."
- "AI is reading the details"

After 1.5s, auto-transitions to Phase 3.

### Phase 3: Result

**Copy:**

- **Headline:** That's it!
- **Subtitle:** Screenshots become organized events, automatically

**Elements:**

- Parsed event card (styled like the real app's event cards):
  - Date + time header
  - Bold event name
  - Location
  - "Add to Calendar" and "Save" action pills
- Fake notification banner (slides in from top after 0.8s, auto-dismisses after 3s):
  - Soonlist app icon (purple square with "S")
  - "Soonlist" label
  - "{Event name} saved!"
  - Date and time

**Actions:**
| Button | Style | Destination |
|--------|-------|-------------|
| "Continue" | White filled (appears after 0.5s delay) | 07-notifications |

---

## Screen 7: Notifications

**File:** `07-notifications.tsx`
**Progress:** Step 7 of 10
**Background:** Purple
**Data saved:** `onboardingData.notificationsEnabled` (boolean)

### Copy

- **Headline:** Never miss an event
- **Subtitle:** Get notified when events are saved so you can stay on top of your plans
- **Footer:** You can always update this later in your settings!

### Elements

- Fake iOS notification permission dialog:
  - **Dialog title:** Turn on Push Notifications to capture and remember
  - **Dialog body:** Soonlist notifies you when events are created, and to help you build a habit of capturing events
  - **"Don't Allow"** button (disabled/grayed out)
  - **"Allow"** button (active, blue)
- Bouncing chevron-up arrow pointing at "Allow" button

### Behavior

- If permission already granted: navigates directly to 08-share-demo
- Otherwise: calls `registerForPushNotifications()`, saves result, navigates

### Actions

| Button  | Style                        | Destination   |
| ------- | ---------------------------- | ------------- |
| "Allow" | Blue text (iOS dialog style) | 08-share-demo |

---

## Screen 8: Share Demo

**File:** `08-share-demo.tsx`
**Progress:** Step 8 of 10
**Background:** Purple

### Copy

- **Headline:** Share into the app
- **Subtitle:** Use the share button from any app to save events directly to Soonlist

### Elements

- Demo video player (looping, muted, auto-playing)
  - Video URL loaded from Convex: `api.appConfig.getDemoVideoUrl`
  - Aspect ratio: 884/1920 (phone screen recording)
  - Loading spinner while video loads
  - Rounded purple container

### Actions

| Button     | Style        | Destination |
| ---------- | ------------ | ----------- |
| "Continue" | White filled | 09-age      |

---

## Screen 9: Age

**File:** `09-age.tsx`
**Progress:** Step 9 of 10
**Background:** Purple
**Data saved:** `onboardingData.ageRange`

### Copy

- **Headline:** How old are you?

### Options (single-select, tapping advances immediately)

1. Under 24
2. 25-34
3. 35-44
4. 45-54
5. 55-64
6. 65+

### Actions

Tapping an option saves and navigates to 10-source.

---

## Screen 10: Source

**File:** `10-source.tsx`
**Progress:** Step 10 of 10
**Background:** Purple
**Data saved:** `onboardingData.source`

### Copy

- **Headline:** Where did you hear about us?

### Options (single-select, tapping advances immediately)

1. Google Search
2. TikTok
3. Searched on App Store
4. Instagram
5. Facebook
6. Through a friend
7. Other

### Actions

Tapping an option saves and navigates to paywall.

---

## Screen 11: Paywall

**File:** `paywall.tsx`
**Progress:** None
**Background:** Purple (bg-interactive-1)

### Behavior

This screen auto-presents the RevenueCat paywall modal on real devices. On simulator, it shows a mock UI.

**Auto-checks:**

- If user already has "unlimited" entitlement: skips paywall, marks onboarding complete, navigates to /sign-in
- If real device + not subscribed: presents RevenueCat paywall

### Paywall outcomes

| Result               | Action                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Purchased / Restored | Saves `subscribed: true`, completes onboarding, navigates to /sign-in with `subscribed=true`         |
| Not Presented        | User already has entitlement — same as Purchased                                                     |
| Cancelled / Error    | Enters trial mode (`trialMode: true`), completes onboarding, navigates to /sign-in with `trial=true` |

### Mock Paywall (simulator only)

**Copy:**

- **Headline:** Unlock Soonlist
- **Subtitle:** Save unlimited events and never miss out
- **Badge:** (Mock Paywall - Simulator Mode)

**Mock plans:**
| Plan | Price | Label |
|------|-------|-------|
| Monthly | $9.99/month | Cancel anytime |
| Yearly | $59.99/year | Save 50% - Best value / BEST VALUE badge |

**Copy:**

- "Tap a plan to simulate purchase"
- "Try 3 events free" (skip link)

### Real Device Loading Screen

**Copy:**

- "Initializing..." or "Loading subscription options..."
- "Skip for now" (link, appears before paywall is presented)

---

## Data Model

### OnboardingData (persisted to Convex)

| Field                  | Type                                                                                                                           | Set by screen                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| `goals`                | `string[]`                                                                                                                     | 03-goals                          |
| `screenshotEvents`     | `"Yes" \| "Not yet"`                                                                                                           | 04-screenshot-habit               |
| `discoveryMethod`      | `"Instagram" \| "TikTok" \| "Friends' recommendations" \| "Local websites/newsletters" \| "Walking around town" \| "Facebook"` | 05-discovery-channels             |
| `completedShareDemo`   | `boolean`                                                                                                                      | 06-try-it                         |
| `notificationsEnabled` | `boolean`                                                                                                                      | 07-notifications                  |
| `ageRange`             | `"Under 24" \| "25-34" \| "35-44" \| "45-54" \| "55-64" \| "65+"`                                                              | 09-age                            |
| `source`               | `"Google Search" \| "TikTok" \| "Searched on App Store" \| "Instagram" \| "Facebook" \| "Through a friend" \| "Other"`         | 10-source                         |
| `subscribed`           | `boolean`                                                                                                                      | paywall                           |
| `subscribedAt`         | `string` (ISO date)                                                                                                            | paywall                           |
| `subscriptionPlan`     | `string`                                                                                                                       | paywall (mock)                    |
| `trialMode`            | `boolean`                                                                                                                      | paywall                           |
| `trialStartedAt`       | `string` (ISO date)                                                                                                            | paywall                           |
| `watchedDemo`          | `boolean`                                                                                                                      | (legacy, not set in current flow) |
| `completedAt`          | `string` (ISO date)                                                                                                            | set by `completeOnboarding()`     |

### OnboardingStep (analytics tracking IDs)

`welcome`, `intro`, `goals`, `screenshot`, `discovery`, `shareDemoTryIt`, `notifications`, `age`, `source`, `demo`, `demoIntro`, `screenshotDemo`, `addScreenshot`, `success`, `paywall`, `readyNotifications`

---

## Navigation Flow Diagram

```
Welcome (00)
  ├─ [Get Started] ──→ Value: One Place (01)
  ├─ [Sign In] ──→ /sign-in
  └─ [Code] ──→ CodeEntryModal

Value: One Place (01) ──→ Value: Batch (02)
Value: Batch (02) ──→ Goals (03)
Goals (03) ──→ Screenshot Habit (04)
Screenshot Habit (04) ──→ Discovery Channels (05)
Discovery Channels (05) ──→ Try It (06)
Try It (06) ──→ Notifications (07)
Notifications (07) ──→ Share Demo (08)
Share Demo (08) ──→ Age (09)
Age (09) ──→ Source (10)
Source (10) ──→ Paywall
Paywall ──→ /sign-in
```

---

## Layout & Shared Components

**`_layout.tsx`**: Wraps all onboarding screens in a `Stack` with `ios_from_right` animation. Redirects authenticated users to `/(tabs)/feed`. Exports `TOTAL_ONBOARDING_STEPS = 10`.

**`QuestionContainer`**: Shared wrapper used by screens 01–10. Provides:

- `SafeAreaView` with purple background
- `ProgressBar` (currentStep / totalSteps)
- Headline text (white, 3xl, bold)
- Optional subtitle (white/80, xl)
- Children slot

**`QuestionOption`**: Shared option row component used by survey screens (03–05, 09–10).
