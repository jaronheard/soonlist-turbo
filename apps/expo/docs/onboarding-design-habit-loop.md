# Soonlist Onboarding Design: "The Habit Loop"

## Research: Habit-Formation Framing in iOS Onboarding

### 1. Duolingo -- "Just 5 minutes a day"

Duolingo's onboarding is the gold standard for planting a habit seed. During setup, users select how much time they want to commit per day (5, 10, 15, or 20 minutes). This is a commitment device: it anchors all future reminders and progress messaging to that self-selected bar. The app never says "learn a language" -- it says "complete one short lesson." The action is minimal (1-3 minutes), always within reach, and framed as a daily rep rather than an educational journey. The onboarding optimizes time-to-first-success by running users through their first lesson before requiring account creation. Everything after -- streaks, characters, leagues -- exists to push users toward opening the app and finishing today's rep.

Key takeaway for Soonlist: frame the core action as trivially small and immediately completable, not as a feature to learn.

Sources: [Duolingo Case Study: Habit-forming within onboarding](https://www.theuxologist.com/psychology-case-study/habit-forming-within-onboarding), [Building Effective Onboarding: Lessons from Duolingo](https://medium.com/@kotarina832/building-effective-onboarding-experiences-lessons-from-duolingo-7aa2af536020)

### 2. Headspace -- "Start with 3 minutes"

Headspace asks three simple questions (what you want to improve, experience level, schedule), then immediately routes users into their first meditation session instead of a dashboard. The session is 3 minutes -- deliberately positioned as an achievable entry point. Critically, Headspace anchors new sessions to existing routines ("After your morning coffee," "Before bed") rather than asking users to invent a new time slot. This habit-stacking approach makes the behavior feel like a natural extension of what users already do, not an addition.

Key takeaway for Soonlist: anchor the capture behavior to something users already do (scrolling Instagram, reading newsletters, walking past flyers) rather than asking them to create a new routine.

Sources: [Headspace's Mindful Onboarding Sequence](https://goodux.appcues.com/blog/headspaces-mindful-onboarding-sequence), [Headspace Onboarding Flow](https://www.theappfuel.com/examples/headspace_onboarding)

### 3. Fabulous -- "Put your shoes on and start your power song"

Fabulous uses a behavioral science approach: "Running is not the behavior we're trying to teach you. We're only trying to get you to put your shoes on and start your power song." The onboarding begins with a personalized letter, then asks users to commit to one tiny action on waking -- drinking a glass of water. Only after that sticks does the app layer in more steps. The formula is: start slow, plant signals, let wins in, find your rhythm. Routines are framed as "rituals" (morning, afternoon, evening) rather than tasks.

Key takeaway for Soonlist: the habit isn't "use Soonlist" -- it's "screenshot the event." Soonlist is what happens after.

Sources: [How The Fabulous App Uses Behavioral Design](https://designli.co/blog/the-fabulous-app-uses-behavioral-design/), [Fabulous App Product Critique: Onboarding](https://www.thebehavioralscientist.com/articles/fabulous-app-product-critique-onboarding)

### 4. Atoms (from Atomic Habits) -- "Become the type of person who..."

James Clear's official app frames every habit as an identity statement: "I will [habit], [time/location] so that I can become [type of person]." The onboarding forces users to link each habit to their future identity. The app emphasizes starting with extremely small actions that reduce resistance -- build consistency before intensity. A satisfying hold-and-expand animation on completion provides tactile reward.

Key takeaway for Soonlist: position event-capturing not as a task but as an identity ("You're the person who always knows what's happening this weekend").

Sources: [Atoms: The Official Atomic Habits App](https://atoms.jamesclear.com/), [Screensdesign: Atoms Showcase](https://screensdesign.com/showcase/atoms-from-atomic-habits)

### 5. Calm -- "Start your journey here"

Calm's onboarding uses a tooltip overlay that says "Start your journey here" and routes users directly into a 7-day beginner program ("7 Days of Calm") after just four tutorial overlays. The app creates an atmosphere of inevitability -- the first session isn't optional, it's the natural next step. Daily reminders are framed as consistency tools, not nags. The environment itself (background sounds, typography) reinforces calm as an ongoing state, not a one-time action.

Key takeaway for Soonlist: make the first capture feel like the obvious next step, not a demo. Frame it as "your first one" rather than "try the feature."

Sources: [Calm's Carefully Curated New User Experience](https://goodux.appcues.com/blog/calm-app-new-user-experience), [Calm Onboarding Flow](https://www.theappfuel.com/examples/calm_onboarding)

---

## Design: Complete Screen-by-Screen Onboarding Flow

### Design Principles

1. **The habit is already happening.** Users already screenshot events. Soonlist just completes the loop.
2. **Name the rhythm, not the features.** Every screen reinforces "see it, screenshot it, done."
3. **First capture = first rep.** The simulated capture is framed as their first real habit moment.
4. **Surveys earn their place.** Each survey question is reframed to serve the habit narrative.

### Flow Overview

| # | Screen | Type | Purpose |
|---|--------|------|---------|
| 0 | Welcome | Value | Plant the loop |
| 1 | The Loop | Value | Show the rhythm visually |
| 2 | You Already Do This | Survey (screenshot habit) | Validate existing behavior |
| 3 | Where You See Events | Survey (discovery channels) | Personalize the demo |
| 4 | Your First Capture | Interactive demo | First rep of the habit |
| 5 | Share Extension | Video demo | Second capture method |
| 6 | Stay in the Loop | Notification permission | Frame notifications as rhythm |
| 7 | What Matters to You | Survey (goals) | Connect habit to motivation |
| 8 | Quick Questions | Survey (age + source) | Required data, fast |
| 9 | Paywall | Monetization | Support the tool |
| 10 | Sign In | Auth | Create account |

Total: 11 screens (10 before sign-in), within the 8-12 range.

---

### Screen 0: Welcome

**Headline:** See it. Screenshot it. Soonlist does the rest.

**Subtitle:** The simplest way to never miss an event again.

**What the user sees:**
- Soonlist logo at top
- Headline and subtitle centered
- A looping 3-step illustration below the headline:
  - Step visual 1: phone screen showing an Instagram story with event flyer
  - Step visual 2: screenshot capture animation (camera shutter flash)
  - Step visual 3: organized event card in Soonlist feed
- "Get Started" button (purple, full-width, rounded)
- "Already have an account? Sign in" text link below
- "Got a code? Enter it here" text link below

**What the user does:** Taps "Get Started"

**Navigates to:** Screen 1

---

### Screen 1: The Loop

**Headline:** One habit. Three seconds.

**Subtitle:** This is the whole thing.

**What the user sees:**
- Progress bar (step 1 of 10)
- Three vertically stacked cards, each with an icon and short label:
  1. "You spot an event" -- eye icon, with examples: "on Instagram, a flyer, a text from a friend"
  2. "You screenshot it" -- phone/camera icon, "like you probably already do"
  3. "Soonlist handles the rest" -- sparkle/AI icon, "name, date, time, location -- all parsed automatically"
- Below the cards, a single line of supporting text: "Do it once and you'll do it every time."
- "Continue" button

**What the user does:** Taps "Continue"

**Navigates to:** Screen 2

---

### Screen 2: You Already Do This

**Headline:** Do you already screenshot events you're interested in?

**Subtitle:** (none -- the question is the headline)

**What the user sees:**
- Progress bar (step 2 of 10)
- Two options, styled as tappable cards:
  - "Yes, all the time" (maps to "Yes" in data)
  - "Not yet, but I want to" (maps to "Not yet" in data)

**What the user does:** Taps one option. Selection auto-advances.

**Navigates to:** Screen 3

**Data saved:** `screenshotEvents` (survey: screenshot habit)

**Design note:** This screen serves double duty. It collects the required screenshot habit survey data while also reinforcing the habit narrative. If the user selects "Yes," the next screen validates them ("Perfect -- you're already halfway there"). If "Not yet," the next screen encourages them ("You're about to start").

---

### Screen 3: Where You See Events

**Headline:** Where do you spot the most events?

**Subtitle:** We'll personalize your first capture.

**What the user sees:**
- Progress bar (step 3 of 10)
- Six tappable options:
  - Instagram
  - TikTok
  - Friends' recommendations
  - Local websites/newsletters
  - Walking around town
  - Facebook

**What the user does:** Taps one option. Selection auto-advances.

**Navigates to:** Screen 4

**Data saved:** `discoveryMethod` (survey: discovery channels)

**Design note:** This feels natural in the flow because it sets up the personalized demo on the next screen. The user doesn't feel surveyed -- they feel like they're customizing their experience.

---

### Screen 4: Your First Capture

**Headline (phase 1):** Here's one from {source}.

**Subtitle (phase 1):** Screenshot it. (Just tap the button.)

**Headline (phase 2 - parsing):** Capturing...

**Subtitle (phase 2):** (none)

**Headline (phase 3 - result):** That's your first one.

**Subtitle (phase 3):** {Conditional on Screen 2 answer}
- If "Yes, all the time": "You already do this. Now Soonlist does the rest."
- If "Not yet, but I want to": "That's all there is to it. Screenshot, done."

**What the user sees:**

*Phase 1 -- Screenshot:*
- Progress bar (step 4 of 10)
- A sample event card styled to match the source they selected (e.g., if they picked Instagram, it looks like an Instagram story screenshot; if they picked "Walking around town," it looks like a photo of a flyer). Event content is personalized based on their discovery channel selection.
- A prominent button: "Capture this event"

*Phase 2 -- Parsing:*
- The sample event animates: a sparkle/pulse animation appears over the card
- Text reads "Parsing your event..." with "AI is reading the details" subtitle
- Lasts ~1.5 seconds

*Phase 3 -- Result:*
- The parsed event card appears (clean, structured: date, time, name, location, action buttons)
- A fake push notification slides down from top: "{Event name} saved!"
- Below the card, a subtle line: "One screenshot. One tap. That's the whole habit."
- "Continue" button appears after notification dismisses

**What the user does:** Taps "Capture this event" in phase 1. Watches parsing. Taps "Continue" in phase 3.

**Navigates to:** Screen 5

---

### Screen 5: Share Extension

**Headline:** There's an even faster way.

**Subtitle:** Share directly from any app -- no screenshot needed.

**What the user sees:**
- Progress bar (step 5 of 10)
- Looping demo video showing the share extension in action (loaded from Convex backend, same as current implementation)
- Below the video, a small text: "Works with Instagram, Safari, Messages, and more."
- "Continue" button

**What the user does:** Watches video, taps "Continue"

**Navigates to:** Screen 6

---

### Screen 6: Stay in the Loop

**Headline:** Never forget an event you saved.

**Subtitle:** We'll remind you before events happen so you actually go.

**What the user sees:**
- Progress bar (step 6 of 10)
- A mock iOS notification permission dialog (styled to match iOS system dialog), with the messaging:
  - Dialog title: "Turn on Push Notifications to stay in your rhythm"
  - Dialog body: "Soonlist reminds you before saved events so the screenshot actually becomes a plan."
  - Two buttons: "Don't Allow" (dimmed/disabled) and "Allow" (blue, prominent)
  - Animated bouncing chevron pointing to "Allow"
- Below the dialog, small text: "You can always update this later in settings."

**What the user does:** Taps "Allow" (triggers real iOS notification permission request)

**Navigates to:** Screen 7

**Data saved:** `notificationsEnabled`

---

### Screen 7: What Matters to You

**Headline:** What do you want to do more of?

**Subtitle:** Pick as many as you like.

**What the user sees:**
- Progress bar (step 7 of 10)
- Five tappable options (multi-select with checkmarks):
  - "Actually go to events I hear about"
  - "Stop losing events in my camera roll"
  - "Find out what's happening near me"
  - "Share plans with friends"
  - "Just exploring for now"
- "Continue" button (activates after at least one selection)

**What the user does:** Selects one or more options, taps "Continue"

**Navigates to:** Screen 8

**Data saved:** `goals` (survey: goals)

**Design note:** The goals are reframed from feature-centric language ("Organize all my events in one place") to behavior-centric language ("Actually go to events I hear about"). The first option is deliberately phrased as an outcome of the habit loop, not a product capability.

**Data mapping:**
| New copy | Maps to existing goal value |
|----------|---------------------------|
| "Actually go to events I hear about" | "Organize all my events in one place" |
| "Stop losing events in my camera roll" | "Turn my screenshots into saved plans" |
| "Find out what's happening near me" | "Discover fun events near me" |
| "Share plans with friends" | "Share plans with friends" |
| "Just exploring for now" | "Just exploring for now" |

---

### Screen 8: Quick Questions

**Headline:** Two quick ones, then you're in.

**Subtitle:** (none)

**What the user sees:**
- Progress bar (step 8 of 10)
- Two questions stacked vertically, each with horizontally scrollable pill-style option chips:

**Question A: "How old are you?"**
- Options: Under 24 | 25-34 | 35-44 | 45-54 | 55-64 | 65+

**Question B: "Where did you hear about Soonlist?"**
- Options: Google Search | TikTok | App Store | Instagram | Facebook | A friend | Other

- "Continue" button (activates when both questions are answered)

**What the user does:** Taps one chip per question, taps "Continue"

**Navigates to:** Screen 9

**Data saved:** `ageRange` (survey: age), `source` (survey: source)

**Design note:** Combining these two low-stakes demographic questions onto one screen reduces screen count and avoids ending the flow with two back-to-back dead-simple survey screens. The pill-chip format feels faster than full-height option cards.

---

### Screen 9: Paywall

**Headline:** Soonlist is free. Really.

**Subtitle:** Every feature works. No limits. No catch. If you love it, you can support us.

**What the user sees:**
- Full-screen paywall (RevenueCat native paywall, same as current implementation)
- The framing copy above appears before the paywall modal loads
- If user subscribes: navigates to Screen 10 with subscription status
- If user dismisses/cancels: navigates to Screen 10 in trial mode

**What the user does:** Views paywall, either subscribes or dismisses

**Navigates to:** Screen 10

---

### Screen 10: Sign In

**What the user sees:** OAuth sign-in screen (existing implementation, outside onboarding flow)

**What the user does:** Signs in with Apple/Google

**Navigates to:** Main app feed

---

## Flow Diagram

```
[0 Welcome] --> [1 The Loop] --> [2 Screenshot Habit?] --> [3 Where You See Events]
    --> [4 Your First Capture (interactive demo)] --> [5 Share Extension (video)]
    --> [6 Notifications] --> [7 Goals] --> [8 Age + Source]
    --> [9 Paywall] --> [10 Sign In] --> [Main App]
```

---

## Survey Data Mapping

All five required survey data points are collected:

| Required survey | Screen | How it's framed |
|----------------|--------|-----------------|
| Goals | Screen 7 | "What do you want to do more of?" |
| Screenshot habit | Screen 2 | "Do you already screenshot events?" |
| Discovery channels | Screen 3 | "Where do you spot the most events?" |
| Age | Screen 8 | Combined quick-question screen |
| Source | Screen 8 | Combined quick-question screen |

---

## Justification

This direction works for Soonlist specifically because the product's core action -- screenshotting an event -- is something many users already do instinctively. Unlike Duolingo or Headspace, which must convince users to adopt an entirely new behavior, Soonlist only needs to complete an existing one. The habit-loop framing ("see it, screenshot it, done") transforms the onboarding from a product tour into a moment of recognition: "Oh, I already do this. This just makes it useful." By leading with the rhythm and delaying the feature explanations, the flow plants the seed of a repeatable behavior before the user even creates an account.

The biggest risk is that the habit framing feels hollow for users who do not already screenshot events. For these users (the "Not yet" respondents on Screen 2), the loop is aspirational rather than validating. The flow mitigates this with conditional copy on the demo result screen, but if the majority of new users don't already screenshot events, the "you already do this" premise may feel presumptuous. A/B testing Screen 0's headline against a more feature-forward alternative would be a smart safeguard.
