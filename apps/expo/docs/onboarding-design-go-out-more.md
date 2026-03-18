# Onboarding Design: "Go Out More"

## Research: Aspirational/Identity-Based Onboarding in Real iOS Apps

### 1. Strava

Strava's onboarding centers on **validating who you already are**. The app calls every user an "athlete" from the first moment -- not a "user" or "runner" or "beginner." The first real action is syncing your wearable to display your last workout, which tells the user: _you already did something worth celebrating, and we see it._ The identity precedes the product. Strava never says "Track your runs." It says "You're an athlete. Here's your community." This data-first moment shows users their own effort reflected back at them within 30 seconds of opening the app, which is psychologically powerful because it validates their self-concept before asking them to do anything.

**Key takeaway:** Don't introduce the tool. Reflect the user's identity back at them.

Sources: [Strava Onboarding - App Fuel](https://www.theappfuel.com/examples/strava_onboarding), [Strava Animated Onboarding - Medium](https://medium.com/strava-design/creating-an-animated-onboarding-experience-19b0363a1326)

### 2. Headspace

Headspace opens with "Support for all of life's moments" -- not "meditation app" or "guided breathing." The onboarding immediately asks _why you're here_ ("What brings you to Headspace?") and uses the answer to frame a personal journey. The proof points are aspirational outcomes: "Just 10 days of Headspace can increase happiness by 16%." Headspace positions each user as joining a community of millions who _prioritize their mental health_, creating belonging around an identity ("I'm someone who takes care of my mind") rather than a product feature.

**Key takeaway:** Frame survey questions as self-discovery, not data collection. Anchor on outcomes ("be happier") not features ("guided meditation").

Sources: [Headspace Onboarding - App Fuel](https://www.theappfuel.com/examples/headspace_onboarding), [Headspace Onboarding UX Journey](https://behindlogin.com/news/headspace-onboarding-a-ux-journey-that-welcomes-and-delights/), [Headspace UX Case Study](https://raw.studio/blog/how-headspace-designs-for-mindfulness/)

### 3. Opal

Opal reframes screen time restriction -- an inherently negative experience -- as a _positive identity choice_. The onboarding generates a personalized "Focus Report" that quantifies your lifetime phone usage (a shock moment), then immediately reframes it: _you could reclaim this time._ The "fist bump" commitment screen uses a playful animation where the user physically taps to commit, creating a moment of buy-in. Opal gamifies the aspirational identity through 3D gems for milestones. The message is never "block your apps" -- it's "become someone who's present."

**Key takeaway:** Create a moment of emotional reckoning (the problem) followed immediately by the aspirational reframe (the identity you could become). Use physical interaction (tap, gesture) to create commitment.

Sources: [Opal Onboarding - App Fuel](https://www.theappfuel.com/examples/opal_onboarding), [Opal App Review 2025](https://mindsightnow.com/blogs/mindful-matters/opal-app-review), [Opal - ScreensDesign](https://screensdesign.com/showcase/opal-screen-time-control)

### 4. Noom

Noom's 96+ screen onboarding is legendarily long, but the key insight is that every single screen talks about _you, your body, your psychology_ -- never the app. The first action is setting your goal weight, which puts the user's aspiration front and center. Noom assigns identity labels immediately ("Noom Novice") and provides social proof tied to those identities ("Noomers who graduate to Apprentice are 2.8x more likely to reach their goal weight"). The conversational one-sentence-per-screen format makes survey questions feel like a dialogue with a coach, not a form.

**Key takeaway:** One idea per screen. Make survey questions feel like coaching, not data extraction. Assign identity labels early.

Sources: [Noom Onboarding - Page Flows](https://pageflows.com/post/ios/onboarding/noom/), [Noom UX Case Study](https://www.justinmind.com/blog/ux-case-study-of-noom-app-gamification-progressive-disclosure-nudges/), [The Longest Onboarding Ever](https://www.retention.blog/p/the-longest-onboarding-ever)

### 5. Duolingo

Duolingo's onboarding starts from desire -- "What language do you want to learn?" -- and immediately delivers a first win. Users complete a mini-lesson within the first 2 minutes and see a score, creating a low-effort, high-dopamine moment. The identity shift is subtle but effective: by the time you finish onboarding, you've already _done the thing_, which makes you feel like "a person who learns languages" rather than "someone who downloaded an app." Account creation is delayed until after this first win, which is a critical design choice -- you invest before you commit.

**Key takeaway:** Let the user _do the thing_ before asking them to sign up. The simulated capture demo should feel like a real first win, not a tutorial.

Sources: [Duolingo Onboarding - App Fuel](https://theappfuel.com/examples/duolingo_onboarding), [Duolingo Onboarding UX](https://userguiding.com/blog/duolingo-onboarding-ux), [Duolingo Onboarding Lessons](https://medium.com/@kotarina832/building-effective-onboarding-experiences-lessons-from-duolingo-7aa2af536020)

---

## Design: Complete Screen-by-Screen Onboarding Flow

**Total screens: 11 (plus paywall modal and sign-in)**

The flow is ordered to build emotional momentum: aspiration first, then self-identification (survey), then proof it works (demo), then commitment (notifications, paywall, sign-in).

---

### Screen 0: Welcome

**Headline:** "Be the person who actually goes"

**Subtitle:** "Events are everywhere. Soonlist makes sure you show up."

**What the user sees:**

- Soonlist logo at top center
- Headline and subtitle centered in the upper third
- Below: a lifestyle-oriented image showing the app feed (existing `feed.png` asset), but framed as a personal event calendar full of interesting things
- "Free, community-supported" in small muted text
- Primary CTA button at bottom
- "Already have an account? Sign in" text link below
- "Got a code? Enter it here" text link below that

**What the user does:**

- Taps "Get Started" to begin onboarding
- Or taps "Sign in" to skip to sign-in
- Or taps "Enter it here" to enter an access code

**Navigates to:** Screen 1

---

### Screen 1: Aspiration Setup (Goals -- survey question)

**Headline:** "What kind of plans do you want to make?"

**Subtitle:** "Pick everything that sounds like you"

**What the user sees:**

- Progress bar (step 1 of 10)
- Headline and subtitle
- Multi-select option list (tap to toggle, checkmark appears):
  - "Go to more concerts, shows, and nightlife"
  - "Try new restaurants and food events"
  - "Find outdoor adventures and active things"
  - "Attend community events and meetups"
  - "Keep up with friends' plans"
  - "Just exploring for now"
- "Continue" button at bottom (disabled until at least one selected)

**What the user does:**

- Taps one or more options (multi-select with checkmarks)
- Taps "Continue"

**Data collected:** `goals` (mapped to existing schema -- the aspirational labels map 1:1 to the current goal values for backend compatibility)

**Backend mapping:**
| New aspirational label | Stored value |
|---|---|
| "Go to more concerts, shows, and nightlife" | "Organize all my events in one place" |
| "Try new restaurants and food events" | "Turn my screenshots into saved plans" |
| "Find outdoor adventures and active things" | "Discover fun events near me" |
| "Attend community events and meetups" | "Share plans with friends" |
| "Keep up with friends' plans" | "Share plans with friends" |
| "Just exploring for now" | "Just exploring for now" |

**Navigates to:** Screen 2

---

### Screen 2: Screenshot Habit (survey question)

**Headline:** "Sound familiar?"

**Subtitle:** "You see an event on Instagram, screenshot it, and then... never look at it again."

**What the user sees:**

- Progress bar (step 2 of 10)
- Headline and subtitle
- Two large tap-to-select options:
  - "That's literally me" (maps to "Yes")
  - "Not yet, but I want to start" (maps to "Not yet")

**What the user does:**

- Taps one option. Selection auto-advances.

**Data collected:** `screenshotEvents`

**Navigates to:** Screen 3

---

### Screen 3: Discovery Channels (survey question)

**Headline:** "Where do you find things to do?"

**Subtitle:** "We'll personalize your first experience"

**What the user sees:**

- Progress bar (step 3 of 10)
- Headline and subtitle
- Single-select option list:
  - "Instagram"
  - "TikTok"
  - "Friends' recommendations"
  - "Local websites/newsletters"
  - "Walking around town"
  - "Facebook"

**What the user does:**

- Taps one option. Selection auto-advances.

**Data collected:** `discoveryMethod`

**Navigates to:** Screen 4

---

### Screen 4: The Problem (aspirational reframe)

**Headline:** "Events shouldn't disappear into your camera roll"

**Subtitle:** "You deserve a real plan, not a graveyard of screenshots"

**What the user sees:**

- Progress bar (step 4 of 10)
- Headline and subtitle
- Visual: a stylized representation of a chaotic camera roll with event screenshots scattered, overlapping, half-buried (can reuse the existing 6-grid thumbnail layout from `02-value-batch.tsx` but with a more "messy/chaotic" arrangement and a subtle red/gray overlay to convey disorganization)
- Social proof banner at bottom: "Most people have 5+ event screenshots saved right now"
- "Continue" button

**What the user does:**

- Taps "Continue"

**Navigates to:** Screen 5

---

### Screen 5: The Promise (aspirational reframe)

**Headline:** "One tap. Every detail. Actually go."

**Subtitle:** "Capture any event from anywhere and we'll handle the rest -- date, time, location, all organized"

**What the user sees:**

- Progress bar (step 5 of 10)
- Headline and subtitle
- Visual: the existing feed image (`feed.png`) showing a clean, organized event feed -- the aspirational "after" to Screen 4's "before"
- Social proof banner: "Join thousands of people who stopped just screenshotting and started actually going"
- "See how it works" button

**What the user does:**

- Taps "See how it works"

**Navigates to:** Screen 6

---

### Screen 6: Simulated Capture Demo (interactive)

**Headline (phase: screenshot):** "Try it -- capture this event"

**Subtitle (phase: screenshot):** "Imagine you just saw this on {discoveryChannel}"

**Headline (phase: parsing):** "Making you a plan..."

**Headline (phase: result):** "You'd actually go to this"

**Subtitle (phase: result):** "That's all it takes. One tap, and it's on your list."

**What the user sees:**

- Progress bar (step 6 of 10)
- **Screenshot phase:** A sample event card personalized to their discovery channel selection (existing `SAMPLE_EVENTS` mapping). Styled as an event flyer/post. Primary button: "Capture this event"
- **Parsing phase:** Animated sparkle/pulse with "Making you a plan..." text. AI-parsing animation (existing `ParsingAnimation` component)
- **Result phase:** The parsed event card (existing `ParsedEventCard` component) with date, time, location neatly organized. A fake push notification banner slides in from the top: "Soonlist: [Event Name] saved!" After a moment, "Continue" button fades in.

**What the user does:**

- Taps "Capture this event" to trigger parsing animation
- Waits ~1.5s for parsing
- Sees result + notification
- Taps "Continue"

**Data collected:** `completedShareDemo: true`

**Navigates to:** Screen 7

---

### Screen 7: Share Extension Video Demo

**Headline:** "Even faster from any app"

**Subtitle:** "See an event on Instagram? Share it directly to Soonlist without leaving the app."

**What the user sees:**

- Progress bar (step 7 of 10)
- Headline and subtitle
- Looping video demo of the share extension flow (existing video from Convex `appConfig.getDemoVideoUrl`)
- "Continue" button at bottom

**What the user does:**

- Watches video (auto-plays, looping, muted)
- Taps "Continue"

**Navigates to:** Screen 8

---

### Screen 8: Notification Permission

**Headline:** "Don't just save it. Show up."

**Subtitle:** "Get a reminder before events so you actually go"

**What the user sees:**

- Progress bar (step 8 of 10)
- Headline and subtitle
- Centered: a styled mock iOS notification permission dialog (existing component from `07-notifications.tsx`), with the copy inside the dialog updated to:
  - Dialog title: "Get reminders before your events"
  - Dialog body: "Soonlist reminds you before events start so you never forget to go"
  - "Don't Allow" button (dimmed)
  - "Allow" button (bold, prominent) with animated bouncing chevron pointing to it
- Small muted text at bottom: "You can always change this in Settings"

**What the user does:**

- Taps "Allow" which triggers the real iOS notification permission request
- Permission result is saved; flow continues regardless of choice

**Data collected:** `notificationsEnabled`

**Navigates to:** Screen 9

---

### Screen 9: Age (survey question)

**Headline:** "One quick thing"

**Subtitle:** "How old are you? This helps us improve the app for everyone."

**What the user sees:**

- Progress bar (step 9 of 10)
- Headline and subtitle
- Single-select option list:
  - "Under 24"
  - "25-34"
  - "35-44"
  - "45-54"
  - "55-64"
  - "65+"

**What the user does:**

- Taps one option. Selection auto-advances.

**Data collected:** `ageRange`

**Navigates to:** Screen 10

---

### Screen 10: Source (survey question)

**Headline:** "How'd you find us?"

**Subtitle:** "We're a small team and this really helps"

**What the user sees:**

- Progress bar (step 10 of 10)
- Headline and subtitle
- Single-select option list:
  - "Google Search"
  - "TikTok"
  - "Searched on App Store"
  - "Instagram"
  - "Facebook"
  - "Through a friend"
  - "Other"

**What the user does:**

- Taps one option. Selection auto-advances.

**Data collected:** `source`

**Navigates to:** Paywall

---

### Screen 11: Paywall

**Headline (mock/simulator only):** "Go out more. We'll keep it free."

**Subtitle (mock/simulator only):** "Soonlist is free with no limits. Support us to keep it that way."

**What the user sees:**

- On real devices: RevenueCat native paywall modal (presented via `RevenueCatUI.presentPaywallIfNeeded`). The RevenueCat dashboard should be configured with aspirational copy matching this direction: framing support as "keeping Soonlist free for everyone" rather than "unlocking features."
- On simulator: Mock paywall with Monthly ($9.99/mo) and Yearly ($59.99/yr) options, "BEST VALUE" badge on yearly. Skip link: "Continue for free"

**What the user does:**

- Subscribes (completes onboarding, navigates to sign-in with `subscribed: true`)
- Or dismisses/cancels (completes onboarding, navigates to sign-in with `trial: true`)

**Navigates to:** Sign-in (OAuth screen, existing implementation)

---

## Flow Summary

| #   | Screen Name        | Type                   | Data Collected             |
| --- | ------------------ | ---------------------- | -------------------------- |
| 0   | Welcome            | Aspirational hook      | --                         |
| 1   | Goals              | Survey (multi-select)  | `goals`                    |
| 2   | Screenshot Habit   | Survey (single-select) | `screenshotEvents`         |
| 3   | Discovery Channels | Survey (single-select) | `discoveryMethod`          |
| 4   | The Problem        | Aspirational reframe   | --                         |
| 5   | The Promise        | Aspirational reframe   | --                         |
| 6   | Capture Demo       | Interactive demo       | `completedShareDemo`       |
| 7   | Share Extension    | Video demo             | --                         |
| 8   | Notifications      | Permission request     | `notificationsEnabled`     |
| 9   | Age                | Survey (single-select) | `ageRange`                 |
| 10  | Source             | Survey (single-select) | `source`                   |
| 11  | Paywall            | Monetization           | `subscribed` / `trialMode` |
| --  | Sign-in            | OAuth                  | --                         |

**Total: 12 screens (11 + paywall) before sign-in. All 5 required survey questions present.**

---

## Justification

**Why this works for Soonlist:** Soonlist's real competition is not another event app -- it's inertia. People already screenshot events; they just don't follow through. The "Go Out More" direction reframes the product from a utility ("save your screenshots") into a lifestyle commitment ("be someone who actually goes to things"), which creates stronger emotional attachment and higher motivation to complete onboarding. This mirrors how Strava succeeded not by being a GPS tracker but by being the place where "athletes" see themselves. The survey questions (goals, discovery channels) do double duty: they collect data AND reinforce the aspirational identity by making the user articulate what kind of social life they want.

**Biggest risk:** Aspirational framing can feel hollow if the app doesn't deliver on the promise. If a user goes through "be the person who actually goes" onboarding and then has a confusing or buggy first real experience (failed image parsing, empty feed, no friends to follow), the gap between promise and reality will feel worse than if the onboarding had been purely functional. The aspirational bar demands that the post-onboarding first session is smooth and immediately rewarding. A secondary risk is that the tone could feel patronizing to users who already have an active social life -- the copy needs to feel inviting, not preachy.
