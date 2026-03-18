import type { ReactNode } from "react";

/* ─── PhoneFrame ─── */
export function PhoneFrame({
  children,
  screenId,
  label,
}: {
  children: ReactNode;
  screenId: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <span className="max-w-[390px] truncate text-center text-xs font-medium text-neutral-1">
          {label}
        </span>
      )}
      <div
        data-screen-id={screenId}
        className="relative flex h-[844px] w-[390px] shrink-0 flex-col overflow-hidden rounded-[40px] border border-gray-300 bg-white"
      >
        {children}
      </div>
    </div>
  );
}

/* ─── ProgressBar ─── */
export function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = (step / total) * 100;
  return (
    <div className="mx-6 mt-6 h-1.5 rounded-full bg-white/30">
      <div
        className="h-full rounded-full bg-white transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─── PurpleScreen ─── */
export function PurpleScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-interactive-1 px-8 py-10 text-white">
      {children}
    </div>
  );
}

/* ─── LightScreen ─── */
export function LightScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-interactive-3 px-8 py-10">
      {children}
    </div>
  );
}

/* ─── Headline ─── */
export function Headline({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-heading text-[28px] font-bold leading-tight ${className}`}
    >
      {children}
    </h2>
  );
}

/* ─── Subtitle ─── */
export function Subtitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`mt-2 text-base leading-relaxed opacity-90 ${className}`}>
      {children}
    </p>
  );
}

/* ─── QuestionOption (single/multi select pill) ─── */
export function QuestionOption({
  label,
  selected = false,
  variant = "dark",
}: {
  label: string;
  selected?: boolean;
  variant?: "dark" | "light";
}) {
  const base =
    "flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left text-[15px] font-medium transition-all";
  const styles =
    variant === "dark"
      ? selected
        ? "border-white bg-white text-interactive-1"
        : "border-white/40 bg-white/10 text-white"
      : selected
        ? "border-interactive-1 bg-interactive-1 text-white"
        : "border-gray-300 bg-white text-neutral-1";
  return (
    <div className={`${base} ${styles}`}>
      {selected && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-interactive-1 text-xs text-white">
          ✓
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}

/* ─── PrimaryButton ─── */
export function PrimaryButton({
  label,
  variant = "white",
}: {
  label: string;
  variant?: "white" | "purple";
}) {
  return (
    <div
      className={`mt-auto flex w-full items-center justify-center rounded-full py-4 text-base font-semibold ${
        variant === "white"
          ? "bg-white text-interactive-1"
          : "bg-interactive-1 text-white"
      }`}
    >
      {label}
    </div>
  );
}

/* ─── SecondaryLinks (Sign In / Code) ─── */
export function SecondaryLinks() {
  return (
    <div className="mt-4 flex flex-col items-center gap-1 text-sm opacity-70">
      <span>
        Already have an account? <u>Sign in</u>
      </span>
      <span>
        Got a code? <u>Enter it here</u>
      </span>
    </div>
  );
}

/* ─── SampleScreenshot ─── */
export function SampleScreenshot({
  source = "Instagram",
}: {
  source?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[300px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex h-[200px] items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 text-center text-sm text-neutral-2">
        <div>
          <div className="text-2xl">🎶</div>
          <div className="mt-2 font-semibold text-neutral-1">
            Rooftop Sunset DJ Set
          </div>
          <div className="text-xs text-neutral-2">Sat, Mar 22 · 6:00 PM</div>
          <div className="mt-1 text-xs italic text-neutral-2">
            Spotted on {source}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ParsedEventCard ─── */
export function ParsedEventCard() {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-2xl border-2 border-interactive-1 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-interactive-1">
        Sat, Mar 22 · 6:00 PM
      </div>
      <div className="mt-1 text-lg font-bold text-neutral-1">
        Rooftop Sunset DJ Set
      </div>
      <div className="mt-0.5 text-sm text-neutral-2">
        Skyline Terrace, Downtown
      </div>
      <div className="mt-3 flex gap-2">
        <span className="rounded-full bg-interactive-3 px-3 py-1 text-xs font-medium text-interactive-1">
          Add to Calendar
        </span>
        <span className="rounded-full bg-interactive-3 px-3 py-1 text-xs font-medium text-interactive-1">
          Save
        </span>
      </div>
    </div>
  );
}

/* ─── FakeNotification ─── */
export function FakeNotification({
  text = "Rooftop Sunset DJ Set saved!",
}: {
  text?: string;
}) {
  return (
    <div className="mx-auto mt-4 flex w-full max-w-[340px] items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-interactive-1 text-sm font-bold text-white">
        S
      </div>
      <div className="flex-1">
        <div className="text-xs font-semibold text-neutral-1">Soonlist</div>
        <div className="text-xs text-neutral-2">{text}</div>
      </div>
      <div className="text-[10px] text-neutral-2">now</div>
    </div>
  );
}

/* ─── VideoPlaceholder ─── */
export function VideoPlaceholder({
  label = "Share Extension Demo",
}: {
  label?: string;
}) {
  return (
    <div className="mx-auto flex aspect-[884/1920] w-full max-w-[220px] items-center justify-center rounded-2xl bg-white/20 text-center text-sm text-white/60">
      <div>
        <div className="text-3xl">▶</div>
        <div className="mt-2">{label}</div>
      </div>
    </div>
  );
}

/* ─── ImagePlaceholder ─── */
export function ImagePlaceholder({
  label = "Feed Preview",
  aspectRatio = "3/4",
}: {
  label?: string;
  aspectRatio?: string;
}) {
  return (
    <div
      className="mx-auto flex w-full max-w-[260px] items-center justify-center rounded-2xl bg-gray-100 text-center text-sm text-neutral-2"
      style={{ aspectRatio }}
    >
      <div>
        <div className="text-2xl">🖼</div>
        <div className="mt-1">{label}</div>
      </div>
    </div>
  );
}

/* ─── NotificationPermission ─── */
export function NotificationPermission({
  title = "Turn on Push Notifications to capture and remember",
  body = "Soonlist notifies you when events are created, and to help you build a habit of capturing events",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-2xl bg-white p-6 shadow-lg">
      <div className="text-center text-sm font-semibold text-neutral-1">
        {title}
      </div>
      <div className="mt-2 text-center text-xs text-neutral-2">{body}</div>
      <div className="mt-4 flex border-t border-gray-200">
        <div className="flex-1 border-r border-gray-200 py-3 text-center text-sm text-gray-400">
          Don&apos;t Allow
        </div>
        <div className="flex-1 py-3 text-center text-sm font-semibold text-blue-500">
          Allow ↑
        </div>
      </div>
    </div>
  );
}

/* ─── SocialProof pill ─── */
export function SocialProof({ text }: { text: string }) {
  return (
    <div className="mx-auto mt-4 rounded-full bg-white/20 px-4 py-2 text-center text-xs text-white/80">
      {text}
    </div>
  );
}

/* ─── FlowRow (horizontal row of PhoneFrames) ─── */
export function FlowRow({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="mb-12">
      {title && (
        <h2 className="mb-4 font-heading text-2xl font-bold text-neutral-1">
          {title}
        </h2>
      )}
      <div className="flex gap-6 overflow-x-auto pb-4">{children}</div>
    </div>
  );
}

/* ─── BatchGrid (6 thumbnail grid with checkmarks) ─── */
export function BatchGrid() {
  return (
    <div className="mx-auto grid w-full max-w-[260px] grid-cols-3 gap-2">
      {[true, true, true, false, false, false].map((checked, i) => (
        <div
          key={i}
          className="relative flex aspect-square items-center justify-center rounded-lg bg-white/20 text-lg"
        >
          🖼
          {checked && (
            <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-interactive-1 text-[10px] text-white">
              ✓
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Logo placeholder ─── */
export function Logo() {
  return (
    <div className="mb-4 flex items-center justify-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-interactive-1 text-sm font-bold text-white">
        S
      </div>
      <span className="font-heading text-lg font-bold">Soonlist</span>
    </div>
  );
}

/* ─── CommunityPill ─── */
export function CommunityPill({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3 text-sm text-white">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

/* ─── PaywallCard ─── */
export function PaywallCard({
  title,
  price,
  note,
  badge,
}: {
  title: string;
  price: string;
  note?: string;
  badge?: string;
}) {
  return (
    <div className="relative rounded-2xl border-2 border-white/30 bg-white/10 px-5 py-4">
      {badge && (
        <span className="absolute -top-3 right-4 rounded-full bg-accent-yellow px-3 py-0.5 text-xs font-semibold text-neutral-1">
          {badge}
        </span>
      )}
      <div className="font-semibold text-white">{title}</div>
      <div className="text-sm text-white/80">{price}</div>
      {note && <div className="mt-1 text-xs text-white/60">{note}</div>}
    </div>
  );
}

/* ─── StoryIllustration (placeholder for narrative directions) ─── */
export function StoryIllustration({
  scene,
  description,
}: {
  scene: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex aspect-[4/3] w-full max-w-[300px] flex-col items-center justify-center rounded-2xl bg-white/10 p-4 text-center">
      <div className="text-4xl">{scene}</div>
      <div className="mt-2 text-xs text-white/60">{description}</div>
    </div>
  );
}

/* ─── FeatureGatePaywall ─── */
export function FeatureGatePaywall({
  headline = "Unlock unlimited captures",
  subtitle = "Free members get 3 captures/month. Upgrade for unlimited access to all features.",
  freeLabel = "3 captures/month",
  paidLabel = "Unlimited captures",
}: {
  headline?: string;
  subtitle?: string;
  freeLabel?: string;
  paidLabel?: string;
}) {
  return (
    <PurpleScreen>
      <div className="mt-8">
        <Headline>{headline}</Headline>
        <Subtitle>{subtitle}</Subtitle>
      </div>
      <div className="mt-8 flex flex-col gap-4">
        <div className="rounded-2xl border-2 border-white bg-white/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">{paidLabel}</div>
              <div className="text-sm text-white/80">$9.99/month</div>
            </div>
            <span className="rounded-full bg-accent-yellow px-3 py-0.5 text-xs font-semibold text-neutral-1">
              RECOMMENDED
            </span>
          </div>
        </div>
        <PaywallCard
          title="Yearly"
          price="$59.99/year"
          badge="BEST VALUE"
          note="Unlimited captures · Save 50%"
        />
        <div className="rounded-2xl border-2 border-white/20 bg-white/5 px-5 py-4">
          <div className="font-semibold text-white/70">{freeLabel}</div>
          <div className="text-sm text-white/50">Free forever</div>
        </div>
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton label="Continue for free" />
      </div>
      <div className="mt-3 text-center text-xs text-white/50">
        You can upgrade anytime in Settings
      </div>
    </PurpleScreen>
  );
}

/* ─── PostSignInShare ─── */
export function PostSignInShare() {
  return (
    <div className="flex h-full flex-col bg-interactive-3 px-8 py-10">
      <div className="mt-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-interactive-1 text-2xl">
          🎉
        </div>
        <Headline className="mt-4 text-interactive-1">You&apos;re in!</Headline>
        <Subtitle className="text-neutral-2">
          Share your event list with a friend and discover events together.
        </Subtitle>
      </div>
      <div className="mx-auto mt-8 w-full max-w-[300px] rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-center text-sm font-semibold text-neutral-1">
          Your Soonlist link
        </div>
        <div className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-center text-xs text-neutral-2">
          soonlist.com/you/events
        </div>
        <div className="mt-3 flex justify-center gap-3">
          <span className="rounded-full bg-interactive-1 px-4 py-2 text-xs font-semibold text-white">
            Copy Link
          </span>
          <span className="rounded-full bg-interactive-3 px-4 py-2 text-xs font-semibold text-interactive-1">
            Share
          </span>
        </div>
      </div>
      <div className="mt-6 text-center text-xs text-neutral-2">
        When friends follow your list, you&apos;ll both discover more events.
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton label="Go to my feed" variant="purple" />
      </div>
      <div className="mt-3 text-center text-xs text-neutral-2">
        Skip for now
      </div>
    </div>
  );
}

/* ─── MessCard (scattered source cards) ─── */
export function MessCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm text-white shadow-sm">
      <span className="text-lg">{icon}</span>
      <span className="flex-1 text-xs">{text}</span>
      <span className="text-red-300">?</span>
    </div>
  );
}

/* ─── LoopStep ─── */
export function LoopStep({
  number,
  icon,
  title,
  subtitle,
}: {
  number: number;
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/15 px-4 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
        {number}
      </div>
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <span>{icon}</span> {title}
        </div>
        <div className="text-xs text-white/60">{subtitle}</div>
      </div>
    </div>
  );
}

/* ─── ReferralAvatar ─── */
export function ReferralAvatar({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-interactive-2 text-2xl font-bold text-interactive-1">
        {name.charAt(0)}
      </div>
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}

/* ─── MiniEventCard ─── */
export function MiniEventCard({
  name,
  date,
  location,
}: {
  name: string;
  date: string;
  location?: string;
}) {
  return (
    <div className="rounded-xl border border-interactive-2 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase text-interactive-1">
        {date}
      </div>
      <div className="text-sm font-bold text-neutral-1">{name}</div>
      {location && <div className="text-xs text-neutral-2">{location}</div>}
    </div>
  );
}
