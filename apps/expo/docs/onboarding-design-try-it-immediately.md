# Soonlist Onboarding: "Try It Immediately" Direction

## Research: Apps That Lead With the Experience

### 1. Duolingo

The gold standard for experience-first onboarding. On the very first screen after the splash, Duolingo asks "What language do you want to learn?" -- not "create an account." Users are dropped into a real translation exercise within 60 seconds of opening the app. Sign-up is deferred until _after_ the user has completed their first mini-lesson and felt the dopamine of getting answers right. The lesson IS the pitch. ([Source](https://goodux.appcues.com/blog/duolingo-user-onboarding), [Source](https://www.theappfuel.com/casestudies/three-learnings-from-duolingos-onboarding))

### 2. Photoroom

Photoroom asks the user to select a photo on the first screen, then immediately removes the background -- demonstrating its core AI capability before any signup or paywall. The paywall appears _after_ the user has seen the magic happen to their own photo. This is structurally identical to what Soonlist could do: select an input, watch AI transform it, see the result. ([Source](https://www.purchasely.com/blog/app-onboarding))

### 3. Robinhood

On the launch screen, Robinhood offers three CTAs: Register, Learn More, and _Try Demo_. Users who tap "Try Demo" can execute a simulated stock trade -- picking a stock, setting a quantity, swiping to confirm -- before providing any personal information. The simulated trade is clearly labeled as simulated, but the mechanics are real. This is the closest analog to Soonlist's "simulated capture" concept. ([Source](https://medium.com/@ericyi/ux-teardown-3-robinhood-79e310f7578))

### 4. Headspace

Rather than explaining what meditation is or showing feature carousels, Headspace guides the user through a real 1-minute breathing exercise in the first session. Three quick personalization questions (experience level, goal, schedule) happen _before_ the exercise, but they take under 30 seconds and feel like part of the experience rather than a gate. The exercise creates its own context. ([Source](https://goodux.appcues.com/blog/headspaces-mindful-onboarding-sequence))

### 5. Calm

Calm opens with a purple screen that simply says "Take a deep breath" -- no logo, no feature list. The user breathes. Then a short personalization quiz (3-4 taps) leads directly into a guided session. The paywall and account creation come after. The first screen IS the product. ([Source](https://appagent.com/blog/new-user-flow-types/))

---

## Design: Complete Screen-by-Screen Flow

**Total screens: 11** (including paywall and sign-in)

**Current flow order:** Welcome > Value 1 > Value 2 > Goals > Screenshot Habit > Discovery Channels > Try It > Notifications > Share Demo > Age > Source > Paywall > Sign-in

**New flow order:** Welcome/Capture Prompt > AI Parsing > Result + Reaction > Discovery Channels > Share Demo > Notifications > Goals > Screenshot Habit > Age > Source > Paywall > Sign-in

The key structural change: the capture simulation moves from screen 7 to screen 1. No explanatory screens precede it. The experience _is_ the explanation.

---

### Screen 1: "The Hook" (Welcome + Capture Prompt)

**Headline:** Screenshot. Tap. Done.

**Subtitle:** Try it right now -- tap the screenshot below.

**What the user sees:**

- Soonlist logo (small, top center)
- A realistic-looking sample event screenshot in the center of the screen (styled to look like an Instagram story or flyer -- the same `SampleScreenshot` component from the current `06-try-it.tsx`, but using the Instagram sample event as the default since no discovery channel has been selected yet)
- A large, pulsing "Capture this event" button at the bottom (white pill on the purple `interactive-3` background)
- Small text below: "Already have an account? Sign in" and the code entry link

**What the user does:** Taps "Capture this event."

**Navigation:** Transitions in-place to Screen 2 (parsing animation, same screen component with phase state change).

**Design notes:** No progress bar on this screen. No step counter. The screen should feel like a playground, not a form. The sample screenshot should be visually rich -- a colorful event flyer, not a wireframe placeholder. The pulsing button draws attention to the single action.

---

### Screen 2: "The Magic" (AI Parsing Animation)

**Headline:** Capturing...

**Subtitle:** AI is reading the details

**What the user sees:**

- The sample screenshot shrinks/fades upward
- A centered parsing animation: a pulsing sparkle icon inside a translucent circle with the text "Parsing your event..." and "AI is reading the details"
- This is the same `ParsingAnimation` component from the current `06-try-it.tsx`

**What the user does:** Nothing. Watches for 1.5 seconds.

**Navigation:** Auto-transitions to Screen 3 after the parsing delay.

**Design notes:** The wait is intentional. It creates anticipation. 1.5 seconds is enough to feel like something is happening without feeling slow. The animation should feel alive and intelligent.

---

### Screen 3: "The Payoff" (Parsed Result)

**Headline:** That's it.

**Subtitle:** Screenshots become organized events, automatically.

**What the user sees:**

- The parsed event card (the same `ParsedEventCard` component from `06-try-it.tsx`) showing the structured event: date, time, name, location, plus "Add to Calendar" and "Save" action chips
- A simulated iOS push notification slides in from the top after 800ms: "Soonlist -- Rooftop Sunset DJ Set saved! Sat, Mar 22 at 6:00 PM" (the `FakeNotificationBanner` component)
- After the notification auto-dismisses (3s), the "Continue" button fades in

**What the user does:** Absorbs the result. Taps "Continue."

**Navigation:** Screen 4 (Discovery Channels). This is where the progress bar begins (step 1 of 8).

**Design notes:** This is the "aha moment." The user has just experienced the entire core loop -- input, processing, output -- in under 5 seconds. The notification preview also seeds the value of notifications before that permission request comes later. The progress bar starting here (at 1/8) signals: "Now we have a few quick questions."

---

### Screen 4: "Where You Find Events" (Discovery Channels -- Survey)

**Headline:** Where do you find the most events?

**Subtitle:** (none)

**What the user sees:**

- Progress bar: step 1 of 8
- Six tappable options: Instagram, TikTok, Friends' recommendations, Local websites/newsletters, Walking around town, Facebook
- Same `QuestionOption` component styling as current flow

**What the user does:** Taps one option. Auto-advances.

**Navigation:** Screen 5 (Share Demo).

**Design notes:** Moved earlier than the current flow because (a) it now feeds into the share demo context and (b) the user has already experienced the capture flow, so this question feels natural -- "You just captured a screenshot; where do you usually find events like that?"

---

### Screen 5: "The Second Way" (Share Extension Demo)

**Headline:** Share into the app

**Subtitle:** Use the share button from any app to save events directly to Soonlist

**What the user sees:**

- Progress bar: step 2 of 8
- A looping video demonstrating the share extension flow (same `VideoPlayer` component from current `08-share-demo.tsx`, fetching from Convex)
- "Continue" button at the bottom

**What the user does:** Watches the video, taps "Continue."

**Navigation:** Screen 6 (Notifications).

**Design notes:** This is the existing share demo screen, repositioned. By placing it right after the discovery channels question, the user has context: "Oh, so I can share directly from Instagram/TikTok too." The video does the explaining.

---

### Screen 6: "Stay in the Loop" (Notification Permission)

**Headline:** Never miss an event

**Subtitle:** Get notified when events are saved so you can stay on top of your plans

**What the user sees:**

- Progress bar: step 3 of 8
- A styled iOS notification permission dialog (the existing custom dialog from `07-notifications.tsx`) with the "Don't Allow" button grayed out and an animated chevron pointing to "Allow"
- Small text at the bottom: "You can always update this later in your settings!"

**What the user does:** Taps "Allow" (triggers the real iOS permission prompt) or the system "Don't Allow."

**Navigation:** Screen 7 (Goals).

**Design notes:** The simulated notification from Screen 3 has already primed the user to understand why notifications are valuable. This is a natural place for the ask -- they just saw what a notification looks like, now they can turn them on.

---

### Screen 7: "Your Goals" (Goals -- Survey)

**Headline:** What do you want to use Soonlist for?

**Subtitle:** Pick as many as you like

**What the user sees:**

- Progress bar: step 4 of 8
- Five multi-select options: Organize all my events in one place, Turn my screenshots into saved plans, Discover fun events near me, Share plans with friends, Just exploring for now
- "Continue" button (disabled until at least one selected)
- Same component as current `03-goals.tsx`

**What the user does:** Selects one or more goals, taps "Continue."

**Navigation:** Screen 8 (Screenshot Habit).

**Design notes:** Now that the user has experienced the product, these goal options carry more meaning. "Turn my screenshots into saved plans" resonates differently after they just did exactly that.

---

### Screen 8: "Your Habit" (Screenshot Habit -- Survey)

**Headline:** Do you already screenshot events you're interested in?

**Subtitle:** (none)

**What the user sees:**

- Progress bar: step 5 of 8
- Two options: "Yes" and "Not yet"
- Same component as current `04-screenshot-habit.tsx`

**What the user does:** Taps one option. Auto-advances.

**Navigation:** Screen 9 (Age).

---

### Screen 9: "About You" (Age -- Survey)

**Headline:** How old are you?

**Subtitle:** (none)

**What the user sees:**

- Progress bar: step 6 of 8
- Six age range options: Under 24, 25-34, 35-44, 45-54, 55-64, 65+
- Same component as current `09-age.tsx`

**What the user does:** Taps one option. Auto-advances.

**Navigation:** Screen 10 (Source).

---

### Screen 10: "How You Found Us" (Source -- Survey)

**Headline:** Where did you hear about us?

**Subtitle:** (none)

**What the user sees:**

- Progress bar: step 7 of 8
- Seven options: Google Search, TikTok, Searched on App Store, Instagram, Facebook, Through a friend, Other
- Same component as current `10-source.tsx`

**What the user does:** Taps one option. Auto-advances.

**Navigation:** Screen 11 (Paywall).

---

### Screen 11: "Support Soonlist" (Paywall)

**Headline:** (Handled by RevenueCat native paywall UI)

**Subtitle:** (Handled by RevenueCat native paywall UI)

**What the user sees:**

- The RevenueCat paywall modal (existing implementation from `paywall.tsx`)
- Monthly and yearly subscription options
- Dismiss/skip option that enters trial mode

**What the user does:** Subscribes, restores a purchase, or dismisses the paywall.

**Navigation:** Sign-in screen (OAuth via Clerk). This is handled by the existing paywall logic which navigates to `/sign-in` with appropriate params.

---

## Flow Summary Table

| #   | Screen Name        | Type                   | Time (est.) |
| --- | ------------------ | ---------------------- | ----------- |
| 1   | The Hook           | Interactive demo       | 3s          |
| 2   | The Magic          | Auto-animation         | 1.5s        |
| 3   | The Payoff         | Result + notification  | 5s          |
| 4   | Discovery Channels | Survey (single-select) | 3s          |
| 5   | Share Demo         | Video demo             | 8s          |
| 6   | Notifications      | Permission request     | 5s          |
| 7   | Goals              | Survey (multi-select)  | 5s          |
| 8   | Screenshot Habit   | Survey (single-select) | 2s          |
| 9   | Age                | Survey (single-select) | 2s          |
| 10  | Source             | Survey (single-select) | 2s          |
| 11  | Paywall            | Subscription           | 10s         |

**Estimated total time: ~45 seconds** (vs. current flow which reaches the demo at screen 7, roughly 30+ seconds in)

---

## Justification

This direction works for Soonlist because the core value proposition -- "screenshot becomes structured event" -- is visual, fast, and self-explanatory. Unlike apps where the product requires context (e.g., finance, health), Soonlist's magic is immediately legible: you see a messy screenshot, you tap a button, you get a clean event card. That three-beat rhythm (input, magic, output) is compelling enough to carry the first 5 seconds without any preamble. Duolingo proved this pattern at scale: when the product experience is inherently satisfying, explanation is overhead.

The biggest risk is that the simulated capture feels hollow without stakes. The user knows this is a demo event, not _their_ event. Unlike Duolingo (where even the demo quiz teaches you a real word) or Photoroom (where you use your own photo), Soonlist's simulation uses a fake screenshot. If the animation and result card do not feel polished and real, the "aha moment" could land as "oh, a canned demo" instead of "wow, this is magic." Mitigating this requires the sample screenshot to look genuinely like something the user would encounter in the wild, and the parsing animation to feel genuinely intelligent rather than performative.

---

Sources:

- [Duolingo's delightful user onboarding experience](https://goodux.appcues.com/blog/duolingo-user-onboarding)
- [Three learnings from Duolingo's onboarding](https://www.theappfuel.com/casestudies/three-learnings-from-duolingos-onboarding)
- [The Best App Onboarding Examples & Best Practices (Purchasely)](https://www.purchasely.com/blog/app-onboarding)
- [UX Teardown: Robinhood](https://medium.com/@ericyi/ux-teardown-3-robinhood-79e310f7578)
- [Headspace's mindful onboarding sequence](https://goodux.appcues.com/blog/headspaces-mindful-onboarding-sequence)
- [Mobile App Onboarding: 4 Examples of Successful New User Flows](https://appagent.com/blog/new-user-flow-types/)
- [App Onboarding Guide - Top 10 Onboarding Flow Examples 2026](https://uxcam.com/blog/10-apps-with-great-user-onboarding/)
- [Top 15 Mobile Onboarding Examples (Userpilot)](https://userpilot.com/blog/mobile-onboarding-examples/)
- [Apple Human Interface Guidelines: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)
