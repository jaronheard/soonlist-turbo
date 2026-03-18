import Link from "next/link";

const DIRECTIONS = [
  {
    id: 1,
    slug: "1-try-it-immediately",
    title: "Try It Immediately",
    tagline: "Demo-first. No value screens precede the capture simulation.",
    screens: 11,
  },
  {
    id: 2,
    slug: "2-someones-list",
    title: "I'm Here Because of Someone's List",
    tagline: "Split onboarding: referral path vs organic path.",
    screens: 13,
  },
  {
    id: 3,
    slug: "3-go-out-more",
    title: "Go Out More",
    tagline: "Aspirational lifestyle framing. Be the person who actually goes.",
    screens: 12,
  },
  {
    id: 4,
    slug: "4-everything-in-one-place",
    title: "Everything in One Place",
    tagline: "Consolidation pitch: the mess → the fix.",
    screens: 12,
  },
  {
    id: 5,
    slug: "5-habit-loop",
    title: "The Habit Loop",
    tagline: "See it. Screenshot it. Done. Frame the rhythm, not features.",
    screens: 11,
  },
  {
    id: 6,
    slug: "6-tell-a-story",
    title: "Tell a Story",
    tagline: "Narrative-driven with character Maya. 9 illustrated chapters.",
    screens: 11,
  },
  {
    id: 7,
    slug: "7-free-community-supported",
    title: "Free & Community-Supported",
    tagline: "Lead with identity. Patronage model, not feature gating.",
    screens: 11,
  },
];

const VARIATIONS = [
  {
    id: "A",
    slug: "a-instant-habit",
    title: "Instant Habit",
    tagline:
      "Activation-optimized. Habit Loop positioning + Try It Immediately speed. Demo in first 5 seconds.",
    screens: 11,
  },
  {
    id: "B",
    slug: "b-instant-habit-referral",
    title: "Instant Habit + Referral Fork",
    tagline:
      "Growth-optimized. Variation A as organic path + Someone's List mechanics for referral arrivals.",
    screens: 13,
  },
  {
    id: "C",
    slug: "c-story-speed",
    title: "Story + Speed",
    tagline:
      "Emotion-optimized. Tell a Story emotional arc + demo by screen 4 instead of screen 5.",
    screens: 12,
  },
];

export default function OnboardingPrototypesIndex() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="font-heading text-4xl font-bold text-neutral-1">
        Onboarding Prototypes
      </h1>
      <p className="mt-2 text-lg text-neutral-2">
        7 design directions — wireframe-level prototypes for side-by-side
        comparison.
      </p>
      <div className="mt-8 grid gap-4">
        {DIRECTIONS.map((d) => (
          <Link
            key={d.id}
            href={`/onboarding-prototypes/${d.slug}`}
            className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-interactive-1 text-lg font-bold text-white">
              {d.id}
            </span>
            <div>
              <div className="text-lg font-semibold text-neutral-1">
                {d.title}
              </div>
              <div className="mt-0.5 text-sm text-neutral-2">{d.tagline}</div>
              <div className="mt-1 text-xs text-neutral-2">
                {d.screens} screens
              </div>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 font-heading text-3xl font-bold text-neutral-1">
        Hybrid Variations
      </h2>
      <p className="mt-2 text-lg text-neutral-2">
        3 hybrid variations combining the best elements from advisor review.
      </p>
      <div className="mt-8 grid gap-4">
        {VARIATIONS.map((v) => (
          <Link
            key={v.id}
            href={`/onboarding-prototypes/${v.slug}`}
            className="flex items-start gap-4 rounded-2xl border-2 border-interactive-1 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-interactive-1 text-lg font-bold text-white">
              {v.id}
            </span>
            <div>
              <div className="text-lg font-semibold text-neutral-1">
                {v.title}
              </div>
              <div className="mt-0.5 text-sm text-neutral-2">{v.tagline}</div>
              <div className="mt-1 text-xs text-neutral-2">
                {v.screens} screens
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
