# Onboarding Design: "I'm here because of someone's list"

## Part 1: Research -- Real iOS Apps with Referral-Aware or Social-Context-Driven Onboarding

### 1. Discord -- "You've been invited to join [Server Name]"

When a user taps a Discord invite link, the app opens (or the App Store opens for install, with deferred deep linking) directly to a screen that says "You've been invited to join [Server Name]" with the server's icon, name, member count, and online count. The user sees "Accept Invite" as the primary action. After accepting, Discord runs the server owner's custom onboarding questions (e.g., "What are you interested in?") to assign roles and channels. If you open Discord organically -- no invite context -- you see a generic "Create or Join a Server" screen instead. The entire first minute of the app is shaped by whether you arrived from a link or not.

This is relevant to Soonlist because it proves that showing the *specific thing someone was invited to* (a server / a list) dramatically increases the likelihood of completing onboarding. The invite object becomes the anchor.

### 2. Partiful -- Event-First Onboarding via Shared Link

Partiful's primary growth loop is the shared event invitation link. When a non-user taps a Partiful event link, they land on the event page in-browser and can RSVP without ever downloading the app. If they choose to install, the app opens with that event pre-loaded -- they see the event details, who else is going, and their own RSVP status. The onboarding is essentially "here's the event you came for; now you have an account." For organic users (who search the App Store), onboarding leads with "Create your first event" -- a completely different entry point.

This maps closely to Soonlist's situation: both are event-centric apps where the shared content (an event / a list) is the most compelling first screen.

### 3. Clubhouse -- Invite-Only Social Context

During Clubhouse's growth phase (2020-2021), onboarding was entirely gate-kept by social context. You could not use the app without an invite from an existing user. When you opened the app after installation, it told you who invited you and showed their profile. This "someone specific brought you here" framing created immediate social obligation and curiosity. The referrer's name and photo were the literal first thing a new user saw.

The psychological mechanism -- anchoring your onboarding on a specific person rather than a generic value proposition -- is the core of this Soonlist design direction.

### 4. Venmo -- "Your friend [Name] sent you money"

Venmo's most common organic acquisition path is receiving a payment from an existing user. The new user gets a text/email saying "[Name] paid you $X." When they install and open the app, the pending payment is front and center. The onboarding is functionally "claim this money" first, "learn about Venmo" second. If you install Venmo without a pending transaction (organic), you see standard value-prop screens about splitting bills with friends. Two distinct first experiences based on arrival context.

### 5. Strava -- Follow-the-Friend Onboarding

Strava's onboarding aggressively front-loads social connection. After basic account setup, one of the first screens is "Find Friends" which surfaces contacts already on Strava and highlights the specific friend who sent you the invite link (if applicable). The referrer's recent activities are shown as social proof. For users who found Strava organically, this screen still appears but is populated with suggested athletes and local clubs rather than a specific person. The experience adapts based on whether there is a known referral relationship.

---

## Part 2: Complete Screen-by-Screen Onboarding Design

### Flow Architecture

```
                    App opens
                       |
                 Has referral context?
                  /              \
                YES               NO
                 |                 |
          [R1] Referral       [O1] Organic
           Welcome             Welcome
                 |                 |
          [R2] Their List     [O2] Value: One Place
                 |                 |
          [R3] Follow +       [O3] Value: Batch
           Value Prop              |
                 \                /
                  \              /
                   v            v
              [C1] Goals (survey)
                     |
              [C2] Screenshot habit (survey)
                     |
              [C3] Discovery channels (survey)
                     |
              [C4] Try It (capture demo)
                     |
              [C5] Notifications
                     |
              [C6] Share Demo (video)
                     |
              [C7] Age (survey)
                     |
              [C8] Source (survey)
                     |
              [C9] Paywall
                     |
              [C10] Sign-in (OAuth)
```

**Referral path: 3 unique screens + 10 shared = 13 total**
**Organic path: 3 unique screens + 10 shared = 13 total**
*(But 2 organic value screens replace the 3 referral screens, so organic is 12 total)*

---

### REFERRAL PATH (Screens R1-R3)

These screens appear only when the app detects a `pendingFollowUsername` in the deep link context -- meaning the user tapped a link from someone's shared Soonlist list.

---

#### Screen R1: Referral Welcome

**Screen number:** R1
**Screen name:** referral-welcome

**Headline copy:**
> "[Display Name] wants you to see what's coming up"

(Example: "Jamie Chen wants you to see what's coming up")

**Subtitle copy:**
> You're one step away from following their events

**What the user sees:**
- Soonlist logo at top (small, same as current)
- The referrer's avatar (circular, 64px, pulled from Convex user data via `pendingFollowUsername`) centered below the logo
- The referrer's display name bolded in the headline
- Subtitle text below
- A preview of 2-3 event cards from the referrer's list (fetched from Convex, showing event name + date only, in a compact stacked layout)
- "See Their Events" primary button (purple, full-width, rounded pill)
- "Already have an account? Sign in" secondary link below
- "Got a code? Enter it here" tertiary link below

**What the user does:**
- Taps "See Their Events" to continue to R2
- OR taps "Sign in" to skip onboarding entirely (same behavior as current)
- OR taps "Got a code?" to open the code modal (same behavior as current)

**Navigates to:** R2 (Their List)

---

#### Screen R2: Their List Preview

**Screen number:** R2
**Screen name:** referral-list-preview

**Headline copy:**
> "[Display Name]'s upcoming events"

(Example: "Jamie Chen's upcoming events")

**Subtitle copy:**
> Follow them to keep these in your feed

**What the user sees:**
- Progress bar at top: step 1 of N
- Headline with referrer's name
- Subtitle
- A scrollable list of 3-5 real upcoming events from the referrer's public list, each showing:
  - Event name (bold)
  - Date and time
  - Location (if available)
  - Styled as Soonlist event cards (matching the existing `ParsedEventCard` visual style with the purple border and white background)
- If the referrer has fewer than 3 events, show what's available plus a "More events coming soon" placeholder
- "Follow [First Name] + Continue" primary button at bottom
- Small text below: "You can unfollow anytime"

**What the user does:**
- Scrolls to browse the events
- Taps "Follow [First Name] + Continue" -- this queues the follow action (to be executed after sign-in) and advances

**Navigates to:** R3 (Follow Confirmation + Value)

---

#### Screen R3: You're In + Build Your Own

**Screen number:** R3
**Screen name:** referral-bridge

**Headline copy:**
> "You'll follow [First Name] after sign-up"

**Subtitle copy:**
> Now let's set up your own event feed

**What the user sees:**
- Progress bar: step 2 of N
- A compact confirmation card at the top showing: referrer's avatar + "Following [Display Name]" with a checkmark
- Below the card, a visual transition element -- a downward arrow or divider with the text "Your turn"
- Below that, the same "One place for all your events" value content from the current organic screen O2, but abbreviated: a single feed screenshot image (the existing `feed.png` asset) and a one-liner: "Save events from screenshots, texts, Instagram -- all in one place"
- "Continue" primary button

**What the user does:**
- Taps "Continue" to proceed to the shared survey flow

**Navigates to:** C1 (Goals)

---

### ORGANIC PATH (Screens O1-O3)

These screens appear when there is no `pendingFollowUsername` -- the user found the app on their own.

---

#### Screen O1: Organic Welcome

**Screen number:** O1
**Screen name:** organic-welcome

**Headline copy:**
> Turn screenshots into plans

**Subtitle copy:**
> Save events in one tap. All in one place

**Tertiary copy:**
> Free, community-supported

**What the user sees:**
- Soonlist logo centered at top
- Headline with "plans" in the accent purple color (`interactive-1`)
- Subtitle and tertiary text
- A feed preview image (existing `feed.png`)
- "Get Started" primary button (purple pill)
- "Already have an account? Sign in" link
- "Got a code? Enter it here" link

*This is essentially identical to the current `00-welcome.tsx` screen, minus the `FollowContextBanner` component (which renders nothing in the organic case anyway).*

**What the user does:**
- Taps "Get Started"

**Navigates to:** O2 (Value: One Place)

---

#### Screen O2: Value -- One Place

**Screen number:** O2
**Screen name:** value-one-place

**Headline copy:**
> One place for all your events

**Subtitle copy:**
> No matter where you find them -- Instagram, flyers, texts -- save them all here

**What the user sees:**
- Progress bar: step 1 of N
- Feed preview image (existing `feed.png`)
- Social proof callout: "Join thousands of people saving events with Soonlist"
- "Continue" button

*Identical to current `01-value-one-place.tsx`.*

**What the user does:**
- Taps "Continue"

**Navigates to:** O3 (Value: Batch)

---

#### Screen O3: Value -- Batch Capture

**Screen number:** O3
**Screen name:** value-batch

**Headline copy:**
> Add them all at once

**Subtitle copy:**
> Select multiple screenshots from your camera roll and save them in seconds

**What the user sees:**
- Progress bar: step 2 of N
- Grid of 6 thumbnail placeholders showing the batch-select concept (3 with checkmarks)
- Social proof: "Most people have 5+ event screenshots saved already"
- "Continue" button

*Identical to current `02-value-batch.tsx`.*

**What the user does:**
- Taps "Continue"

**Navigates to:** C1 (Goals)

---

### SHARED PATH (Screens C1-C10)

Both referral and organic paths converge here. Step numbering in the progress bar adjusts based on path (referral starts at step 3, organic starts at step 3).

---

#### Screen C1: Goals (Survey)

**Screen number:** C1
**Screen name:** goals

**Headline copy:**
> What do you want to use Soonlist for?

**Subtitle copy:**
> Pick as many as you like

**What the user sees:**
- Progress bar
- Multi-select list of goals:
  - "Organize all my events in one place"
  - "Turn my screenshots into saved plans"
  - "Discover fun events near me"
  - "Share plans with friends"
  - "Follow a friend's event list" *(new option -- pre-selected if referral path)*
  - "Just exploring for now"
- "Continue" button (disabled until at least one selected)

**What the user does:**
- Taps one or more goals, then taps "Continue"

**Navigates to:** C2

---

#### Screen C2: Screenshot Habit (Survey)

**Screen number:** C2
**Screen name:** screenshot-habit

**Headline copy:**
> Do you already screenshot events you're interested in?

**Subtitle copy:** (none)

**What the user sees:**
- Progress bar
- Two options: "Yes" / "Not yet"
- Tapping an option auto-advances

**What the user does:**
- Taps one option

**Navigates to:** C3

---

#### Screen C3: Discovery Channels (Survey)

**Screen number:** C3
**Screen name:** discovery-channels

**Headline copy:**
> Where do you see the most events?

**Subtitle copy:** (none)

**What the user sees:**
- Progress bar
- Single-select list:
  - "Instagram"
  - "TikTok"
  - "Friends' recommendations"
  - "Local websites/newsletters"
  - "Walking around town"
  - "Facebook"
- Tapping an option auto-advances

**What the user does:**
- Taps one option

**Navigates to:** C4

---

#### Screen C4: Try It -- Capture Demo

**Screen number:** C4
**Screen name:** try-it

**Headline copy (phase 1):**
> Capture any event screenshot

**Subtitle copy (phase 1):**
> We'll do the rest

**Headline copy (phase 2 -- parsing):**
> Capturing...

**Headline copy (phase 3 -- result):**
> That's it!

**Subtitle copy (phase 3):**
> Screenshots become organized events, automatically

**What the user sees:**
- Progress bar
- Phase 1: A sample event screenshot card (content personalized based on their C3 discovery channel answer -- e.g., if they said "Instagram," they see a rooftop DJ set from an Instagram Story). A "Capture this event" button at bottom.
- Phase 2: A pulsing sparkle animation with "Parsing your event..." and "AI is reading the details" -- lasts ~1.5 seconds
- Phase 3: A parsed event card (purple border, white bg) showing the extracted name, date, time, location, with "Add to Calendar" and "Save" pill badges. A simulated push notification banner slides in from the top showing "Soonlist -- [Event Name] saved!"
- "Continue" button appears after the parsed card

*Identical to current `06-try-it.tsx`.*

**What the user does:**
- Taps "Capture this event" --> watches parsing animation --> sees result --> taps "Continue"

**Navigates to:** C5

---

#### Screen C5: Notifications Permission

**Screen number:** C5
**Screen name:** notifications

**Headline copy:**
> Never miss an event

**Subtitle copy:**
> Get notified when events are saved so you can stay on top of your plans

**What the user sees:**
- Progress bar
- A mock iOS notification permission dialog (white card with rounded corners) showing:
  - "Turn on Push Notifications to capture and remember"
  - "Soonlist notifies you when events are created, and to help you build a habit of capturing events"
  - "Don't Allow" (grayed out, non-functional) and "Allow" (blue, functional) buttons
  - An animated bouncing chevron pointing at "Allow"
- Small text: "You can always update this later in your settings!"

*Identical to current `07-notifications.tsx`. Tapping "Allow" triggers the real iOS permission dialog.*

**What the user does:**
- Taps "Allow" (which triggers the actual system permission dialog)

**Navigates to:** C6

---

#### Screen C6: Share Demo (Video)

**Screen number:** C6
**Screen name:** share-demo

**Headline copy:**
> Share into the app

**Subtitle copy:**
> Use the share button from any app to save events directly to Soonlist

**What the user sees:**
- Progress bar
- A looping, muted video (fetched from Convex via `appConfig.getDemoVideoUrl`) demonstrating the share extension workflow
- "Continue" button

*Identical to current `08-share-demo.tsx`.*

**What the user does:**
- Watches the video, taps "Continue"

**Navigates to:** C7

---

#### Screen C7: Age (Survey)

**Screen number:** C7
**Screen name:** age

**Headline copy:**
> How old are you?

**Subtitle copy:** (none)

**What the user sees:**
- Progress bar
- Single-select list of age ranges:
  - "Under 24"
  - "25-34"
  - "35-44"
  - "45-54"
  - "55-64"
  - "65+"
- Tapping an option auto-advances

*Identical to current `09-age.tsx`.*

**What the user does:**
- Taps one option

**Navigates to:** C8

---

#### Screen C8: Source (Survey)

**Screen number:** C8
**Screen name:** source

**Headline copy:**
> Where did you hear about us?

**Subtitle copy:** (none)

**What the user sees:**
- Progress bar
- Single-select list:
  - "A friend's shared list" *(new option, pre-selected if referral path -- this captures the referral attribution explicitly)*
  - "Through a friend"
  - "Google Search"
  - "TikTok"
  - "Searched on App Store"
  - "Instagram"
  - "Facebook"
  - "Other"
- Tapping an option auto-advances

**What the user does:**
- Taps one option. For referral users, "A friend's shared list" is at the top and likely the natural choice, which completes the attribution loop.

**Navigates to:** C9

---

#### Screen C9: Paywall

**Screen number:** C9
**Screen name:** paywall

**Headline copy:** (handled by RevenueCat paywall UI)

**What the user sees:**
- RevenueCat's native paywall modal with subscription options (Monthly $9.99, Yearly $59.99)
- "Try 3 events free" skip option
- For referral users, the paywall could include a custom subtitle: "Support Soonlist to keep following [First Name]'s events and more" -- though this depends on RevenueCat's customization capabilities. If not feasible, use the standard paywall.

*Functionally identical to current `paywall.tsx`.*

**What the user does:**
- Subscribes, restores, or skips/cancels

**Navigates to:** C10

---

#### Screen C10: Sign-in (OAuth)

**Screen number:** C10
**Screen name:** sign-in

**What the user sees:**
- Clerk OAuth sign-in screen (Apple, Google, etc.)
- For referral users: after sign-in completes, the queued follow action executes automatically (following the referrer's account)

**What the user does:**
- Signs in via OAuth
- App completes onboarding, lands on the main feed
- Referral users see the referrer's events in their feed immediately

**Navigates to:** Main app (feed tab)

---

### Survey Question Placement Summary

| Survey Question | Screen | Position in Flow |
|---|---|---|
| Goals | C1 | Immediately after path convergence |
| Screenshot habit | C2 | After goals |
| Discovery channels | C3 | After screenshot habit (feeds into C4 demo personalization) |
| Age | C7 | After demos, before source |
| Source | C8 | Last survey, right before paywall |

All five required survey questions are present. The ordering is intentional: goals/discovery are asked before the demo so the demo can be personalized to the user's context (e.g., showing an Instagram event if they said Instagram). Age and source are moved to after the demos to avoid front-loading too many survey screens in a row.

---

## Part 3: Justification

**Why this direction works for Soonlist specifically:** Soonlist's strongest organic growth channel is someone sharing their event list -- a friend sees the list, thinks "I want that," and installs the app. But the current onboarding treats that high-intent user the same as someone who stumbled onto the App Store listing. By opening with the specific person's name and their actual upcoming events, the referral path converts the user's existing intent ("I want to see Jamie's events") into an immediate action ("Follow Jamie"), and only then broadens to "now build your own feed." This mirrors the Partiful and Discord pattern where the shared content *is* the onboarding, and it respects the user's real motivation rather than making them sit through generic value propositions they already believe in. The existing `FollowContextBanner` component and `pendingFollowUsername` store mechanism already provide the infrastructure for detecting referral context, so the technical lift is incremental rather than architectural.

**Biggest risk:** If the referrer's list has few or no upcoming events (they shared their list months ago, or their events have all passed), screens R1 and R2 will feel empty and underwhelming -- the social hook falls flat. Mitigation: if the referrer has fewer than 2 upcoming events, fall back to showing their most recent past events with a label like "Recent events from [Name]," or collapse R2 into R1 and move to the shared flow faster. The system needs a graceful degradation path for stale referrals.

---

Sources:
- [Branch Deep Linking](https://www.branch.io/deep-linking/)
- [Personalized Onboarding Flow for Apps - Branch Documentation](https://dev.branch.io/marketing-channels/custom-onboarding/guide/ios/)
- [How Mobile Apps Go Viral: User-generated Sharing Links - Branch](https://www.branch.io/resources/blog/how-mobile-apps-go-viral-user-generated-sharing-links/)
- [Partiful - Free Online Invitations](https://partiful.com)
- [Partiful Invites - App Store](https://apps.apple.com/us/app/partiful-invites/id1662982304)
- [Discord Onboarding - Taylor B. Dallas](https://www.taylorbdallas.com/discord-onboarding)
- [Strava Onboarding Flow on iOS - Page Flows](https://pageflows.com/post/ios/onboarding/strava/)
- [How Dropbox Marketing Achieved 3900% Growth with Referrals](https://viral-loops.com/blog/dropbox-grew-3900-simple-referral-program/)
- [Mobile App Onboarding: Mastering Deep Linking & Smart Banners](https://www.apptweak.com/en/aso-blog/mobile-app-onboarding-mastering-deep-linking-smart-banners)
