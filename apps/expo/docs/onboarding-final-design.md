# Onboarding: Final Design

**Status:** Ready for implementation
**Date:** March 12, 2026
**Based on:** 7 design directions reviewed by 3 specialist agents (UX, iOS Design, Growth), synthesized and challenged through 2 additional rounds

---

## The Insight

Soonlist converts at 50% trial-to-paid once people try it. The product works. The problem is structural: the current onboarding buries the demo at screen 7 of 12, behind 3 surveys and 2 passive value-prop screens. Users drop before the "aha moment."

**The fix is simple: demo first, everything else second.**

---

## Flow: 6 Screens, ~30 Seconds

```
[1] The Demo (interactive capture)     — no progress bar
[2] The Result (parsed event card)     — no progress bar
[3] What Matters to You (goals)        — step 1 of 4
[4] Notifications                      — step 2 of 4
[5] Support Soonlist (paywall)         — step 3 of 4
[6] Sign In (OAuth)                    — step 4 of 4

→ Post-onboarding: First Real Capture prompt
```

**Cut from current flow:**

- Value: One Place (01) — passive, telling not showing
- Value: Batch (02) — secondary feature, too early
- Screenshot Habit survey (04) — low-value, inferable from behavior
- Discovery Channels survey (05) — move to post-onboarding or cut
- Share Demo video (08) — contextual tooltip post-onboarding instead
- Age survey (09) — move to post-sign-up prompt (day 3)
- Source survey (10) — move to post-sign-up prompt (day 3)

**Rationale for cuts:** Age, source, and discovery channels serve the founder's analytics, not the user's experience. Every survey screen is an exit point. At 37 downloads/month, losing even 1 user to survey fatigue is catastrophic. Collect this data from retained users post-sign-up — the data quality will be higher anyway.

---

## Screen-by-Screen

### Screen 1: The Demo

**File:** `01-demo.tsx`
**Progress bar:** None — this is the playground, not the form
**Data collected:** None

**Headline:**

> Save any event in one tap

**Subtitle:**

> Try it — tap the screenshot below

**What the user sees:**

- Soonlist logo (small, top center)
- Headline and subtitle
- If referral (`pendingFollowUsername` exists): `FollowContextBanner` appears between subtitle and demo area. Headline changes to: "{Name} uses Soonlist. Try it — tap the screenshot below"
- A sample event screenshot card in the center (the existing `SampleScreenshot` component — uses Instagram sample as default)
- A "Capture this event" button below the card (white pill on purple background, with a gentle breathing animation: scale 1.0 → 1.02, 2-second cycle)
- Bottom links: "Already have an account? **Sign in**" and "Got a code? **Enter it here**"

**What the user does:**

- Taps "Capture this event" → transitions in-place to parsing phase

**Parsing phase (same screen, phase state change):**

- The screenshot shrinks and floats upward
- A scanning animation passes over it: animated text fields (date, time, location, title) slide out of the screenshot and assemble below into the event card structure
- Headline changes to: "Reading..."
- Duration: 2 seconds (minimum floor, even if instant)
- Medium haptic at scan completion

**After parsing:** Auto-transitions to Screen 2

**Micro-interactions:**

- Breathing animation on capture button (subtle, not pulsing — calming, not urgent)
- Spring compression on button tap (scale to 0.95, spring back)
- Light haptic on tap
- The "text fields sliding out of screenshot" animation is the money moment — it makes the AI feel like it's _reading_, not just loading. Build with Reanimated shared values for each field (translateY + opacity).

**Design notes:**

- No progress bar. No step counter. The screen should feel like an invitation to play, not step 1 of a process.
- The canned sample event should feel like something the target user would actually encounter. Current Portland-specific events (Breakside Brewery, Alberta Arts District) are good for the Portland market.
- Photo access / camera roll scanning is deferred to post-onboarding (see "First Real Capture" below). Asking for photo permission on screen 1 of an unknown app has ~50% denial rate on iOS. One shot — don't waste it.

---

### Screen 2: The Result

**File:** `02-result.tsx`
**Progress bar:** None — still part of the demo experience
**Data collected:** None

**Headline:**

> That's it.

**Subtitle:**

> Screenshot in, organized event out. Takes 3 seconds.

**What the user sees:**

- The parsed event card (`ParsedEventCard` component) appearing with spring animation from below
- Card shows: event name, date, time, location, "Add to Calendar" and "Save" action chips
- After 800ms: fake iOS push notification slides down from top — "Soonlist — {Event Name} saved! {Date} at {Time}"
- Notification auto-dismisses after 2.5s
- "Continue" button fades in after notification dismisses
- Below Continue button, small light text: "This works from your home screen too."

**What the user does:**

- Absorbs the result
- Taps "Continue"

**Micro-interactions:**

- Event card: `SlideInDown` with spring (damping: 15, stiffness: 150)
- Success haptic (`notificationSuccess`) when card appears
- Fake notification: existing `FakeNotificationBanner` with `SlideInUp`/`SlideOutUp`
- Continue button: `FadeIn.delay(3500).duration(400)`

**Design notes:**

- The fake notification primes the user for the real notification permission request on Screen 4. They've now _seen_ what a Soonlist notification looks like and experienced its value (confirmation that the event was saved).
- "Takes 3 seconds" plants the habit seed — this isn't a one-time demo, it's a behavior.
- "This works from your home screen too" hints at the share extension without requiring a video screen.

---

### Screen 3: What Matters to You

**File:** `03-goals.tsx`
**Progress bar:** Step 1 of 4 — the bar starting here signals "a few quick things, then you're in"
**Data collected:** `goals` (multi-select array)

**Headline:**

> What do you want to do more of?

**Subtitle:**

> Pick as many as you like

**What the user sees:**

- Progress bar: step 1 of 4
- Five multi-select options (existing `QuestionOption` component):
  - "Actually go to events I hear about"
  - "Stop losing events in my camera roll"
  - "Find what's happening near me"
  - "Share plans with friends"
  - "Just exploring"
- "Continue" button (disabled until at least 1 selected)

**What the user does:**

- Taps one or more goals
- Taps "Continue"

**Micro-interactions:**

- Spring scale animation on each selection (scale to 0.97, spring back)
- Light haptic on each selection
- Checkmark icon pops in with overshoot (scale 0 → 1.1 → 1.0)
- Continue button transitions from `opacity-30` to `opacity-100` when enabled

**Data mapping (to existing schema):**
| New label | Maps to |
|-----------|---------|
| Actually go to events I hear about | Organize all my events in one place |
| Stop losing events in my camera roll | Turn my screenshots into saved plans |
| Find what's happening near me | Discover fun events near me |
| Share plans with friends | Share plans with friends |
| Just exploring | Just exploring for now |

**Design notes:**

- Goals are reframed from feature language to behavior language (from Habit Loop direction). Post-demo, these resonate because the user just _did_ the thing.
- This is the only survey screen in onboarding. Discovery channels, age, and source are collected post-sign-up (Day 3 in-app prompt).

---

### Screen 4: Notifications

**File:** `04-notifications.tsx`
**Progress bar:** Step 2 of 4
**Data collected:** `notificationsEnabled` (boolean)

**Headline:**

> Get reminded before your events

**Subtitle:**

> So the events you save actually happen

**What the user sees:**

- Progress bar: step 2 of 4
- A mock notification showing a reminder for the SAME event from the demo: "Tomorrow: {Event Name} at {Location} — {Time}"
- The mock notification slides in from the top on screen load, mimicking a real notification arrival
- Below: "Turn on reminders" button (white pill, breathing animation)
- Below that: "Maybe later" in lighter text (not grayed out, not hidden — a first-class option)
- Bottom: "You can change this anytime in Settings"

**What the user does:**

- **Taps "Turn on reminders":** Triggers real iOS notification permission prompt. Auto-advances regardless of user's system choice.
- **Taps "Maybe later":** Skips, auto-advances.

**Micro-interactions:**

- Mock notification: `SlideInUp.delay(300).duration(400)` on screen mount
- Light haptic when mock notification appears
- Breathing animation on "Turn on reminders" button

**Design notes:**

- The mock notification uses THEIR demo event, not a generic message. This connects the permission request to something the user has already experienced.
- "Get reminded before your events" frames this as a benefit to the user, not a system request.
- "Maybe later" is honest and non-manipulative. No grayed-out "Don't Allow." No bouncing chevrons. No dark patterns.
- **IMPORTANT:** Remove the fake iOS dialog with the disabled "Don't Allow" button from the current implementation. Apple has rejected apps for this. Use a custom pre-permission screen (this design) followed by the real system dialog.

---

### Screen 5: Support Soonlist

**File:** `05-support.tsx`
**Progress bar:** Step 3 of 4
**Data collected:** `subscribed`, `subscribedAt` or `trialMode`

**Headline:**

> Everything you just tried is free.

**Subtitle:**

> I'm Jaron. I built Soonlist in Portland because I kept missing events I wanted to go to. There are no ads, no data sales, and no features behind a paywall. If it's useful to you, you can help keep it going.

**What the user sees:**

- Progress bar: step 3 of 4
- Headline (large, warm)
- Subtitle paragraph (given breathing room — this is the most important text in the onboarding)
- One support option as a warm card:
  - **"Support Soonlist"** — $29.99/year
  - Below price: "That's $2.50/month"
  - Small heart icon, not a feature checklist
  - Below card: "Supporters get: a badge on your profile and early access to new features"
- Clear, full-opacity skip link: **"No thanks — I'll use Soonlist for free"**
- Below skip: "You can always support later. No one is turned away for lack of funds."

**What the user does:**

- **Taps "Support Soonlist":** Triggers RevenueCat subscription flow ($29.99/yr plan). On success → Screen 6.
- **Taps "No thanks":** → Screen 6 in free mode. No "trial." No "3 events free" limitation. Just free.

**Micro-interactions:**

- Support card: subtle shimmer on load (light gradient sweeps across once)
- Light haptic on card tap
- Skip link: no animation, no delay, no hiding. First-class citizen.

**Design notes:**

- ONE price point. Not two. At 76 MAU, monthly vs. yearly is premature optimization. Single option = less decision fatigue.
- The founder's voice ("I'm Jaron") is the trust signal. Personal > corporate. This is the Signal/Overcast/Halide pattern.
- Do NOT use "76 people use Soonlist" — at this scale, the number triggers "dead product" alarm bells. The founder's personal story is the stronger trust signal.
- Do NOT say "Unlock Soonlist" or "Try 3 events free" — these imply the free version is limited. Nothing is locked.
- Implementation: Custom paywall screen (not RevenueCat native modal). Use `Purchases.getOfferings()` programmatically to get the price, handle purchase in code, maintain the patronage voice.

---

### Screen 6: Sign In

**File:** `06-sign-in.tsx`
**Progress bar:** Step 4 of 4 (full)
**Data collected:** Auth credentials

**Headline:**

> Last step — create your account

**Subtitle:**

> So your events are saved and synced

**What the user sees:**

- Progress bar: step 4 of 4 (complete!)
- "Continue with Apple" button (black, Apple logo)
- "Continue with Google" button (white with border, Google logo)
- Bottom: "By continuing, you agree to our Terms and Privacy Policy"

**What the user does:**

- Taps Apple or Google → Clerk OAuth flow
- On success: brief success animation (checkmark), then → post-onboarding

**Micro-interactions:**

- On auth success: checkmark animation with confetti-like particle burst (800ms)
- Success haptic (`notificationSuccess`)

**Design notes:**

- If referral user: queued follow action executes automatically after sign-in. They land in the app with the referrer's events already visible.

---

## Post-Onboarding: The First 60 Seconds

**This is where 14% D7 retention gets fixed.** Onboarding must not just "end." It must hand off to a first real session.

### Moment 1: The Feed (0-5s)

User lands on feed tab. If referral → referrer's events visible. If organic → empty feed with a prominent card:

> **Ready to save your real events?**
> Pick screenshots from your camera roll — we'll turn them all into events.
> [Open Camera Roll]

The card uses the same visual language as the onboarding event card (purple border, white bg) so it feels like a continuation.

### Moment 2: Batch Capture (5-30s)

Tapping "Open Camera Roll" → photo picker (multi-select). User selects event screenshots. Soonlist parses them in parallel with progress: "Saving 3 of 5 events..."

Each parsed event drops into the feed with a satisfying animation. Now they have REAL events. They have data. They have a reason to come back.

### Moment 3: Share Extension Tooltip (30-45s)

After batch capture completes (or dismissal), a small bottom toast appears for 5 seconds:

> **Pro tip:** See an event in Instagram or Safari? Tap Share → Soonlist. No screenshot needed.

This replaces the cut Share Demo video screen. Contextual, after value, no video required.

### Moment 4: Welcome Notification (if granted)

Within 60 seconds of completing onboarding, a real push notification:

> "Welcome to Soonlist! You have {N} events saved. We'll remind you before each one."

Closes the loop on the notification permission and gives confidence it's working.

### Day 3: Deferred Survey

An in-app card appears in the feed:

> **Help us improve Soonlist**
> 3 quick questions (takes 10 seconds)

Questions: Where do you find events? / How old are you? / How did you find Soonlist?
These are the survey questions cut from onboarding. Collected from retained users = higher quality data.

---

## Referral Layer: Zero Extra Screens

| Screen               | Organic                      | Referral                                             |
| -------------------- | ---------------------------- | ---------------------------------------------------- |
| 1 (Demo)             | "Save any event in one tap"  | "{Name} uses Soonlist. Try it" + FollowContextBanner |
| 6 (Sign In)          | Standard auth                | Auth + auto-follow execution                         |
| Post-onboarding feed | Empty + batch capture prompt | Referrer's events visible + batch capture prompt     |

One `pendingFollowUsername` check per affected screen. No fork. No extra screens.

---

## What Makes This Onboarding Shareable

Three details that make people text their friends:

### 1. The Parsing Animation

Instead of a pulsing sparkle emoji, show text fields (date, time, location, title) sliding out of the screenshot and assembling into the structured event card below. Make the AI feel like it's _reading_. This 2-second animation is the entire product pitch compressed into a visual. Build with Reanimated shared values for each field.

### 2. The Founder's Voice on the Paywall

"I'm Jaron. I built Soonlist in Portland because I kept missing events." In a world of corporate paywalls, a human being asking for support is disarming. People screenshot this and send it to friends because it feels different from everything else on their phone.

### 3. The Post-Onboarding Batch Capture

The moment when 5 screenshots from your camera roll transform into organized events in your feed — that's when the app stops being a demo and becomes _yours_. This is the real aha moment, and it happens within 60 seconds of completing onboarding.

---

## Implementation Priority

### Phase 1: Ship this week

- Reorder screens: move try-it demo to screen 1-2 (reuse existing `SampleScreenshot`, `ParsingAnimation`, `ParsedEventCard`, `FakeNotificationBanner`)
- Cut screens: value-one-place, value-batch, screenshot-habit, discovery-channels, share-demo, age, source
- Rewrite goals copy to behavior framing
- Remove fake iOS notification dialog (dark pattern) from notifications screen
- Update `TOTAL_ONBOARDING_STEPS` to 4
- Add post-onboarding "first real capture" card to feed

### Phase 2: Next sprint

- Custom patronage paywall (replace RevenueCat native modal)
- Founder photo/voice on paywall screen
- Parsing animation upgrade (text fields sliding out of screenshot)
- Share extension tooltip post-onboarding
- Welcome push notification

### Phase 3: After measuring

- Per-screen funnel analytics (PostHog events)
- Day 3 deferred survey prompt
- Referral conditional copy refinements
- Camera roll scanning during onboarding (Phase 2+ — needs user trust first)
- City-aware sample events via CoreLocation

---

## Analytics Events

| Event                           | Properties                                    |
| ------------------------------- | --------------------------------------------- |
| `onboarding_screen_viewed`      | `screen`, `isReferral`, `timestamp`           |
| `onboarding_screen_completed`   | `screen`, `isReferral`, `durationMs`          |
| `onboarding_paywall_action`     | `action` (support/skip), `isReferral`         |
| `onboarding_completed`          | `totalDurationMs`, `isReferral`, `subscribed` |
| `post_onboarding_batch_capture` | `eventsCount`                                 |
| `post_onboarding_tooltip_seen`  | `dismissed`                                   |
| `deferred_survey_completed`     | `discoveryMethod`, `ageRange`, `source`       |

---

## Files to Modify

| Action      | File                                            | Notes                                         |
| ----------- | ----------------------------------------------- | --------------------------------------------- |
| Rewrite     | `00-welcome.tsx` → `01-demo.tsx`                | Merge try-it demo to screen 1                 |
| Rewrite     | `06-try-it.tsx` → `02-result.tsx`               | Result phase becomes screen 2                 |
| Update copy | `03-goals.tsx`                                  | Behavior-framed goal labels                   |
| Rewrite     | `07-notifications.tsx` → `04-notifications.tsx` | Remove fake iOS dialog, add mock notification |
| Rewrite     | `paywall.tsx` → `05-support.tsx`                | Custom patronage screen                       |
| Update      | `_layout.tsx`                                   | `TOTAL_ONBOARDING_STEPS = 4`                  |
| Delete      | `01-value-one-place.tsx`                        | Cut                                           |
| Delete      | `02-value-batch.tsx`                            | Cut                                           |
| Delete      | `04-screenshot-habit.tsx`                       | Cut                                           |
| Delete      | `05-discovery-channels.tsx`                     | Cut (move to day 3 survey)                    |
| Delete      | `08-share-demo.tsx`                             | Cut (replace with tooltip)                    |
| Delete      | `09-age.tsx`                                    | Cut (move to day 3 survey)                    |
| Delete      | `10-source.tsx`                                 | Cut (move to day 3 survey)                    |

---

## Flow Diagram

```
                     App opens
                        |
                  Has seen onboarding?
                   /              \
                 NO                YES
                  |                 |
            [1] Demo           Main App
                  |
            [2] Result
                  |
            [3] Goals ← progress bar starts (1/4)
                  |
            [4] Notifications (2/4)
                  |
            [5] Support Soonlist (3/4)
                  |
            [6] Sign In (4/4)
                  |
            Main App
                  |
         [Post] First Real Capture card
                  |
         [Post] Batch capture from camera roll
                  |
         [Post] Share extension tooltip
                  |
         [Day 3] Deferred survey prompt
```

---

## Success Metrics

| Metric                      | Current | Target | How to measure                                                |
| --------------------------- | ------- | ------ | ------------------------------------------------------------- |
| Screens before aha          | 7       | 1      | Count                                                         |
| Onboarding completion rate  | Unknown | 80%+   | `onboarding_completed` / `onboarding_screen_viewed(screen=1)` |
| Download → trial start      | 10.8%   | 25%+   | RevenueCat + analytics                                        |
| Download → account creation | 37.8%   | 60%+   | Clerk signups / downloads                                     |
| D7 retention                | 14%     | 25%+   | PostHog cohort                                                |
| Notification opt-in rate    | Unknown | 60%+   | `notificationsEnabled`                                        |
| Paywall conversion          | Unknown | 8%+    | RevenueCat                                                    |

---

## What This Doesn't Solve

- **App Store conversion (3.3% impression-to-download):** That's an ASO/creative problem, not an onboarding problem
- **Content cold start for organic users:** If the user has no events and follows no one, the feed is empty after onboarding. The batch capture prompt addresses this but can't force it
- **Long-term retention:** Onboarding creates first-session value; habit formation requires ongoing engagement loops (reminders, weekly digests, social features)
