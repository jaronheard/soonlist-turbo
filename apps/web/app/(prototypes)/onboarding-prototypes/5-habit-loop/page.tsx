import {
  FlowRow,
  Headline,
  LightScreen,
  Logo,
  LoopStep,
  PhoneFrame,
  PrimaryButton,
  ProgressBar,
  PurpleScreen,
  SecondaryLinks,
  Subtitle,
} from "../components";
import {
  CombinedAgeSurveyScreen,
  DiscoveryChannelsScreen,
  GoalsScreen,
  NotificationsScreen,
  PaywallScreen,
  ScreenshotHabitScreen,
  ShareDemoScreen,
  SignInScreen,
  TryItParsing,
  TryItScreenshot,
} from "../shared-screens";

export default function HabitLoop() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold text-neutral-1">
        Direction 5: The Habit Loop
      </h1>
      <p className="mb-8 text-sm text-neutral-2">
        Frame the rhythm, not features. &quot;See it. Screenshot it. Done.&quot;
        11 screens.
      </p>

      <FlowRow>
        {/* Screen 0: Welcome */}
        <PhoneFrame screenId="5-welcome" label="0. Welcome">
          <LightScreen>
            <Logo />
            <div className="mt-4 text-center">
              <Headline className="text-interactive-1">
                See it. Screenshot it. Soonlist does the rest.
              </Headline>
              <Subtitle className="text-neutral-2">
                The simplest way to never miss an event again.
              </Subtitle>
            </div>
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="text-4xl">📱 → 📸 → ✨</div>
              <div className="text-xs text-neutral-2">
                See → Screenshot → Organized
              </div>
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Get Started" variant="purple" />
            </div>
            <SecondaryLinks />
          </LightScreen>
        </PhoneFrame>

        {/* Screen 1: The Loop */}
        <PhoneFrame screenId="5-loop" label="1. The Loop">
          <PurpleScreen>
            <ProgressBar step={1} total={10} />
            <div className="mt-8">
              <Headline>One habit. Three seconds.</Headline>
              <Subtitle>This is the whole thing.</Subtitle>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <LoopStep
                number={1}
                icon="👁"
                title="You spot an event"
                subtitle="on Instagram, a flyer, a text from a friend"
              />
              <LoopStep
                number={2}
                icon="📸"
                title="You screenshot it"
                subtitle="like you probably already do"
              />
              <LoopStep
                number={3}
                icon="✨"
                title="Soonlist handles the rest"
                subtitle="name, date, time, location — all parsed automatically"
              />
            </div>
            <div className="mt-4 text-center text-sm text-white/60">
              Do it once and you&apos;ll do it every time.
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Screen 2: Screenshot Habit */}
        <PhoneFrame screenId="5-screenshot" label="2. Screenshot Habit">
          <ScreenshotHabitScreen
            step={2}
            total={10}
            headline="Do you already screenshot events you're interested in?"
            options={["Yes, all the time", "Not yet, but I want to"]}
          />
        </PhoneFrame>

        {/* Screen 3: Discovery */}
        <PhoneFrame screenId="5-discovery" label="3. Discovery">
          <DiscoveryChannelsScreen
            step={3}
            total={10}
            headline="Where do you spot the most events?"
            subtitle="We'll personalize your first capture."
          />
        </PhoneFrame>

        {/* Screen 4: First Capture */}
        <PhoneFrame screenId="5-tryit1" label="4. Try It 1/3">
          <TryItScreenshot
            step={4}
            total={10}
            headline="Here's one from Instagram."
            subtitle="Screenshot it. (Just tap the button.)"
          />
        </PhoneFrame>

        <PhoneFrame screenId="5-tryit2" label="4. Try It 2/3">
          <TryItParsing step={4} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="5-tryit3" label="4. Try It 3/3">
          <PurpleScreen>
            <ProgressBar step={4} total={10} />
            <div className="mt-8">
              <Headline>That&apos;s your first one.</Headline>
              <Subtitle>
                You already do this. Now Soonlist does the rest.
              </Subtitle>
            </div>
            <div className="mt-6">
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
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-white/60">
              One screenshot. One tap. That&apos;s the whole habit.
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Screen 5: Share Extension */}
        <PhoneFrame screenId="5-share" label="5. Share Extension">
          <ShareDemoScreen
            step={5}
            total={10}
            headline="There's an even faster way."
            subtitle="Share directly from any app — no screenshot needed."
          />
        </PhoneFrame>

        {/* Screen 6: Notifications */}
        <PhoneFrame screenId="5-notif" label="6. Notifications">
          <NotificationsScreen
            step={6}
            total={10}
            headline="Never forget an event you saved."
            subtitle="We'll remind you before events happen so you actually go."
            dialogTitle="Turn on Push Notifications to stay in your rhythm"
            dialogBody="Soonlist reminds you before saved events so the screenshot actually becomes a plan."
          />
        </PhoneFrame>

        {/* Screen 7: Goals */}
        <PhoneFrame screenId="5-goals" label="7. Goals">
          <GoalsScreen
            step={7}
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

        {/* Screen 8: Combined Age + Source */}
        <PhoneFrame screenId="5-age-source" label="8. Age + Source">
          <CombinedAgeSurveyScreen step={8} total={10} />
        </PhoneFrame>

        {/* Screen 9: Paywall */}
        <PhoneFrame screenId="5-paywall" label="9. Paywall">
          <PaywallScreen
            headline="Soonlist is free. Really."
            subtitle="Every feature works. No limits. No catch. If you love it, you can support us."
          />
        </PhoneFrame>

        {/* Screen 10: Sign In */}
        <PhoneFrame screenId="5-signin" label="10. Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>
    </div>
  );
}
