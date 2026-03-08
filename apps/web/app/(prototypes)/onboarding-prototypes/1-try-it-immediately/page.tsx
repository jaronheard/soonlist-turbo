import {
  FlowRow,
  Headline,
  LightScreen,
  Logo,
  PhoneFrame,
  PrimaryButton,
  SampleScreenshot,
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
} from "../shared-screens";

export default function TryItImmediately() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold text-neutral-1">
        Direction 1: Try It Immediately
      </h1>
      <p className="mb-8 text-sm text-neutral-2">
        Demo-first. The capture simulation is screen 1. No value screens precede
        it. 11 screens total.
      </p>

      <FlowRow>
        {/* Screen 1: The Hook */}
        <PhoneFrame screenId="1-hook" label="1. The Hook">
          <LightScreen>
            <Logo />
            <div className="mt-4 text-center">
              <Headline className="text-interactive-1">
                Screenshot. Tap. Done.
              </Headline>
              <Subtitle className="text-neutral-2">
                Try it right now — tap the screenshot below.
              </Subtitle>
            </div>
            <div className="mt-6 flex-1">
              <SampleScreenshot source="Instagram" />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Capture this event" variant="purple" />
            </div>
            <SecondaryLinks />
          </LightScreen>
        </PhoneFrame>

        {/* Screen 2: The Magic */}
        <PhoneFrame screenId="1-magic" label="2. The Magic">
          <TryItParsing step={0} total={8} headline="Capturing..." subtitle="AI is reading the details" />
        </PhoneFrame>

        {/* Screen 3: The Payoff */}
        <PhoneFrame screenId="1-payoff" label="3. The Payoff">
          <TryItResult
            step={0}
            total={8}
            headline="That's it."
            subtitle="Screenshots become organized events, automatically."
          />
        </PhoneFrame>

        {/* Screen 4: Discovery Channels */}
        <PhoneFrame screenId="1-discovery" label="4. Discovery Channels">
          <DiscoveryChannelsScreen
            step={1}
            total={8}
            headline="Where do you find the most events?"
          />
        </PhoneFrame>

        {/* Screen 5: Share Demo */}
        <PhoneFrame screenId="1-share-demo" label="5. Share Demo">
          <ShareDemoScreen
            step={2}
            total={8}
            headline="Share into the app"
            subtitle="Use the share button from any app to save events directly to Soonlist"
          />
        </PhoneFrame>

        {/* Screen 6: Notifications */}
        <PhoneFrame screenId="1-notifications" label="6. Notifications">
          <NotificationsScreen
            step={3}
            total={8}
            headline="Never miss an event"
            subtitle="Get notified when events are saved so you can stay on top of your plans"
          />
        </PhoneFrame>

        {/* Screen 7: Goals */}
        <PhoneFrame screenId="1-goals" label="7. Goals">
          <GoalsScreen step={4} total={8} />
        </PhoneFrame>

        {/* Screen 8: Screenshot Habit */}
        <PhoneFrame screenId="1-screenshot-habit" label="8. Screenshot Habit">
          <ScreenshotHabitScreen step={5} total={8} />
        </PhoneFrame>

        {/* Screen 9: Age */}
        <PhoneFrame screenId="1-age" label="9. Age">
          <AgeScreen step={6} total={8} />
        </PhoneFrame>

        {/* Screen 10: Source */}
        <PhoneFrame screenId="1-source" label="10. Source">
          <SourceScreen step={7} total={8} />
        </PhoneFrame>

        {/* Screen 11: Paywall */}
        <PhoneFrame screenId="1-paywall" label="11. Paywall">
          <PaywallScreen />
        </PhoneFrame>

        {/* Screen 12: Sign In */}
        <PhoneFrame screenId="1-signin" label="12. Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>
    </div>
  );
}
