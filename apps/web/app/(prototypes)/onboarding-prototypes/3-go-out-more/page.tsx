import {
  FlowRow,
  Headline,
  ImagePlaceholder,
  LightScreen,
  Logo,
  PhoneFrame,
  PrimaryButton,
  SecondaryLinks,
  SocialProof,
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
} from "../shared-screens";

export default function GoOutMore() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold text-neutral-1">
        Direction 3: Go Out More
      </h1>
      <p className="mb-8 text-sm text-neutral-2">
        Aspirational lifestyle framing. Identity-first, not utility-first. 12
        screens.
      </p>

      <FlowRow>
        {/* Screen 0: Welcome */}
        <PhoneFrame screenId="3-welcome" label="0. Welcome">
          <LightScreen>
            <Logo />
            <div className="mt-4 text-center">
              <Headline className="text-interactive-1">
                Be the person who actually goes
              </Headline>
              <Subtitle className="text-neutral-2">
                Events are everywhere. Soonlist makes sure you show up.
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

        {/* Screen 1: Goals (aspirational) */}
        <PhoneFrame screenId="3-goals" label="1. Goals">
          <GoalsScreen
            step={1}
            total={10}
            headline="What kind of plans do you want to make?"
            subtitle="Pick everything that sounds like you"
            options={[
              "Go to more concerts, shows, and nightlife",
              "Try new restaurants and food events",
              "Find outdoor adventures and active things",
              "Attend community events and meetups",
              "Keep up with friends' plans",
              "Just exploring for now",
            ]}
            selectedIndices={[0, 3]}
          />
        </PhoneFrame>

        {/* Screen 2: Screenshot Habit */}
        <PhoneFrame screenId="3-screenshot" label="2. Screenshot Habit">
          <ScreenshotHabitScreen
            step={2}
            total={10}
            headline="Sound familiar?"
            options={["That's literally me", "Not yet, but I want to start"]}
          />
        </PhoneFrame>

        {/* Screen 3: Discovery Channels */}
        <PhoneFrame screenId="3-discovery" label="3. Discovery">
          <DiscoveryChannelsScreen
            step={3}
            total={10}
            headline="Where do you find things to do?"
            subtitle="We'll personalize your first experience"
          />
        </PhoneFrame>

        {/* Screen 4: The Problem */}
        <PhoneFrame screenId="3-problem" label="4. The Problem">
          <div className="flex h-full flex-col bg-interactive-1 px-8 py-10 text-white">
            <div className="mx-6 mt-0 h-1.5 rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: "40%" }}
              />
            </div>
            <div className="mt-8">
              <Headline>
                Events shouldn&apos;t disappear into your camera roll
              </Headline>
              <Subtitle>
                You deserve a real plan, not a graveyard of screenshots
              </Subtitle>
            </div>
            <div className="mt-6">
              <ImagePlaceholder label="Messy Camera Roll" aspectRatio="1/1" />
            </div>
            <SocialProof text="Most people have 5+ event screenshots saved right now" />
            <div className="mt-auto pt-4">
              <PrimaryButton label="Continue" />
            </div>
          </div>
        </PhoneFrame>

        {/* Screen 5: The Promise */}
        <PhoneFrame screenId="3-promise" label="5. The Promise">
          <div className="flex h-full flex-col bg-interactive-1 px-8 py-10 text-white">
            <div className="mx-6 mt-0 h-1.5 rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: "50%" }}
              />
            </div>
            <div className="mt-8">
              <Headline>One tap. Every detail. Actually go.</Headline>
              <Subtitle>
                Capture any event from anywhere and we&apos;ll handle the rest —
                date, time, location, all organized
              </Subtitle>
            </div>
            <div className="mt-6">
              <ImagePlaceholder label="Clean Feed" aspectRatio="3/4" />
            </div>
            <SocialProof text="Join thousands who stopped just screenshotting and started going" />
            <div className="mt-auto pt-4">
              <PrimaryButton label="See how it works" />
            </div>
          </div>
        </PhoneFrame>

        {/* Screen 6: Try It Demo */}
        <PhoneFrame screenId="3-tryit1" label="6. Try It 1/3">
          <TryItScreenshot
            step={6}
            total={10}
            headline="Try it — capture this event"
            subtitle="Imagine you just saw this on Instagram"
          />
        </PhoneFrame>

        <PhoneFrame screenId="3-tryit2" label="6. Try It 2/3">
          <TryItParsing step={6} total={10} headline="Making you a plan..." />
        </PhoneFrame>

        <PhoneFrame screenId="3-tryit3" label="6. Try It 3/3">
          <TryItResult
            step={6}
            total={10}
            headline="You'd actually go to this"
            subtitle="That's all it takes. One tap, and it's on your list."
          />
        </PhoneFrame>

        {/* Screen 7: Share Demo */}
        <PhoneFrame screenId="3-share" label="7. Share Demo">
          <ShareDemoScreen
            step={7}
            total={10}
            headline="Even faster from any app"
            subtitle="See an event on Instagram? Share it directly to Soonlist without leaving the app."
          />
        </PhoneFrame>

        {/* Screen 8: Notifications */}
        <PhoneFrame screenId="3-notif" label="8. Notifications">
          <NotificationsScreen
            step={8}
            total={10}
            headline="Don't just save it. Show up."
            subtitle="Get a reminder before events so you actually go"
            dialogTitle="Get reminders before your events"
            dialogBody="Soonlist reminds you before events start so you never forget to go"
          />
        </PhoneFrame>

        {/* Screen 9: Age */}
        <PhoneFrame screenId="3-age" label="9. Age">
          <AgeScreen
            step={9}
            total={10}
            headline="One quick thing"
            subtitle="How old are you? This helps us improve the app for everyone."
          />
        </PhoneFrame>

        {/* Screen 10: Source */}
        <PhoneFrame screenId="3-source" label="10. Source">
          <SourceScreen
            step={10}
            total={10}
            headline="How'd you find us?"
            subtitle="We're a small team and this really helps"
          />
        </PhoneFrame>

        {/* Screen 11: Paywall */}
        <PhoneFrame screenId="3-paywall" label="11. Paywall">
          <PaywallScreen
            headline="Go out more. We'll keep it free."
            subtitle="Soonlist is free with no limits. Support us to keep it that way."
            skipLabel="Continue for free"
          />
        </PhoneFrame>

        {/* Screen 12: Sign In */}
        <PhoneFrame screenId="3-signin" label="12. Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>
    </div>
  );
}
