# Empty States: "Everything in One Place" Approach

This document defines alternate empty states for the **"Everything in One Place"** onboarding approach. The core idea is consolidation messaging: *"Your events are everywhere. Soonlist brings them all into one place."* The tone is practical and relief-oriented, naming the mess explicitly rather than speaking in abstractions. It draws inspiration from Notion ("all-in-one workspace"), Fantastical ("all your calendars, one app"), and Spark Mail's unified inbox positioning. Headlines like "Your events are everywhere" and "One place. Every event." set the voice.

The pain of scattered events is the hook. The organized list is the relief. Every empty state should make the user feel seen ("yes, my events ARE everywhere") and then offer the clear next step.

---

## My List Empty State

Shown on the **"My List" / "My Soonlist"** tab when the user has zero saved events.

| Element | Content |
|---|---|
| **Headline** | Your events are everywhere |
| **Subtitle** | Instagram stories, texts from friends, email invites, flyers on the wall — they all end up forgotten. Save one here and bring them together. |
| **Visual** | A convergence animation: small, recognizable source icons (Instagram, iMessage, Gmail, TikTok, a paper flyer, a screenshot) drift inward from the edges of the screen toward a single glowing Soonlist card in the center. The card is empty but ready — a dotted outline with a subtle pulse. The source icons are full-color (not grayscale) to emphasize that these are real, active sources the user already deals with. As icons reach the center card, they dissolve into it. |
| **CTA Button** | Save your first event |
| **Secondary Action** | "Paste a link, share a screenshot, or type it in" (muted helper text below the CTA) |

### Design Notes

- The current empty state uses grayscale source icons and ghost event card placeholders. This revision makes the icons full-color and animated to feel alive and specific — the user should recognize their own daily chaos in the visual.
- The headline names the problem directly instead of leading with a feature ("Turn screenshots into possibilities"). Naming the mess creates an immediate "yes, exactly" moment.
- The subtitle lists concrete sources by name. This specificity is key to the "Everything in One Place" voice — it says "we know where your events get lost" rather than speaking generically.
- The CTA is action-oriented and singular ("Save your first event") rather than aspirational. One event is all it takes to see the value.
- Consider a micro-interaction where tapping the CTA causes the floating source icons to rush into the center card, reinforcing the convergence metaphor.

---

## Board/Radar Empty State

Shown on the **"Board" / "Community Board" / "Radar"** tab when the user is not following anyone and no community events are visible.

| Element | Content |
|---|---|
| **Headline** | One place for everyone's events, too |
| **Subtitle** | When friends and people you follow save events, they show up right here. No more hunting through group chats and stories to figure out what's happening. |
| **Visual** | A simplified feed mockup showing 2–3 ghost event cards, each tagged with a subtle avatar silhouette and source badge (e.g., "via Instagram," "via link"). The cards are stacked in a clean vertical list to preview what a populated board looks like. A faint dotted connector line runs from each card to a small cluster of avatar circles at the top, implying "people you follow → their events → your feed." |
| **CTA Button** | Find people to follow |
| **Secondary Action** | "Invite a friend" (text link below the CTA) |

### Design Notes

- The current version ("Events other people have captured will appear here") is passive and vague. This revision reframes the board as an extension of the consolidation promise: it is not just *your* events in one place, it is *everyone's* events in one place.
- The headline ("One place for everyone's events, too") uses "too" to connect back to the My List promise. The user already understands "one place for my events" — now the board extends that.
- The subtitle names the specific pain of social event discovery: hunting through group chats and stories. This is the same "name the mess" technique from the My List state, applied to the social context.
- The ghost cards with source badges ("via Instagram," "via link") reinforce that events come from many scattered places but land in one unified feed.
- "Find people to follow" is a stronger CTA than "Invite friends" because it gives the user immediate agency. Inviting requires waiting; following delivers value now. The invite option is preserved as a secondary action.

---

## Paywall/Support Empty State

The subscription ask, reframed to match the **"Everything in One Place"** tone. Shown when the user has used their free events and hits the upgrade prompt.

| Element | Content |
|---|---|
| **Headline** | One place. Every event. Always. |
| **Subtitle** | You've seen how Soonlist pulls your events together from everywhere. Keep it going — unlimited saves, so nothing slips through the cracks again. |
| **Pricing** | Monthly: $9.99/mo · Yearly: $59.99/yr (save 50%) |
| **Visual** | A compact, organized list of 5–6 event cards in a tight vertical stack, each with a small colored source icon on the left edge (Instagram pink, iMessage green, Gmail red, TikTok black, a calendar blue, a link/globe gray). The stack is clean and aligned — the visual thesis is "look how organized this is." Below the stack, a subtle lock icon or fade effect on additional cards implies "there's more to unlock." |
| **CTA Button** | Keep everything in one place |
| **Secondary Action** | "Try 3 events free" (if applicable, as current skip option) |

### Design Notes

- The current paywall is a standard RevenueCat modal with pricing tiers. This revision wraps the same pricing in the consolidation narrative so the upgrade feels like a continuation of the promise, not an interruption.
- The headline ("One place. Every event. Always.") is a three-beat escalation. "One place" is the core promise. "Every event" expands scope. "Always" adds permanence — that is what the subscription buys.
- The subtitle references what the user has already experienced ("You've seen how Soonlist pulls your events together") to ground the ask in proven value rather than hypothetical benefit.
- "Keep everything in one place" as the CTA reframes the purchase as maintaining something the user already values, not acquiring something new. Loss aversion is the lever: you have already started organizing — do not let it fall apart.
- The source-icon-labeled event stack visual reinforces the diversity of sources one final time. The user sees Instagram, texts, email, and links all tidily in a row and thinks "yes, I want to keep this."
- The "Try 3 events free" skip option is preserved from the current implementation for users who are not ready to commit.

---

## Summary: Current vs. "Everything in One Place" Empty States

| Context | Current Approach | "Everything in One Place" Approach |
|---|---|---|
| **My List** | "Turn screenshots into possibilities" — feature-forward, aspirational. Grayscale source icons, ghost cards. | "Your events are everywhere" — problem-forward, names the mess. Full-color animated source icons converging into one card. |
| **Board/Radar** | "Events other people have captured will appear here" — passive, descriptive. "Invite friends" CTA. | "One place for everyone's events, too" — extends the consolidation promise to social. "Find people to follow" as primary CTA. |
| **Paywall** | Standard RevenueCat pricing modal. Feature list. "Try 3 events free" skip. | "One place. Every event. Always." — wraps pricing in the consolidation narrative. CTA is "Keep everything in one place." Same pricing, same skip option. |

**Key shifts across all three states:**

1. **Problem-first, not feature-first.** Each headline names the scattered reality before offering the solution.
2. **Specificity over abstraction.** Instagram, texts, email, group chats, flyers — the copy names real sources instead of speaking generically about "events."
3. **Convergence as the visual metaphor.** Many sources flowing into one organized feed, consistently across all three contexts.
4. **Continuity of narrative.** The My List state introduces "one place," the Board state extends it to others, and the Paywall state asks the user to keep it permanent. Each builds on the last.
5. **Relief as the emotional register.** The tone is not excited or aspirational — it is practical and relieving. "Finally, one place" rather than "unlock possibilities."
