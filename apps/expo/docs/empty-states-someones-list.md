# Empty States: "I'm Here Because of Someone's List" Onboarding Approach

This document defines alternate empty states for the referral-aware onboarding path. The core idea is that the user arrived because someone shared their list — a friend, a curator, a local organizer. The voice throughout is **personal, social, warm, and relationship-driven**. Instead of leading with product features, every screen reinforces the feeling: "someone brought you here."

There are two paths through each empty state:

- **Referral path** — We know who invited them. We use that person's display name, avatar, and events to ground the experience in a real relationship.
- **Organic path** — The user found Soonlist on their own. We still lean into the social, community angle, but without a specific person to reference.

---

## My List Empty State

Shown on the **"My List" / "My Soonlist"** tab when the user has zero saved events.

### Referral Variant

| Element | Content |
|---|---|
| **Headline** | [Display Name] wants you to see what's coming up. |
| **Subtitle** | They've already shared their list with you. Now start yours — save anything that catches your eye and you'll never lose track of it. |
| **Visual** | The referrer's avatar sits above the headline. Below the subtitle, show 1–2 ghost event cards with a subtle arrow or "save" animation pointing from a miniature version of the referrer's list into the user's empty list area. The ghost cards should hint at real event shapes (date pill, title line, location line) but remain unpopulated. |
| **CTA button** | See [Display Name]'s list |
| **Secondary action** | "Or save your first event" as a text link below the CTA |
| **Design notes** | The referrer's name should be styled as a tappable link that navigates to their public list. Use the referrer's accent color or avatar border color as the CTA button color to reinforce the personal connection. Keep the ghost cards at ~40% opacity so the screen feels inviting, not empty. |

### Organic Variant

| Element | Content |
|---|---|
| **Headline** | Your list is waiting for its first event. |
| **Subtitle** | Paste a link, share a screenshot, or forward a message — Soonlist turns it into something you can actually find again. |
| **Visual** | A single ghost event card centered on screen, with faint grayscale icons of common sources (Instagram story, iMessage, flyer photo) arranged in a loose arc above it, each with a dotted-line path converging on the card. The card has a gentle pulse animation to suggest it's ready to receive. |
| **CTA button** | Save your first event |
| **Secondary action** | "See how it works" text link leading to a brief inline walkthrough or tooltip sequence |
| **Design notes** | Without a referrer to anchor the emotional tone, lean on the practical magic of the product. The source icons should be recognizable but muted — the point is "stuff you already encounter" not "platforms we integrate with." Avoid feature-list energy; keep it one clear promise. |

---

## Board / Radar Empty State

Shown on the **"Board" / "Community Board" / "Radar"** tab when the user isn't following anyone (or, for referral users, when they are following the referrer but no events have loaded yet).

### Referral Variant

Because referral users are **automatically following the person who invited them**, this state is slightly different — they should rarely see a truly empty board. But if the referrer has no upcoming events, or if events haven't synced yet, this state appears.

| Element | Content |
|---|---|
| **Headline** | You're following [Display Name]. Their events will show up here. |
| **Subtitle** | This is your radar — events from people you follow appear as they save them. [Display Name] brought you in, and you can follow more people anytime. |
| **Visual** | The referrer's avatar in a "following" badge state (small checkmark or green ring). Below, a timeline-style layout with 2–3 placeholder event slots, the first one bearing a faint version of the referrer's avatar as attribution. A subtle loading shimmer on the first slot suggests content is on its way. |
| **CTA button** | Explore [Display Name]'s list |
| **Secondary action** | "Find more people to follow" as a text link |
| **Design notes** | The key feeling here is "you're already connected." The board isn't empty in a lonely way — it's empty in a "just getting started" way. The shimmer animation should feel optimistic, not broken. If the referrer genuinely has zero events, swap the shimmer for a static message: "[Display Name] hasn't saved any upcoming events yet — but you'll see them here when they do." |

### Organic Variant

| Element | Content |
|---|---|
| **Headline** | Your radar is quiet — for now. |
| **Subtitle** | When you follow people, their saved events show up here. It's like a shared calendar you never have to manage. |
| **Visual** | An empty timeline view with three ghost event slots stacked vertically. Each slot has a blank circular avatar placeholder on the left edge. A gentle radial gradient or "radar sweep" animation passes over the slots periodically, reinforcing the "radar" metaphor. |
| **CTA button** | Find people to follow |
| **Secondary action** | "Invite a friend to Soonlist" as a text link — this surfaces the share/invite flow |
| **Design notes** | This is the loneliest empty state in the app for organic users. Resist the urge to over-explain. The radar metaphor does the work: you're scanning, nothing's pinged yet, but the system is live. If the user has contacts who are already on Soonlist, consider replacing "Find people to follow" with "3 of your contacts are on Soonlist" (or similar) to reduce the cold-start problem. |

---

## Paywall / Support Empty State

The subscription ask, reframed to match the "someone brought you here" tone. Shown when the user hits the free-tier limit (currently 3 events) or navigates to subscription settings.

### Referral Variant

| Element | Content |
|---|---|
| **Headline** | [Display Name] thinks you'd love this. We think so too. |
| **Subtitle** | You've saved [N] events so far. Soonlist keeps working — unlimited saves, smart reminders, and a shared radar with the people who matter — for less than a coffee a week. |
| **Visual** | A compact "your activity so far" summary: the user's saved event count, the referrer's avatar with "invited you" label, and a miniature preview of 1–2 events they've already saved. Below, the subscription options are presented as cards rather than a modal paywall. The referrer's avatar adds a speech-bubble-style endorsement: "[Display Name] is a subscriber" (if true) or simply their avatar as a warm presence. |
| **CTA button (primary)** | Keep going — $9.99/month |
| **CTA button (secondary)** | Best value — $59.99/year |
| **Skip action** | "Not yet" as understated text below the buttons |
| **Design notes** | The referral paywall should never feel like a bait-and-switch. The referrer's implicit endorsement ("they use this and invited you") is the most powerful social proof available — use it, but don't fabricate it. If the referrer is not a paying subscriber, omit the "[Display Name] is a subscriber" badge entirely. The tone is grateful and confident, not desperate. Avoid urgency language ("limited time," "don't miss out"). The relationship is the reason to stay. |

### Organic Variant

| Element | Content |
|---|---|
| **Headline** | You've got good taste. Keep it going. |
| **Subtitle** | You've saved [N] events so far — nice start. With Soonlist, you get unlimited saves, smart reminders before events happen, and a shared radar so your friends never miss what you find. |
| **Visual** | A warm summary of the user's activity: their saved event count displayed prominently, with thumbnails or compact cards of the events they've saved fanned out behind the subscription options. This reinforces "look at what you've already built — don't let it stop here." Subscription tiers are presented as side-by-side cards with clear pricing. |
| **CTA button (primary)** | Keep going — $9.99/month |
| **CTA button (secondary)** | Best value — $59.99/year |
| **Skip action** | "Try 3 more events free" or "Not yet" — whichever aligns with current free-tier policy |
| **Design notes** | Without a referrer, the organic paywall leans on the user's own momentum. The compliment in the headline ("good taste") is intentional — it reframes the paywall as recognition, not a gate. Show their own saved events as proof of value. Keep the same pricing as the referral variant; do not offer referral-exclusive discounts unless deliberately running a promotion. The skip action should feel genuinely available, not buried or guilt-laden. |

---

## Summary: Comparison to Current Empty States

| Context | Current Approach | "Someone's List" Approach |
|---|---|---|
| **My List** | "Turn screenshots into possibilities" — product-feature-first, grayscale source icons, ghost event card placeholders. Functional but impersonal. | Referral: leads with the inviter's name and relationship. Organic: still personal ("your list is waiting") but warmer and less feature-centric. The visual shifts from "here's what the product does" to "here's what your list will become." |
| **Board / Radar** | "Events other people have captured will appear here" — accurate but passive. "Invite friends" button as sole CTA. | Referral: the user is already following someone, so the board feels alive from moment one ("You're following [Name]"). Organic: the radar metaphor adds personality and motion to what is otherwise a dead screen. Both variants offer clearer next steps than a single "Invite friends" button. |
| **Paywall** | RevenueCat default with monthly ($9.99) and yearly ($59.99). "Try 3 events free" skip. Transactional tone. | Referral: uses the inviter's implicit endorsement as social proof. Organic: compliments the user's activity and frames the subscription as continuation, not conversion. Both variants show the user's own saved events to reinforce value already received. Pricing stays the same; tone shifts from transactional to relational. |

The fundamental shift across all three contexts: **current empty states describe the product; "Someone's List" empty states describe the relationship.** The product fades into the background. The people — the referrer, the user, the community — move to the foreground.
