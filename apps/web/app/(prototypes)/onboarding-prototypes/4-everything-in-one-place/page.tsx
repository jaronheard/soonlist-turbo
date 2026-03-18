import {
  BatchGrid,
  FlowRow,
  Headline,
  ImagePlaceholder,
  LightScreen,
  Logo,
  MessCard,
  PhoneFrame,
  PrimaryButton,
  ProgressBar,
  PurpleScreen,
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

export default function EverythingInOnePlace() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold text-neutral-1">
        Direction 4: Everything in One Place
      </h1>
      <p className="mb-8 text-sm text-neutral-2">
        Consolidation pitch: name the mess, show the fix, prove it works. 12
        screens.
      </p>

      <FlowRow>
        {/* Screen 0: Welcome */}
        <PhoneFrame screenId="4-welcome" label="0. Welcome">
          <LightScreen>
            <Logo />
            <div className="mt-4 text-center">
              <Headline className="text-interactive-1">
                Your events are everywhere
              </Headline>
              <Subtitle className="text-neutral-2">
                Soonlist brings them all into one place
              </Subtitle>
              <div className="mt-2 text-xs text-neutral-2">
                Free, community-supported
              </div>
            </div>
            <div className="mt-6">
              <ImagePlaceholder
                label="Convergence Illustration"
                aspectRatio="1/1"
              />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Bring them together" variant="purple" />
            </div>
            <SecondaryLinks />
          </LightScreen>
        </PhoneFrame>

        {/* Screen 1: The Mess */}
        <PhoneFrame screenId="4-mess" label="1. The Mess">
          <PurpleScreen>
            <ProgressBar step={1} total={10} />
            <div className="mt-8">
              <Headline>Sound familiar?</Headline>
              <Subtitle>
                Events buried in screenshots. Plans lost in group chats. Flyers
                you forgot to save. Newsletters you skimmed and closed.
              </Subtitle>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <MessCard icon="📸" text="Instagram story — DJ set flyer" />
              <MessCard icon="💬" text='"you coming to the thing saturday?"' />
              <MessCard icon="📧" text="This week in Portland..." />
              <MessCard icon="📋" text="Physical flyer, slightly crooked" />
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="That's me" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Screen 2: The Fix */}
        <PhoneFrame screenId="4-fix" label="2. The Fix">
          <PurpleScreen>
            <ProgressBar step={2} total={10} />
            <div className="mt-8">
              <Headline>One place. Every event.</Headline>
              <Subtitle>
                No matter where you find it — Instagram, a friend&apos;s text, a
                flyer on the street — capture it and it lives here
              </Subtitle>
            </div>
            <div className="mt-6">
              <ImagePlaceholder
                label="Clean Feed (sources → one list)"
                aspectRatio="3/4"
              />
            </div>
            <SocialProof text="Join thousands of people who stopped losing events" />
            <div className="mt-auto pt-4">
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Screen 3: All at Once (Batch) */}
        <PhoneFrame screenId="4-batch" label="3. All at Once">
          <PurpleScreen>
            <ProgressBar step={3} total={10} />
            <div className="mt-8">
              <Headline>Add them all at once</Headline>
              <Subtitle>
                Select up to 10 screenshots from your camera roll. We&apos;ll
                save every event in seconds.
              </Subtitle>
            </div>
            <div className="mt-6">
              <BatchGrid />
            </div>
            <SocialProof text="Most people have 5+ event screenshots saved already" />
            <div className="mt-auto pt-4">
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Screen 4: Goals */}
        <PhoneFrame screenId="4-goals" label="4. Goals">
          <GoalsScreen
            step={4}
            total={10}
            headline="What's slipping through the cracks?"
            subtitle="Pick everything that applies"
            options={[
              "Events I screenshot but never look at again",
              "Plans friends text me that I forget",
              "Local things I hear about too late",
              "Concerts, shows, and tickets I lose track of",
              "I just want everything in one place",
            ]}
            selectedIndices={[0, 4]}
          />
        </PhoneFrame>

        {/* Screen 5: Screenshot Habit */}
        <PhoneFrame screenId="4-screenshot" label="5. Screenshot Habit">
          <ScreenshotHabitScreen
            step={5}
            total={10}
            headline="Do you already screenshot events you want to remember?"
            options={["Yes, all the time", "Sometimes", "Not yet"]}
          />
        </PhoneFrame>

        {/* Screen 6: Discovery */}
        <PhoneFrame screenId="4-discovery" label="6. Discovery">
          <DiscoveryChannelsScreen
            step={6}
            total={10}
            headline="Where do your events get lost?"
            subtitle="Pick the place where you find the most events"
          />
        </PhoneFrame>

        {/* Screen 7: Try It */}
        <PhoneFrame screenId="4-tryit1" label="7. Try It 1/3">
          <TryItScreenshot
            step={7}
            total={10}
            headline="See it. Screenshot it. Done."
            subtitle="Tap below to capture this event"
          />
        </PhoneFrame>

        <PhoneFrame screenId="4-tryit2" label="7. Try It 2/3">
          <TryItParsing step={7} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="4-tryit3" label="7. Try It 3/3">
          <TryItResult
            step={7}
            total={10}
            headline="Saved. Organized. One place."
            subtitle="Every event you capture lands right here — no sorting, no folders, no effort"
          />
        </PhoneFrame>

        {/* Screen 8: Notifications */}
        <PhoneFrame screenId="4-notif" label="8. Notifications">
          <NotificationsScreen
            step={8}
            total={10}
            headline="Never lose an event again"
            subtitle="Get a notification every time an event is saved, so nothing slips through the cracks"
          />
        </PhoneFrame>

        {/* Screen 9: Share Demo */}
        <PhoneFrame screenId="4-share" label="9. Share Demo">
          <ShareDemoScreen
            step={9}
            total={10}
            headline="Share from any app, straight to Soonlist"
            subtitle="See an event in Instagram, Safari, or a text? Tap share, tap Soonlist."
          />
        </PhoneFrame>

        {/* Screen 10: Age */}
        <PhoneFrame screenId="4-age" label="10. Age">
          <AgeScreen
            step={10}
            total={10}
            headline="Almost there — how old are you?"
          />
        </PhoneFrame>

        {/* Screen 11: Source */}
        <PhoneFrame screenId="4-source" label="11. Source">
          <SourceScreen
            step={10}
            total={10}
            headline="Last one — where did you hear about us?"
          />
        </PhoneFrame>

        {/* Screen 12: Paywall */}
        <PhoneFrame screenId="4-paywall" label="12. Paywall">
          <PaywallScreen
            headline="Support Soonlist"
            subtitle="Every feature is free, forever. Your support keeps it that way."
          />
        </PhoneFrame>

        {/* Screen 13: Sign In */}
        <PhoneFrame screenId="4-signin" label="13. Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>
    </div>
  );
}
