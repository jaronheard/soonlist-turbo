# Onboarding Design: "Free and Community-Supported"

## Research: Apps That Lead With a Free / Community-Supported Identity

### 1. Signal

Signal is a nonprofit messaging app sustained entirely by donations, not ads or data sales. Its identity as a community-funded project is not a footnote -- it is the product's thesis. The donation flow is framed as "Become a Signal Sustainer," not "Subscribe to Signal." Users who donate receive a badge on their profile, turning contribution into visible community membership. The copy on their donation page reads: "Signal is a nonprofit sustained only by the people who use and value it." There is no gate, no paywall, no degraded free tier. Every feature is free. The ask is positioned after trust is built, not before.

**Key takeaway for Soonlist:** Frame the support ask as joining something, not buying something. Use a badge or visible marker for supporters. Never imply that the free experience is lesser.

Sources: [Signal Sustainer Program](https://www.makeuseof.com/how-signal-sustainer-works/), [Signal Donate](https://signal.org/donate/), [Signal Foundation](https://signalfoundation.org/)

### 2. Overcast

Overcast, Marco Arment's podcast app, pioneered the "patronage" model for indie iOS apps. In 2015, Overcast 2.0 made every feature free and introduced a $1/month optional patronage. Arment wrote: "I'd rather have you using Overcast for free than not using it at all." The patronage button carried no gate -- it was positioned as a way to directly support one independent developer. When patronage revenue proved insufficient, Arment pivoted to small in-house ads promoting podcasts, with a paid tier to remove them. The language throughout remained personal and transparent: one person building a tool, asking for support if you find it valuable.

**Key takeaway for Soonlist:** The indie developer's voice is a powerful trust signal. Be transparent about the economics. "Support the person building this" resonates more than "unlock premium."

Sources: [Overcast 2.0 Patronage Model (MacStories)](https://www.macstories.net/reviews/overcast-2-0-streaming-chapters-new-patronage-model-and-an-interview-with-marco-arment/), [Marco.org on Overcast Ads](https://marco.org/2016/09/09/overcast-ads)

### 3. Wikipedia / Wikimedia Foundation

Wikipedia's donation banners are among the most A/B-tested fundraising copy in existence. Their winning formula: "If everyone reading this right now gave $3, our fundraiser would be done within an hour." The framing is always: (a) this is free and will stay free, (b) we depend on you, not corporations, (c) most people skip this, and (d) if you are one of the few who gives, you are exceptional. Wikipedia never gates content. The donation ask appears after you have already received value, and the copy makes you feel like a participant in something larger than a transaction.

**Key takeaway for Soonlist:** The "most people don't give, but the few who do keep this alive" framing is extremely effective. Lead with value delivered, then ask. Make the supporter feel rare and important.

Sources: [Wikipedia 2023 Fundraising Banners](https://en.wikipedia.org/wiki/Wikipedia:Fundraising/2023_banners), [Wikimedia Fundraising Report](https://meta.wikimedia.org/wiki/Fundraising/2017-18_Report)

### 4. Mastodon

Mastodon positions itself as "social networking that's not for sale." The onboarding is community-first by design: the first choice is which community (server) to join, not what account to create. The messaging is anti-corporate: "Your feed is curated by you. No ads. No algorithms." Mastodon is funded by Patreon supporters and grants, and the project page lists supporters by name. The entire product identity is built around being an alternative to the VC-funded social media model.

**Key takeaway for Soonlist:** "Not for sale" is a powerful anti-positioning. When the product category (event apps, social media) is full of ad-supported or subscription-gated alternatives, explicitly naming what you are NOT builds instant trust.

Sources: [Mastodon - Decentralized Social Media](https://joinmastodon.org/), [Mastodon Blog: "Mastodon is for the people"](https://blog.joinmastodon.org/2026/02/mastodon-is-for-the-people/)

### 5. Halide (Lux Camera)

Halide is a pro camera app built by a two-person indie studio. Their onboarding includes a built-in 10-day photography course, which frames the purchase as investing in craft, not unlocking features. Their community strategy includes a Discord where developers share TestFlight builds and photography challenges. The positioning is "made by people who care about photography," and the paywall explicitly presents both a subscription and a one-time purchase. What is notable is how they connect payment to supporting continued development by a small team, not to gating features behind a wall.

**Key takeaway for Soonlist:** Connecting payment to "keeping a small team building something you love" is more compelling than feature-gating. Education and community touchpoints within onboarding build trust before any ask.

Sources: [Halide by Lux Camera](https://halide.cam/), [Lux Year 4: Doubling Down](https://www.lux.camera/lux-year-4-doubling-down/)

---

## Complete Onboarding Flow: 11 Screens

The thread running through every screen: **Soonlist is free, made by real people, and sustained by the community that uses it.** This is not a tagline on one screen -- it is the identity of the entire experience.

---

### Screen 1: Welcome

**Headline:**
"Turn screenshots into plans"

**Subtitle:**
"Save events in one tap. All in one place."

**Tertiary line:**
"Free forever. Community-supported."

**What the user sees:**
- Soonlist logo at top center
- Headline and subtitle centered below
- "Free forever. Community-supported." in a lighter/smaller treatment below the subtitle -- present but not shouting
- App preview image (feed screenshot) filling the middle
- FollowContextBanner if arriving from a follow link
- "Get Started" primary button (purple, full-width)
- "Already have an account? Sign in" text link below
- "Got a code? Enter it here" text link below that

**What the user does:**
Taps "Get Started" to begin.

**Navigates to:** Screen 2

---

### Screen 2: Community Identity

**Headline:**
"Made by people, not a corporation"

**Subtitle:**
"Soonlist is built by a small team. No investors, no ads, no data sales. Every feature is free -- supported by people like you."

**What the user sees:**
- Progress indicator: step 1 of 10
- Headline and subtitle in white on the purple onboarding background
- Three short callouts in pill/chip format, stacked vertically with icons:
  - "All features, always free" (with an unlocked icon)
  - "No ads. No tracking." (with a shield icon)
  - "Supported by the community" (with a heart icon)
- Small text at bottom: "Join 2,000+ people saving events with Soonlist"
- "Continue" button

**What the user does:**
Taps "Continue."

**Navigates to:** Screen 3

**Design note:** This screen replaces both value-one-place and value-batch from the current flow. The community identity IS the value proposition. Feature specifics come later through the interactive demo.

---

### Screen 3: Goals (Survey -- Goals)

**Headline:**
"What brings you here?"

**Subtitle:**
"This helps us build what matters to you"

**What the user sees:**
- Progress indicator: step 2 of 10
- Multi-select list:
  - "Organize all my events in one place"
  - "Turn my screenshots into saved plans"
  - "Discover fun events near me"
  - "Share plans with friends"
  - "Just exploring for now"
- "Continue" button (disabled until at least one selected)

**What the user does:**
Selects one or more goals, taps "Continue."

**Navigates to:** Screen 4

---

### Screen 4: Screenshot Habit (Survey -- Screenshot Habit)

**Headline:**
"Do you already screenshot events you're interested in?"

**Subtitle:**
(none)

**What the user sees:**
- Progress indicator: step 3 of 10
- Two options, single-select:
  - "Yes"
  - "Not yet"
- Tapping an option auto-advances

**What the user does:**
Taps an option.

**Navigates to:** Screen 5

---

### Screen 5: Discovery Channels (Survey -- Discovery Channels)

**Headline:**
"Where do you find the most events?"

**Subtitle:**
"We'll personalize your demo"

**What the user sees:**
- Progress indicator: step 4 of 10
- Single-select list:
  - "Instagram"
  - "TikTok"
  - "Friends' recommendations"
  - "Local websites/newsletters"
  - "Walking around town"
  - "Facebook"
- Tapping an option auto-advances

**What the user does:**
Taps an option.

**Navigates to:** Screen 6

**Design note:** The subtitle "We'll personalize your demo" gives the user a reason to answer honestly and creates anticipation for the next screen, which uses their selection.

---

### Screen 6: Try It -- Simulated Capture Demo

**Phase 1 -- Screenshot view:**

**Headline:**
"Capture any event screenshot"

**Subtitle:**
"We'll do the rest -- for free"

**What the user sees:**
- Progress indicator: step 5 of 10
- A sample event card (personalized to their discovery channel selection from Screen 5)
- A prominent "Capture this event" button

**Phase 2 -- Parsing:**

**Headline:**
"Capturing..."

**What the user sees:**
- Pulsing AI animation
- "Parsing your event..." label
- "AI is reading the details" sublabel

**Phase 3 -- Result:**

**Headline:**
"That's it."

**Subtitle:**
"Screenshots become organized events, automatically. No charge."

**What the user sees:**
- The parsed event card with date, time, name, location
- Action chips: "Add to Calendar" and "Save"
- A fake push notification slides in from the top showing the saved event
- "Continue" button appears after a short delay

**What the user does:**
Taps "Capture this event," watches the animation, sees the result, taps "Continue."

**Navigates to:** Screen 7

**Design note:** Adding "for free" and "No charge" to the demo reinforces the identity at the exact moment the user experiences the core product value. This is the highest-impact moment to associate "free" with "powerful."

---

### Screen 7: Notifications Permission

**Headline:**
"Never miss an event"

**Subtitle:**
"Get a reminder before events you've saved so you never forget"

**What the user sees:**
- Progress indicator: step 6 of 10
- A simulated iOS notification permission dialog
- Animated chevron pointing to the "Allow" button
- Small text at bottom: "You can always change this in Settings"

**What the user does:**
Taps "Allow" (which triggers the real iOS notification permission prompt) or skips.

**Navigates to:** Screen 8

---

### Screen 8: Share Extension Video Demo

**Headline:**
"Share from any app"

**Subtitle:**
"Use the share button in Instagram, Safari, or any app to save events directly"

**What the user sees:**
- Progress indicator: step 7 of 10
- Looping video demo of the share extension in action
- "Continue" button

**What the user does:**
Watches the video, taps "Continue."

**Navigates to:** Screen 9

---

### Screen 9: Age (Survey -- Age)

**Headline:**
"One more thing -- how old are you?"

**Subtitle:**
"Helps us understand our community"

**What the user sees:**
- Progress indicator: step 8 of 10
- Single-select list:
  - "Under 24"
  - "25-34"
  - "35-44"
  - "45-54"
  - "55-64"
  - "65+"
- Tapping an option auto-advances

**What the user does:**
Taps an option.

**Navigates to:** Screen 10

**Design note:** "Helps us understand our community" subtly reinforces the community frame even on a data-collection screen.

---

### Screen 10: Source (Survey -- Source)

**Headline:**
"How did you find us?"

**Subtitle:**
(none)

**What the user sees:**
- Progress indicator: step 9 of 10
- Single-select list:
  - "Google Search"
  - "TikTok"
  - "Searched on App Store"
  - "Instagram"
  - "Facebook"
  - "Through a friend"
  - "Other"
- Tapping an option auto-advances

**What the user does:**
Taps an option.

**Navigates to:** Screen 11

---

### Screen 11: Support Soonlist (Reframed Paywall)

**Headline:**
"Support Soonlist"

**Subtitle:**
"Everything you just tried? It's yours. Free. All features, no limits, no catch. Soonlist is built by a small team and funded by the people who use it. If you find it valuable, you can help keep it going."

**What the user sees:**
- Progress indicator: step 10 of 10
- Background: the same purple brand color, but the tone shifts -- this is a conversation, not a sales pitch
- The headline "Support Soonlist" in large, warm type
- The subtitle paragraph, given room to breathe
- A community impact line: "2,000+ people use Soonlist. If just 5% supported it, we'd cover our costs for the year."
- Two support tiers presented as friendly cards (not aggressive upsell boxes):
  - **"Buy us a coffee"** -- $4.99/month -- "Keeps the servers running"
  - **"Champion"** -- $29.99/year -- "Save 50% -- you're keeping Soonlist alive"
- Each tier has a small heart or star icon, not a checkmark-gated feature list
- Below the tiers: "What supporters get: A supporter badge on your profile, early access to new features, and our deep gratitude."
- A prominent, friendly skip option at the bottom: "Not now -- I'll use Soonlist for free" (not greyed out, not hidden, not guilt-tripping)
- Below the skip: small text "You can always support later in Settings"

**What the user does:**
Taps a support tier (triggers RevenueCat subscription flow) OR taps "Not now" to continue for free.

**Navigates to:** Sign-in screen (OAuth) in both cases.

**Design note:** This is the critical screen. The reframing compared to the current "Unlock Soonlist" paywall:

| Current paywall | Community-supported reframe |
|---|---|
| "Unlock Soonlist" | "Support Soonlist" |
| Feature list behind gate | No features gated -- everything is free |
| "Try 3 events free" (implies limit) | "Not now -- I'll use Soonlist for free" (implies abundance) |
| Subscription framing | Patronage framing |
| Skip is hidden/de-emphasized | Skip is clear and guilt-free |

The Wikipedia-inspired community math ("If just 5% supported it...") gives the ask social proof and scale without making any individual feel pressured. The Signal-inspired badge gives supporters a visible identity within the community.

---

## Flow Summary

| # | Screen | Type | Key community thread |
|---|--------|------|---------------------|
| 1 | Welcome | Brand intro | "Free forever. Community-supported." |
| 2 | Community Identity | Value prop | "Made by people, not a corporation" |
| 3 | Goals | Survey | "Helps us build what matters to you" |
| 4 | Screenshot Habit | Survey | (quick, no reframe needed) |
| 5 | Discovery Channels | Survey | "We'll personalize your demo" |
| 6 | Try It (Capture Demo) | Interactive demo | "We'll do the rest -- for free" / "No charge" |
| 7 | Notifications | Permission | (standard, no reframe needed) |
| 8 | Share Extension Demo | Video demo | (standard, no reframe needed) |
| 9 | Age | Survey | "Helps us understand our community" |
| 10 | Source | Survey | (quick, no reframe needed) |
| 11 | Support Soonlist | Reframed paywall | "Support Soonlist" / patronage model |

**Post-flow:** Sign-in via OAuth.

---

## Required Survey Questions: Coverage Check

| Required survey | Screen | Present? |
|----------------|--------|----------|
| Goals | Screen 3 | Yes |
| Screenshot habit | Screen 4 | Yes |
| Discovery channels | Screen 5 | Yes |
| Age | Screen 9 | Yes |
| Source | Screen 10 | Yes |

All five required survey questions are included.

---

## Justification

**Why this direction works for Soonlist specifically:**

Soonlist is genuinely free with no feature gates, which means the community-supported framing is not a marketing spin -- it is the truth. Most apps that call themselves "free" are actually freemium with aggressive upsell. Because Soonlist has no limits, no ad model, and no data-selling business, the community-supported identity is credible in a way that most apps cannot claim. This credibility is the foundation of trust, and trust is what converts a first-time user into someone willing to support the project financially. The framing also differentiates Soonlist from every event app that uses a conventional subscription wall, which is a competitive advantage in a category where users are increasingly fatigued by paywalls.

**Biggest risk:**

The biggest risk is conversion rate. Signal and Wikipedia both have enormous scale (hundreds of millions of users) that makes a low single-digit conversion rate viable. Soonlist does not have that scale yet. If the community-supported framing is too soft -- if the skip button is too easy, if the language is too permission-giving -- the paywall conversion rate could drop significantly below what a conventional "Unlock Soonlist" paywall would achieve. The mitigation is to make the community story genuinely compelling (not just polite), to use specific numbers ("If just 5% supported it..."), and to monitor conversion closely. If conversion drops below a sustainable threshold, the copy can be tightened without abandoning the community frame -- for example, by adding a "free trial of supporter perks" before the skip option.
