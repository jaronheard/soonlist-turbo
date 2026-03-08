import {
  CommunityPill,
  FlowRow,
  Headline,
  ImagePlaceholder,
  LightScreen,
  Logo,
  PaywallCard,
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
  ScreenshotHabitScreen,
  ShareDemoScreen,
  SignInScreen,
  SourceScreen,
  TryItParsing,
  TryItResult,
  TryItScreenshot,
} from "../shared-screens";

export default function FreeCommunitySupported() {
  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold text-neutral-1">
        Direction 7: Free &amp; Community-Supported
      </h1>
      <p className="mb-8 text-sm text-neutral-2">
        Lead with identity, not features. Patronage model, not feature gating.
        11 screens.
      </p>

      <FlowRow>
        {/* Screen 1: Welcome */}
        <PhoneFrame screenId="7-welcome" label="1. Welcome">
          <LightScreen>
            <Logo />
            <div className="mt-4 text-center">
              <Headline className="text-interactive-1">
                Turn screenshots into plans
              </Headline>
              <Subtitle className="text-neutral-2">
                Save events in one tap. All in one place.
              </Subtitle>
              <div className="mt-2 text-sm font-semibold text-interactive-1">
                Free forever. Community-supported.
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

        {/* Screen 2: Community Identity */}
        <PhoneFrame screenId="7-identity" label="2. Community Identity">
          <PurpleScreen>
            <ProgressBar step={1} total={10} />
            <div className="mt-8">
              <Headline>Made by people, not a corporation</Headline>
              <Subtitle>
                Soonlist is built by a small team. No investors, no ads, no data
                sales. Every feature is free — supported by people like you.
              </Subtitle>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <CommunityPill icon="🔓" text="All features, always free" />
              <CommunityPill icon="🛡" text="No ads. No tracking." />
              <CommunityPill icon="❤️" text="Supported by the community" />
            </div>
            <SocialProof text="Join 2,000+ people saving events with Soonlist" />
            <div className="mt-auto pt-4">
              <PrimaryButton label="Continue" />
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Screen 3: Goals */}
        <PhoneFrame screenId="7-goals" label="3. Goals">
          <GoalsScreen
            step={2}
            total={10}
            headline="What brings you here?"
            subtitle="This helps us build what matters to you"
          />
        </PhoneFrame>

        {/* Screen 4: Screenshot Habit */}
        <PhoneFrame screenId="7-screenshot" label="4. Screenshot Habit">
          <ScreenshotHabitScreen step={3} total={10} />
        </PhoneFrame>

        {/* Screen 5: Discovery */}
        <PhoneFrame screenId="7-discovery" label="5. Discovery">
          <DiscoveryChannelsScreen
            step={4}
            total={10}
            subtitle="We'll personalize your demo"
          />
        </PhoneFrame>

        {/* Screen 6: Try It Demo */}
        <PhoneFrame screenId="7-tryit1" label="6. Try It 1/3">
          <TryItScreenshot
            step={5}
            total={10}
            subtitle="We'll do the rest — for free"
          />
        </PhoneFrame>

        <PhoneFrame screenId="7-tryit2" label="6. Try It 2/3">
          <TryItParsing step={5} total={10} />
        </PhoneFrame>

        <PhoneFrame screenId="7-tryit3" label="6. Try It 3/3">
          <TryItResult
            step={5}
            total={10}
            subtitle="Screenshots become organized events, automatically. No charge."
          />
        </PhoneFrame>

        {/* Screen 7: Notifications */}
        <PhoneFrame screenId="7-notif" label="7. Notifications">
          <NotificationsScreen step={6} total={10} />
        </PhoneFrame>

        {/* Screen 8: Share Demo */}
        <PhoneFrame screenId="7-share" label="8. Share Demo">
          <ShareDemoScreen
            step={7}
            total={10}
            headline="Share from any app"
            subtitle="Use the share button in Instagram, Safari, or any app to save events directly"
          />
        </PhoneFrame>

        {/* Screen 9: Age */}
        <PhoneFrame screenId="7-age" label="9. Age">
          <AgeScreen
            step={8}
            total={10}
            headline="One more thing — how old are you?"
            subtitle="Helps us understand our community"
          />
        </PhoneFrame>

        {/* Screen 10: Source */}
        <PhoneFrame screenId="7-source" label="10. Source">
          <SourceScreen
            step={9}
            total={10}
            headline="How did you find us?"
          />
        </PhoneFrame>

        {/* Screen 11: Reframed Paywall */}
        <PhoneFrame screenId="7-paywall" label="11. Support Soonlist">
          <PurpleScreen>
            <ProgressBar step={10} total={10} />
            <div className="mt-8">
              <Headline>Support Soonlist</Headline>
              <Subtitle>
                Everything you just tried? It&apos;s yours. Free. All features,
                no limits, no catch. Soonlist is built by a small team and
                funded by the people who use it.
              </Subtitle>
            </div>
            <div className="mt-4 text-center text-xs text-white/60">
              2,000+ people use Soonlist. If just 5% supported it, we&apos;d
              cover our costs for the year.
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <PaywallCard
                title="☕ Buy us a coffee"
                price="$4.99/month"
                note="Keeps the servers running"
              />
              <PaywallCard
                title="⭐ Champion"
                price="$29.99/year"
                badge="SAVE 50%"
                note="You're keeping Soonlist alive"
              />
            </div>
            <div className="mt-3 text-center text-xs text-white/60">
              Supporters get: a badge, early access, and our deep gratitude.
            </div>
            <div className="mt-auto pt-4">
              <PrimaryButton label="Not now — I'll use Soonlist for free" />
            </div>
            <div className="mt-2 text-center text-xs text-white/40">
              You can always support later in Settings
            </div>
          </PurpleScreen>
        </PhoneFrame>

        {/* Screen 12: Sign In */}
        <PhoneFrame screenId="7-signin" label="12. Sign In">
          <SignInScreen />
        </PhoneFrame>
      </FlowRow>
    </div>
  );
}
