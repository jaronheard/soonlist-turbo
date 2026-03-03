# Empty States: "Go Out More" Onboarding Approach

This document defines alternate empty states built around the **"Go Out More"** identity-based framing. The core premise: Soonlist does not position itself as a utility for organizing events. It positions the user as **the person who actually goes**. Every empty state is a mirror -- it reflects back the identity the user already wants to inhabit. The tone is aspirational, warm but challenging, and lifestyle-oriented. Think Strava calling every user an "athlete" from day one. The empty state is not a dead end; it is the first step in an identity shift.

Voice principles:
- **Identity-first.** "You're the kind of person who shows up."
- **Aspirational but grounded.** Not fantasy, not guilt. A better version of Saturday night.
- **Warm but challenging.** A gentle push, not a sales pitch.
- **Anti-FOMO.** Not "you're missing out" but "you're the one who makes plans happen."

---

## My List Empty State

Shown on the **"My List" / "My Soonlist"** tab when the user has zero saved events.

| Element | Content |
|---------|---------|
| **Headline** | Be the person who actually goes |
| **Subtitle** | Events shouldn't disappear into your camera roll. Save one, and your list starts working for you. |
| **Visual** | A single ghost event card, mid-capture -- half materialized, shifting from a faded screenshot into a full-color event card. The card sits slightly off-center as if it just landed. No grayscale icon grid; the focus is on the transformation moment, not the sources. Subtle warm gradient behind the card (peach to amber). |
| **CTA Button** | Save your first event |
| **Secondary action** | Small text link below the CTA: "Paste a link, share a screenshot, or just describe it" |

**Design Notes**

- The current empty state ("Turn screenshots into possibilities" with grayscale source icons) frames the product as a tool and the sources as the story. The "Go Out More" version frames the *user* as the story. The headline is about who you become, not what the app does.
- The ghost card animation should feel like potential energy -- something is about to happen. Consider a very slow breathing animation (scale 1.0 to 1.02) on the placeholder card.
- Avoid showing Instagram/TikTok/etc. logos. The identity framing works better when the user is not reminded they are importing from other platforms. The input method is secondary to the act of committing to go.
- The warm gradient background should feel distinct from the rest of the app's neutral chrome, marking this screen as emotionally significant -- a starting line, not an error state.

---

## Board/Radar Empty State

Shown on the **"Board" / "Community Board" / "Radar"** tab when the user is not following anyone and no community events are visible.

| Element | Content |
|---------|---------|
| **Headline** | Your people are already out there |
| **Subtitle** | When you follow friends on Soonlist, their plans show up here. You stop wondering what everyone's doing and start showing up together. |
| **Visual** | Two or three overlapping event cards at slightly different angles, with blurred/placeholder content (names, dates, venues visible but anonymized). They look like real plans from real people, just out of reach. A soft radial blur at the edges suggests a wider world just beyond the viewport. |
| **CTA Button** | Find your people |
| **Secondary action** | Text link: "Invite a friend who always knows what's happening" |

**Design Notes**

- The current version ("Events other people have captured will appear here" with "Invite friends") is accurate but passive. It describes a feature. The "Go Out More" version describes a feeling: the relief of not having to be the one who always organizes, the pleasure of serendipitously discovering a friend's plan.
- "Your people are already out there" does two things: it implies the user belongs to a community that exists (aspirational identity), and it implies that community is active and worth joining (social proof without specific numbers).
- The blurred event cards should feel tantalizing but not manipulative. The goal is not artificial scarcity ("you can't see this!") but genuine anticipation ("this space is about to fill up with plans from people you care about").
- The "Invite a friend who always knows what's happening" secondary link is identity-based targeting. It names a specific person in the user's life and makes the invitation feel purposeful, not spammy.
- Consider showing this state with a subtle parallax or depth effect on the blurred cards to suggest the board is a living, dimensional space.

---

## Paywall/Support Empty State

The subscription ask, reframed as a commitment to a lifestyle rather than a feature unlock. Shown after the user has used their free event captures or at a natural upgrade moment.

| Element | Content |
|---------|---------|
| **Headline** | You showed up. Keep going. |
| **Subtitle** | You've already saved events and made plans real. Soonlist Pro keeps your momentum -- unlimited saves, smarter suggestions, and the full toolkit for someone who actually goes. |
| **Visual** | A vertical timeline or "streak" visualization showing the user's actual captured events as small dots or icons along a line, with the line continuing upward into a glowing, unlocked section representing Pro. The past is concrete (their real data); the future is aspirational (warm glow, expanded space). No feature grid. No checkmark comparison table. |
| **CTA Button (Primary)** | Keep going -- yearly ($59.99/yr) |
| **CTA Button (Secondary)** | Monthly ($9.99/mo) |
| **Skip/Dismiss** | "Save 3 more events free" (replaces "Try 3 events free" -- the reframe emphasizes continued action, not a trial) |

**Design Notes**

- The current RevenueCat paywall is transactional: here are features, here are prices, here is a free trial. The "Go Out More" version reframes the subscription as **continuity of identity**. You have already become someone who saves events and shows up. Paying is not buying a product; it is maintaining momentum.
- "You showed up. Keep going." directly references the identity established in the My List empty state ("Be the person who actually goes"). This creates narrative continuity across the onboarding arc.
- The timeline/streak visualization is critical. By showing the user's *own* captured events, it makes the paywall feel earned, not imposed. "Look at what you've already done" is more compelling than "look at what you could unlock."
- Avoid a feature comparison table. Feature grids make the user evaluate ROI. The identity framing works best when the decision feels like a commitment to a direction, not a cost-benefit analysis. If features must be mentioned, weave them into the subtitle copy naturally ("unlimited saves, smarter suggestions, and the full toolkit").
- The yearly plan is presented first and framed as "Keep going" -- a verb, not a price. The monthly plan is secondary and neutral. This privileges the action over the transaction.
- "Save 3 more events free" instead of "Try 3 events free" is a subtle but meaningful reframe. "Try" implies the user has not yet committed. "Save 3 more" implies they are already in motion and this is a continuation, not an experiment.

---

## Summary: Current vs. "Go Out More" Empty States

| Context | Current Approach | "Go Out More" Approach | Key Shift |
|---------|-----------------|----------------------|-----------|
| **My List** | "Turn screenshots into possibilities" -- tool-centric, shows source platform icons | "Be the person who actually goes" -- identity-centric, shows transformation moment | From **what the app does** to **who the user becomes** |
| **Board/Radar** | "Events other people have captured will appear here" -- feature description, generic invite | "Your people are already out there" -- community belonging, targeted invite | From **explaining a feature** to **evoking a feeling** |
| **Paywall** | RevenueCat standard with feature grid, "Try 3 events free" | "You showed up. Keep going." -- continuity of identity, user's own data as proof | From **transactional unlock** to **momentum continuation** |

The unifying principle across all three: the empty state is never an error. It is an origin story. Every empty screen is the user standing at the beginning of something, and the copy and design should make that beginning feel exciting, inevitable, and already underway.
