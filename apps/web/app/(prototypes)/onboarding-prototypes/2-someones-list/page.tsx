import {
  FlowRow,
  Headline,
  ImagePlaceholder,
  LightScreen,
  Logo,
  MiniEventCard,
  PhoneFrame,
  PrimaryButton,
  ProgressBar,
  PurpleScreen,
  ReferralAvatar,
  SecondaryLinks,
  Subtitle,
} from "../components";
import {
  AgeScreen,
  DiscoveryChannelsScreen,
  GoalsScreen,
  NotificationsScreen,
  PaywallScreen,
  ScreenshotHabitScreen,
  ShareDemoScreen,
  SignInScreen,
  SourceScreen,
  TryItParsing,
  TryItResult,
  TryItScreenshot,
  ValueBatchScreen,
  ValueOnePlaceScreen,
} from "../shared-screens";

export default function SomeonesList() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold text-neutral-1">
        Direction 2: I&apos;m Here Because of Someone&apos;s List
      </h1>
      <p className="mb-8 text-sm text-neutral-2">
        Two paths: referral (top row) and organic (bottom row), converging at
        Goals. 13 screens referral / 12 organic.
      </p>

      {/* REFERRAL PATH */}
      <h3 className="mb-4 text-lg font-semibold text-interactive-1">
        Referral Path
      </h3>
      <FlowRow>
        {/* R1: Referral Welcome */}
        <PhoneFrame screenId="2-r1-welcome" label="R1. Referral Welcome">
          <LightScreen>
            <Logo />
            <div className="mt-4 flex flex-col items-center">
              <ReferralAvatar name="Jamie Chen" />
              <div className="mt-4 text-center">
                <Headline className="text-interactive-1">
                  Jamie Chen wants you to see what&apos;s coming up
                </Headline>
                <Subtitle className="text-neutral-2">
                  You&apos;re one step away from following their events
                </Subtitle>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <MiniEventCard
                name="Rooftop Sunset DJ Set"
                date="Sat, Mar 22 · 6 PM"
                location="Skyline Terrace"
              />
              <MiniEventCard
                name="Portland Night Market"
                date="Fri, Mar 28 · 5 PM"
                location="Pioneer Square"
              />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="See Their Events" variant="purple" />
            </div>
            <SecondaryLinks />
          </LightScreen>
        </PhoneFrame>

        {/* R2: List Preview */}
        <PhoneFrame screenId="2-r2-list" label="R2. Their List">
          <PurpleScreen>
            <ProgressBar step={1} total={10} />
            <div className="mt-8">
              <Headline>Jamie Chen&apos;s upcoming events</Headline>
              <Subtitle>Follow them to keep these in your feed</Subtitle>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <MiniEventCard
                name="Rooftop Sunset DJ Set"
                date="Sat, Mar 22 · 6 PM"
                location="Skyline Terrace"
              />
              <MiniEventCard
                name="Portland Night Market"
                date="Fri, Mar 28 · 5 PM"
                location="Pioneer Square"
              />
              <MiniEventCard
                name="Comedy Open Mic"
                date="Thu, Apr 3 · 8 PM"
                location="Helium Comedy Club"
              />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Follow Jamie + Continue" />
            </div>
            <div className="mt-2 text-center text-xs text-white/60">
              You can unfollow anytime
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* R3: Bridge */}
        <PhoneFrame screenId="2-r3-bridge" label="R3. Bridge">
          <PurpleScreen>
            <ProgressBar step={2} total={10} />
            <div className="mt-8">
              <Headline>You&apos;ll follow Jamie after sign-up</Headline>
              <Subtitle>Now let&apos;s set up your own event feed</Subtitle>
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-interactive-2 text-sm font-bold text-interactive-1">
                J
              </div>
              <span className="text-sm text-white">Following Jamie Chen ✓</span>
            </div>
            <div className="mt-6 text-center text-sm text-white/60">
              ↓ Your turn ↓
            </div>
            <div className="mt-4">
              <ImagePlaceholder label="Feed Preview" aspectRatio="4/3" />
            </div>
            <div className="mt-2 text-center text-xs text-white/70">
              Save events from screenshots, texts, Instagram — all in one place
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Shared screens: C1-C10 */}
        <PhoneFrame screenId="2-r-goals" label="C1. Goals">
          <GoalsScreen
            step={3}
            total={10}
            options={[
              "Organize all my events in one place",
              "Turn my screenshots into saved plans",
              "Discover fun events near me",
              "Share plans with friends",
              "Follow a friend's event list",
              "Just exploring for now",
            ]}
            selectedIndices={[0, 4]}
          />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-screenshot" label="C2. Screenshot Habit">
          <ScreenshotHabitScreen step={4} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-discovery" label="C3. Discovery">
          <DiscoveryChannelsScreen step={5} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-tryit1" label="C4. Try It 1/3">
          <TryItScreenshot step={6} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-tryit2" label="C4. Try It 2/3">
          <TryItParsing step={6} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-tryit3" label="C4. Try It 3/3">
          <TryItResult step={6} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-notif" label="C5. Notifications">
          <NotificationsScreen step={7} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-share" label="C6. Share Demo">
          <ShareDemoScreen step={8} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-age" label="C7. Age">
          <AgeScreen step={9} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-source" label="C8. Source">
          <SourceScreen
            step={10}
            total={10}
            options={[
              "A friend's shared list",
              "Through a friend",
              "Google Search",
              "TikTok",
              "Searched on App Store",
              "Instagram",
              "Facebook",
              "Other",
            ]}
            selectedIndex={0}
          />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-paywall" label="C9. Paywall">
          <PaywallScreen />
        </PhoneFrame>

        <PhoneFrame screenId="2-r-signin" label="C10. Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>

      {/* ORGANIC PATH */}
      <h3 className="mb-4 mt-8 text-lg font-semibold text-interactive-1">
        Organic Path
      </h3>
      <FlowRow>
        {/* O1: Organic Welcome */}
        <PhoneFrame screenId="2-o1-welcome" label="O1. Organic Welcome">
          <LightScreen>
            <Logo />
            <div className="mt-4 text-center">
              <Headline className="text-interactive-1">
                Turn screenshots into plans
              </Headline>
              <Subtitle className="text-neutral-2">
                Save events in one tap. All in one place.
              </Subtitle>
              <div className="mt-2 text-xs text-neutral-2">
                Free, community-supported
              </div>
            </div>
            <div className="mt-6">
              <ImagePlaceholder label="Feed Preview" aspectRatio="3/4" />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Get Started" variant="purple" />
            </div>
            <SecondaryLinks />
          </LightScreen>
        </PhoneFrame>

        {/* O2: Value One Place */}
        <PhoneFrame screenId="2-o2-value1" label="O2. One Place">
          <ValueOnePlaceScreen step={1} total={10} />
        </PhoneFrame>

        {/* O3: Value Batch */}
        <PhoneFrame screenId="2-o3-value2" label="O3. Batch">
          <ValueBatchScreen step={2} total={10} />
        </PhoneFrame>

        {/* Then same shared path */}
        <PhoneFrame screenId="2-o-goals" label="C1. Goals">
          <GoalsScreen step={3} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-screenshot" label="C2. Screenshot">
          <ScreenshotHabitScreen step={4} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-discovery" label="C3. Discovery">
          <DiscoveryChannelsScreen step={5} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-tryit1" label="C4. Try It 1/3">
          <TryItScreenshot step={6} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-tryit2" label="C4. Try It 2/3">
          <TryItParsing step={6} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-tryit3" label="C4. Try It 3/3">
          <TryItResult step={6} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-notif" label="C5. Notifications">
          <NotificationsScreen step={7} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-share" label="C6. Share Demo">
          <ShareDemoScreen step={8} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-age" label="C7. Age">
          <AgeScreen step={9} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-source" label="C8. Source">
          <SourceScreen step={10} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-paywall" label="C9. Paywall">
          <PaywallScreen />
        </PhoneFrame>

        <PhoneFrame screenId="2-o-signin" label="C10. Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>
    </div>
  );
}
