import {
  BatchGrid,
  FakeNotification,
  Headline,
  ImagePlaceholder,
  NotificationPermission,
  ParsedEventCard,
  PaywallCard,
  PrimaryButton,
  ProgressBar,
  PurpleScreen,
  QuestionOption,
  SampleScreenshot,
  SocialProof,
  Subtitle,
  VideoPlaceholder,
} from "./components";

/* ─── Goals Screen ─── */
export function GoalsScreen({
  step,
  total,
  headline = "What do you want to use Soonlist for?",
  subtitle = "Pick as many as you like",
  options = [
    "Organize all my events in one place",
    "Turn my screenshots into saved plans",
    "Discover fun events near me",
    "Share plans with friends",
    "Just exploring for now",
  ],
  selectedIndices = [0, 2],
}: {
  step: number;
  total: number;
  headline?: string;
  subtitle?: string;
  options?: string[];
  selectedIndices?: number[];
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>{headline}</Headline>
        <Subtitle>{subtitle}</Subtitle>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {options.map((opt, i) => (
          <QuestionOption
            key={i}
            label={opt}
            selected={selectedIndices.includes(i)}
          />
        ))}
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton label="Continue" />
      </div>
    </PurpleScreen>
  );
}

/* ─── Screenshot Habit Screen ─── */
export function ScreenshotHabitScreen({
  step,
  total,
  headline = "Do you already screenshot events you're interested in?",
  options = ["Yes", "Not yet"],
  selectedIndex = 0,
}: {
  step: number;
  total: number;
  headline?: string;
  options?: string[];
  selectedIndex?: number;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>{headline}</Headline>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        {options.map((opt, i) => (
          <QuestionOption key={i} label={opt} selected={i === selectedIndex} />
        ))}
      </div>
    </PurpleScreen>
  );
}

/* ─── Discovery Channels Screen ─── */
export function DiscoveryChannelsScreen({
  step,
  total,
  headline = "Where do you find the most events?",
  subtitle,
  options = [
    "Instagram",
    "TikTok",
    "Friends' recommendations",
    "Local websites/newsletters",
    "Walking around town",
    "Facebook",
  ],
  selectedIndex = 0,
}: {
  step: number;
  total: number;
  headline?: string;
  subtitle?: string;
  options?: string[];
  selectedIndex?: number;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>{headline}</Headline>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {options.map((opt, i) => (
          <QuestionOption key={i} label={opt} selected={i === selectedIndex} />
        ))}
      </div>
    </PurpleScreen>
  );
}

/* ─── Try It: Phase 1 (Screenshot) ─── */
export function TryItScreenshot({
  step,
  total,
  headline = "Capture any event screenshot",
  subtitle = "We'll do the rest",
  source = "Instagram",
}: {
  step: number;
  total: number;
  headline?: string;
  subtitle?: string;
  source?: string;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>{headline}</Headline>
        <Subtitle>{subtitle}</Subtitle>
      </div>
      <div className="mt-6 flex-1">
        <SampleScreenshot source={source} />
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton label="Capture this event" />
      </div>
    </PurpleScreen>
  );
}

/* ─── Try It: Phase 2 (Parsing) ─── */
export function TryItParsing({
  step,
  total,
  headline = "Capturing...",
  subtitle = "AI is reading the details",
}: {
  step: number;
  total: number;
  headline?: string;
  subtitle?: string;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-3xl">
          ✨
        </div>
        <div className="mt-4 text-lg font-semibold text-white">{headline}</div>
        <div className="mt-1 text-sm text-white/70">{subtitle}</div>
      </div>
    </PurpleScreen>
  );
}

/* ─── Try It: Phase 3 (Result) ─── */
export function TryItResult({
  step,
  total,
  headline = "That's it!",
  subtitle = "Screenshots become organized events, automatically.",
}: {
  step: number;
  total: number;
  headline?: string;
  subtitle?: string;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>{headline}</Headline>
        <Subtitle>{subtitle}</Subtitle>
      </div>
      <div className="mt-6">
        <ParsedEventCard />
      </div>
      <div className="mt-4">
        <FakeNotification />
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton label="Continue" />
      </div>
    </PurpleScreen>
  );
}

/* ─── Notifications Screen ─── */
export function NotificationsScreen({
  step,
  total,
  headline = "Never miss an event",
  subtitle = "Get notified when events are saved so you can stay on top of your plans",
  dialogTitle,
  dialogBody,
}: {
  step: number;
  total: number;
  headline?: string;
  subtitle?: string;
  dialogTitle?: string;
  dialogBody?: string;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>{headline}</Headline>
        <Subtitle>{subtitle}</Subtitle>
      </div>
      <div className="mt-8">
        <NotificationPermission title={dialogTitle} body={dialogBody} />
      </div>
      <div className="mt-auto text-center text-xs text-white/60">
        You can always update this later in your settings!
      </div>
    </PurpleScreen>
  );
}

/* ─── Share Demo Screen ─── */
export function ShareDemoScreen({
  step,
  total,
  headline = "Share into the app",
  subtitle = "Use the share button from any app to save events directly to Soonlist",
}: {
  step: number;
  total: number;
  headline?: string;
  subtitle?: string;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>{headline}</Headline>
        <Subtitle>{subtitle}</Subtitle>
      </div>
      <div className="mt-6 flex-1">
        <VideoPlaceholder />
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton label="Continue" />
      </div>
    </PurpleScreen>
  );
}

/* ─── Age Screen ─── */
export function AgeScreen({
  step,
  total,
  headline = "How old are you?",
  subtitle,
  selectedIndex = 1,
}: {
  step: number;
  total: number;
  headline?: string;
  subtitle?: string;
  selectedIndex?: number;
}) {
  const options = ["Under 24", "25-34", "35-44", "45-54", "55-64", "65+"];
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>{headline}</Headline>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {options.map((opt, i) => (
          <QuestionOption key={i} label={opt} selected={i === selectedIndex} />
        ))}
      </div>
    </PurpleScreen>
  );
}

/* ─── Source Screen ─── */
export function SourceScreen({
  step,
  total,
  headline = "Where did you hear about us?",
  subtitle,
  options = [
    "Google Search",
    "TikTok",
    "Searched on App Store",
    "Instagram",
    "Facebook",
    "Through a friend",
    "Other",
  ],
  selectedIndex = 5,
}: {
  step: number;
  total: number;
  headline?: string;
  subtitle?: string;
  options?: string[];
  selectedIndex?: number;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>{headline}</Headline>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {options.map((opt, i) => (
          <QuestionOption key={i} label={opt} selected={i === selectedIndex} />
        ))}
      </div>
    </PurpleScreen>
  );
}

/* ─── Paywall Screen ─── */
export function PaywallScreen({
  headline = "Support Soonlist",
  subtitle = "Every feature is free, forever. Your support keeps it that way.",
  skipLabel = "Continue for free",
}: {
  headline?: string;
  subtitle?: string;
  skipLabel?: string;
}) {
  return (
    <PurpleScreen>
      <div className="mt-8">
        <Headline>{headline}</Headline>
        <Subtitle>{subtitle}</Subtitle>
      </div>
      <div className="mt-8 flex flex-col gap-4">
        <PaywallCard
          title="Monthly"
          price="$9.99/month"
          note="Cancel anytime"
        />
        <PaywallCard
          title="Yearly"
          price="$59.99/year"
          badge="BEST VALUE"
          note="Save 50%"
        />
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton label={skipLabel} />
      </div>
      <div className="mt-3 text-center text-xs text-white/50">
        You can always support later in Settings
      </div>
    </PurpleScreen>
  );
}

/* ─── Sign In Screen ─── */
export function SignInScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-white px-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-interactive-1 text-2xl font-bold text-white">
        S
      </div>
      <div className="mt-4 font-heading text-xl font-bold text-neutral-1">
        Sign in to Soonlist
      </div>
      <div className="mt-6 flex w-full flex-col gap-3">
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-neutral-1">
          <span>🍎</span> Continue with Apple
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-neutral-1">
          <span>G</span> Continue with Google
        </div>
      </div>
    </div>
  );
}

/* ─── Value: One Place Screen ─── */
export function ValueOnePlaceScreen({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>One place for all your events</Headline>
        <Subtitle>
          No matter where you find them — Instagram, flyers, texts — save them
          all here
        </Subtitle>
      </div>
      <div className="mt-6">
        <ImagePlaceholder label="Feed Preview" aspectRatio="3/4" />
      </div>
      <SocialProof text="Join thousands of people saving events with Soonlist" />
      <div className="mt-auto pt-6">
        <PrimaryButton label="Continue" />
      </div>
    </PurpleScreen>
  );
}

/* ─── Value: Batch Screen ─── */
export function ValueBatchScreen({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>Add them all at once</Headline>
        <Subtitle>
          Select multiple screenshots from your camera roll and save them in
          seconds
        </Subtitle>
      </div>
      <div className="mt-6">
        <BatchGrid />
      </div>
      <SocialProof text="Most people have 5+ event screenshots saved already" />
      <div className="mt-auto pt-6">
        <PrimaryButton label="Continue" />
      </div>
    </PurpleScreen>
  );
}

/* ─── Combined Age + Source Screen ─── */
export function CombinedAgeSurveyScreen({
  step,
  total,
  headline = "Two quick ones, then you're in.",
}: {
  step: number;
  total: number;
  headline?: string;
}) {
  return (
    <PurpleScreen>
      <ProgressBar step={step} total={total} />
      <div className="mt-8">
        <Headline>{headline}</Headline>
      </div>
      <div className="mt-6">
        <div className="text-sm font-semibold text-white/80">
          How old are you?
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Under 24", "25-34", "35-44", "45-54", "55-64", "65+"].map(
            (opt, i) => (
              <span
                key={i}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  i === 1
                    ? "bg-white text-interactive-1"
                    : "bg-white/15 text-white"
                }`}
              >
                {opt}
              </span>
            ),
          )}
        </div>
      </div>
      <div className="mt-6">
        <div className="text-sm font-semibold text-white/80">
          Where did you hear about Soonlist?
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            "Google Search",
            "TikTok",
            "App Store",
            "Instagram",
            "Facebook",
            "A friend",
            "Other",
          ].map((opt, i) => (
            <span
              key={i}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                i === 5
                  ? "bg-white text-interactive-1"
                  : "bg-white/15 text-white"
              }`}
            >
              {opt}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton label="Continue" />
      </div>
    </PurpleScreen>
  );
}
