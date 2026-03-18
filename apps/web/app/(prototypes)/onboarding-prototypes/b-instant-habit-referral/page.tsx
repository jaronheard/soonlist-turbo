import {
  FeatureGatePaywall,
  FlowRow,
  Headline,
  ImagePlaceholder,
  LightScreen,
  Logo,
  MiniEventCard,
  PhoneFrame,
  PostSignInShare,
  PrimaryButton,
  ProgressBar,
  PurpleScreen,
  ReferralAvatar,
  SecondaryLinks,
  Subtitle,
} from "../components";
import {
  CombinedAgeSurveyScreen,
  DiscoveryChannelsScreen,
  GoalsScreen,
  NotificationsScreen,
  ScreenshotHabitScreen,
  SignInScreen,
  TryItParsing,
  TryItResult,
  TryItScreenshot,
} from "../shared-screens";

export default function InstantHabitReferral() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold text-neutral-1">
        Variation B: Instant Habit + Referral Fork
      </h1>
      <p className="mb-8 text-sm text-neutral-2">
        Growth-optimized. Variation A as organic path + Someone&apos;s List
        mechanics for referral arrivals. ~13 referral / ~12 organic screens.
      </p>

      {/* REFERRAL PATH */}
      <h3 className="mb-4 text-lg font-semibold text-interactive-1">
        Referral Path
      </h3>
      <FlowRow>
        {/* R1: Referral Welcome */}
        <PhoneFrame screenId="b-r1-welcome" label="R1. Referral Welcome">
          <LightScreen>
            <Logo />
            <div className="mt-4 flex flex-col items-center">
              <ReferralAvatar name="Jamie Chen" />
              <div className="mt-4 text-center">
                <Headline className="text-interactive-1">
                  Jamie Chen&apos;s events
                </Headline>
                <Subtitle className="text-neutral-2">
                  See what Jamie&apos;s planning — and start saving your own
                  events too.
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

        {/* R2: List Preview + Follow */}
        <PhoneFrame screenId="b-r2-list" label="R2. List Preview">
          <PurpleScreen>
            <ProgressBar step={1} total={12} />
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
        <PhoneFrame screenId="b-r3-bridge" label="R3. Bridge">
          <PurpleScreen>
            <ProgressBar step={2} total={12} />
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
              ↓ Try it yourself ↓
            </div>
            <div className="mt-4">
              <ImagePlaceholder label="Your feed preview" aspectRatio="4/3" />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Then Variation A screens 2-11 */}
        <PhoneFrame screenId="b-r-demo-tap" label="4. Demo Tap">
          <TryItScreenshot
            step={3}
            total={12}
            headline="Here's one from Instagram."
            subtitle="Screenshot it. (Just tap the button.)"
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-r-demo-parse" label="5. Demo Parse">
          <TryItParsing step={4} total={12} />
        </PhoneFrame>

        <PhoneFrame screenId="b-r-demo-result" label="6. Demo Result">
          <TryItResult
            step={5}
            total={12}
            headline="Done. One screenshot, one tap."
            subtitle="You already do this. Now Soonlist handles the rest."
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-r-screenshot" label="7. Screenshot Habit">
          <ScreenshotHabitScreen
            step={6}
            total={12}
            headline="Do you already screenshot events you're interested in?"
            options={["Yes, all the time", "Not yet, but I want to"]}
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-r-discovery" label="8. Discovery">
          <DiscoveryChannelsScreen
            step={7}
            total={12}
            headline="Where do you spot the most events?"
            subtitle="We'll personalize your experience."
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-r-goals" label="9. Goals">
          <GoalsScreen
            step={8}
            total={12}
            headline="What do you want to do more of?"
            subtitle="Pick as many as you like."
            options={[
              "Actually go to events I hear about",
              "Stop losing events in my camera roll",
              "Find out what's happening near me",
              "Share plans with friends",
              "Follow a friend's event list",
              "Just exploring for now",
            ]}
            selectedIndices={[0, 4]}
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-r-age-source" label="10. Age + Source">
          <CombinedAgeSurveyScreen step={9} total={12} />
        </PhoneFrame>

        <PhoneFrame screenId="b-r-notif" label="11. Notifications">
          <NotificationsScreen
            step={10}
            total={12}
            headline="Never forget an event you saved."
            subtitle="We'll remind you before events happen so you actually go."
            dialogTitle="Turn on Push Notifications to stay in your rhythm"
            dialogBody="Soonlist reminds you before saved events so the screenshot actually becomes a plan."
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-r-paywall" label="12. Paywall">
          <FeatureGatePaywall />
        </PhoneFrame>

        <PhoneFrame screenId="b-r-signin" label="13. Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>

      {/* ORGANIC PATH */}
      <h3 className="mb-4 mt-8 text-lg font-semibold text-interactive-1">
        Organic Path
      </h3>
      <FlowRow>
        {/* Same as Variation A */}
        <PhoneFrame screenId="b-o-welcome" label="0. Welcome">
          <LightScreen>
            <Logo />
            <div className="mt-4 text-center">
              <Headline className="text-interactive-1">
                See it. Screenshot it. Soonlist does the rest.
              </Headline>
              <Subtitle className="text-neutral-2">
                Try it right now — tap the screenshot below.
              </Subtitle>
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Try it now" variant="purple" />
            </div>
            <SecondaryLinks />
          </LightScreen>
        </PhoneFrame>

        <PhoneFrame screenId="b-o-demo-tap" label="1. Demo Tap">
          <TryItScreenshot
            step={1}
            total={10}
            headline="Here's one from Instagram."
            subtitle="Screenshot it. (Just tap the button.)"
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-o-demo-parse" label="2. Demo Parse">
          <TryItParsing step={2} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="b-o-demo-result" label="3. Demo Result">
          <TryItResult
            step={3}
            total={10}
            headline="Done. One screenshot, one tap."
            subtitle="You already do this. Now Soonlist handles the rest."
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-o-screenshot" label="4. Screenshot Habit">
          <ScreenshotHabitScreen
            step={4}
            total={10}
            headline="Do you already screenshot events you're interested in?"
            options={["Yes, all the time", "Not yet, but I want to"]}
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-o-discovery" label="5. Discovery">
          <DiscoveryChannelsScreen
            step={5}
            total={10}
            headline="Where do you spot the most events?"
            subtitle="We'll personalize your experience."
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-o-goals" label="6. Goals">
          <GoalsScreen
            step={6}
            total={10}
            headline="What do you want to do more of?"
            subtitle="Pick as many as you like."
            options={[
              "Actually go to events I hear about",
              "Stop losing events in my camera roll",
              "Find out what's happening near me",
              "Share plans with friends",
              "Just exploring for now",
            ]}
            selectedIndices={[0, 1]}
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-o-age-source" label="7. Age + Source">
          <CombinedAgeSurveyScreen step={7} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="b-o-notif" label="8. Notifications">
          <NotificationsScreen
            step={8}
            total={10}
            headline="Never forget an event you saved."
            subtitle="We'll remind you before events happen so you actually go."
            dialogTitle="Turn on Push Notifications to stay in your rhythm"
            dialogBody="Soonlist reminds you before saved events so the screenshot actually becomes a plan."
          />
        </PhoneFrame>

        <PhoneFrame screenId="b-o-paywall" label="9. Paywall">
          <FeatureGatePaywall />
        </PhoneFrame>

        <PhoneFrame screenId="b-o-signin" label="10. Sign In">
          <SignInScreen />
        </PhoneFrame>

        {/* Post-sign-in share (organic-only) */}
        <PhoneFrame screenId="b-o-share" label="11. Share Your List">
          <PostSignInShare />
        </PhoneFrame>
      </FlowRow>
    </div>
  );
}
