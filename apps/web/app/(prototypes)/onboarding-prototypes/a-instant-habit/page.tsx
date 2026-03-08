import {
  FeatureGatePaywall,
  FlowRow,
  Headline,
  LightScreen,
  Logo,
  PhoneFrame,
  PrimaryButton,
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

export default function InstantHabit() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold text-neutral-1">
        Variation A: Instant Habit
      </h1>
      <p className="mb-8 text-sm text-neutral-2">
        Activation-optimized. Habit Loop positioning + Try It Immediately speed.
        Demo in the first 5 seconds. ~11 screens.
      </p>

      <FlowRow>
        {/* Screen 0: Welcome */}
        <PhoneFrame screenId="a-welcome" label="0. Welcome">
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

        {/* Screen 1: Demo Tap */}
        <PhoneFrame screenId="a-demo-tap" label="1. Demo Tap">
          <TryItScreenshot
            step={1}
            total={10}
            headline="Here's one from Instagram."
            subtitle="Screenshot it. (Just tap the button.)"
          />
        </PhoneFrame>

        {/* Screen 2: Demo Parse */}
        <PhoneFrame screenId="a-demo-parse" label="2. Demo Parse">
          <TryItParsing step={2} total={10} />
        </PhoneFrame>

        {/* Screen 3: Demo Result + Notification */}
        <PhoneFrame screenId="a-demo-result" label="3. Demo Result">
          <TryItResult
            step={3}
            total={10}
            headline="Done. One screenshot, one tap."
            subtitle="You already do this. Now Soonlist handles the rest."
          />
        </PhoneFrame>

        {/* Screen 4: Screenshot Habit */}
        <PhoneFrame screenId="a-screenshot" label="4. Screenshot Habit">
          <ScreenshotHabitScreen
            step={4}
            total={10}
            headline="Do you already screenshot events you're interested in?"
            options={["Yes, all the time", "Not yet, but I want to"]}
          />
        </PhoneFrame>

        {/* Screen 5: Discovery Channels */}
        <PhoneFrame screenId="a-discovery" label="5. Discovery">
          <DiscoveryChannelsScreen
            step={5}
            total={10}
            headline="Where do you spot the most events?"
            subtitle="We'll personalize your experience."
          />
        </PhoneFrame>

        {/* Screen 6: Goals (behavior-framed) */}
        <PhoneFrame screenId="a-goals" label="6. Goals">
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

        {/* Screen 7: Age + Source combined */}
        <PhoneFrame screenId="a-age-source" label="7. Age + Source">
          <CombinedAgeSurveyScreen step={7} total={10} />
        </PhoneFrame>

        {/* Screen 8: Notifications */}
        <PhoneFrame screenId="a-notif" label="8. Notifications">
          <NotificationsScreen
            step={8}
            total={10}
            headline="Never forget an event you saved."
            subtitle="We'll remind you before events happen so you actually go."
            dialogTitle="Turn on Push Notifications to stay in your rhythm"
            dialogBody="Soonlist reminds you before saved events so the screenshot actually becomes a plan."
          />
        </PhoneFrame>

        {/* Screen 9: Paywall (soft feature gate) */}
        <PhoneFrame screenId="a-paywall" label="9. Paywall">
          <FeatureGatePaywall />
        </PhoneFrame>

        {/* Screen 10: Sign In */}
        <PhoneFrame screenId="a-signin" label="10. Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>
    </div>
  );
}
