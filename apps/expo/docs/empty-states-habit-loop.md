# Empty States: Habit Loop Onboarding Approach

The Habit Loop approach reframes Soonlist's empty states around a single insight: **users already screenshot events**. The habit exists. Soonlist just completes the loop.

Modeled after apps that succeed by making the first step feel absurdly small -- Duolingo ("just 5 minutes a day"), Headspace ("start with 3 minutes"), Fabulous ("put your shoes on"), Atoms ("become the type of person who...") -- this approach treats each empty state as the start of a rhythm, not a blank page. The first saved event is "your first rep," not "getting started."

**Voice principles:** Encouraging. Rhythm-focused. Small-steps. Validates what you already do. Never guilt-trips. Never overwhelms. The tone says: "You already do the hard part. Let us handle the rest."

**Core tagline:** *See it. Screenshot it. Soonlist does the rest.*

---

## My List Empty State

Shown on the "My List" / "My Soonlist" tab when the user has zero saved events.

| Element | Content |
|---|---|
| **Headline** | One habit. Three seconds. |
| **Subtitle** | You already screenshot events. Now they actually go somewhere. Share one to Soonlist and watch it turn into a plan. |
| **Visual** | A single ghost event card in full color (not greyed out) with a subtle pulse animation, as if it is waiting to be born. Above it, a small looping animation: phone screen -> screenshot gesture -> card materializes. No source-app icons -- keep focus on the action, not the origin. |
| **CTA Button** | Save your first one |
| **Design Notes** | Avoid the current grayscale icon grid (Instagram, TikTok, etc.) -- it emphasizes platforms rather than the user's existing behavior. The ghost card should feel alive and expectant, not empty and sad. Consider a secondary line of micro-copy below the CTA: "It takes about 3 seconds." The entire composition should feel like the top of a streak counter at zero, not like an error state. If the user has granted photo permissions, the CTA can deep-link directly into the share-sheet or photo picker flow. |

### Why this differs from current

The current My List empty state ("Turn screenshots into possibilities") leads with source icons and placeholder cards, which frames the screen as a catalog of integrations. The Habit Loop version leads with the user's own behavior and frames the first event as a single, tiny rep in a new rhythm.

---

## Board / Radar Empty State

Shown on the "Board" / "Community Board" / "Radar" tab when the user is not following anyone or no events are available.

| Element | Content |
|---|---|
| **Headline** | Your friends are already screenshotting events. |
| **Subtitle** | When they share to Soonlist, their finds show up here. Invite one person and start building your radar together. |
| **Visual** | Two ghost event cards slightly overlapping at a casual angle, each with a small avatar circle placeholder on top. A faint dotted line connects them, suggesting a network forming. One card has a subtle shimmer animation as if it is about to resolve into a real event. |
| **CTA Button** | Invite your first friend |
| **Design Notes** | The current version ("Events other people have captured will appear here") is passive and descriptive. The Habit Loop version reframes the empty board as a shared rhythm waiting to start. The word "radar" in the subtitle reinforces the tab name and the idea that this is a living, updating feed. Consider adding a secondary ghost-text line: "Most people invite the friend they text plans with." This leverages social proof and makes the invite feel concrete, not abstract. The invite flow should pre-populate a message that mirrors the habit-loop voice: "I'm trying this app that turns screenshots into plans. Want to try it together?" |

### Why this differs from current

The current Board empty state is a single informational sentence with an "Invite friends" button. It tells the user what the tab does but gives no reason to act now. The Habit Loop version makes the invite feel like the natural next rep -- you saved your first event, now bring in the person you'd actually go with.

---

## Paywall / Support Empty State

The subscription ask, reframed to match the Habit Loop tone. Shown after the user has used their free events or at a natural upgrade moment.

| Element | Content |
|---|---|
| **Headline** | That's your first one. |
| **Subtitle** | You just turned a screenshot into a plan. Soonlist can keep doing this for every event you find -- concerts, dinners, exhibits, all of it. Keep the habit going. |
| **Visual** | The user's actual first saved event card displayed prominently at the top, fully rendered and real. Below it, a simple timeline showing three dots: the first dot is filled (representing the event they just saved), the next two are outlined, suggesting a rhythm continuing forward. No feature comparison grids. No checkmark lists. |
| **CTA Button** | Keep it going -- $9.99/mo |
| **Design Notes** | The current paywall uses a standard RevenueCat template with monthly ($9.99) and yearly ($59.99) options and a "Try 3 events free" skip. The Habit Loop version should still offer both pricing tiers but deprioritize the comparison. Lead with the emotional momentum of having just completed a successful action. The yearly option can appear as a secondary line: "Or $59.99/year -- that's less than $5/month." The skip/dismiss option should read "Maybe after a few more" rather than "Try 3 events free" -- this keeps the language in rhythm-territory and implies the user will naturally come back. Do not use urgency or scarcity tactics. The tone is "you've started something good" not "you'll lose access." If the user dismisses, a subtle toast or bottom-sheet reminder can appear after their 2nd and 3rd free events: "Two down. You're building a habit." / "Three for three. Ready to keep going?" |

### Pricing display

| Tier | Label | Framing |
|---|---|---|
| Monthly | $9.99/month | Primary CTA: "Keep it going" |
| Yearly | $59.99/year | Secondary line: "Less than $5/month -- the price of one screenshot turning into a real plan" |
| Skip | Free (limited) | "Maybe after a few more" -- dismisses without guilt |

### Why this differs from current

The current paywall is transactional: here are the features, here are the prices, decide. The Habit Loop version is sequential: you just did the thing, it worked, keep doing the thing. It leverages the completion high of the first successful event save rather than presenting a cold feature list. The user's own event card becomes the best sales pitch.

---

## Summary: Current vs. Habit Loop Empty States

| Context | Current Approach | Habit Loop Approach |
|---|---|---|
| **My List** | "Turn screenshots into possibilities." Grayscale source icons. Ghost card placeholders. Frames the app as a tool with integrations. | "One habit. Three seconds." Single animated ghost card. Frames the app as the completion of something you already do. |
| **Board / Radar** | "Events other people have captured will appear here." Informational. Passive. Generic invite button. | "Your friends are already screenshotting events." Social proof. Frames the invite as the next natural rep in the rhythm. |
| **Paywall** | RevenueCat standard. Monthly/yearly toggle. "Try 3 events free" skip. Feature-led. | "That's your first one." Shows the user's real event. Momentum-led. Skip reads "Maybe after a few more." |

The fundamental shift: current empty states describe what the app *can* do. Habit Loop empty states validate what the user *already* does and frame Soonlist as the missing last step. Every screen answers the same question: "What's my one next rep?"
