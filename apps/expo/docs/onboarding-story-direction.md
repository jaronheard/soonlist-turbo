# Soonlist Onboarding: "Tell a Story" Direction

## Research: Narrative Onboarding in iOS Apps

### 1. Headspace -- Andy's Guided Journey

Headspace introduces meditation through its co-founder Andy Puddicombe, a former Tibetan monk. The onboarding opens with friendly, soft illustrations and the message "Meditation made simple." Rather than listing features, the app immediately puts users into Andy's world: gentle animated characters, a warm voice, and a simple question about your experience level. The first session is framed not as a tutorial but as a personal guided moment with Andy. The whole tone says "someone is here with you" rather than "here is a product."

**What to steal:** The feeling that a real person (not a brand) is walking beside you. The warmth of the illustrations carrying emotional weight that copy alone cannot.

Source: [Headspace iOS Onboarding Flow -- Mobbin](https://mobbin.com/flows/7cdc08c0-3bcb-4882-90dd-5cf92019616f), [Headspace Onboarding Journey -- Medium](https://medium.com/designpractice-io/onboarding-journey-of-headspace-ios-app-8867420accf)

### 2. Florence -- A Wordless Interactive Story

Florence, by the lead designer of Monument Valley, is an entire app built as a narrative. Its "onboarding" is the first chapter of Florence's life: waking up, commuting, scrolling her phone. The user participates by completing small interactive gestures -- assembling speech bubbles during a first conversation, brushing teeth by swiping. There are almost no words. Each screen is a chapter. The pacing is deliberate: monotony, then spark, then connection. It proves that mobile screens can carry genuine emotional arcs.

**What to steal:** The chapter structure. The way mundane moments (scrolling, commuting) become relatable setup for the product's emotional payoff. Interaction as part of the story, not separate from it.

Source: [Florence -- The Work Behind The Work](https://milanote.com/the-work/lead-designer-of-monument-valley-deconstructs-his-latest-game-florence), [Game Informer](https://gameinformer.com/b/news/archive/2017/10/24/florence-a-new-game-by-the-lead-of-monument-valley-is-an-interactive-narrative-experience.aspx)

### 3. Finch -- Hatching a Character Together

Finch, the self-care pet app, onboards users by having them hatch a baby bird ("birb"). You choose an egg color, name it, pick its personality traits. The onboarding IS the story: you are creating a living character whose growth depends on your daily actions. There are no feature lists. Instead, each screen deepens your emotional investment in the character before you even understand what the app does mechanically. The bird's personality only unfolds over days, creating a serialized narrative that extends well beyond onboarding.

**What to steal:** Co-creation as storytelling. The user is not a passive audience; they are building the story by making choices. Survey questions (personality traits) feel like character development, not data collection.

Source: [UX Teardown: Finch -- Medium](https://medium.com/@deepthi.aipm/ux-teardown-finch-self-care-app-18122357fae7), [Design Critique: Finch -- IXD@Pratt](https://ixd.prattsi.org/2026/02/design-critique-finch-self-care-pet-ios-app/)

### 4. Duolingo -- A Mascot With a Life

Duolingo's green owl Duo is not just a logo -- it is a recurring character with moods, stories, and reactions. During onboarding, Duo celebrates your language choice, reacts to your goal-setting, and guides your first lesson with animated expressions. The survey questions (why are you learning? how much time do you have?) are framed as Duo asking you personally. The mascot creates continuity: the same character who onboards you is the one who guilt-trips you into returning. The narrative is light -- more personality than plot -- but it turns a utilitarian quiz into a conversation.

**What to steal:** Reframing survey questions as a character asking you directly. The mascot as emotional through-line. Making data collection feel like a conversation, not a form.

Source: [Duolingo's Delightful Onboarding -- Appcues](https://goodux.appcues.com/blog/duolingo-user-onboarding), [Duolingo UX Breakdown -- UserGuiding](https://userguiding.com/blog/duolingo-onboarding-ux)

### 5. Noom -- Your Personal Weight-Loss Story

Noom's onboarding is famously long (70+ questions) but retains users because it frames the entire quiz as "writing your personal plan." Each question deepens a narrative: your past attempts, your emotional triggers, your vision of the future. Interstitial screens show a progress graphic of "your journey" unfolding. Social proof screens ("People like you typically see results in 8 weeks") are woven into the story arc. The length works because users feel they are authoring their own transformation narrative, not filling out a medical form.

**What to steal:** Interstitial story beats between survey questions. Making the user the protagonist of their own story. Using "people like you" social proof as narrative validation.

Source: [UX Case Study of Noom -- Justinmind](https://www.justinmind.com/blog/ux-case-study-of-noom-app-gamification-progressive-disclosure-nudges/), [Noom Onboarding -- Page Flows](https://pageflows.com/post/ios/onboarding/noom/)

---

## Design: Complete Screen-by-Screen Onboarding Flow

### The Character: Maya

Maya is 28, lives in a mid-size city, and loves going to things -- concerts, pop-ups, art walks, friend hangs. She is not disorganized by nature. She is overwhelmed by the sheer number of places events live now: Instagram stories that vanish, group texts that scroll away, flyers she passes on walks. She is the person your user sees in the mirror. Her week is their week.

### The Arc

**Chaos** (Screens 1-3) -- Maya's week of missed events builds sympathy and recognition.
**Discovery** (Screen 4) -- Soonlist enters Maya's life.
**Organization** (Screens 5-6) -- Maya captures and the AI parses. User tries it themselves.
**Connection** (Screens 7-8) -- Notifications, sharing, following friends.
**Resolution** (Screens 9-10) -- Maya actually goes. The story completes.
**Commitment** (Screens 11-12) -- Paywall and sign-in.

---

### Screen 1: "Chapter 1: The Flyer"
**Type:** Story (narrative)

**Headline:**
Maya spotted a poster for a jazz night on her walk home.

**Subtitle:**
She thought, "I'll remember that." She did not remember that.

**Visual:**
Illustrated scene: a woman walking past a telephone pole with a colorful flyer. The flyer is slightly angled, warm streetlight glow. Simple, warm line-art style with a muted color palette and one accent color (Soonlist purple on the flyer). Think editorial illustration, not cartoon.

**User action:**
Single button: "What happened next" (navigates forward).

**Navigation:** Screen 2

**Data collected:** None

---

### Screen 2: "Chapter 2: The Screenshot Graveyard"
**Type:** Story (narrative) + Survey (screenshot habit)

**Headline:**
By Friday, Maya had 6 event screenshots buried in her camera roll.

**Subtitle:**
An Instagram story about a rooftop party. A friend's text about a comedy show. A newsletter with three weekend picks. All saved. None organized.

**Visual:**
Illustrated phone screen showing a messy camera roll grid -- event flyers mixed with food photos, selfies, random screenshots. A small red notification badge shows "1,247 photos." The event screenshots have a faint purple glow to distinguish them.

**User action:**
The narrative question appears below the illustration:
"Sound familiar? Do you screenshot events too?"
- "All the time" (maps to "Yes")
- "Not yet" (maps to "Not yet")

Tapping either option auto-advances.

**Navigation:** Screen 3

**Data collected:** `screenshotEvents` (Yes / Not yet)

---

### Screen 3: "Chapter 3: Saturday Morning"
**Type:** Story (narrative) + Survey (discovery channels)

**Headline:**
Saturday morning. Maya scrolled through her phone trying to find that one event.

**Subtitle:**
Was it on Instagram? In that group text? That newsletter she skimmed at lunch?

**Visual:**
Illustrated Maya sitting on her couch, phone in hand, eyebrows slightly furrowed. Around her head, floating app icons and message bubbles fade in and out -- Instagram, a text thread, an email, a flyer image. Visual chaos, soft colors.

**User action:**
"Where do you usually spot events?"
Options (single-select, presented as floating bubbles matching the illustration):
- Instagram
- TikTok
- Friends' recommendations
- Local websites/newsletters
- Walking around town
- Facebook

Tapping an option highlights it (the corresponding floating icon near Maya enlarges/glows) and auto-advances.

**Navigation:** Screen 4

**Data collected:** `discoveryMethod`

---

### Screen 4: "Chapter 4: Then She Found Soonlist"
**Type:** Story (narrative transition)

**Headline:**
Then Maya found Soonlist.

**Subtitle:**
One app to save events from anywhere. Screenshots, texts, flyers -- captured in seconds, organized by AI.

**Visual:**
Illustrated Maya, now with a slight smile, holding her phone. The screen of her phone glows with the Soonlist logo (purple). The floating chaos icons from Screen 3 are now flowing INTO the phone like a gentle funnel. The background shifts from the previous muted tones to slightly warmer and brighter. This is the emotional pivot of the onboarding.

**User action:**
Single button: "Show me how" (navigates forward).

**Navigation:** Screen 5

**Data collected:** None

---

### Screen 5: "Chapter 5: The Capture"
**Type:** Interactive demo (simulated capture)

**Headline:**
Maya screenshotted that rooftop party from Instagram. Then she opened Soonlist.

**Subtitle:**
Tap "Capture" to see what happened next.

**Visual:**
The existing `SampleScreenshot` component showing the sample event card (dynamically chosen based on the user's discovery channel selection from Screen 3). Styled with a thin illustrated border to keep it feeling like part of the storybook. Above the card, a small illustrated Maya hand holding a phone.

**User action:**
Phase 1 (screenshot): Button reads "Capture this event" -- user taps it.
Phase 2 (parsing): Pulsing AI animation with text "Soonlist is reading the details..."
Phase 3 (result): Parsed event card appears. Fake notification banner slides in ("Rooftop Sunset DJ Set saved!"). Button reads "Continue Maya's story."

**Navigation:** Screen 6

**Data collected:** `completedShareDemo: true`

---

### Screen 6: "Chapter 6: The Shortcut"
**Type:** Video demo (share extension)

**Headline:**
Maya didn't even have to open the app.

**Subtitle:**
She shared straight from Instagram. From Safari. From her group text. One tap, done.

**Visual:**
The existing share extension demo video, framed within an illustrated phone outline to maintain the storybook feel. A small illustrated Maya in the corner, looking impressed / relieved.

**User action:**
Single button: "Continue" (navigates forward).

**Navigation:** Screen 7

**Data collected:** None

---

### Screen 7: "Chapter 7: The Reminder"
**Type:** Notification permission request

**Headline:**
Friday afternoon. Maya got a nudge.

**Subtitle:**
"Rooftop Sunset DJ Set starts in 2 hours." She almost forgot. Again. But this time, Soonlist had her back.

**Visual:**
Illustrated split scene: Left side shows Maya at her desk, phone buzzing with a notification. Right side shows the notification expanded -- the Soonlist push notification with the event name. Below the illustration, the actual iOS-style notification permission dialog (existing component), but the "Don't Allow" is dimmed and "Allow" has the bouncing chevron arrow.

**User action:**
Tapping "Allow" triggers the real iOS push notification permission prompt. After granting or declining, auto-advances.

**Navigation:** Screen 8

**Data collected:** `notificationsEnabled` (true/false)

---

### Screen 8: "Chapter 8: She Actually Went"
**Type:** Story (narrative climax) + Survey (goals)

**Headline:**
Maya went to the rooftop jazz night. And the comedy show. And the art walk.

**Subtitle:**
For the first time in months, she didn't miss the things she actually wanted to do.

**Visual:**
Illustrated montage: three small vignette panels arranged vertically, like a comic strip. Panel 1: Maya at a rooftop with string lights. Panel 2: Maya laughing at a comedy show. Panel 3: Maya at an outdoor art walk with friends. Warm, golden-hour colors. This is the emotional peak -- the payoff.

**User action:**
Below the illustration, the narrative question:
"What matters most to you?"
(Pick as many as you like)
- Organize all my events in one place
- Turn my screenshots into saved plans
- Discover fun events near me
- Share plans with friends
- Just exploring for now

Multi-select with checkmarks. "Continue" button at bottom.

**Navigation:** Screen 9

**Data collected:** `goals` (array)

---

### Screen 9: "Epilogue: Your Turn"
**Type:** Survey (age + source), reframed as story transition

**Headline:**
That's Maya's story. Now let's start yours.

**Subtitle:**
Two quick questions so we can make Soonlist work best for you.

**Visual:**
Clean transition screen. The illustrated style continues but now the "character" slot is empty -- a soft outlined silhouette where Maya was, implying the user is stepping into the frame. Soonlist purple background, white text.

**User action:**
Two sequential questions on the same screen (stacked):

**Question 1:** "How old are you?"
- Under 24 / 25-34 / 35-44 / 45-54 / 55-64 / 65+

**Question 2 (appears after Q1 is answered):** "How did you find us?"
- Google Search / TikTok / Searched on App Store / Instagram / Facebook / Through a friend / Other

"Continue" button activates after both are answered.

**Navigation:** Screen 10

**Data collected:** `ageRange`, `source`

---

### Screen 10: "Support the Story"
**Type:** Paywall

**Headline:**
Soonlist is free. Every feature. No limits.

**Subtitle:**
We're community-supported. If Maya's story resonated, you can help us keep building it for everyone.

**Visual:**
The existing RevenueCat paywall modal is presented here. On real devices, it appears as a native modal over a simple holding screen. The holding screen uses the illustrated style: a group of diverse illustrated characters (including Maya) standing together, representing the community. On simulator, the mock paywall renders with the existing plan options.

**User action:**
Standard paywall flow: Subscribe (monthly/yearly) or dismiss/skip.

**Navigation:** Screen 11 (sign-in)

**Data collected:** `subscribed`, `subscribedAt` or `trialMode`, `trialStartedAt`

---

### Screen 11: Sign-In
**Type:** Authentication (OAuth)

This is the existing sign-in screen. The user arrives here after the paywall, whether they subscribed or not. Standard Clerk OAuth flow (Apple, Google, email).

**Navigation:** Main app

**Data collected:** Authentication credentials

---

## Flow Summary

| # | Screen Name | Type | Data Collected |
|---|------------|------|----------------|
| 1 | Chapter 1: The Flyer | Story | -- |
| 2 | Chapter 2: The Screenshot Graveyard | Story + Survey | `screenshotEvents` |
| 3 | Chapter 3: Saturday Morning | Story + Survey | `discoveryMethod` |
| 4 | Chapter 4: Then She Found Soonlist | Story (pivot) | -- |
| 5 | Chapter 5: The Capture | Interactive demo | `completedShareDemo` |
| 6 | Chapter 6: The Shortcut | Video demo | -- |
| 7 | Chapter 7: The Reminder | Notification permission | `notificationsEnabled` |
| 8 | Chapter 8: She Actually Went | Story + Survey | `goals` |
| 9 | Epilogue: Your Turn | Survey | `ageRange`, `source` |
| 10 | Support the Story | Paywall | subscription data |
| 11 | Sign-In | Auth | credentials |

**Total screens:** 11 (9 authored + paywall + sign-in)

**All required survey data points collected:**
- Goals (Screen 8)
- Screenshot habit (Screen 2)
- Discovery channels (Screen 3)
- Age (Screen 9)
- Source (Screen 9)

---

## Justification

This direction works for Soonlist because the core product problem -- events scattered across apps, screenshots, and conversations -- is inherently a narrative problem. Every user has lived Maya's week. By showing the chaos first and the solution second, the onboarding builds genuine emotional recognition ("that's me") before asking the user to do anything. The survey questions feel organic because they are woven into Maya's story: asking "where do you spot events?" while Maya is surrounded by floating app icons is character development, not market research. The approach also differentiates Soonlist from utility-first competitors; it positions the app as understanding your life, not just organizing your data.

The biggest risk is illustration dependency. This flow lives or dies on the quality and consistency of the illustrated scenes. Without strong, cohesive artwork across all 9 story screens, the "storybook" framing will feel hollow or amateurish. Budget, timeline, and access to an illustrator who can deliver a warm, editorial style with Soonlist's purple accent palette are the primary constraints. A fallback option would be to use stylized photo collages or animated Lottie scenes instead of full illustrations, but that weakens the storybook metaphor. A second risk is pacing: the narrative screens (1, 4) carry no data collection, so they must earn their existence through emotional impact alone -- if they feel like filler, users will tap through impatiently.
