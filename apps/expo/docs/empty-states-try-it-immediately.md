# Empty States: "Try It Immediately" Onboarding Approach

This document defines alternate empty states aligned with the "Try It Immediately" onboarding approach. The core idea: experience-first, no explanation before action. The capture demo is screen 1. The headline is "Screenshot. Tap. Done." The tone is direct, action-oriented, minimal words, and carries full confidence that the product speaks for itself. Empty states should feel like invitations to take action, not explanations of what the feature does.

---

## My List Empty State

Shown on the "My List" / "My Soonlist" tab when the user has no saved events.

| Element | Content |
|---|---|
| **Headline** | Nothing here yet. Go find something. |
| **Subtitle** | Screenshot an event anywhere. We handle the rest. |
| **Visual** | A single ghost event card mid-fade-in, as if the first event is about to materialize. No source icons, no labels. Just the empty shape waiting to be filled. Subtle upward motion animation on load. |
| **CTA Button** | Capture your first event |
| **Design Notes** | Strip away all explanation. No grayscale source icons (Instagram, TikTok, etc.) — those teach the user about inputs before they have tried the output. The ghost card should feel like a placeholder that wants to be replaced, not a diagram of the feature. The CTA button opens the capture flow directly. Keep the entire state to a single scroll-free screen. The animation should last no more than 600ms and settle into stillness. |

---

## Board / Radar Empty State

Shown on the "Board" / "Community Board" / "Radar" tab when the user is not following anyone.

| Element | Content |
|---|---|
| **Headline** | Your radar is empty. |
| **Subtitle** | Follow people. See what they're saving. |
| **Visual** | A minimal radar sweep animation — a single arc rotating once then stopping. The center dot represents the user. No fake content, no mock cards. After the sweep completes, the area remains visually open and clean. |
| **CTA Button** | Find people to follow |
| **Design Notes** | Avoid explaining the concept of a community board. The user already understands "follow people, see their stuff" from every other app. The radar animation gives the tab its identity without words. The CTA navigates to a people-discovery or invite flow. Do not use "Invite friends" as the primary CTA — it frames the empty state as the user's problem to solve socially. "Find people to follow" is lower friction and action-oriented. A secondary text link for "Invite friends" can sit below the button, understated. |

---

## Paywall / Support Empty State

The subscription ask, reframed to match the "Try It Immediately" tone.

| Element | Content |
|---|---|
| **Headline** | You've seen what it does. Keep going. |
| **Subtitle** | Unlimited captures. All your events in one place. Cancel anytime. |
| **Visual** | A compact summary of the user's own captured events so far (even if only the 3 free ones), displayed as a tight vertical stack of mini event cards. This is not a marketing graphic — it is the user's real data reflected back at them. If the user has captured zero events, fall back to a single line: "Your first 3 captures are free." |
| **CTA Button** | Unlock Soonlist |
| **Design Notes** | This paywall works because the user has already experienced the product. No feature bullet lists. No comparison tables. No "Here's what you get" framing. The user already knows what they get — they just did it. Reflect their own usage back to them and make the ask. Pricing (monthly $9.99 / yearly $59.99) appears below the CTA in a toggle, not above it. The skip option reads "Not yet" instead of "Try 3 events free" — they have already tried, so the skip acknowledges the decision rather than re-selling the trial. |

---

## Summary: Current vs. "Try It Immediately" Empty States

| Context | Current Approach | "Try It Immediately" Approach |
|---|---|---|
| **My List** | "Turn screenshots into possibilities" with grayscale source icons (Instagram, TikTok, etc.) and ghost event card placeholders. Explains the input sources before the user has tried the output. | "Nothing here yet. Go find something." Single ghost card, no source icons, direct CTA into capture flow. Trusts the user to act without a diagram. |
| **Board / Radar** | "Events other people have captured will appear here" with "Invite friends" button. Describes the feature rather than prompting action. | "Your radar is empty." Radar sweep animation, "Find people to follow" CTA. Names the action instead of the concept. |
| **Paywall** | RevenueCat paywall with monthly/yearly options, feature lists, "Try 3 events free" skip. Sells the product to someone who may not have used it yet. | "You've seen what it does. Keep going." Shows the user's own captured events, single "Unlock Soonlist" CTA, "Not yet" skip. Sells to someone who has already experienced the product. |

The consistent shift across all three: remove explanation, add action. The current empty states tell the user what the feature does. The "Try It Immediately" empty states assume the user already understands (because they have already done it or are about to) and simply point them toward the next step.
